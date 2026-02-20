import type { Express } from "express";
import fs from "fs";
import path from "path";

export function registerLocalUploadsRoutes(app: Express) {
  // Local upload fallback (development only)
  // Allows uploading images without Replit Object Storage env vars.
  const localUploadsDir = path.resolve(import.meta.dirname, "..", "..", ".local-uploads");
  const ensureLocalUploadsDir = async () => {
    await fs.promises.mkdir(localUploadsDir, { recursive: true });
  };

  app.put("/api/local-uploads/:id", async (req, res) => {
    if ((process.env.NODE_ENV || "development") !== "development") {
      return res.status(404).json({ error: "Not found" });
    }

    const id = req.params.id;
    const contentType = String(req.headers["content-type"] || "application/octet-stream");

    // MVP: images only
    if (!contentType.startsWith("image/")) {
      return res.status(400).json({ error: "Only image uploads are supported" });
    }

    // 10MB limit (matches frontend)
    const maxBytes = 10 * 1024 * 1024;
    let totalBytes = 0;

    await ensureLocalUploadsDir();
    const dataPath = path.join(localUploadsDir, `${id}.bin`);
    const metaPath = path.join(localUploadsDir, `${id}.json`);

    const writeStream = fs.createWriteStream(dataPath);
    let aborted = false;
    let responded = false;

    const respondOnce = (status: number, body?: any) => {
      if (responded) return;
      responded = true;
      if (body === undefined) {
        res.sendStatus(status);
      } else {
        res.status(status).json(body);
      }
    };

    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes && !aborted) {
        aborted = true;
        req.destroy();
        writeStream.destroy(new Error("File too large"));
      }
    });

    req.on("aborted", () => {
      aborted = true;
    });

    req.on("error", async () => {
      aborted = true;
      try {
        await fs.promises.unlink(dataPath);
      } catch {
        // ignore
      }
      respondOnce(500, { error: "Upload failed" });
    });

    req.on("close", async () => {
      // If the client disconnects mid-upload, clean up.
      if (!responded && aborted) {
        try {
          await fs.promises.unlink(dataPath);
        } catch {
          // ignore
        }
        respondOnce(400, { error: "Upload aborted" });
      }
    });

    writeStream.on("error", async (err) => {
      try {
        await fs.promises.unlink(dataPath);
      } catch {
        // ignore
      }

      if (String(err?.message || "").includes("File too large")) {
        respondOnce(413, { error: "File too large (max 10MB)" });
      } else {
        respondOnce(500, { error: "Upload failed" });
      }
    });

    req.pipe(writeStream);

    writeStream.on("finish", async () => {
      if (aborted) {
        try {
          await fs.promises.unlink(dataPath);
        } catch {
          // ignore
        }

        if (!responded) {
          respondOnce(400, { error: "Upload aborted" });
        }
        return;
      }

      await fs.promises.writeFile(
        metaPath,
        JSON.stringify(
          {
            contentType,
            size: totalBytes,
            uploadedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
        "utf-8",
      );

      respondOnce(200, { ok: true, objectPath: `/api/local-uploads/${id}` });
    });
  });

  app.get("/api/local-uploads/:id", async (req, res) => {
    if ((process.env.NODE_ENV || "development") !== "development") {
      return res.status(404).json({ error: "Not found" });
    }

    const id = req.params.id;
    const dataPath = path.join(localUploadsDir, `${id}.bin`);
    const metaPath = path.join(localUploadsDir, `${id}.json`);

    try {
      const metaRaw = await fs.promises.readFile(metaPath, "utf-8");
      const meta = JSON.parse(metaRaw) as { contentType?: string; size?: number };

      if (!fs.existsSync(dataPath)) {
        return res.sendStatus(404);
      }

      res.setHeader("Content-Type", meta.contentType || "application/octet-stream");
      if (typeof meta.size === "number") {
        res.setHeader("Content-Length", String(meta.size));
      }
      res.setHeader("Cache-Control", "no-store");

      fs.createReadStream(dataPath).pipe(res);
    } catch (error) {
      return res.sendStatus(404);
    }
  });
}
