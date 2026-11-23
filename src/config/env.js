const { z } = require("zod");
const dotenv = require("dotenv");

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  ADMIN_JWT_EXPIRES_IN: z.string().default("8h"),
  FRONTEND_URL: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((url) => url.trim().replace(/\/+$/, ""))
        .filter(Boolean),
    )
    .pipe(z.array(z.string().url()).min(1)),
  // Public storefront URL used in emails (password reset links). Falls back to
  // the first FRONTEND_URL entry.
  SITE_URL: z.string().url().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  // Who is emailed when an order is placed: one or more addresses separated by
  // commas (for example the shop owner's Gmail). Falls back to ADMIN_EMAIL.
  ORDER_NOTIFY_EMAILS: z
    .string()
    .optional()
    .transform((value) =>
      (value || "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().email())),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_NAME: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM_NAME: z.string().default("Yuricart"),
  // Must be on a domain verified in Resend (noumandev.com).
  EMAIL_FROM_ADDRESS: z.string().default("noreply@noumandev.com"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

module.exports = { env };
