// app/layout.tsx

import type { Metadata, Viewport } from "next"; // Import Viewport
import { Inter } from "next/font/google";
import "./globals.css";

// Import your Navigation component
import Navigation from "@/app/components/Navigation";

// Import the combined Providers wrapper
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

// --- Enhanced Metadata for SEO and Alphabinet Attribution ---
export const metadata: Metadata = {
  // 1. Primary SEO Title: Clear, concise, and keyword-rich
  title: "Snaapii - Influencer Marketing Platform for Brands & Creators",

  // 2. Comprehensive SEO Description: Engaging and informative, includes key services
  description:
    "Snaapii connects brands with verified digital creators for powerful influencer marketing campaigns. Discover seamless collaborations, paid partnerships, and expert content services on our leading platform.",

  // 3. Expanded Keywords for better search visibility: Broader and more specific terms
  keywords: [
    "Snaapii",
    "influencer marketing platform",
    "brand creator collaboration",
    "digital marketing India",
    "content creation platform",
    "social media influencer",
    "paid campaigns",
    "creator economy",
    "micro-influencers",
    "nano-influencers",
    "brand partnerships",
    "marketing strategy",
    "online advertising",
    "creator monetization",
    "influencer discovery",
    "campaign management",
    "verified creators",
    "influencer network",
    "India", // Regional SEO
    "marketing platform", // Broader term
  ],

  // 4. Application Name
  applicationName: "Snaapii",

  // 5. Canonical URL to prevent duplicate content issues: Essential for SEO
  alternates: {
    canonical: "https://www.snaapii.com/",
    // Add other alternates like RSS feeds or language-specific URLs if applicable
    // eg: languages: { 'en-US': 'https://www.snaapii.com/en-US', },
  },

  // 6. Open Graph Meta Tags (for social media sharing - Facebook, LinkedIn, etc.)
  openGraph: {
    title: "Snaapii - Connect Creators with Brands | Influencer Marketing Platform",
    description:
      "Snaapii is the premier platform connecting verified digital creators with top brands for impactful marketing campaigns. Discover professional influencer marketing, seamless brand collaborations, and innovative content creation services. Empowering creators, boosting brands.",
    url: "https://www.snaapii.com/",
    siteName: "Snaapii",
    images: [
      {
        url: "https://www.snaapii.com/og_image.jpg", // Recommended: Create a specific OG image for best display (1200x630px ideal)
        width: 1200,
        height: 630,
        alt: "Snaapii - Influencer Marketing Platform for Brands and Digital Creators",
      },
      // You can add more image sizes or variations here if needed for different platforms
    ],
    locale: "en_US",
    type: "website", // Use 'website' for most homepages, 'article' for blog posts, etc.
  },

  // --- Favicon and Web Manifest Configuration ---
  icons: [
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
      url: "/favicon_io/apple-touch-icon.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      url: "/favicon_io/favicon-32x32.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      url: "/favicon_io/favicon-16x16.png",
    },
    {
      rel: "mask-icon", // For Safari pinned tabs
      url: "/favicon_io/safari-pinned-tab.svg",
      color: "#4B0082", // Set to your brand's primary color
    },
    {
      rel: "shortcut icon", // Fallback for older browsers and general use
      url: "/favicon_io/favicon.ico",
    },
  ],
  manifest: "/favicon_io/site.webmanifest", // Link to the Web Manifest for PWA features

  // 7. Robots Meta Tag (guide search engine crawlers): Explicitly allow indexing and following
  robots: {
    index: true,
    follow: true,
    nocache: false, // Generally good to allow caching
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1, // Allow full video previews
      "max-snippet": -1, // Allow full text snippets
    },
  },

  // 8. Builder Agency / Author / Publisher Attribution (Alphabinet)
  authors: [{ name: "Alphabinet", url: "https://www.alphabinet.com" }],
  creator: "Alphabinet", // Indicates who created the content/website
  publisher: "Alphabinet", // Indicates who published the content/website (often the same as creator for a website)
};

// Viewport for theme and color scheme (moved here)
export const viewport: Viewport = {
  themeColor: "#4B0082", // This is your purple theme color
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} pb-[60px] md:pb-0`}>
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