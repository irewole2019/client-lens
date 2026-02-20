import type { Express } from "express";

import { storage } from "../storage";
import { insertProjectSchema } from "@shared/schema";
import { getCurrentUserId } from "./helpers";

export function registerProjectRoutes(app: Express) {
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
}
