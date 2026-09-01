"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function PageTransition({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn(className)}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export { PageTransition };
