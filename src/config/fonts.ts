import { Inconsolata, Lato } from "next/font/google";

// Change this loader and its options to preview a different primary font.
const primaryFont = Inconsolata({
  subsets: ["latin"],
  variable: "--font-primary-source",
  weight: "variable",
});

const secondaryFont = Lato({
  subsets: ["latin"],
  variable: "--font-secondary-source",
  weight: ["400", "700"],
});

export const fontVariables = `${primaryFont.variable} ${secondaryFont.variable}`;
