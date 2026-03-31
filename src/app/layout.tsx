import { Geist_Mono, Space_Grotesk, IBM_Plex_Sans, Merriweather } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { ReactQueryProvider } from "@/lib/react-query";
import { PostHogProvider } from "@/lib/PostHogProvider";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { baseUrl, createMetadata } from "@/utils/metadata";
import { Analytics } from "@vercel/analytics/next";
import { cn } from "@/lib/utils";

// const merriweatherHeading = Merriweather({ subsets: ["latin"], variable: "--font-heading" });

// const ibmPlexSans = IBM_Plex_Sans({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = createMetadata({
  title: {
    template: "%s | Scenify",
    default: "Scenify - AI Video Generator & Editor",
  },
  description:
    "Create stunning marketing videos, social media content, and more with Scenify. The next-generation AI video generator and editor for creators and businesses.",
  metadataBase: baseUrl,
});

import { TooltipProvider } from "@/components/ui/tooltip";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", spaceGrotesk.variable, geistMono.variable)}
    >
      <body className={`antialiased`}>
        <ThemeProvider>
          <ReactQueryProvider>
            <NextIntlClientProvider>
              <PostHogProvider>
                <TooltipProvider>{children}</TooltipProvider>
              </PostHogProvider>
            </NextIntlClientProvider>
          </ReactQueryProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
