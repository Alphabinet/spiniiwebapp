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

export default function TermsAndConditionsPage() {
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
            Terms and Conditions
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Please read these terms carefully before using our platform.
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
            1. Acceptance of Terms
          </motion.h2>
          <motion.p className="mb-6" variants={itemVariants}>
            Welcome to our platform! These Terms and Conditions (&quot;Terms&quot;) govern your use of our website and services. By accessing or using our platform, you agree to be bound by these Terms. If you do not agree with any part of these Terms, please do not use our platform. By creating an account, accessing, or using our services, you confirm that you have read, understood, and agree to be bound by these Terms, as well as our Privacy Policy.
          </motion.p>

          <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
            2. User Responsibilities
          </motion.h2>
          <motion.ul className="list-disc list-inside mb-6 space-y-2" variants={containerVariants}>
            <motion.li variants={itemVariants}>Maintaining the confidentiality of your account information.</motion.li>
            <motion.li variants={itemVariants}>All activities that occur under your account.</motion.li>
            <motion.li variants={itemVariants}>Ensuring that any content you provide is accurate and does not violate any laws or third-party rights.</motion.li>
            <motion.li variants={itemVariants}>Complying with all applicable laws and regulations.</motion.li>
          </motion.ul>

          <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
            3. Intellectual Property
          </motion.h2>
          <motion.p className="mb-6" variants={itemVariants}>
            All content on this platform, including text, graphics, logos, and software, is our property or the property of our licensors and is protected by intellectual property laws. You may not use any content without our prior written permission.
          </motion.p>

          <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
            4. Prohibited Conduct
          </motion.h2>
          <motion.p className="mb-6" variants={itemVariants}>
            You agree not to:
          </motion.p>
          <motion.ul className="list-disc list-inside mb-6 space-y-2" variants={containerVariants}>
            <motion.li variants={itemVariants}>Use the platform for any unlawful purpose.</motion.li>
            <motion.li variants={itemVariants}>Impersonate any person or entity.</motion.li>
            <motion.li variants={itemVariants}>Interfere with the operation of the platform.</motion.li>
            <motion.li variants={itemVariants}>Upload or transmit viruses or any other harmful code.</motion.li>
            <motion.li variants={itemVariants}>Engage in any activity that could damage, disable, overburden, or impair our servers or networks.</motion.li>
          </motion.ul>

          <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
            5. Disclaimers
          </motion.h2>
          <motion.p className="mb-6" variants={itemVariants}>
            Our platform and services are provided &quot;as is&quot; and &quot;as available&quot; without any warranties, express or implied. We do not guarantee that the platform will be error-free or uninterrupted.
          </motion.p>

          <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
            6. Limitation of Liability
          </motion.h2>
          <motion.p className="mb-6" variants={itemVariants}>
            To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from: Your access to or use of or inability to access or use the platform; Any conduct or content of any third party on the platform; Any content obtained from the platform; Unauthorized access, use, or alteration of your transmissions or content.
          </motion.p>

          <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
            7. Indemnification
          </motion.h2>
          <motion.p className="mb-6" variants={itemVariants}>
            You agree to indemnify and hold us harmless from any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising from your use of the platform, your violation of these Terms, or your violation of any rights of another.
          </motion.p>

          <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
            8. Governing Law
          </motion.h2>
          <motion.p className="mb-6" variants={itemVariants}>
            These Terms shall be governed by and construed in accordance with the laws of [Your Country/State], without regard to its conflict of law principles.
          </motion.p>

          <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
            9. Changes to Terms
          </motion.h2>
          <motion.p className="mb-6" variants={itemVariants}>
            We reserve the right to modify or replace these Terms at any time. We will notify you of any changes by posting the new Terms on this page. Your continued use of the platform after any such changes constitutes your acceptance of the new Terms.
          </motion.p>

          <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
            10. Contact Information
          </motion.h2>
          <motion.p className="mb-6" variants={itemVariants}>
            If you have any questions about these Terms, please contact us at <a href="mailto:business@snaapii.com" className="text-purple-600 hover:underline">business@snaapii.com</a>.
          </motion.p>
        </motion.section>
      </div>
    </div>
  );
}
