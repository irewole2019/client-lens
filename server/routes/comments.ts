import type { Express } from "express";

import { storage } from "../storage";
import { insertCommentSchema } from "@shared/schema";

export function registerCommentRoutes(app: Express) {
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
        return res
          .status(400)
          .json({ error: "Invalid comment data", details: validation.error });
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
        return res
          .status(400)
          .json({ error: "Invalid comment data", details: validation.error });
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
}
