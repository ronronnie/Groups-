import type { Metadata } from "next";
import { APP_NAME } from "@/config/brand";
import { DesignSystemGallery } from "@/features/design-system/components/design-system-gallery";

export const metadata: Metadata = {
  title: `Design System | ${APP_NAME}`,
  description: `${APP_NAME} interface tokens, components, and interaction states.`,
};

export default function DesignSystemPage() {
  return <DesignSystemGallery />;
}
