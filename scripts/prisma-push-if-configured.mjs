#!/usr/bin/env node
/**
 * Run `prisma db push` only when DATABASE_URL is configured.
 * Lets the Vercel build succeed before env vars are set, while keeping
 * schema-sync automatic once they are.
 */
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn(
    "[prisma-push-if-configured] DATABASE_URL not set - skipping `prisma db push`. " +
      "The app will fail at runtime until a database is configured."
  );
  process.exit(0);
}

const result = spawnSync(
  "pnpm",
  ["exec", "prisma", "db", "push", "--skip-generate"],
  { stdio: "inherit" }
);

process.exit(result.status ?? 1);
