import type { ReactNode } from "react";
import { MobileBottomNavigation } from "@/components/layout/mobile-bottom-navigation";
import type { NavigationItem } from "@/components/layout/navigation-types";
import { SideNavigation } from "@/components/layout/side-navigation";
import { TopBar } from "@/components/layout/top-bar";
import { PageTransition } from "@/components/motion/page-transition";

function AppShell({
  activeHref,
  children,
  navigation,
}: Readonly<{
  activeHref: string;
  children: ReactNode;
  navigation: NavigationItem[];
}>) {
  return (
    <div className="min-h-screen bg-background">
      <a
        className="fixed top-2 left-2 z-[100] -translate-y-20 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:translate-y-0"
        href="#main-content"
      >
        Skip to content
      </a>
      <TopBar />
      <div className="mx-auto flex max-w-[100rem]">
        <SideNavigation
          activeHref={activeHref}
          className="sticky top-16 hidden h-[calc(100vh-4rem)] lg:block"
          items={navigation}
        />
        <main
          className="min-w-0 flex-1 px-shell pt-6 pb-24 sm:pt-8 lg:pb-10"
          id="main-content"
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <MobileBottomNavigation
        activeHref={activeHref}
        className="lg:hidden"
        items={navigation}
      />
    </div>
  );
}

export { AppShell };
export type { NavigationItem } from "@/components/layout/navigation-types";
