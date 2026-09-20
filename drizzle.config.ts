import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js met les secrets dans `.env.local` ; drizzle-kit ne le lit pas seul.
config({ path: ".env.local" });

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL(_UNPOOLED) manquant dans .env.local — voir .env.example.",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  casing: "snake_case",
  strict: true,
  verbose: true,
});
