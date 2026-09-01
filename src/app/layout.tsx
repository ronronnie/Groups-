import type { Metadata } from "next";
import { APP_NAME } from "@/config/brand";
import { fontVariables } from "@/config/fonts";
import { Toaster } from "@/components/ui/toaster";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Purpose-built AI groups that turn conversation into action.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={fontVariables} lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
