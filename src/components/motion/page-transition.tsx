"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useReducedMotionPreference } from "@/components/motion/use-reduced-motion-preference";
import { cn } from "@/lib/utils";

function PageTransition({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  const reduceMotion = useReducedMotionPreference();

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn(className)}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      transition={{ duration: reduceMotion ? 0 : 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export { PageTransition };
