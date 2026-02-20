import type { Request } from "express";

export function buildAppBaseUrl(req: Request): string {
  const configured = process.env.APP_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const host = req.get("host");
  const protocol = req.protocol;
  return `${protocol}://${host}`;
}

export function getCurrentUserId(req: Request): string {
  return req.session?.userId || (req.query.userId as string) || "user-1";
}
