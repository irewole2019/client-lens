import "dotenv/config";
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
    // 1. Create or retrieve hardcoded user (matches default userId in routes)
    const username = "user-1";
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    let user: any = existingUser;
    if (!user) {
      const [insertedUser] = await db
        .insert(users)
        .values({ username, password: "demo-password" })
        .returning();
      user = insertedUser;
      console.log("✓ Created demo user:", user.id);
    } else {
      console.log("✓ Demo user already exists:", user.id);
    }

    // 2. Create demo project
    const [insertedProject] = await db
      .insert(projects)
      .values({ title: "Demo Project", userId: user.id })
      .returning();
    console.log("✓ Created demo project:", insertedProject.publicId);

    // 3. Create demo image file
    const [insertedFile] = await db
      .insert(files)
      .values({
        projectId: insertedProject.id,
        name: "Demo Image",
        originalName: "demo.png",
        mimeType: "image/png",
        size: "123456",
        objectPath: "https://via.placeholder.com/1200x800.png",
      })
      .returning();
    console.log("✓ Created demo file:", insertedFile.publicId);

    // 4. Create root comments at different pin locations
    const [rootComment] = await db
      .insert(comments)
      .values({
        fileId: insertedFile.id,
        parentId: null,
        name: "Client Demo",
        email: "client@example.com",
        content: "This is a demo comment pinned near the center.",
        tag: "To Do",
        positionX: 5000,
        positionY: 5000,
      })
      .returning();
    console.log("✓ Created root comment #1 (center):", rootComment.id);

    // Create threaded reply to first comment
    const [threadedReply] = await db
      .insert(comments)
      .values({
        fileId: insertedFile.id,
        parentId: rootComment.id,
        name: "Provider Response",
        email: "provider@example.com",
        content: "Got it! I'll adjust the design based on this feedback.",
        tag: "In Progress",
      })
      .returning();
    console.log("✓ Created threaded reply to #1:", threadedReply.id);

    const [secondRootComment] = await db
      .insert(comments)
      .values({
        fileId: insertedFile.id,
        parentId: null,
        name: "Alice Johnson",
        email: "alice@client.com",
        content: "Love the layout! Can we make the header a bit taller?",
        tag: "To Do",
        positionX: 2000,
        positionY: 1500,
      })
      .returning();
    console.log("✓ Created root comment #2 (top-left):", secondRootComment.id);

    // Create threaded reply to second comment
    const [secondThreadedReply] = await db
      .insert(comments)
      .values({
        fileId: insertedFile.id,
        parentId: secondRootComment.id,
        name: "Bob Designer",
        email: "bob@provider.com",
        content: "Sure, I can increase the header height. Will update in the next version.",
        tag: "In Progress",
      })
      .returning();
    console.log("✓ Created threaded reply to #2:", secondThreadedReply.id);

    console.log("\n✅ Seed complete!");
    console.log(`Project: ${insertedProject.publicId}`);
    console.log(`File: ${insertedFile.publicId}`);
    console.log(`Root comments: ${rootComment.id}, ${secondRootComment.id}`);
  } catch (err: any) {
    console.error("❌ Seeding error:", err?.message ?? err);
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

seed().catch(console.error);
