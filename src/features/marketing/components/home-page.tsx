import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { AI_DISPLAY_NAME } from "@/config/brand";

const workflow = [
  {
    icon: BriefcaseBusiness,
    label: "Shared by your group",
    title: "Product Designer",
    detail: "Bengaluru · Hybrid",
    accent: "bg-accent",
  },
  {
    icon: Sparkles,
    label: `${AI_DISPLAY_NAME} found a match`,
    title: "Strong fit",
    detail: "Your skills match this role",
    accent: "bg-accent-mint",
  },
  {
    icon: UserRoundCheck,
    label: "People can help",
    title: "2 possible referrers",
    detail: "Ask someone you already know",
    accent: "bg-accent-pink",
  },
] as const;

export function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-shell">
        <Link className="w-fit" href="/" aria-label="Groups home">
          <BrandMark />
        </Link>
        <nav aria-label="Account" className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="brand" className="hidden sm:inline-flex">
            <Link href="/sign-up">
              Create account
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </nav>
      </header>

      <section className="relative overflow-hidden border-y-2 border-border-strong bg-surface">
        <div
          aria-hidden="true"
          className="ds-halftone absolute right-0 top-0 h-44 w-44 opacity-35 sm:h-72 sm:w-72"
        />
        <div className="relative mx-auto flex min-h-[calc(100svh-8rem)] max-w-7xl flex-col justify-center px-shell py-section">
          <div className="max-w-4xl">
            <p className="font-secondary mb-5 inline-flex items-center gap-2 border-2 border-border-strong bg-accent px-3 py-2 text-sm font-bold shadow-pop">
              <BriefcaseBusiness aria-hidden="true" className="size-4" />
              Jobs &amp; Referrals groups
            </p>
            <h1 className="max-w-4xl text-5xl font-bold leading-[0.98] tracking-normal text-balance sm:text-7xl lg:text-8xl">
              Find your next job with help from your people.
            </h1>
            <p className="font-secondary mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Share opportunities, discover the roles that fit, ask for trusted
              referrals, and keep your applications moving in one focused group.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="brand">
                <Link href="/sign-up">
                  Create your group
                  <ArrowRight aria-hidden="true" className="size-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/sign-in">I already have an account</Link>
              </Button>
            </div>
          </div>

          <div
            aria-label="How Groups turns a shared job into action"
            className="mt-12 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch"
          >
            {workflow.map((item, index) => {
              const Icon = item.icon;

              return (
                <div className="contents" key={item.label}>
                  <article className="relative border-2 border-border-strong bg-background p-5 shadow-pop">
                    <div
                      className={`mb-5 grid size-10 place-items-center border-2 border-border-strong ${item.accent}`}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                    </div>
                    <p className="font-secondary text-xs font-bold uppercase text-muted-foreground">
                      {item.label}
                    </p>
                    <h2 className="mt-2 text-xl font-bold">{item.title}</h2>
                    <p className="font-secondary mt-1 text-sm text-muted-foreground">
                      {item.detail}
                    </p>
                  </article>
                  {index < workflow.length - 1 ? (
                    <ArrowRight
                      aria-hidden="true"
                      className="mx-auto hidden size-5 self-center lg:block"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-8 px-shell py-10 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="text-2xl font-bold sm:text-3xl">
              One profile. Every opportunity. Your progress stays yours.
            </p>
            <p className="font-secondary mt-3 max-w-2xl leading-7 text-primary-foreground/75">
              Groups keeps the useful work visible while your career profile and
              application details remain under your control.
            </p>
          </div>
          <ul className="font-secondary grid gap-3 text-sm sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <Check aria-hidden="true" className="size-4 text-accent-mint" />
              Jobs stay easy to find
            </li>
            <li className="flex items-center gap-2">
              <Check aria-hidden="true" className="size-4 text-accent-mint" />
              Referrals have clear next steps
            </li>
            <li className="flex items-center gap-2">
              <Check aria-hidden="true" className="size-4 text-accent-mint" />
              Applications stay private
            </li>
            <li className="flex items-center gap-2">
              <Check aria-hidden="true" className="size-4 text-accent-mint" />
              {AI_DISPLAY_NAME} helps in context
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
