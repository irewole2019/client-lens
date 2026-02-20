import type { Express } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db";
import { storage } from "../storage";
import { generateMagicToken, hashMagicToken, magicLinkExpiryDate } from "../auth";
import { sendEmail } from "../email";
import { magicLinks, users } from "@shared/schema";
import { buildAppBaseUrl } from "./helpers";

export function registerAuthRoutes(app: Express) {
  const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
  });

  const registerSchema = z.object({
    username: z.string().trim().min(2).max(50),
    email: z.string().trim().toLowerCase().email(),
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.json({ user: null });
      const user = await storage.getUser(userId);
      if (!user) return res.json({ user: null });
      return res.json({
        user: { id: user.id, username: user.username, email: user.email },
      });
    } catch (error) {
      console.error("Error fetching current user:", error);
      return res.status(500).json({ error: "Failed to fetch current user" });
    }
  });

  app.post("/api/auth/login-link", async (req, res) => {
    try {
      const { email } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      // Respond generically to avoid email enumeration.
      if (!user) {
        return res.json({ ok: true });
      }

      const token = generateMagicToken();
      const tokenHash = hashMagicToken(token);
      const expiresAt = magicLinkExpiryDate(15);

      await db.insert(magicLinks).values({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const baseUrl = buildAppBaseUrl(req);
      const url = `${baseUrl}/api/auth/callback?token=${encodeURIComponent(token)}`;

      await sendEmail({
        to: email,
        subject: "Your Client Lens sign-in link",
        text: `Click to sign in:\n\n${url}\n\nThis link expires in 15 minutes.`,
      });

      return res.json({ ok: true });
    } catch (error) {
      console.error("Error creating login link:", error);
      return res.status(500).json({ error: "Failed to create login link" });
    }
  });

  app.post("/api/auth/register-link", async (req, res) => {
    try {
      const { username, email } = registerSchema.parse(req.body);

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }

      const user = await storage.createUser({ username, email });

      const token = generateMagicToken();
      const tokenHash = hashMagicToken(token);
      const expiresAt = magicLinkExpiryDate(15);

      await db.insert(magicLinks).values({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const baseUrl = buildAppBaseUrl(req);
      const url = `${baseUrl}/api/auth/callback?token=${encodeURIComponent(token)}`;

      await sendEmail({
        to: email,
        subject: "Finish creating your Client Lens account",
        text: `Click to finish signing up:\n\n${url}\n\nThis link expires in 15 minutes.`,
      });

      return res.status(201).json({ ok: true });
    } catch (error) {
      console.error("Error creating register link:", error);
      return res.status(500).json({ error: "Failed to create register link" });
    }
  });

  app.get("/api/auth/callback", async (req, res) => {
    try {
      const token = String(req.query.token || "");
      if (!token) {
        return res.status(400).send("Missing token");
      }

      const tokenHash = hashMagicToken(token);
      const now = new Date();

      const [link] = await db
        .select()
        .from(magicLinks)
        .where(
          and(
            eq(magicLinks.tokenHash, tokenHash),
            isNull(magicLinks.consumedAt),
            gt(magicLinks.expiresAt, now),
          ),
        );

      if (!link) {
        return res.status(400).send("Invalid or expired link");
      }

      const [user] = await db.select().from(users).where(eq(users.id, link.userId));
      if (!user) {
        return res.status(400).send("User not found");
      }

      await db.update(magicLinks).set({ consumedAt: now }).where(eq(magicLinks.id, link.id));

      if (!user.emailVerifiedAt) {
        await db.update(users).set({ emailVerifiedAt: now }).where(eq(users.id, user.id));
      }

      req.session.userId = user.id;

      return res.redirect("/projects");
    } catch (error) {
      console.error("Error consuming magic link:", error);
      return res.status(500).send("Failed to sign in");
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).json({ error: "Failed to logout" });
        }
        res.clearCookie("connect.sid");
        return res.json({ ok: true });
      });
    } catch (error) {
      console.error("Error logging out:", error);
      return res.status(500).json({ error: "Failed to logout" });
    }
  });
}
