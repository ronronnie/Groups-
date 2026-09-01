"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-border bg-card text-card-foreground shadow-xs",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

function PopCard({
  children,
  className,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <motion.article
      className={cn(
        "rounded-lg border-2 border-border-strong bg-card p-5 shadow-pop",
        className,
      )}
      initial={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      viewport={{ amount: 0.25, once: true }}
      whileHover={{ y: -2 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.99 }}
    >
      {children}
    </motion.article>
  );
}

function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1.5 p-5", className)} {...props} />;
}

function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold", className)} {...props} />;
}

function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "font-secondary text-sm leading-6 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-3 px-5 pb-5", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  PopCard,
};
