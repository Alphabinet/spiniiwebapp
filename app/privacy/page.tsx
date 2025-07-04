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

export default function PrivacyPolicyPage() {
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
                        Privacy Policy
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                        Your privacy is important to us.
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
                        1. Information We Collect
                    </motion.h2>
                    <motion.p className="mb-4" variants={itemVariants}>
                        We collect information to provide and improve our services to you.
                    </motion.p>
                    <motion.ul className="list-disc list-inside mb-6 space-y-2" variants={containerVariants}>
                        <motion.li variants={itemVariants}>
                            <strong className="text-gray-900">Personal Information:</strong> This includes information that can identify you, such as your name, email address, contact number, and payment information (if applicable). We collect this when you register for an account, make a purchase, or contact us.
                        </motion.li>
                        <motion.li variants={itemVariants}>
                            <strong className="text-gray-900">Usage Data:</strong> We automatically collect information about how you access and use our platform. This may include your IP address, browser type, operating system, referral URLs, pages viewed, and the dates and times of your visits.
                        </motion.li>
                        <motion.li variants={itemVariants}>
                            <strong className="text-gray-900">Cookies and Tracking Technologies:</strong> We use cookies and similar tracking technologies to track activity on our service and hold certain information. Cookies are small data files stored on your device.
                        </motion.li>
                    </motion.ul>

                    <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
                        2. How We Use Your Information
                    </motion.h2>
                    <motion.ul className="list-disc list-inside mb-6 space-y-2" variants={containerVariants}>
                        <motion.li variants={itemVariants}>To provide, operate, and maintain our services.</motion.li>
                        <motion.li variants={itemVariants}>To improve, personalize, and expand our services.</motion.li>
                        <motion.li variants={itemVariants}>To understand and analyze how you use our services.</motion.li>
                        <motion.li variants={itemVariants}>To develop new products, services, features, and functionality.</motion.li>
                        <motion.li variants={itemVariants}>To communicate with you, including for customer service, updates, and marketing.</motion.li>
                        <motion.li variants={itemVariants}>To process your transactions.</motion.li>
                        <motion.li variants={itemVariants}>To detect and prevent fraud.</motion.li>
                        <motion.li variants={itemVariants}>To comply with legal obligations.</motion.li>
                    </motion.ul>

                    <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
                        3. How We Share Your Information
                    </motion.h2>
                    <motion.p className="mb-4" variants={itemVariants}>
                        We may share your information in the following situations:
                    </motion.p>
                    <motion.ul className="list-disc list-inside mb-6 space-y-2" variants={containerVariants}>
                        <motion.li variants={itemVariants}>
                            <strong className="text-gray-900">With Service Providers:</strong> We may share your information with third-party vendors, consultants, and other service providers who perform services for us or on our behalf.
                        </motion.li>
                        <motion.li variants={itemVariants}>
                            <strong className="text-gray-900">For Business Transfers:</strong> We may share or transfer your information in connection with any merger, sale of company assets, financing, or acquisition.
                        </motion.li>
                        <motion.li variants={itemVariants}>
                            <strong className="text-gray-900">With Affiliates:</strong> We may share your information with our affiliates, requiring them to honor this Privacy Policy.
                        </motion.li>
                        <motion.li variants={itemVariants}>
                            <strong className="text-gray-900">For Legal Reasons:</strong> We may disclose your information if required by law or public authorities.
                        </motion.li>
                        <motion.li variants={itemVariants}>
                            <strong className="text-gray-900">With Your Consent:</strong> We may disclose your personal information for any other purpose with your consent.
                        </motion.li>
                    </motion.ul>

                    <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
                        4. Data Security
                    </motion.h2>
                    <motion.p className="mb-6" variants={itemVariants}>
                        We implement reasonable security measures to protect your personal information from unauthorized access, use, or disclosure. However, please be aware that no method of transmission over the Internet or method of electronic storage is 100% secure.
                    </motion.p>

                    <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
                        5. Your Rights
                    </motion.h2>
                    <motion.p className="mb-4" variants={itemVariants}>
                        Depending on your location, you may have certain rights regarding your personal information, including the right to:
                    </motion.p>
                    <motion.ul className="list-disc list-inside mb-6 space-y-2" variants={containerVariants}>
                        <motion.li variants={itemVariants}>Access your personal data.</motion.li>
                        <motion.li variants={itemVariants}>Request correction of inaccurate data.</motion.li>
                        <motion.li variants={itemVariants}>Request deletion of your data.</motion.li>
                        <motion.li variants={itemVariants}>Object to the processing of your data.</motion.li>
                        <motion.li variants={itemVariants}>Request data portability.</motion.li>
                    </motion.ul>
                    <motion.p className="mb-6" variants={itemVariants}>
                        To exercise these rights, please contact us using the information below.
                    </motion.p>

                    <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
                        6. Third-Party Links
                    </motion.h2>
                    <motion.p className="mb-6" variants={itemVariants}>
                        Our platform may contain links to third-party websites that are not operated by us. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.
                    </motion.p>

                    <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
                        7. Children&apos;s Privacy
                    </motion.h2>
                    <motion.p className="mb-6" variants={itemVariants}>
                        Our services are not intended for anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under 13. If you are a parent or guardian and you are aware that your child has provided us with personal data, please contact us.
                    </motion.p>

                    <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
                        8. Changes to This Privacy Policy
                    </motion.h2>
                    <motion.p className="mb-6" variants={itemVariants}>
                        We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. We encourage you to review this Privacy Policy periodically for any changes.
                    </motion.p>

                    <motion.h2 className="text-3xl font-bold text-gray-900 mb-6 mt-8" variants={itemVariants}>
                        9. Contact Us
                    </motion.h2>
                    <motion.p className="mb-6" variants={itemVariants}>
                        If you have any questions about this Privacy Policy, please contact us:
                        <br />
                        By email: <a href="mailto:business@snaapii.com" className="text-purple-600 hover:underline">business@snaapii.com</a>
                    </motion.p>
                </motion.section>
            </div>
        </div>
    );
}
