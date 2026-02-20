import crypto from "crypto";

export function generateMagicToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashMagicToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function magicLinkExpiryDate(ttlMinutes: number): Date {
  return new Date(Date.now() + ttlMinutes * 60 * 1000);
}
