"use client";

import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.06, // Slightly slower stagger for a smoother reveal
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function PrivacyPolicyPage() {
  const effectiveDate = "July 8, 2025"; // You can update this date as needed

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Header Section */}
        <motion.header
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-4 drop-shadow-sm">
            Privacy Policy
          </h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto">
            At Snaapii.com, your privacy is paramount.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Effective Date: {effectiveDate}
          </p>
        </motion.header>

        {/* Content Section */}
        <motion.section
          className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl border-2 border-purple-100 text-gray-800 leading-relaxed"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={containerVariants}
        >
          <motion.h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 pb-4 border-b border-purple-200" variants={itemVariants}>
            1. Information We Collect
          </motion.h2>
          <motion.p className="mb-4 text-base md:text-lg" variants={itemVariants}>
            To make Snaapii.com work for you, we collect information when you use our platform. This helps us connect businesses with influencers and manage campaigns effectively.
          </motion.p>
          <motion.ul className="list-disc list-inside mb-6 space-y-4 pl-4" variants={containerVariants}>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">Information you provide:</strong> When you create an account, we collect your name, email, and phone number. For businesses, this includes company details. For influencers, this includes social media handles (like Instagram username), follower counts, content categories, pricing, and profile pictures.
            </motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">Payment Information:</strong> If you make or receive payments through Snaapii.com, we collect payment details (like bank account or UPI ID). This information is securely processed by our trusted third-party payment partners.
            </motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">Communications:</strong> Records of your conversations with us and other users on the platform.
            </motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">Usage Data:</strong> We automatically collect details about how you use Snaapii.com, such as pages visited, features used, and time spent. This helps us improve our service.
            </motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">Device and Connection Information:</strong> Your IP address, browser type, operating system, and unique device identifiers.
            </motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">Cookies and Tracking Technologies:</strong> Small data files stored on your device that help us remember your preferences and understand how you interact with our site.
            </motion.li>
          </motion.ul>

          <motion.h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200" variants={itemVariants}>
            2. How We Use Your Information
          </motion.h2>
          <motion.p className="mb-4 text-base md:text-lg" variants={itemVariants}>
            We use the information we collect to operate, maintain, and improve Snaapii.com, and specifically to facilitate successful connections and collaborations between businesses and influencers.
          </motion.p>
          <motion.ul className="list-disc list-inside mb-6 space-y-4 pl-4" variants={containerVariants}>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">To connect you:</strong> Matching businesses with suitable influencers based on their profiles and campaign requirements.
            </motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">To manage campaigns:</strong> Facilitating communication, content delivery, and tracking campaign progress.
            </motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">To process payments:</strong> Handling transactions for services rendered, including calculating and applying our minimal service and platform charges.
            </motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">To improve our platform:</strong> Analyzing usage to enhance features, user experience, and matching algorithms on Snaapii.com.
            </motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">To communicate with you:</strong> Sending important updates, notifications about new opportunities, and marketing messages (with your consent).
            </motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">To ensure safety:</strong> Detecting and preventing fraudulent activities and ensuring compliance with our terms.
            </motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">For legal reasons:</strong> Fulfilling our legal obligations under Indian laws.
            </motion.li>
          </motion.ul>

          <motion.h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200" variants={itemVariants}>
            3. How We Share Your Information
          </motion.h2>
          <motion.p className="mb-4 text-base md:text-lg" variants={itemVariants}>
            We share your information to make the platform work and to comply with legal requirements.
          </motion.p>
          <motion.ul className="list-disc list-inside mb-6 space-y-4 pl-4" variants={containerVariants}>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">Between Users:</strong> When a business and an influencer agree to a collaboration on Snaapii.com, we share necessary profile and campaign details to facilitate their interaction.
            </motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">With Service Providers:</strong> We work with trusted third-party companies (like payment processors) to help us operate Snaapii.com. They only access information needed to perform their services.
            </motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">For Business Changes:</strong> If Snaapii.com is involved in a merger, acquisition, or sale of assets, your information might be transferred as part of that deal.
            </motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">Legal Compliance:</strong> We may disclose your information if required by Indian law or a valid government request.
            </motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>
              <strong className="text-gray-900">With Your Consent:</strong> We can share your information for other purposes if you give us explicit permission.
            </motion.li>
          </motion.ul>

          <motion.h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200" variants={itemVariants}>
            4. Data Security
          </motion.h2>
          <motion.p className="mb-6 text-base md:text-lg" variants={itemVariants}>
            We implement reasonable security measures to protect your personal information from unauthorized access, use, or disclosure. While we strive for maximum security, please understand that no internet transmission or electronic storage is 100% secure.
          </motion.p>

          <motion.h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200" variants={itemVariants}>
            5. Your Rights
          </motion.h2>
          <motion.p className="mb-4 text-base md:text-lg" variants={itemVariants}>
            Depending on your location, you may have certain rights regarding your personal information, including the right to:
          </motion.p>
          <motion.ul className="list-disc list-inside mb-6 space-y-4 pl-4" variants={containerVariants}>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>Access your personal data.</motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>Request correction of inaccurate data.</motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>Request deletion of your data (subject to legal obligations).</motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>Object to the processing of your data.</motion.li>
            <motion.li className="text-base md:text-lg" variants={itemVariants}>Request data portability.</motion.li>
          </motion.ul>
          <motion.p className="mb-6 text-base md:text-lg" variants={itemVariants}>
            To exercise these rights, please contact us using the information below.
          </motion.p>

          <motion.h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200" variants={itemVariants}>
            6. Third-Party Links
          </motion.h2>
          <motion.p className="mb-6 text-base md:text-lg" variants={itemVariants}>
            Our platform, Snaapii.com, may contain links to third-party websites that are not operated by us. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services. We encourage you to review the privacy policies of every site you visit.
          </motion.p>

          <motion.h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200" variants={itemVariants}>
            7. Children&apos;s Privacy
          </motion.h2>
          <motion.p className="mb-6 text-base md:text-lg" variants={itemVariants}>
            Our services are not intended for anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under 13. If you are a parent or guardian and you are aware that your child has provided us with personal data, please contact us immediately.
          </motion.p>

          <motion.h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200" variants={itemVariants}>
            8. Changes to This Privacy Policy
          </motion.h2>
          <motion.p className="mb-6 text-base md:text-lg" variants={itemVariants}>
            We may update our Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any significant changes by posting the new Privacy Policy on this page and updating the "Effective Date" at the top. We encourage you to review this Privacy Policy periodically for any changes.
          </motion.p>

          <motion.h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200" variants={itemVariants}>
            9. Contact Us
          </motion.h2>
          <motion.p className="mb-6 text-base md:text-lg" variants={itemVariants}>
            If you have any questions about this Privacy Policy, please contact us:
            <br />
            By email: <a href="mailto:business@snaapii.com" className="text-purple-600 hover:text-purple-800 hover:underline font-semibold">business@snaapii.com</a>
            <br />
            Website: <a href="https://www.snaapii.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 hover:underline font-semibold">www.snaapii.com</a>
          </motion.p>
        </motion.section>
      </div>
    </div>
  );
}
