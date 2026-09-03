import {
  BriefcaseBusiness,
  Handshake,
  HeartHandshake,
  Send,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import {
  reputationEventPolicy,
  type ReputationEventType,
} from "@/domains/reputation/policy";

const badgeIcons: Record<ReputationEventType, LucideIcon> = {
  job_shared: BriefcaseBusiness,
  job_saved_by_member: Sparkles,
  application_attributed: Send,
  referral_completed: Handshake,
  interview_helped: HeartHandshake,
  hire_helped: Trophy,
};

export function ContributionBadges({
  badges,
}: Readonly<{ badges: ReputationEventType[] }>) {
  if (!badges.length) return null;

  return (
    <ul aria-label="Contribution badges" className="flex flex-wrap gap-2">
      {badges.map((badge) => {
        const Icon = badgeIcons[badge];
        return (
          <li key={badge}>
            <StatusBadge tone={badge === "hire_helped" ? "success" : "info"}>
              <Icon aria-hidden="true" className="size-3.5" />
              {reputationEventPolicy[badge].label}
            </StatusBadge>
          </li>
        );
      })}
    </ul>
  );
}
