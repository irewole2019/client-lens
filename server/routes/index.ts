import type { Express } from "express";
import { createServer, type Server } from "http";

import { ObjectStorageService } from "../objectStorage";

import { registerAuthRoutes } from "./auth";
import { registerLocalUploadsRoutes } from "./localUploads";
import { registerObjectRoutes } from "./objects";
import { registerPublicApiRoutes } from "./public";
import { registerFolderRoutes } from "./folders";
import { registerProjectRoutes } from "./projects";
import { registerFileRoutes } from "./files";
import { registerCommentRoutes } from "./comments";
import { registerGitHubRoutes } from "./github";

export async function registerRoutes(app: Express): Promise<Server> {
  const objectStorageService = new ObjectStorageService();

  // Keep route registration order predictable.
  registerAuthRoutes(app);
  registerLocalUploadsRoutes(app);
  registerObjectRoutes(app, objectStorageService);
  registerPublicApiRoutes(app);
  registerFolderRoutes(app);
  registerProjectRoutes(app);
  registerFileRoutes(app, objectStorageService);
  registerCommentRoutes(app);
  registerGitHubRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
