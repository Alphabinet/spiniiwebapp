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
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-indigo-100 py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Hero Section */}
        <motion.header
          className="text-center mb-20 md:mb-32"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Badge
            variant="secondary"
            className="text-sm sm:text-base px-4 py-1.5 rounded-full mb-4 bg-purple-600 text-white font-medium shadow-md"
          >
            Our Story
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-purple-950 leading-tight mb-6 tracking-tight px-2"> {/* Reduced text size for smaller mobiles, added horizontal padding */}
            Connecting Brands with the{" "}
            <span className="text-purple-700">Pulse of Influence</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-purple-800 max-w-3xl mx-auto opacity-90 px-4"> {/* Reduced text size for mobiles, added horizontal padding */}
            At Snaapii, we’re building more than just a platform — we’re creating a space where influencers and brands connect with purpose.
          </p>
        </motion.header>

        {/* Our Mission Section */}
        <motion.section
          className="mb-20 md:mb-32 bg-purple-900 text-white p-8 sm:p-10 md:p-16 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border-2 border-purple-700 relative overflow-hidden" // Adjusted padding and rounded corners
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Subtle background pattern/texture */}
          <div className="absolute inset-0 opacity-10 bg-top bg-repeat"
               style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M0 0h3v3H0V0zm3 3h3v3H3V3z'/%3E%3C/g%3E%3C/svg%3E\")" }}>
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-purple-200 mb-6 md:mb-8">Our Mission</h2> {/* Reduced text size for smaller screens */}
            <p className="text-base sm:text-lg md:text-xl text-purple-100 leading-relaxed max-w-4xl mx-auto text-justify sm:text-center"> {/* Adjusted text size for responsiveness */}
              We started with a simple observation: talented creators were struggling to find the right brand opportunities, and brands were spending too much time finding trusted influencers. That’s where **Snaapii** comes in.
              <br /><br />
              Our platform helps verified creators showcase their work, and lets brands discover and collaborate with them through a streamlined, transparent system. From paid campaigns to content services, we make influencer marketing simple, secure, and scalable.
              <br /><br />
              Every feature on Snaapii is built with one goal in mind — to help creators grow, and help brands reach the right audience through real voices and impactful content.
              <br /><br />
              We’re passionate about creative freedom, honest collaborations, and building a community that supports and uplifts both sides of the creator economy.
              <br /><br />
              Welcome to Snaapii — where stories begin, and partnerships thrive.
            </p>
            {/* Founder's Quote */}
            <p className="text-purple-300 font-semibold mt-8 text-lg sm:text-xl md:text-2xl text-center"> {/* Adjusted text size */}
              – Ritesh Kumar
            </p>
            <p className="text-purple-400 text-sm sm:text-md md:text-lg text-center"> {/* Adjusted text size */}
              Founder, Snaapii
            </p>
          </div>
        </motion.section>

        {/* Why Choose Us Section */}
        <motion.section
          className="text-center mb-16 md:mb-32" // Adjusted bottom margin for mobile
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          <motion.h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-purple-950 mb-6 md:mb-8 tracking-tight" // Adjusted text size and margin
            variants={itemVariants}
          >
            Why Brands Choose Us
          </motion.h2>
          <motion.p
            className="text-base sm:text-lg text-purple-800 max-w-2xl mx-auto mb-10 md:mb-12 opacity-90" // Adjusted text size and margin
            variants={itemVariants}
          >
            We simplify influencer marketing with features designed for your success.
          </motion.p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"> {/* Adjusted grid gap and columns for responsiveness */}
            {valuePropositions.map((item, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="h-full p-5 sm:p-6 text-center bg-white border-2 border-purple-200 hover:border-purple-500 transition-all duration-300 shadow-lg hover:shadow-xl rounded-2xl sm:rounded-3xl group"> {/* Adjusted padding and rounded corners */}
                  <CardContent className="flex flex-col items-center p-0">
                    <div className="bg-purple-100 p-3 sm:p-4 rounded-full mb-4 sm:mb-6 transition-colors duration-300 group-hover:bg-purple-200"> {/* Adjusted padding and margin */}
                      <item.icon className="h-8 w-8 sm:h-10 sm:w-10 text-purple-700 transition-colors duration-300 group-hover:text-purple-800" /> {/* Adjusted icon size */}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-purple-950 mb-2 sm:mb-3 transition-colors duration-300 group-hover:text-purple-800"> {/* Adjusted text size and margin */}
                      {item.title}
                    </h3>
                    <p className="text-sm sm:text-base text-purple-800 opacity-90">{item.description}</p> {/* Adjusted text size */}
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