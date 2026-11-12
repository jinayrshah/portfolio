import type { Metadata, Viewport } from "next";
import { Archivo, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { site } from "@/content/site";
import "./globals.css";

const display = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});
// The heavy, wide letters of the name. Variable width and weight.
const wide = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});
const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${site.name} · ${site.tagline}`,
  description: site.description,
};

export const viewport: Viewport = { themeColor: "#020203" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${wide.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
