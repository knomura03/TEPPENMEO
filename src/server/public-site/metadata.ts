import { z } from "zod";

const metadataSchema = z.object({
  PUBLIC_OPERATOR_NAME: z.string().trim().min(1).optional(),
  PUBLIC_CONTACT_EMAIL: z.string().trim().email().optional(),
  PUBLIC_CONTACT_URL: z.string().trim().url().optional(),
  PUBLIC_PRIVACY_EFFECTIVE_DATE: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  PUBLIC_TERMS_EFFECTIVE_DATE: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type PublicSiteMetadata = {
  operatorName: string | null;
  contactEmail: string | null;
  contactUrl: string | null;
  privacyEffectiveDate: string | null;
  termsEffectiveDate: string | null;
  invalidKeys: string[];
};

export function getPublicSiteMetadata(): PublicSiteMetadata {
  const parsed = metadataSchema.safeParse(process.env);
  if (!parsed.success) {
    const invalidKeys = parsed.error.issues
      .map((issue) => issue.path[0])
      .filter((key): key is string => typeof key === "string");
    return {
      operatorName: null,
      contactEmail: null,
      contactUrl: null,
      privacyEffectiveDate: null,
      termsEffectiveDate: null,
      invalidKeys,
    };
  }

  const data = parsed.data;
  return {
    operatorName: data.PUBLIC_OPERATOR_NAME ?? null,
    contactEmail: data.PUBLIC_CONTACT_EMAIL ?? null,
    contactUrl: data.PUBLIC_CONTACT_URL ?? null,
    privacyEffectiveDate: data.PUBLIC_PRIVACY_EFFECTIVE_DATE ?? null,
    termsEffectiveDate: data.PUBLIC_TERMS_EFFECTIVE_DATE ?? null,
    invalidKeys: [],
  };
}
