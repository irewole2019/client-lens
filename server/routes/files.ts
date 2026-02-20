import type { Express } from "express";

import type { ObjectStorageService } from "../objectStorage";
import { storage } from "../storage";
import { insertFileSchema } from "@shared/schema";

export function registerFileRoutes(app: Express, objectStorageService: ObjectStorageService) {
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
        objectPath,
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
}
