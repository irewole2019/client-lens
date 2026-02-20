import type { Express } from "express";

import { pushToGitHub } from "../github-utils";

export function registerGitHubRoutes(app: Express) {
  app.post("/api/github/push", async (req, res) => {
    try {
      const result = await pushToGitHub();
      res.json(result);
    } catch (error: any) {
      console.error("Error pushing to GitHub:", error);
      res.status(500).json({
        error: "Failed to push to GitHub",
        details: error.message,
      });
    }
  });
}
