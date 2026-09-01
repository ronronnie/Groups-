"use client";

import {
  BriefcaseBusiness,
  Check,
  ListChecks,
  MessageCircle,
  Palette,
  Plus,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { AppShell, type NavigationItem } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Celebration } from "@/components/motion/celebration";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge, StickerBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  PopCard,
} from "@/components/ui/card";
import { CommandSearch } from "@/components/ui/command-search";
import {
  ComicBurst,
  Halftone,
  HighlightMarker,
  StickerOutline,
} from "@/components/ui/decorative";
import { Drawer, Modal } from "@/components/ui/dialog";
import { SearchInput } from "@/components/ui/search-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { toast } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";
import { UserChip } from "@/components/ui/user-chip";
import { AI_DISPLAY_NAME, APP_NAME } from "@/config/brand";
import { cn } from "@/lib/utils";

const navigation: NavigationItem[] = [
  { href: "/design-system", icon: Sparkles, label: "For You" },
  { href: "#cards", icon: BriefcaseBusiness, label: "Jobs" },
  { href: "#states", icon: ListChecks, label: "Tracker" },
  { href: "#identity", icon: Users, label: "People" },
  { href: "#overlays", icon: MessageCircle, label: "Chat" },
];

const swatches = [
  { className: "bg-background", label: "Background" },
  { className: "bg-foreground", label: "Ink" },
  { className: "bg-brand", label: "Brand coral" },
  { className: "bg-brand-blue", label: "Brand blue" },
  { className: "bg-accent", label: "Accent yellow" },
  { className: "bg-accent-mint", label: "Accent mint" },
  { className: "bg-accent-pink", label: "Accent pink" },
  { className: "bg-success", label: "Success" },
  { className: "bg-warning", label: "Warning" },
  { className: "bg-destructive", label: "Error" },
];

function ShowcaseSection({
  children,
  description,
  id,
  title,
}: Readonly<{
  children: ReactNode;
  description: string;
  id: string;
  title: string;
}>) {
  return (
    <section className="scroll-mt-24 border-b border-border py-section" id={id}>
      <div className="mb-7 max-w-2xl">
        <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
        <p className="font-secondary mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function Label({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p className="font-secondary mb-3 text-xs font-bold text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function DesignSystemGallery() {
  const [query, setQuery] = useState("");

  return (
    <AppShell activeHref="/design-system" navigation={navigation}>
      <PageHeader
        actions={
          <>
            <Button variant="outline">
              <Palette aria-hidden="true" className="size-4" />
              Tokens
            </Button>
            <Button variant="brand">
              <Plus aria-hidden="true" className="size-4" />
              Create
            </Button>
          </>
        }
        description="A restrained Pop Art foundation for clear, purpose-native product experiences."
        eyebrow="Development route"
        title={`${APP_NAME} design system`}
      />

      <ShowcaseSection
        description="Neutral surfaces carry most of the interface. Brand and accent colors appear only when they communicate hierarchy or meaning."
        id="tokens"
        title="Foundation"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {swatches.map(({ className, label }) => (
            <div className="min-w-0" key={label}>
              <div
                className={cn(
                  "h-20 rounded-md border border-border-strong shadow-xs",
                  className,
                )}
              />
              <p className="font-secondary mt-2 truncate text-xs text-muted-foreground">
                {label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div>
            <Label>Primary typography</Label>
            <p className="text-4xl font-semibold text-balance sm:text-5xl">
              Clear ideas, confident action.
            </p>
          </div>
          <div className="font-secondary">
            <Label>Secondary typography</Label>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              Lato supports longer descriptions and dense information where
              effortless scanning matters most.
            </p>
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        description="Actions use stable sizing, direct labels, and visible semantic states."
        id="actions"
        title="Actions and status"
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <Label>Buttons</Label>
            <div className="flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="brand">Brand action</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Remove</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
          <div>
            <Label>Badges</Label>
            <div className="flex flex-wrap items-center gap-3">
              <StickerBadge>Strong match</StickerBadge>
              <StatusBadge tone="neutral">Saved</StatusBadge>
              <StatusBadge tone="success">
                <Check aria-hidden="true" className="size-3" /> Applied
              </StatusBadge>
              <StatusBadge tone="warning">Interviewing</StatusBadge>
              <StatusBadge tone="info">New</StatusBadge>
              <StatusBadge tone="danger">Needs attention</StatusBadge>
            </div>
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        description="Cards frame individual objects. Pop Cards are reserved for high-value moments, never used as generic section containers."
        id="cards"
        title="Cards"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Product Designer</CardTitle>
                  <CardDescription>Northstar · Bengaluru</CardDescription>
                </div>
                <StatusBadge tone="info">New</StatusBadge>
              </div>
            </CardHeader>
            <CardContent className="font-secondary text-sm leading-6 text-muted-foreground">
              A calm object card for repeated information and everyday actions.
            </CardContent>
            <CardFooter>
              <Button size="sm">View role</Button>
              <Button size="sm" variant="ghost">
                Save
              </Button>
            </CardFooter>
          </Card>
          <PopCard>
            <StickerBadge className="mb-4">92% match</StickerBadge>
            <h3 className="text-xl font-semibold">Made for your strengths</h3>
            <p className="font-secondary mt-2 text-sm leading-6 text-muted-foreground">
              {AI_DISPLAY_NAME} connected your product systems experience with
              the team&apos;s current priorities.
            </p>
            <Button className="mt-5" variant="brand">
              See why
            </Button>
          </PopCard>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        description="Identity remains compact, legible, and useful across repeated group interactions."
        id="identity"
        title="People and identity"
      >
        <div className="flex flex-wrap items-center gap-4">
          <Avatar alt="Maya Chen" />
          <Avatar alt="Jordan Lee" className="size-12 bg-accent-mint" />
          <UserChip detail="Product designer" name="Maya Chen" />
          <UserChip detail="Can refer at Northstar" name="Jordan Lee" />
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        description="Search and mode controls remain direct, keyboard reachable, and touch friendly."
        id="controls"
        title="Controls"
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="min-w-0">
            <Label>Search input</Label>
            <SearchInput
              aria-label="Search jobs"
              onChange={(event) => setQuery(event.target.value)}
              onClear={() => setQuery("")}
              placeholder="Search jobs, people, or skills"
              value={query}
            />
          </div>
          <div className="min-w-0">
            <Label>Segmented control</Label>
            <SegmentedControl
              ariaLabel="Job view"
              className="max-w-full overflow-x-auto"
              defaultValue="recommended"
              options={[
                { label: "Recommended", value: "recommended" },
                { label: "Recent", value: "recent" },
                { label: "Saved", value: "saved" },
              ]}
            />
          </div>
          <div className="min-w-0">
            <Label>Contextual command search</Label>
            <CommandSearch className="w-full justify-start" />
          </div>
          <div>
            <Label>Tooltip</Label>
            <Tooltip content="Search group knowledge">
              <button
                aria-label="Search group knowledge"
                className="grid size-10 place-items-center rounded-md border border-input bg-surface hover:border-border-strong hover:bg-secondary"
                type="button"
              >
                <Search aria-hidden="true" className="size-5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        description="Overlays preserve context, trap focus, close with Escape, and remain usable on narrow screens."
        id="overlays"
        title="Overlays and feedback"
      >
        <div className="flex flex-wrap gap-3">
          <Modal
            description="A focused confirmation surface for consequential actions."
            title="Save this opportunity?"
            trigger={<Button variant="outline">Open modal</Button>}
          >
            <p className="font-secondary text-sm leading-6 text-muted-foreground">
              Saved roles stay private unless you intentionally share them.
            </p>
            <div className="mt-5 flex justify-end">
              <Button>Save role</Button>
            </div>
          </Modal>
          <Drawer
            description="Drawers hold contextual detail without losing the current page."
            title="Match details"
            trigger={<Button variant="outline">Open drawer</Button>}
          >
            <div className="space-y-4">
              <UserChip
                className="w-full"
                detail="Shared this opportunity"
                name="Jordan Lee"
              />
              <div className="font-secondary border-l-4 border-brand-blue bg-info/15 p-4 text-sm leading-6">
                Your portfolio work aligns with the role&apos;s product systems
                focus.
              </div>
            </div>
          </Drawer>
          <Button
            onClick={() =>
              toast.success("Saved to your tracker", {
                description: "Only you can see this application state.",
              })
            }
            variant="outline"
          >
            Show toast
          </Button>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        description="System states explain what happened and offer the next useful action without blame or ambiguity."
        id="states"
        title="System states"
      >
        <div className="grid gap-5 lg:grid-cols-3">
          <EmptyState
            action={{ label: "Share a role" }}
            description="Useful opportunities shared with this group will appear here."
            title="No jobs yet"
          />
          <ErrorState
            action={{ label: "Try again" }}
            description="We could not load this group. Your information has not changed."
            title="Something went wrong"
          />
          <LoadingState label="Finding strong matches" />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div className="space-y-3" key={item}>
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        description="Expressive treatments are optional and deliberately rare. They support emphasis, AI moments, and celebrations."
        id="expression"
        title="Pop Art primitives"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Halftone className="grid min-h-36 place-items-center rounded-lg border border-border bg-accent-mint/30 p-4">
            <span className="rounded-sm bg-surface px-2 py-1 text-sm font-semibold">
              Halftone
            </span>
          </Halftone>
          <ComicBurst className="grid min-h-36 place-items-center rounded-lg border-2 border-border-strong p-4">
            <span className="rounded-full border-2 border-border-strong bg-surface px-3 py-2 font-bold">
              Burst
            </span>
          </ComicBurst>
          <div className="grid min-h-36 place-items-center rounded-lg border border-border bg-surface p-4">
            <StickerOutline className="text-2xl font-bold text-brand">
              Nice!
            </StickerOutline>
          </div>
          <div className="ds-offset-shadow grid min-h-36 place-items-center rounded-lg border-2 border-border-strong bg-accent p-4 text-center">
            Offset shadow
          </div>
          <div className="grid min-h-36 place-items-center rounded-lg border border-border bg-surface p-4 text-center">
            <p>
              A <HighlightMarker>useful signal</HighlightMarker> deserves
              emphasis.
            </p>
          </div>
        </div>
        <div className="mt-8 flex items-center gap-5 border-t border-border pt-6">
          <Celebration />
          <div>
            <p className="font-semibold">Celebration primitive</p>
            <p className="font-secondary mt-1 text-sm text-muted-foreground">
              Reserved for meaningful outcomes, never routine clicks.
            </p>
          </div>
        </div>
      </ShowcaseSection>

      <footer className="font-secondary flex flex-col gap-2 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>{APP_NAME} interface foundation</p>
        <p>Purpose before chat. Objects before messages.</p>
      </footer>
    </AppShell>
  );
}

export { DesignSystemGallery };
