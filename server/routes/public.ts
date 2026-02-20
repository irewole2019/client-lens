import type { Express } from "express";

import { storage } from "../storage";

export function registerPublicApiRoutes(app: Express) {
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
          title: project.title,
        },
      });
    } catch (error) {
      console.error("Error fetching public file:", error);
      res.status(500).json({ error: "Failed to fetch file" });
    }
  });
}
