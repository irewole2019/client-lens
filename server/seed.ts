import "dotenv/config";
import { db, pool } from "./db";
import { users, projects, files, comments, type InsertUser, type InsertProject, type InsertFile, type InsertComment } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  try {
    // Create demo user if not exists
    const username = "demo";
    const [existingUser] = await db.select().from(users).where(eq(users.username, username));
    let user: any = existingUser;
    if (!user) {
      const [insertedUser] = await db.insert(users).values({ username, password: "demo-password" }).returning();
      user = insertedUser;
      console.log("Inserted demo user", user.id);
    } else {
      console.log("Demo user already exists", user.id);
    }

    // Create demo project
    const projectTitle = "Demo Project";
    const [insertedProject] = await db.insert(projects).values({ title: projectTitle, userId: user.id }).returning();
    console.log("Inserted demo project", insertedProject.id, insertedProject.publicId);

    // Create demo file (image)
    const sampleObjectPath = "https://via.placeholder.com/1200x800.png";
    const [insertedFile] = await db.insert(files).values({
      projectId: insertedProject.id,
      name: "Demo Image",
      originalName: "demo.png",
      mimeType: "image/png",
      size: "123456",
      objectPath: sampleObjectPath,
    }).returning();
    console.log("Inserted demo file", insertedFile.id, insertedFile.publicId);

    // Create a sample root comment pinned roughly center (50%,50% -> stored as 5000)
    const [rootComment] = await db.insert(comments).values({
      fileId: insertedFile.id,
      parentId: null,
      name: "Client Demo",
      email: "client@example.com",
      content: "This is a demo comment pinned near the center.",
      tag: "To Do",
      positionX: 5000,
      positionY: 5000,
    }).returning();
    console.log("Inserted root comment", rootComment.id);

    // Create a threaded reply to the root comment
    const [threadedReply] = await db.insert(comments).values({
      fileId: insertedFile.id,
      parentId: rootComment.id,
      name: "Provider Response",
      email: "provider@example.com",
      content: "Got it! I'll adjust the design based on this feedback.",
      tag: "In Progress",
    }).returning();
    console.log("Inserted threaded reply", threadedReply.id);

    // Create another root comment at a different location (top-left)
    const [secondRootComment] = await db.insert(comments).values({
      fileId: insertedFile.id,
      parentId: null,
      name: "Alice Johnson",
      email: "alice@client.com",
      content: "Love the layout! Can we make the header a bit taller?",
      tag: "To Do",
      positionX: 2000,
      positionY: 1500,
    }).returning();
    console.log("Inserted second root comment", secondRootComment.id);

    // Create another threaded reply
    const [secondThreadedReply] = await db.insert(comments).values({
      fileId: insertedFile.id,
      parentId: secondRootComment.id,
      name: "Bob Designer",
      email: "bob@provider.com",
      content: "Sure, I can increase the header height. Will update in the next version.",
      tag: "In Progress",
    }).returning();
    console.log("Inserted second threaded reply", secondThreadedReply.id);

    console.log(\`\nSeed complete!\nProject public id: ${insertedProject.publicId}\nFile public id: ${insertedFile.publicId}\nRoot comments: ${rootComment.id}, ${secondRootComment.id}\`);
  } catch (err: any) {
    console.error("Seeding error:", err?.message ?? err);
    process.exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch (_) {}
  }
}

seed().catch(console.error);

