import { z } from "zod";

export const profileVisibilitySchema = z.enum(["private", "groups", "public"]);
export const remotePreferenceSchema = z.enum([
  "remote",
  "hybrid",
  "onsite",
  "flexible",
]);

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(maximum).nullable(),
  );

const optionalHttpUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .url("Enter a valid URL.")
    .max(500)
    .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
      message: "URL must use http or https.",
    })
    .nullable(),
);

const normalizedList = (label: string, maximumItems: number) =>
  z
    .array(z.string().trim().min(1).max(60))
    .max(maximumItems, `${label} can contain at most ${maximumItems} items.`)
    .transform((items) => [
      ...new Map(items.map((item) => [item.toLowerCase(), item])).values(),
    ]);

export const profilePrivacySettingsSchema = z.object({
  showCurrentCompany: z.boolean(),
  showLocation: z.boolean(),
  showSkills: z.boolean(),
  showYearsExperience: z.boolean(),
});

export const careerProfileInputSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  headline: z.string().trim().min(5).max(140),
  currentRole: z.string().trim().min(2).max(100),
  currentCompany: optionalText(100),
  yearsExperience: z.coerce.number().int().min(0).max(80),
  location: z.string().trim().min(2).max(120),
  skills: normalizedList("Skills", 20).pipe(z.array(z.string()).min(1)),
  desiredRoles: normalizedList("Desired roles", 10).pipe(
    z.array(z.string()).min(1),
  ),
  preferredLocations: normalizedList("Preferred locations", 10).pipe(
    z.array(z.string()).min(1),
  ),
  remotePreference: remotePreferenceSchema,
  resumeUrl: optionalHttpUrl,
  portfolioUrl: optionalHttpUrl,
  linkedinUrl: optionalHttpUrl,
  websiteUrl: optionalHttpUrl,
  privateNotes: optionalText(2_000),
  visibility: profileVisibilitySchema,
  privacySettings: profilePrivacySettingsSchema,
});

export type CareerProfileInput = z.infer<typeof careerProfileInputSchema>;
export type ProfilePrivacySettings = z.infer<
  typeof profilePrivacySettingsSchema
>;
export type ProfileVisibility = z.infer<typeof profileVisibilitySchema>;
export type RemotePreference = z.infer<typeof remotePreferenceSchema>;

export function calculateProfileCompleteness(
  profile: Pick<
    CareerProfileInput,
    | "displayName"
    | "headline"
    | "currentRole"
    | "yearsExperience"
    | "location"
    | "skills"
    | "desiredRoles"
    | "preferredLocations"
    | "remotePreference"
  >,
) {
  const checks = [
    [profile.displayName.length > 0, 10],
    [profile.headline.length > 0, 10],
    [profile.currentRole.length > 0, 15],
    [Number.isInteger(profile.yearsExperience), 10],
    [profile.location.length > 0, 10],
    [profile.skills.length > 0, 15],
    [profile.desiredRoles.length > 0, 15],
    [profile.preferredLocations.length > 0, 10],
    [Boolean(profile.remotePreference), 5],
  ] as const;

  return checks.reduce(
    (total, [complete, weight]) => total + (complete ? weight : 0),
    0,
  );
}

export function parseCommaSeparatedList(value: unknown) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
