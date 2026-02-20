import type { Express } from "express";

import { storage } from "../storage";
import { insertFolderSchema } from "@shared/schema";
import { getCurrentUserId } from "./helpers";

export function registerFolderRoutes(app: Express) {
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
}
