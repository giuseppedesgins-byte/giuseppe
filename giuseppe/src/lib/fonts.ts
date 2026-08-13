import { Playfair_Display, Inter } from "next/font/google";

/**
 * Placeholder typefaces — swap for Giuseppe's final display/body faces later.
 * Playfair Display stands in for an editorial serif; Inter for a clean grotesk body face.
 */
export const displayFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});
