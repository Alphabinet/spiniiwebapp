"use client";

import { motion } from "framer-motion";

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

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Header Section */}
        <motion.header
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-4">
            Cookie Policy
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Understanding how we use cookies on our website.
          </p>
        </motion.header>

        {/* Content Section */}
        <motion.section
          className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border-2 border-purple-100 text-gray-700 leading-relaxed"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={containerVariants}
        >
          <motion.h2 className="text-3xl font-bold text-gray-900 mb-6" variants={itemVariants}>
            1. What Are Cookies?
          </motion.h2>
          <motion.p className="mb-6" variants={itemVariants}>
            Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work, or work more efficiently, as well as to provide information to the owners of the site. Cookies can be &quot;persistent&quot; or &quot;session&quot; cookies. Persistent cookies remain on your personal computer or mobile device when you go offline, while session cookies are deleted as soon as you close your web browser.
          </motion.p>

          <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
            2. How We Use Cookies
          </motion.h2>
          <motion.p className="mb-6" variants={itemVariants}>
            We use cookies for the following purposes on our website [Your Website URL]:
          </motion.p>
          <motion.ul className="list-disc list-inside mb-6 space-y-2" variants={containerVariants}>
            <motion.li variants={itemVariants}>
              <strong className="text-gray-900">Essential Cookies:</strong> These cookies are strictly necessary to provide you with services available through our website and to enable you to use some of its features. Without these cookies, services you have asked for cannot be provided.
            </motion.li>
            <motion.li variants={itemVariants}>
              <strong className="text-gray-900">Performance and Functionality Cookies:</strong> These cookies are used to enhance the performance and functionality of our website but are non-essential to their use. However, without these cookies, certain functionality may become unavailable.
            </motion.li>
            <motion.li variants={itemVariants}>
              <strong className="text-gray-900">Analytics and Customization Cookies:</strong> These cookies collect information that is used either in aggregate form to help us understand how our website is being used or how effective our marketing campaigns are, or to help us customize our website for you.
            </motion.li>
            <motion.li variants={itemVariants}>
              <strong className="text-gray-900">Advertising Cookies:</strong> These cookies are used to make advertising messages more relevant to you and your interests. They perform functions like preventing the same ad from continuously reappearing, ensuring that ads are properly displayed for advertisers, and in some cases selecting advertisements that are based on your interests.
            </motion.li>
          </motion.ul>

          <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
            3. Third-Party Cookies
          </motion.h2>
          <motion.p className="mb-6" variants={itemVariants}>
            In addition to our own cookies, we may also use various third-parties cookies to report usage statistics of the service, deliver advertisements on and through the service, and so on.
          </motion.p>

          <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
            4. Your Choices Regarding Cookies
          </motion.h2>
          <motion.p className="mb-6" variants={itemVariants}>
            You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences by clicking on the appropriate opt-out links provided in the cookie consent banner (if applicable) or by setting your preferences within your web browser.
          </motion.p>
          <motion.ul className="list-disc list-inside mb-6 space-y-2" variants={containerVariants}>
            <motion.li variants={itemVariants}>
              Most web browsers allow you to manage cookies through their settings. You can usually find these settings in the &quot;options&quot; or &quot;preferences&quot; menu of your browser.
            </motion.li>
            <motion.li variants={itemVariants}>
              Please note that if you choose to refuse cookies, you may not be able to use the full functionality of our website.
            </motion.li>
          </motion.ul>

          <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
            5. Changes to Our Cookie Policy
          </motion.h2>
          <motion.p className="mb-6" variants={itemVariants}>
            We may update our Cookie Policy from time to time. We will notify you of any changes by posting the new Cookie Policy on this page. We encourage you to review this Cookie Policy periodically for any changes.
          </motion.p>

          <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
            6. Contact Us
          </motion.h2>
          <motion.p className="mb-6" variants={itemVariants}>
            If you have any questions about this Cookie Policy, please contact us:
            <br />
            By email: <a href="mailto:business@snaapii.com" className="text-purple-600 hover:underline">business@snaapii.com</a>
          </motion.p>
        </motion.section>
      </div>
    </div>
  );
}
