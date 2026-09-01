"use client";

import { Activity, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { AI_DISPLAY_NAME } from "@/config/brand";

export function FoundationStatus() {
  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-between">
        <BrandMark />

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <div className="mb-5 inline-flex items-center gap-2 border border-foreground bg-card px-3 py-2 text-sm font-medium shadow-[3px_3px_0_var(--accent)]">
            <Activity className="size-4" aria-hidden="true" />
            Engineering foundation online
          </div>
          <h1 className="text-4xl font-semibold tracking-normal text-balance sm:text-6xl">
            Purpose-native groups, ready for implementation.
          </h1>
          <p className="font-secondary mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
            The App Router, typed configuration, test harness, and integration
            entry points are in place. {AI_DISPLAY_NAME} stays contextual.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <a href="/api/health">
                Health endpoint
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </motion.div>

        <div className="font-secondary grid gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:grid-cols-3">
          <p>Next.js App Router</p>
          <p>Strict TypeScript</p>
          <p>CI-ready checks</p>
        </div>
      </section>
    </main>
  );
}
