import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { isSupabaseAdminConfigured } from "@/server/utils/env";
import { getEnv } from "@/server/utils/env";
import { isMockMode } from "@/server/utils/feature-flags";

const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600;
const DEFAULT_MAX_UPLOAD_MB = 10;

const allowedImageTypes: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type MediaConfig = {
  bucket: string | null;
  signedUrlTtlSeconds: number;
  maxUploadBytes: number;
  maxUploadMb: number;
};

export type MediaItem =
  | {
      kind: "image";
      source: "url";
      url: string;
      mime?: string | null;
      size?: number | null;
    }
  | {
      kind: "image";
      source: "storage";
      bucket: string;
      path: string;
      mime?: string | null;
      size?: number | null;
    };

export type UploadResult = {
  bucket: string;
  path: string;
  previewUrl: string;
  mime?: string | null;
  size?: number | null;
};

export class MediaError extends Error {
  cause: string;
  nextAction: string;
  status: number;

  constructor(cause: string, nextAction: string, status = 400) {
    super(cause);
    this.cause = cause;
    this.nextAction = nextAction;
    this.status = status;
  }
}

export function isMediaError(error: unknown): error is MediaError {
  return error instanceof MediaError;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function getMediaConfig(): MediaConfig {
  const env = getEnv();
  const bucket = env.SUPABASE_STORAGE_BUCKET?.trim() || null;
  const signedUrlTtlSeconds = parsePositiveInt(
    env.MEDIA_SIGNED_URL_TTL_SECONDS,
    DEFAULT_SIGNED_URL_TTL_SECONDS
  );
  const maxUploadMb = parsePositiveInt(env.MAX_UPLOAD_MB, DEFAULT_MAX_UPLOAD_MB);
  const maxUploadBytes = maxUploadMb * 1024 * 1024;

  return { bucket, signedUrlTtlSeconds, maxUploadBytes, maxUploadMb };
}

export function isStorageConfigured(): boolean {
  const config = getMediaConfig();
  return Boolean(config.bucket && isSupabaseAdminConfigured());
}

export function buildLocationMediaPath(params: {
  organizationId: string;
  locationId: string;
  extension: string;
}): string {
  return `org/${params.organizationId}/loc/${params.locationId}/${crypto.randomUUID()}.${params.extension}`;
}

export function isLocationMediaPath(
  path: string,
  organizationId: string,
  locationId: string
): boolean {
  return path.startsWith(`org/${organizationId}/loc/${locationId}/`);
}

export function buildStorageReference(bucket: string, path: string): string {
  return `storage://${bucket}/${path}`;
}

export function parseStorageReference(value: string): {
  bucket: string;
  path: string;
} | null {
  if (!value.startsWith("storage://")) return null;
  const raw = value.replace("storage://", "");
  const [bucket, ...parts] = raw.split("/");
  if (!bucket || parts.length === 0) return null;
  return { bucket, path: parts.join("/") };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeMediaEntry(entry: unknown): MediaItem | null {
  if (typeof entry === "string") {
    const storageRef = parseStorageReference(entry);
    if (storageRef) {
      return {
        kind: "image",
        source: "storage",
        bucket: storageRef.bucket,
        path: storageRef.path,
      };
    }
    if (isHttpUrl(entry) || entry.startsWith("/")) {
      return { kind: "image", source: "url", url: entry };
    }
    return null;
  }

  if (!entry || typeof entry !== "object") return null;
  const record = entry as Record<string, unknown>;

  if (
    record.kind === "image" &&
    record.source === "url" &&
    typeof record.url === "string"
  ) {
    return {
      kind: "image",
      source: "url",
      url: record.url,
      mime: typeof record.mime === "string" ? record.mime : null,
      size: typeof record.size === "number" ? record.size : null,
    };
  }

  if (
    record.kind === "image" &&
    record.source === "storage" &&
    typeof record.bucket === "string" &&
    typeof record.path === "string"
  ) {
    return {
      kind: "image",
      source: "storage",
      bucket: record.bucket,
      path: record.path,
      mime: typeof record.mime === "string" ? record.mime : null,
      size: typeof record.size === "number" ? record.size : null,
    };
  }

  if (typeof record.bucket === "string" && typeof record.path === "string") {
    return {
      kind: "image",
      source: "storage",
      bucket: record.bucket,
      path: record.path,
      mime: typeof record.mime === "string" ? record.mime : null,
      size: typeof record.size === "number" ? record.size : null,
    };
  }

  if (typeof record.url === "string") {
    return {
      kind: "image",
      source: "url",
      url: record.url,
      mime: typeof record.mime === "string" ? record.mime : null,
      size: typeof record.size === "number" ? record.size : null,
    };
  }

  return null;
}

export function normalizeMediaEntries(input: unknown): MediaItem[] {
  if (!input) return [];
  const entries = Array.isArray(input) ? input : [input];
  return entries
    .map((entry) => normalizeMediaEntry(entry))
    .filter((item): item is MediaItem => Boolean(item));
}

export function validateImageFile(file: File, maxBytes: number) {
  if (!file.type || !file.type.startsWith("image/")) {
    throw new MediaError(
      "画像ファイル以外はアップロードできません。",
      "PNG/JPEG/WebP/GIFの画像を選択してください。"
    );
  }

  const extension = allowedImageTypes[file.type];
  if (!extension) {
    throw new MediaError(
      "対応していない画像形式です。",
      "PNG/JPEG/WebP/GIFの画像を選択してください。"
    );
  }

  if (file.size > maxBytes) {
    throw new MediaError(
      "画像サイズが上限を超えています。",
      `最大${Math.ceil(maxBytes / 1024 / 1024)}MB以内でアップロードしてください。`
    );
  }

  return extension;
}

export async function createSignedImageUrl(
  bucket: string,
  path: string,
  ttlSeconds: number
): Promise<string> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new MediaError(
      "署名URLの発行に失敗しました。",
      "Supabaseのサービスキー設定を確認してください。",
      500
    );
  }

  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new MediaError(
      "署名URLの発行に失敗しました。",
      "Storageのバケット設定とファイルパスを確認してください。",
      500
    );
  }

  return data.signedUrl;
}

export async function createSignedImageUrlForPath(
  path: string,
  ttlSeconds?: number
): Promise<{ bucket: string; signedUrl: string }> {
  const config = getMediaConfig();
  if (!config.bucket) {
    throw new MediaError(
      "画像アップロードの設定が未完了です。",
      "Supabase Storageのバケット設定を確認してください。"
    );
  }

  const signedUrl = await createSignedImageUrl(
    config.bucket,
    path,
    ttlSeconds ?? config.signedUrlTtlSeconds
  );

  return { bucket: config.bucket, signedUrl };
}

export async function uploadImageForLocation(params: {
  organizationId: string;
  locationId: string;
  file: File;
}): Promise<UploadResult> {
  const config = getMediaConfig();

  if (isMockMode() && !isStorageConfigured()) {
    return {
      bucket: "mock",
      path: `org/${params.organizationId}/loc/${params.locationId}/mock.png`,
      previewUrl: "/fixtures/mock-upload.png",
      mime: params.file.type,
      size: params.file.size,
    };
  }

  if (!config.bucket || !isSupabaseAdminConfigured()) {
    throw new MediaError(
      "画像アップロードの設定が未完了です。",
      "Supabase Storageのバケット作成とサービスキー設定を確認してください。"
    );
  }

  const extension = validateImageFile(params.file, config.maxUploadBytes);
  const path = buildLocationMediaPath({
    organizationId: params.organizationId,
    locationId: params.locationId,
    extension,
  });

  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new MediaError(
      "アップロードに失敗しました。",
      "Supabaseの設定を確認してください。",
      500
    );
  }

  const { error } = await admin.storage
    .from(config.bucket)
    .upload(path, params.file, {
      contentType: params.file.type,
      upsert: false,
    });
  if (error) {
    throw new MediaError(
      "アップロードに失敗しました。",
      "バケット権限とファイルサイズを確認してください。",
      500
    );
  }

  const previewUrl = await createSignedImageUrl(
    config.bucket,
    path,
    config.signedUrlTtlSeconds
  );

  return {
    bucket: config.bucket,
    path,
    previewUrl,
    mime: params.file.type,
    size: params.file.size,
  };
}
