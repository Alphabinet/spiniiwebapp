import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Import your Navigation and Footer components
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";

// Import SessionProvider wrapper
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Snapii - Digital Creator & Brand Platform",
  description:
    "Connect with verified creators and brands for digital marketing campaigns. Professional services, influencer marketing, and brand collaborations.",
  keywords:
    "digital marketing, influencer marketing, brand collaboration, content creation, social media marketing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {/* Navigation Bar */}
          <Navigation />

          {/* Main content of your application */}
          <main>{children}</main>

          {/* Footer */}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
