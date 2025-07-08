import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Import your Navigation and Footer components
import Navigation from "@/app/components/Navigation";
// Import SessionProvider wrapper
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

// --- Enhanced Metadata for SEO and Alphabinet Attribution (without Twitter tags) ---
export const metadata: Metadata = {
  // 1. Primary SEO Title
  title: "Snaapii - Influencer Marketing Platform for Brands & Creators",

  // 2. Comprehensive SEO Description
  description:
    "Connect brands with verified digital creators for influencer marketing, collaborations, paid campaigns, and content services on Snaapii",

  // 3. Expanded Keywords for better search visibility
  keywords: [
    "Snaapii",
    "digital marketing",
    "influencer marketing",
    "brand collaboration",
    "content creation",
    "social media marketing",
    "creator platform",
    "brand deals",
    "verified creators",
    "marketing campaigns",
    "digital creators",
    "influencers",
    "India", // Regional SEO
  ],

  // 4. Application Name
  applicationName: "Snaapii",

  // 5. Canonical URL to prevent duplicate content issues
  alternates: {
    canonical: 'https://www.snaapii.com/',
    // You can add other alternates like RSS feeds here if applicable
  },

  // 6. Open Graph Meta Tags (for social media sharing - Facebook, LinkedIn etc.)
  openGraph: {
    title: "Snaapii - Connect Creators with Brands | Influencer Marketing Platform",
    description: "Snaapii is the premier platform connecting verified digital creators with top brands for impactful marketing campaigns. Discover professional influencer marketing, seamless brand collaborations, and innovative content creation services. Empowering creators, boosting brands.",
    url: "https://www.snaapii.com/",
    siteName: "Snaapii",
    images: [
      {
        url: "https://www.snaapii.com/og_image.jpg", // Recommended: Create a specific OG image for best display
        width: 1200,
        height: 630,
        alt: "Snaapii Platform for Creators and Brands",
      },
      // You can add more image sizes or variations here
    ],
    locale: "en_US",
    type: "website", // Or 'article' for blog posts, etc.
  },

  // --- Favicon and Web Manifest Configuration (UPDATED) ---
  icons: [
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      url: '/favicon_io/apple-touch-icon.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      url: '/favicon_io/favicon-32x32.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      url: '/favicon_io/favicon-16x16.png',
    },
    {
      rel: 'mask-icon', // For Safari pinned tabs
      url: '/favicon_io/safari-pinned-tab.svg', // Assuming you might have this, common from generators
      color: '#4B0082', // Set to your theme color or brand color
    },
    // The standard favicon.ico is often still useful, even if others are present
    {
      rel: 'shortcut icon',
      url: '/favicon_io/favicon.ico', // Often combines multiple sizes
    },
  ],
  // Link to the Web Manifest
  manifest: '/favicon_io/site.webmanifest',


  // 7. Robots Meta Tag (guide search engine crawlers)
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-snippet': -1,
    },
  },

  // 8. Builder Agency / Author / Publisher Attribution (Alphabinet)
  authors: [{ name: "Alphabinet", url: "https://www.alphabinet.com" }],
  creator: "Alphabinet", // Indicates who created the content/website
  publisher: "Alphabinet", // Indicates who published the content/website (often the same as creator for a website)

  // Additional Meta Tags (optional but good practice)
  colorScheme: "light", // Or "dark", "dark light"
  themeColor: "#4B0082", // A dominant color from your brand (e.g., a shade of purple)
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* With Next.js 13+ App Router, the `metadata` export automatically
            handles favicon and manifest links, so you usually don't need to add them here manually. */}
      </head>
      <body className={inter.className}>
        <Providers>
          {/* Navigation Bar */}
          <Navigation />

          {/* Main content of your application */}
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}