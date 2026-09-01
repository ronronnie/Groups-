"use client";

import { LoaderCircle, LockKeyhole, Save } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { OwnerCareerProfile } from "@/server/profiles/service";
import { saveCareerProfileAction } from "@/server/profiles/actions";

const initialState = { error: null as string | null };

const fieldClass = "space-y-2";
const labelClass = "font-secondary text-sm font-bold";
const helpClass = "font-secondary text-xs leading-5 text-muted-foreground";
const selectClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25";

function CheckboxField({
  defaultChecked,
  label,
  name,
}: Readonly<{ defaultChecked: boolean; label: string; name: string }>) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-3 font-secondary text-sm">
      <input
        className="size-4 accent-[var(--brand)]"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
      />
      {label}
    </label>
  );
}

export function CareerProfileForm({
  profile,
  submitLabel = "Save profile",
}: Readonly<{
  profile: OwnerCareerProfile;
  submitLabel?: string;
}>) {
  const [state, formAction, pending] = useActionState(
    saveCareerProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-10">
      <section aria-labelledby="public-profile-heading" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold" id="public-profile-heading">
            Public career summary
          </h2>
          <p className="mt-1 font-secondary text-sm leading-6 text-muted-foreground">
            These details can appear to people allowed by your visibility
            settings.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="displayName">
              Display name
            </label>
            <Input
              autoComplete="name"
              defaultValue={profile.displayName}
              id="displayName"
              maxLength={80}
              minLength={2}
              name="displayName"
              required
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="headline">
              Headline
            </label>
            <Input
              defaultValue={profile.headline}
              id="headline"
              maxLength={140}
              minLength={5}
              name="headline"
              placeholder="Product designer focused on useful AI"
              required
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="currentRole">
              Current role
            </label>
            <Input
              autoComplete="organization-title"
              defaultValue={profile.currentRole}
              id="currentRole"
              maxLength={100}
              minLength={2}
              name="currentRole"
              required
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="currentCompany">
              Company <span className="font-normal">(optional)</span>
            </label>
            <Input
              autoComplete="organization"
              defaultValue={profile.currentCompany ?? ""}
              id="currentCompany"
              maxLength={100}
              name="currentCompany"
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="yearsExperience">
              Years of experience
            </label>
            <Input
              defaultValue={profile.yearsExperience}
              id="yearsExperience"
              max={80}
              min={0}
              name="yearsExperience"
              required
              type="number"
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="location">
              Current location
            </label>
            <Input
              autoComplete="address-level2"
              defaultValue={profile.location}
              id="location"
              maxLength={120}
              minLength={2}
              name="location"
              placeholder="Bengaluru, India"
              required
            />
          </div>
        </div>

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="skills">
            Skills
          </label>
          <Input
            defaultValue={profile.skills.join(", ")}
            id="skills"
            name="skills"
            placeholder="Product design, research, prototyping"
            required
          />
          <p className={helpClass}>Separate skills with commas.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="portfolioUrl">
              Portfolio URL
            </label>
            <Input
              defaultValue={profile.portfolioUrl ?? ""}
              id="portfolioUrl"
              name="portfolioUrl"
              placeholder="https://"
              type="url"
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="linkedinUrl">
              LinkedIn URL
            </label>
            <Input
              defaultValue={profile.linkedinUrl ?? ""}
              id="linkedinUrl"
              name="linkedinUrl"
              placeholder="https://"
              type="url"
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="websiteUrl">
              Website URL
            </label>
            <Input
              defaultValue={profile.websiteUrl ?? ""}
              id="websiteUrl"
              name="websiteUrl"
              placeholder="https://"
              type="url"
            />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="private-profile-heading"
        className="border-l-4 border-brand bg-surface-subtle p-5 sm:p-6"
      >
        <div className="flex gap-3">
          <LockKeyhole aria-hidden="true" className="mt-1 size-5 shrink-0" />
          <div>
            <h2 className="text-2xl font-bold" id="private-profile-heading">
              Private matching preferences
            </h2>
            <p className="mt-1 font-secondary text-sm leading-6 text-muted-foreground">
              Only you and secure matching services can use this information. It
              never appears in your member profile.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="desiredRoles">
              Desired roles
            </label>
            <Input
              defaultValue={profile.desiredRoles.join(", ")}
              id="desiredRoles"
              name="desiredRoles"
              placeholder="Senior product designer, design lead"
              required
            />
            <p className={helpClass}>Separate roles with commas.</p>
          </div>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="preferredLocations">
              Preferred locations
            </label>
            <Input
              defaultValue={profile.preferredLocations.join(", ")}
              id="preferredLocations"
              name="preferredLocations"
              placeholder="Bengaluru, Remote"
              required
            />
            <p className={helpClass}>Separate locations with commas.</p>
          </div>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="remotePreference">
              Work preference
            </label>
            <select
              className={selectClass}
              defaultValue={profile.remotePreference}
              id="remotePreference"
              name="remotePreference"
            >
              <option value="flexible">Flexible</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="resumeUrl">
              Resume URL <span className="font-normal">(optional)</span>
            </label>
            <Input
              defaultValue={profile.resumeUrl ?? ""}
              id="resumeUrl"
              name="resumeUrl"
              placeholder="https://"
              type="url"
            />
          </div>
        </div>
        <div className={`${fieldClass} mt-5`}>
          <label className={labelClass} htmlFor="privateNotes">
            Private notes <span className="font-normal">(optional)</span>
          </label>
          <Textarea
            defaultValue={profile.privateNotes ?? ""}
            id="privateNotes"
            maxLength={2000}
            name="privateNotes"
            placeholder="Industries, constraints, salary expectations, or anything else matching should consider."
          />
        </div>
      </section>

      <section aria-labelledby="privacy-heading" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold" id="privacy-heading">
            Visibility and privacy
          </h2>
          <p className="mt-1 font-secondary text-sm leading-6 text-muted-foreground">
            Access is enforced by the server. Hidden fields stay out of member
            profile responses.
          </p>
        </div>
        <fieldset className="space-y-2">
          <legend className={labelClass}>Who can view your profile?</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["private", "Only me"],
              ["groups", "My groups"],
              ["public", "Anyone signed in"],
            ].map(([value, label]) => (
              <label
                className="flex cursor-pointer items-center gap-3 rounded-md border bg-surface p-3 font-secondary text-sm"
                key={value}
              >
                <input
                  className="size-4 accent-[var(--brand)]"
                  defaultChecked={profile.visibility === value}
                  name="visibility"
                  type="radio"
                  value={value}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className={labelClass}>Details others can see</legend>
          <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
            <CheckboxField
              defaultChecked={profile.privacySettings.showCurrentCompany}
              label="Current company"
              name="showCurrentCompany"
            />
            <CheckboxField
              defaultChecked={profile.privacySettings.showYearsExperience}
              label="Years of experience"
              name="showYearsExperience"
            />
            <CheckboxField
              defaultChecked={profile.privacySettings.showLocation}
              label="Current location"
              name="showLocation"
            />
            <CheckboxField
              defaultChecked={profile.privacySettings.showSkills}
              label="Skills"
              name="showSkills"
            />
          </div>
        </fieldset>
      </section>

      {state.error ? (
        <p aria-live="polite" className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button disabled={pending} size="lg" type="submit" variant="brand">
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Save aria-hidden="true" className="size-4" />
        )}
        {submitLabel}
      </Button>
    </form>
  );
}
