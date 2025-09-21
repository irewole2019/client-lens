import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertFileSchema, insertCommentSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { pushToGitHub } from "./github-utils";

export async function registerRoutes(app: Express): Promise<Server> {
  const objectStorageService = new ObjectStorageService();

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
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
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

  // Projects API with comment statistics
  app.get("/api/projects", async (req, res) => {
    try {
      const userId = "user-1"; // Hardcoded user
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
      const userId = "user-1"; // Hardcoded user
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
      const userId = "user-1"; // Hardcoded user
      const project = await storage.createProject({ ...data, userId });
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
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
