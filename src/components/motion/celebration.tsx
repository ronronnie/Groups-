"use client";

import { Sparkles, Star } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

function Celebration({ className }: Readonly<{ className?: string }>) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-label="Celebration"
      className={cn("relative h-20 w-28", className)}
      role="img"
    >
      {[
        { Icon: Star, color: "text-brand", x: 2, y: 30 },
        { Icon: Sparkles, color: "text-brand-blue", x: 44, y: 4 },
        { Icon: Star, color: "text-accent-pink", x: 78, y: 34 },
      ].map(({ Icon, color, x, y }, index) => (
        <motion.span
          animate={
            reduceMotion
              ? { opacity: 1 }
              : { opacity: 1, rotate: 0, scale: 1, x, y }
          }
          className={cn("absolute top-0 left-0", color)}
          initial={
            reduceMotion
              ? { opacity: 1 }
              : { opacity: 0, rotate: -20, scale: 0.4, x: 48, y: 30 }
          }
          key={`${x}-${y}`}
          transition={{
            delay: index * 0.08,
            duration: 0.45,
            ease: "backOut",
          }}
        >
          <Icon aria-hidden="true" className="size-8 fill-current" />
        </motion.span>
      ))}
    </div>
  );
}

export { Celebration };
