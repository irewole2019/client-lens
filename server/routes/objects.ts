import type { Express } from "express";

import { ObjectNotFoundError, type ObjectStorageService } from "../objectStorage";

export function registerObjectRoutes(app: Express, objectStorageService: ObjectStorageService) {
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
    } catch (error: any) {
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
}
