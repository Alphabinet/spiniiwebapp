"use client";

import { motion } from "framer-motion";
import { Users, Lightbulb, TrendingUp, Handshake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Data for the "Why Choose Us" section
const valuePropositions = [
  {
    icon: Users,
    title: "Verified Creators",
    description:
      "Our rigorous vetting process ensures you connect only with authentic, high-quality influencers.",
  },
  {
    icon: TrendingUp,
    title: "Data-Driven Insights",
    description:
      "Access real-time performance metrics like average views to make informed campaign decisions.",
  },
  {
    icon: Handshake,
    title: "Seamless Collaboration",
    description:
      "Our platform streamlines the entire process, from discovery to campaign delivery.",
  },
  {
    icon: Lightbulb,
    title: "Transparent Pricing",
    description: "No hidden fees. See clear, upfront pricing for all creator services.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Hero Section */}
        <motion.header
          className="text-center mb-20 md:mb-32"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Badge
            variant="secondary"
            className="text-sm px-4 py-1.5 rounded-full mb-4 bg-purple-200 text-purple-800"
          >
            Our Story
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-tight mb-6">
            Connecting Brands with the Pulse of Influence
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            We are a platform dedicated to revolutionizing the way brands and digital
            creators collaborate, making influencer marketing accessible, transparent,
            and effective.
          </p>
        </motion.header>

        {/* Our Mission */}
        <motion.section
          className="mb-20 md:mb-32 bg-white p-10 md:p-16 rounded-[2.5rem] shadow-2xl border-2 border-purple-100"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-full text-center">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-gray-700 text-lg leading-relaxed max-w-3xl mx-auto">
                Our mission is to Empower both brands and Creators. We provide brands
                with a curated marketplace to find verified creators who align with
                their values, and we equip creators with the tools to monetize their
                influence fairly and transparently. We believe in fostering a community
                built on trust, creativity, and mutual growth.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Why Choose Us */}
        <motion.section
          className="text-center mb-20 md:mb-32"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-8"
            variants={itemVariants}
          >
            Why Brands Choose Us
          </motion.h2>
          <motion.p
            className="text-lg text-gray-600 max-w-2xl mx-auto mb-12"
            variants={itemVariants}
          >
            We simplify influencer marketing with features designed for your success.
          </motion.p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {valuePropositions.map((item, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="h-full p-6 text-center bg-white border-2 border-transparent hover:border-purple-300 transition-all duration-300 shadow-lg hover:shadow-2xl rounded-3xl">
                  <CardContent className="flex flex-col items-center p-0">
                    <div className="bg-purple-100 p-4 rounded-full mb-6">
                      <item.icon className="h-10 w-10 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {item.title}
                    </h3>
                    <p className="text-gray-600">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}