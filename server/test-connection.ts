import "dotenv/config";
import { pool } from "./db";

(async () => {
  try {
    console.log("Using DATABASE_URL:", Boolean(process.env.DATABASE_URL));
    const res: any = await pool.query("SELECT NOW() AS now");
    // some drivers return rows, others return result object
    const rows = res.rows ?? res;
    console.log("DB connection successful:", rows);
    process.exit(0);
  } catch (err: any) {
    console.error("DB connection failed:", err?.message ?? err);
    process.exit(1);
  } finally {
    try {
      await pool.end();
    } catch (_) {
      // ignore
    }
  }
})();
