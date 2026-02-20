import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { insertProjectSchema, insertFileSchema, insertCommentSchema, insertFolderSchema, magicLinks, users } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { pushToGitHub } from "./github-utils";
import { db } from "./db";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { generateMagicToken, hashMagicToken, magicLinkExpiryDate } from "./auth";
import { sendEmail } from "./email";

export async function registerRoutes(app: Express): Promise<Server> {
  const objectStorageService = new ObjectStorageService();

  const buildAppBaseUrl = (req: any): string => {
    const configured = process.env.APP_BASE_URL;
    if (configured) return configured.replace(/\/$/, "");
    const host = req.get("host");
    const protocol = req.protocol;
    return `${protocol}://${host}`;
  };

  const getCurrentUserId = (req: Request): string => {
    return req.session?.userId || (req.query.userId as string) || "user-1";
  };

  // --- Auth (magic link) ---
  const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
  });

  const registerSchema = z.object({
    username: z.string().trim().min(2).max(50),
    email: z.string().trim().toLowerCase().email(),
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.json({ user: null });
      const user = await storage.getUser(userId);
      if (!user) return res.json({ user: null });
      return res.json({ user: { id: user.id, username: user.username, email: user.email } });
    } catch (error) {
      console.error("Error fetching current user:", error);
      return res.status(500).json({ error: "Failed to fetch current user" });
    }
  });

  app.post("/api/auth/login-link", async (req, res) => {
    try {
      const { email } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      // Respond generically to avoid email enumeration.
      if (!user) {
        return res.json({ ok: true });
      }

      const token = generateMagicToken();
      const tokenHash = hashMagicToken(token);
      const expiresAt = magicLinkExpiryDate(15);

      await db.insert(magicLinks).values({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const baseUrl = buildAppBaseUrl(req);
      const url = `${baseUrl}/api/auth/callback?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: email,
        subject: "Your Client Lens sign-in link",
        text: `Click to sign in:\n\n${url}\n\nThis link expires in 15 minutes.`,
      });

      return res.json({ ok: true });
    } catch (error) {
      console.error("Error creating login link:", error);
      return res.status(500).json({ error: "Failed to create login link" });
    }
  });

  app.post("/api/auth/register-link", async (req, res) => {
    try {
      const { username, email } = registerSchema.parse(req.body);

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }

      const user = await storage.createUser({ username, email });

      const token = generateMagicToken();
      const tokenHash = hashMagicToken(token);
      const expiresAt = magicLinkExpiryDate(15);

      await db.insert(magicLinks).values({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const baseUrl = buildAppBaseUrl(req);
      const url = `${baseUrl}/api/auth/callback?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: email,
        subject: "Finish creating your Client Lens account",
        text: `Click to finish signing up:\n\n${url}\n\nThis link expires in 15 minutes.`,
      });

      return res.status(201).json({ ok: true });
    } catch (error) {
      console.error("Error creating register link:", error);
      return res.status(500).json({ error: "Failed to create register link" });
    }
  });

  app.get("/api/auth/callback", async (req, res) => {
    try {
      const token = String(req.query.token || "");
      if (!token) {
        return res.status(400).send("Missing token");
      }

      const tokenHash = hashMagicToken(token);
      const now = new Date();

      const [link] = await db
        .select()
        .from(magicLinks)
        .where(
          and(
            eq(magicLinks.tokenHash, tokenHash),
            isNull(magicLinks.consumedAt),
            gt(magicLinks.expiresAt, now),
          ),
        );

      if (!link) {
        return res.status(400).send("Invalid or expired link");
      }

      const [user] = await db.select().from(users).where(eq(users.id, link.userId));
      if (!user) {
        return res.status(400).send("User not found");
      }

      await db
        .update(magicLinks)
        .set({ consumedAt: now })
        .where(eq(magicLinks.id, link.id));

      if (!user.emailVerifiedAt) {
        await db
          .update(users)
          .set({ emailVerifiedAt: now })
          .where(eq(users.id, user.id));
      }

      req.session.userId = user.id;

      return res.redirect("/projects");
    } catch (error) {
      console.error("Error consuming magic link:", error);
      return res.status(500).send("Failed to sign in");
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).json({ error: "Failed to logout" });
        }
        res.clearCookie("connect.sid");
        return res.json({ ok: true });
      });
    } catch (error) {
      console.error("Error logging out:", error);
      return res.status(500).json({ error: "Failed to logout" });
    }
  });

  // Local upload fallback (development only)
  // Allows uploading images without Replit Object Storage env vars.
  const localUploadsDir = path.resolve(import.meta.dirname, "..", ".local-uploads");
  const ensureLocalUploadsDir = async () => {
    await fs.promises.mkdir(localUploadsDir, { recursive: true });
  };

  app.put("/api/local-uploads/:id", async (req, res) => {
    if ((process.env.NODE_ENV || "development") !== "development") {
      return res.status(404).json({ error: "Not found" });
    }

    const id = req.params.id;
    const contentType = String(req.headers["content-type"] || "application/octet-stream");

    // MVP: images only
    if (!contentType.startsWith("image/")) {
      return res.status(400).json({ error: "Only image uploads are supported" });
    }

    // 10MB limit (matches frontend)
    const maxBytes = 10 * 1024 * 1024;
    let totalBytes = 0;

    await ensureLocalUploadsDir();
    const dataPath = path.join(localUploadsDir, `${id}.bin`);
    const metaPath = path.join(localUploadsDir, `${id}.json`);

    const writeStream = fs.createWriteStream(dataPath);
    let aborted = false;
    let responded = false;

    const respondOnce = (status: number, body?: any) => {
      if (responded) return;
      responded = true;
      if (body === undefined) {
        res.sendStatus(status);
      } else {
        res.status(status).json(body);
      }
    };

    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes && !aborted) {
        aborted = true;
        req.destroy();
        writeStream.destroy(new Error("File too large"));
      }
    });

    req.on("aborted", () => {
      aborted = true;
    });

    req.on("error", async () => {
      aborted = true;
      try {
        await fs.promises.unlink(dataPath);
      } catch {
        // ignore
      }
      respondOnce(500, { error: "Upload failed" });
    });

    req.on("close", async () => {
      // If the client disconnects mid-upload, clean up.
      if (!responded && aborted) {
        try {
          await fs.promises.unlink(dataPath);
        } catch {
          // ignore
        }
        respondOnce(400, { error: "Upload aborted" });
      }
    });

    writeStream.on("error", async (err) => {
      try {
        await fs.promises.unlink(dataPath);
      } catch {
        // ignore
      }

      if (String(err?.message || "").includes("File too large")) {
        respondOnce(413, { error: "File too large (max 10MB)" });
      } else {
        respondOnce(500, { error: "Upload failed" });
      }
    });

    req.pipe(writeStream);

    writeStream.on("finish", async () => {
      if (aborted) {
        try {
          await fs.promises.unlink(dataPath);
        } catch {
          // ignore
        }

        if (!responded) {
          respondOnce(400, { error: "Upload aborted" });
        }
        return;
      }

      await fs.promises.writeFile(
        metaPath,
        JSON.stringify(
          {
            contentType,
            size: totalBytes,
            uploadedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
        "utf-8",
      );

      respondOnce(200, { ok: true, objectPath: `/api/local-uploads/${id}` });
    });
  });

  app.get("/api/local-uploads/:id", async (req, res) => {
    if ((process.env.NODE_ENV || "development") !== "development") {
      return res.status(404).json({ error: "Not found" });
    }

    const id = req.params.id;
    const dataPath = path.join(localUploadsDir, `${id}.bin`);
    const metaPath = path.join(localUploadsDir, `${id}.json`);

    try {
      const metaRaw = await fs.promises.readFile(metaPath, "utf-8");
      const meta = JSON.parse(metaRaw) as { contentType?: string; size?: number };

      if (!fs.existsSync(dataPath)) {
        return res.sendStatus(404);
      }

      res.setHeader("Content-Type", meta.contentType || "application/octet-stream");
      if (typeof meta.size === "number") {
        res.setHeader("Content-Length", String(meta.size));
      }
      res.setHeader("Cache-Control", "no-store");

      fs.createReadStream(dataPath).pipe(res);
    } catch (error) {
      return res.sendStatus(404);
    }
  });

  // Serve public objects
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve private objects (for public file uploading use case)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get upload URL for file upload
  app.post("/api/objects/upload", async (req, res) => {
    try {
      let uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Uppy expects an absolute URL. In local-dev fallback we may return a
      // relative path like `/api/local-uploads/<id>`.
      if (uploadURL.startsWith("/")) {
        const host = req.get("host");
        const protocol = req.protocol;
        uploadURL = `${protocol}://${host}${uploadURL}`;
      }

      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Normalize object path endpoint
  app.post("/api/objects/normalize", async (req, res) => {
    try {
      const { url } = req.body;
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(url);
      res.json({ objectPath: normalizedPath });
    } catch (error) {
      console.error("Error normalizing object path:", error);
      res.status(500).json({ error: "Failed to normalize path" });
    }
  });

  // Public project view API
  app.get("/api/public/projects/:publicId", async (req, res) => {
    try {
      const project = await storage.getProjectByPublicId(req.params.publicId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const files = await storage.getFilesByProjectId(project.id);
      res.json({ ...project, files });
    } catch (error) {
      console.error("Error fetching public project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  // Public file view API
  app.get("/api/public/files/:publicId", async (req, res) => {
    try {
      const file = await storage.getFileByPublicId(req.params.publicId);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      // Get the project info for context
      const project = await storage.getProject(file.projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json({ 
        ...file, 
        project: {
          id: project.id,
          publicId: project.publicId,
          title: project.title
        }
      });
    } catch (error) {
      console.error("Error fetching public file:", error);
      res.status(500).json({ error: "Failed to fetch file" });
    }
  });

  // Folders API
  app.get("/api/folders", async (req, res) => {
    try {
      const userId = getCurrentUserId(req);
      const folders = await storage.getFoldersByUserId(userId);
      res.json(folders);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  });

  app.post("/api/folders", async (req, res) => {
    try {
      const data = insertFolderSchema.parse(req.body);
      const userId = getCurrentUserId(req);
      const folder = await storage.createFolder({ ...data, userId });
      res.status(201).json(folder);
    } catch (error) {
      console.error("Error creating folder:", error);
      res.status(500).json({ error: "Failed to create folder" });
    }
  });

  app.patch("/api/folders/:id", async (req, res) => {
    try {
      const { name } = req.body;
      const folder = await storage.updateFolder(req.params.id, { name });
      res.json(folder);
    } catch (error) {
      console.error("Error updating folder:", error);
      res.status(500).json({ error: "Failed to update folder" });
    }
  });

  app.delete("/api/folders/:id", async (req, res) => {
    try {
      await storage.deleteFolder(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting folder:", error);
      res.status(500).json({ error: "Failed to delete folder" });
    }
  });

  // Projects API with comment statistics
  app.get("/api/projects", async (req, res) => {
    try {
      const userId = getCurrentUserId(req);
      const projectsWithStats = await storage.getProjectsWithCommentStats(userId);
      res.json(projectsWithStats);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const files = await storage.getFilesByProjectId(project.id);
      res.json({ ...project, files });
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  // Mark project as viewed
  app.post("/api/projects/:id/viewed", async (req, res) => {
    try {
      const userId = getCurrentUserId(req);
      const projectId = req.params.id;
      
      await storage.updateProjectView(userId, projectId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating project view:", error);
      res.status(500).json({ error: "Failed to update project view" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const userId = getCurrentUserId(req);
      const project = await storage.createProject({ ...data, userId });
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const { folderId } = req.body;
      const project = await storage.updateProject(req.params.id, { folderId });
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Files API
  app.get("/api/projects/:projectId/files", async (req, res) => {
    try {
      const files = await storage.getFilesByProjectId(req.params.projectId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  app.post("/api/files", async (req, res) => {
    try {
      const data = insertFileSchema.parse(req.body);
      
      // Normalize the object path
      const objectPath = objectStorageService.normalizeObjectEntityPath(data.objectPath);
      
      const file = await storage.createFile({
        ...data,
        objectPath
      });
      
      res.status(201).json(file);
    } catch (error) {
      console.error("Error creating file record:", error);
      res.status(500).json({ error: "Failed to create file record" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    try {
      await storage.deleteFile(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Comment routes
  // Get comments for a file
  app.get("/api/files/:fileId/comments", async (req, res) => {
    try {
      const { fileId } = req.params;
      const comments = await storage.getCommentsByFileId(fileId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Create a comment (generic endpoint)
  app.post("/api/comments", async (req, res) => {
    try {
      const validation = insertCommentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid comment data", details: validation.error });
      }
      
      const comment = await storage.createComment(validation.data);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Create a comment for a specific file (alternative endpoint)
  app.post("/api/files/:fileId/comments", async (req, res) => {
    try {
      const { fileId } = req.params;
      const commentData = { ...req.body, fileId };
      
      const validation = insertCommentSchema.safeParse(commentData);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid comment data", details: validation.error });
      }
      
      const comment = await storage.createComment(validation.data);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Update a comment (for tag changes)
  app.patch("/api/comments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { tag } = req.body;
      
      if (!tag || !["To Do", "In Progress", "Resolved"].includes(tag)) {
        return res.status(400).json({ error: "Invalid tag value" });
      }
      
      const comment = await storage.updateComment(id, { tag });
      res.json(comment);
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ error: "Failed to update comment" });
    }
  });

  // Delete a comment
  app.delete("/api/comments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteComment(id);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // GitHub integration endpoint
  app.post("/api/github/push", async (req, res) => {
    try {
      const result = await pushToGitHub();
      res.json(result);
    } catch (error: any) {
      console.error("Error pushing to GitHub:", error);
      res.status(500).json({ 
        error: "Failed to push to GitHub", 
        details: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
