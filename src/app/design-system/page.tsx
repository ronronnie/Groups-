import type { Metadata } from "next";
import { DesignSystemGallery } from "@/features/design-system/components/design-system-gallery";

export const metadata: Metadata = {
  title: "Design System | Groups",
  description: "Groups interface tokens, components, and interaction states.",
};

export default function DesignSystemPage() {
  return <DesignSystemGallery />;
}
