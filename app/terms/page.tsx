"use client";

export default function TermsAndConditionsPage() {
  const effectiveDate = "July 8, 2025"; // You can update this date as needed

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Header Section */}
        <header className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-4 drop-shadow-sm">
            Terms and Conditions
          </h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto">
            Please read these terms carefully before using Snaapii.com.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Effective Date: {effectiveDate}
          </p>
        </header>

        {/* Content Section */}
        <section className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl border-2 border-purple-100 text-gray-800 leading-relaxed">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 pb-4 border-b border-purple-200">
            1. Acceptance of Terms
          </h2>
          <p className="mb-6 text-base md:text-lg">
            Welcome to Snaapii.com! These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of our website and services. Snaapii.com acts as a mediator platform connecting businesses with influencers for various campaigns and content creation services. By accessing or using Snaapii.com, you agree to be bound by these Terms. If you do not agree with any part of these Terms, please do not use our platform. By creating an account, accessing, or using our services, you confirm that you have read, understood, and agree to be bound by these Terms, as well as our Privacy Policy.
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            2. User Responsibilities
          </h2>
          <p className="mb-4 text-base md:text-lg">
            As a user of Snaapii.com, you are responsible for:
          </p>
          <ul className="list-disc list-inside mb-6 space-y-4 pl-4">
            <li className="text-base md:text-lg">
              <strong className="text-gray-900">Account Confidentiality:</strong> Keeping your account information (username, password) confidential and secure. You are responsible for all activities that occur under your account.
            </li>
            <li className="text-base md:text-lg">
              <strong className="text-gray-900">Accurate Information:</strong> Providing accurate, complete, and truthful information in your profile, campaign briefs, and content submissions.
            </li>
            <li className="text-base md:text-lg">
              <strong className="text-gray-900">Lawful Conduct:</strong> Ensuring that any content you provide or activities you engage in on Snaapii.com comply with all applicable Indian laws and regulations, and do not infringe upon any third-party rights.
            </li>
            <li className="text-base md:text-lg">
              <strong className="text-gray-900">Ethical Collaboration:</strong> Engaging in professional and ethical conduct during all collaborations facilitated by Snaapii.com.
            </li>
          </ul>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            3. Platform Services and Charges
          </h2>
          <p className="mb-4 text-base md:text-lg">
            Snaapii.com provides a platform for:
          </p>
          <ul className="list-disc list-inside mb-6 space-y-4 pl-4">
            <li className="text-base md:text-lg">
              <strong className="text-gray-900">Influencer Discovery:</strong> Businesses can discover and connect with verified influencers.
            </li>
            <li className="text-base md:text-lg">
              <strong className="text-gray-900">Campaign Management:</strong> Tools to create, manage, and track influencer marketing campaigns.
            </li>
            <li className="text-base md:text-lg">
              <strong className="text-gray-900">Secure Payments:</strong> A secure system for processing payments between businesses and influencers.
            </li>
          </ul>
          <p className="mb-6 text-base md:text-lg">
            Snaapii.com charges a minimal service fee and/or platform charge for facilitating these connections and services. These charges will be clearly communicated to you before any transaction is finalized.
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            4. Intellectual Property
          </h2>
          <p className="mb-4 text-base md:text-lg">
            All content on Snaapii.com, including text, graphics, logos, and software, is our property or the property of our licensors and is protected by intellectual property laws in India.
          </p>
          <p className="mb-6 text-base md:text-lg">
            Content uploaded by users (e.g., influencer portfolios, campaign content) remains the property of the respective users. However, by using Snaapii.com, you grant us a non-exclusive, royalty-free license to use, reproduce, and display such content solely for the purpose of operating and promoting Snaapii.com and facilitating collaborations.
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            5. Prohibited Conduct
          </h2>
          <p className="mb-6 text-base md:text-lg">
            You agree not to:
          </p>
          <ul className="list-disc list-inside mb-6 space-y-4 pl-4">
            <li className="text-base md:text-lg">Use Snaapii.com for any unlawful or fraudulent purpose, or in any way that violates Indian laws.</li>
            <li className="text-base md:text-lg">Impersonate any person or entity, or falsely state or otherwise misrepresent your affiliation with a person or entity.</li>
            <li className="text-base md:text-lg">Interfere with the proper working of Snaapii.com, including introducing viruses or other malicious code.</li>
            <li className="text-base md:text-lg">Engage in any activity that could damage, disable, overburden, or impair our servers or networks.</li>
            <li className="text-base md:text-lg">Attempt to gain unauthorized access to any part of Snaapii.com or its related systems.</li>
          </ul>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            6. Disclaimers
          </h2>
          <p className="mb-6 text-base md:text-lg">
            Snaapii.com and its services are provided &quot;as is&quot; and &quot;as available&quot; without any warranties, express or implied. While we strive to connect businesses with verified influencers, we do not guarantee the success of any campaign or the quality of content produced by influencers. We are a facilitating platform and are not responsible for the direct interactions or agreements between businesses and influencers. We do not guarantee that the platform will be error-free or uninterrupted.
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            7. Limitation of Liability
          </h2>
          <p className="mb-6 text-base md:text-lg">
            To the fullest extent permitted by Indian law, Snaapii.com shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from:
          </p>
          <ul className="list-disc list-inside mb-6 space-y-4 pl-4">
            <li className="text-base md:text-lg">Your access to or use of or inability to access or use Snaapii.com.</li>
            <li className="text-base md:text-lg">Any conduct or content of any third party (including other users) on Snaapii.com.</li>
            <li className="text-base md:text-lg">Any content obtained from Snaapii.com.</li>
            <li className="text-base md:text-lg">Unauthorized access, use, or alteration of your transmissions or content.</li>
          </ul>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            8. Indemnification
          </h2>
          <p className="mb-6 text-base md:text-lg">
            You agree to indemnify and hold Snaapii.com and its affiliates, officers, agents, and employees harmless from any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising from your use of the platform, your violation of these Terms, or your violation of any rights of another.
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            9. Governing Law and Jurisdiction
          </h2>
          <p className="mb-6 text-base md:text-lg">
            These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts in India.
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            10. Dispute Resolution
          </h2>
          <p className="mb-4 text-base md:text-lg">
            In the event of any dispute arising between users or between a user and Snaapii.com, we encourage you to first contact us directly to seek a resolution. Snaapii.com may offer mediation services to facilitate amicable settlement of disputes between businesses and influencers.
          </p>
          <p className="mb-6 text-base md:text-lg">
            If a dispute cannot be resolved through direct communication or mediation, it shall be resolved through arbitration in accordance with the provisions of the Arbitration and Conciliation Act, 1996, as amended from time to time. The seat of arbitration shall be in India.
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            11. Changes to Terms
          </h2>
          <p className="mb-6 text-base md:text-lg">
            We reserve the right to modify or replace these Terms at any time. We will notify you of any significant changes by posting the new Terms on this page and updating the "Effective Date" at the top. Your continued use of Snaapii.com after any such changes constitutes your acceptance of the new Terms.
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            12. Contact Information
          </h2>
          <p className="mb-6 text-base md:text-lg">
            If you have any questions about these Terms, please contact us:
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