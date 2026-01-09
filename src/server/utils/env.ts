import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  APP_BASE_URL: z.string().url().optional(),
  SYSTEM_ADMIN_EMAIL: z.string().email().optional(),
  SYSTEM_ADMIN_PASSWORD: z.string().optional(),
  YAHOO_PLACE_ENABLED: z.string().optional(),
  APPLE_BUSINESS_CONNECT_ENABLED: z.string().optional(),
  PROVIDER_MOCK_MODE: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_REDIRECT_URI: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().optional(),
  MEDIA_SIGNED_URL_TTL_SECONDS: z.string().optional(),
  MAX_UPLOAD_MB: z.string().optional(),
  BING_MAPS_KEY: z.string().optional(),
  YAHOO_YOLP_APP_ID: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`環境変数が不正です: ${issues}`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}

export function resetEnvForTests() {
  cachedEnv = null;
}

export function envBool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

export function isSupabaseConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isSupabaseAdminConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}
