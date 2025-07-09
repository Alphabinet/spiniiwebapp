"use client";

// Removed framer-motion import for faster loading
// import { motion } from "framer-motion";

export default function CookiePolicyPage() {
  const effectiveDate = "July 8, 2025"; // You can update this date as needed

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Header Section */}
        <header
          className="text-center mb-12 md:mb-16"
          // Removed initial, animate, transition props
        >
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-4 drop-shadow-sm">
            Cookie Policy
          </h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto">
            Understanding how we use cookies on Snaapii.com to enhance your experience.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Effective Date: {effectiveDate}
          </p>
        </header>

        {/* Content Section */}
        <section
          className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl border-2 border-purple-100 text-gray-800 leading-relaxed"
          // Removed initial, whileInView, viewport, variants props
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 pb-4 border-b border-purple-200">
            1. What Are Cookies?
          </h2>
          <p className="mb-6 text-base md:text-lg">
            Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work, or work more efficiently, as well as to provide information to the owners of the site. Cookies can be &quot;persistent&quot; (remaining on your device after you close your browser) or &quot;session&quot; (deleted as soon as you close your web browser).
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            2. How Snaapii.com Uses Cookies
          </h2>
          <p className="mb-6 text-base md:text-lg">
            We use cookies on Snaapii.com for the following purposes to ensure our platform functions smoothly and provides you with the best experience:
          </p>
          <ul className="list-disc list-inside mb-6 space-y-4 pl-4">
            <li className="text-base md:text-lg">
              <strong className="text-gray-900">Essential Cookies:</strong> These are crucial for Snaapii.com to operate. They enable core functionalities like user login, account management, and secure transactions, allowing businesses and influencers to connect and manage campaigns.
            </li>
            <li className="text-base md:text-lg">
              <strong className="text-gray-900">Performance and Functionality Cookies:</strong> These cookies help us remember your preferences (like language or region) and enhance your experience by customizing content. They are not essential but improve the usability of Snaapii.com.
            </li>
            <li className="text-base md:text-lg">
              <strong className="text-gray-900">Analytics and Customization Cookies:</strong> We use these to understand how users interact with Snaapii.com. This data helps us analyze platform usage, track campaign effectiveness, and identify areas for improvement, allowing us to continually optimize our services for brands and creators.
            </li>
            <li className="text-base md:text-lg">
              <strong className="text-gray-900">Advertising Cookies:</strong> These cookies help us deliver more relevant advertisements to you based on your interests and activities on Snaapii.com. They also help us track the performance of our advertising campaigns.
            </li>
          </ul>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            3. Third-Party Cookies
          </h2>
          <p className="mb-6 text-base md:text-lg">
            In addition to our own cookies, some third-party services that we integrate with (e.g., analytics providers, payment gateways, social media platforms) may also place cookies on your device when you use Snaapii.com. These cookies are governed by the respective third parties&#39; privacy and cookie policies.
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            4. Your Choices Regarding Cookies
          </h2>
          <p className="mb-6 text-base md:text-lg">
            You have the right to decide whether to accept or reject cookies. You can manage your cookie preferences through your web browser settings.
          </p>
          <ul className="list-disc list-inside mb-6 space-y-4 pl-4">
            <li className="text-base md:text-lg">
              Most web browsers automatically accept cookies, but you can usually modify your browser setting to decline cookies if you prefer. This can typically be found in your browser&#39;s &quot;options&quot; or &quot;preferences&quot; menu.
            </li>
            <li className="text-base md:text-lg">
              Please be aware that if you choose to refuse cookies, some parts of Snaapii.com may not function as intended, or you may not be able to use the full functionality of our platform.
            </li>
          </ul>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            5. Changes to Our Cookie Policy
          </h2>
          <p className="mb-6 text-base md:text-lg">
            We may update our Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any significant changes by posting the new Cookie Policy on this page and updating the &quot;Effective Date&quot; at the top. We encourage you to review this Cookie Policy periodically for any changes.
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            6. Contact Us
          </h2>
          <p className="mb-6 text-base md:text-lg">
            If you have any questions about this Cookie Policy, please contact us:
            <br />
            By email: <a href="mailto:business@snaapii.com" className="text-purple-600 hover:text-purple-800 hover:underline font-semibold">business@snaapii.com</a>
            <br />
            Website: <a href="https://www.snaapii.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 hover:underline font-semibold">www.snaapii.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
