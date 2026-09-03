import {
  BriefcaseBusiness,
  Building2,
  ExternalLink,
  Globe2,
  Link as LinkIcon,
  MapPin,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import type { PublicCareerProfile } from "@/server/profiles/service";

const links = [
  { key: "portfolioUrl", label: "Portfolio", icon: BriefcaseBusiness },
  { key: "linkedinUrl", label: "LinkedIn", icon: LinkIcon },
  { key: "websiteUrl", label: "Website", icon: Globe2 },
] as const;

export function CareerProfileSummary({
  profile,
}: Readonly<{ profile: PublicCareerProfile }>) {
  return (
    <section
      aria-labelledby="career-profile-name"
      className="border-t border-border pt-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-secondary text-sm font-bold text-brand">
            Career profile
          </p>
          <h2 className="mt-1 text-3xl font-bold" id="career-profile-name">
            {profile.displayName}
          </h2>
          {profile.headline ? (
            <p className="mt-2 font-secondary leading-7 text-muted-foreground">
              {profile.headline}
            </p>
          ) : null}
        </div>
        <StatusBadge tone={profile.completeness >= 80 ? "success" : "neutral"}>
          {profile.completeness >= 80
            ? "Ready for matching"
            : "Profile in progress"}
        </StatusBadge>
      </div>

      <dl className="mt-7 grid gap-4 font-secondary sm:grid-cols-2">
        <div className="flex gap-3">
          <BriefcaseBusiness aria-hidden="true" className="mt-0.5 size-5" />
          <div>
            <dt className="text-xs font-bold uppercase text-muted-foreground">
              Current role
            </dt>
            <dd className="mt-1">
              {profile.currentRole || "Not added"}
              {profile.currentCompany ? ` at ${profile.currentCompany}` : ""}
            </dd>
          </div>
        </div>
        {profile.location ? (
          <div className="flex gap-3">
            <MapPin aria-hidden="true" className="mt-0.5 size-5" />
            <div>
              <dt className="text-xs font-bold uppercase text-muted-foreground">
                Location
              </dt>
              <dd className="mt-1">{profile.location}</dd>
            </div>
          </div>
        ) : null}
        {profile.yearsExperience !== null && profile.yearsExperience > 0 ? (
          <div className="flex gap-3">
            <Building2 aria-hidden="true" className="mt-0.5 size-5" />
            <div>
              <dt className="text-xs font-bold uppercase text-muted-foreground">
                Experience
              </dt>
              <dd className="mt-1">{profile.yearsExperience} years</dd>
            </div>
          </div>
        ) : null}
      </dl>

      {profile.skills.length ? (
        <div className="mt-7">
          <h3 className="font-secondary text-xs font-bold uppercase text-muted-foreground">
            Skills
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <li key={skill}>
                <StatusBadge>{skill}</StatusBadge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 font-secondary text-sm">
        {links.map(({ icon: Icon, key, label }) => {
          const href = profile[key];
          return href ? (
            <a
              className="inline-flex items-center gap-2 font-bold underline underline-offset-4"
              href={href}
              key={key}
              rel="noreferrer"
              target="_blank"
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          ) : null;
        })}
      </div>
    </section>
  );
}
