// This file should be placed at `app/about/page.tsx`

"use client";

import { motion } from "framer-motion";
import { Users, Lightbulb, TrendingUp, Handshake } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// Define a type for a team member
interface TeamMember {
  name: string;
  role: string;
  image: string;
}

// Data for team members - Replace with your actual team
const teamMembers: TeamMember[] = [
  {
    name: "Aarav Sharma",
    role: "Founder & CEO",
    image: "/images/team/aarav.jpg", // Add your image path
  },
  {
    name: "Priya Patel",
    role: "Head of Creator Relations",
    image: "/images/team/priya.jpg", // Add your image path
  },
  {
    name: "Vikram Singh",
    role: "Lead Platform Engineer",
    image: "/images/team/vikram.jpg", // Add your image path
  },
  {
    name: "Sneha Reddy",
    role: "Marketing Director",
    image: "/images/team/sneha.jpg", // Add your image path
  },
];

// Data for the "Why Choose Us" section
const valuePropositions = [
  {
    icon: Users,
    title: "Verified Creators",
    description: "Our rigorous vetting process ensures you connect only with authentic, high-quality influencers.",
  },
  {
    icon: TrendingUp,
    title: "Data-Driven Insights",
    description: "Access real-time performance metrics like average views to make informed campaign decisions.",
  },
  {
    icon: Handshake,
    title: "Seamless Collaboration",
    description: "Our platform streamlines the entire process, from discovery to campaign delivery.",
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
          <Badge variant="secondary" className="text-sm px-4 py-1.5 rounded-full mb-4 bg-purple-200 text-purple-800">
            Our Story
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-tight mb-6">
            Connecting Brands with the Pulse of Influence
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            We are a platform dedicated to revolutionizing the way brands and digital creators collaborate, making influencer marketing accessible, transparent, and effective.
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
            <div className="md:w-1/2">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Our Mission
              </h2>
              <p className="text-gray-700 text-lg leading-relaxed">
                Our mission is to empower both brands and creators. We provide brands with a curated marketplace to find verified creators who align with their values, and we equip creators with the tools to monetize their influence fairly and transparently. We believe in fostering a community built on trust, creativity, and mutual growth.
              </p>
            </div>
            <div className="md:w-1/2">
              <img
                src="/images/mission-image.svg" // Replace with a relevant image or illustration
                alt="Our Mission"
                width={600}
                height={400}
                className="rounded-3xl shadow-lg"
              />
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
          <motion.h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8" variants={itemVariants}>
            Why Brands Choose Us
          </motion.h2>
          <motion.p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12" variants={itemVariants}>
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
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                    <p className="text-gray-600">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Meet the Team */}
        <motion.section
          className="text-center mb-20 md:mb-32"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          <motion.h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8" variants={itemVariants}>
            Meet the Visionaries
          </motion.h2>
          <motion.p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12" variants={itemVariants}>
            Our passionate team is the driving force behind our platform.
          </motion.p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {teamMembers.map((member, index) => (
              <motion.div key={index} variants={itemVariants}>
                <div className="flex flex-col items-center text-center">
                  <Avatar className="w-40 h-40 mb-6 border-4 border-white shadow-xl ring-4 ring-purple-200">
                    <AvatarImage src={member.image} alt={member.name} />
                    <AvatarFallback className="text-3xl font-semibold bg-purple-50 text-purple-600">
                      {member.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-2xl font-bold text-gray-900">{member.name}</h3>
                  <p className="text-purple-600 font-semibold mt-1">{member.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Call to Action */}
        <motion.section
          className="text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white p-12 md:p-20 rounded-3xl shadow-2xl"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            Ready to Amplify Your Brand?
          </h2>
          <p className="text-lg md:text-xl max-w-3xl mx-auto mb-8 opacity-90">
            Join the movement and start your next successful marketing campaign today.
          </p>
          <Link href="/creator" passHref>
            <Button size="lg" className="bg-white text-purple-700 hover:bg-gray-100 text-lg px-8 py-7 rounded-full font-bold shadow-lg transition-transform transform hover:scale-105">
              Explore Creators
            </Button>
          </Link>
        </motion.section>
      </div>
    </div>
  );
}