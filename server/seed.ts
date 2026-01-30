import "dotenv/config";
import fs from "fs";
import path from "path";
import { db, pool } from "./db";
import {
  users,
  projects,
  files,
  comments,
  type InsertUser,
  type InsertProject,
  type InsertFile,
  type InsertComment,
} from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  try {
    // Resolve local images directory (default to ../images)
    const imagesDir =
      process.env.SEED_IMAGES_DIR ||
      path.resolve(import.meta.dirname, "..", "images");

    if (!fs.existsSync(imagesDir)) {
      throw new Error(
        `Images directory not found at ${imagesDir}. Create it or set SEED_IMAGES_DIR.`,
      );
    }

    const allImageFiles = fs
      .readdirSync(imagesDir)
      .filter((file) => /\.(png|jpe?g|gif|webp)$/i.test(file));

    if (allImageFiles.length === 0) {
      throw new Error(
        `No image files found in ${imagesDir}. Add some images (png/jpg/jpeg/gif/webp).`,
      );
    }

    const mimeTypeMap: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
    };

    const getImagesByPrefix = (prefix: string) =>
      allImageFiles.filter((file) => file.toLowerCase().startsWith(prefix.toLowerCase()));

    const createUserIfNotExists = async (username: string, password: string) => {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      if (existingUser) {
        console.log(`✓ User already exists: ${username} (${existingUser.id})`);
        return existingUser;
      }
      const [insertedUser] = await db
        .insert(users)
        .values({ username, password })
        .returning();
      console.log("✓ Created user:", username, insertedUser.id);
      return insertedUser;
    };

    const createProjectWithFilesAndComments = async (
      userId: string,
      title: string,
      imageFiles: string[],
      clientName: string,
    ) => {
      if (imageFiles.length === 0) return null;

      const [project] = await db
        .insert(projects)
        .values({ title, userId })
        .returning();
      console.log(`✓ Created project '${title}':`, project.publicId);

      const createdFiles = [] as { id: string; publicId: string; name: string }[];

      for (const fileName of imageFiles) {
        const ext = fileName.split(".").pop()?.toLowerCase();
        const mimeType = (ext && mimeTypeMap[ext]) || "image/png";
        const stats = fs.statSync(path.join(imagesDir, fileName));
        const objectPath = `/images/${fileName}`;

        const [file] = await db
          .insert(files)
          .values({
            projectId: project.id,
            name: fileName,
            originalName: fileName,
            mimeType,
            size: String(stats.size),
            objectPath,
          })
          .returning();
        console.log("  ✓ Created file:", file.publicId, "=>", objectPath);
        createdFiles.push({ id: file.id, publicId: file.publicId!, name: fileName });
      }

      // Seed comments on the first file to demonstrate pins & threads
      const firstFile = createdFiles[0];
      const [rootComment] = await db
        .insert(comments)
        .values({
          fileId: firstFile.id,
          parentId: null,
          name: clientName,
          email: `${clientName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
          content: `Initial feedback on ${title} main shot`,
          tag: "To Do",
          positionX: 5000,
          positionY: 5000,
        })
        .returning();
      console.log("  ✓ Root comment (center):", rootComment.id);

      const [threadedReply] = await db
        .insert(comments)
        .values({
          fileId: firstFile.id,
          parentId: rootComment.id,
          name: "Provider",
          email: "provider@example.com",
          content: "Thanks, I'll incorporate this into the next revision.",
          tag: "In Progress",
        })
        .returning();
      console.log("  ✓ Reply to root:", threadedReply.id);

      return { project, files: createdFiles, rootComment };
    };

    // --- User 1: Mario-only projects ---
    const marioUser = await createUserIfNotExists("mario-designer", "demo-password");
    const marioImages = getImagesByPrefix("mario_");
    const marioData = await createProjectWithFilesAndComments(
      marioUser.id,
      "Mario Feedback Board",
      marioImages,
      "Mario Client",
    );

    // --- User 2: Sonic & Vanitas projects ---
    const multiUser = await createUserIfNotExists("client-two", "demo-password");
    const sonicImages = getImagesByPrefix("sonic_");
    const vanitasImages = getImagesByPrefix("vanitas_");

    const sonicData = await createProjectWithFilesAndComments(
      multiUser.id,
      "Sonic Campaign",
      sonicImages,
      "Sonic Client",
    );

    const vanitasData = await createProjectWithFilesAndComments(
      multiUser.id,
      "Vanitas Lookbook",
      vanitasImages,
      "Vanitas Client",
    );

    console.log("\n✅ Seed complete!");
    if (marioData) {
      console.log(
        `Mario project: ${marioData.project.publicId} (files: ${marioData.files
          .map((f) => f.publicId)
          .join(", ")})`,
      );
    }
    if (sonicData) {
      console.log(
        `Sonic project: ${sonicData.project.publicId} (files: ${sonicData.files
          .map((f) => f.publicId)
          .join(", ")})`,
      );
    }
    if (vanitasData) {
      console.log(
        `Vanitas project: ${vanitasData.project.publicId} (files: ${vanitasData.files
          .map((f) => f.publicId)
          .join(", ")})`,
      );
    }
  } catch (err: any) {
    console.error("❌ Seeding error:", err?.message ?? err);
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

seed().catch(console.error);
