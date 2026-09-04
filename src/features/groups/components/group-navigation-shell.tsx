"use client";

import {
  BriefcaseBusiness,
  MessageCircle,
  Sparkles,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MobileBottomNavigation } from "@/components/layout/mobile-bottom-navigation";
import { SideNavigation } from "@/components/layout/side-navigation";

const icons: Record<string, LucideIcon> = {
  "for-you": Sparkles,
  jobs: BriefcaseBusiness,
  tracker: Workflow,
  people: Users,
  chat: MessageCircle,
};

type GroupNavigationItem = {
  id: string;
  href: string;
  label: string;
};

export function GroupNavigationShell({
  children,
  items,
}: {
  children: ReactNode;
  items: readonly GroupNavigationItem[];
}) {
  const pathname = usePathname();
  const navigation = items.map((item) => ({
    href: item.href,
    icon: icons[item.id] ?? BriefcaseBusiness,
    label: item.label,
  }));

  return (
    <div className="mx-auto flex max-w-[100rem]">
      <SideNavigation
        activeHref={pathname}
        className="sticky top-16 hidden h-[calc(100vh-4rem)] lg:block"
        items={navigation}
      />
      <main className="min-w-0 flex-1 px-shell py-6 pb-24 sm:py-8 lg:pb-10">
        {children}
      </main>
      <MobileBottomNavigation
        activeHref={pathname}
        className="lg:hidden"
        items={navigation}
      />
    </div>
  );
}
