import React from 'react';

export default function UserDataDeletionPolicyPage() {
  const effectiveDate = "July 25, 2025"; // Current date

  return (
    <div className="min-h-screen bg-white text-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto px-0 max-w-4xl">
        <header className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-4 drop-shadow-sm">
            User Data Deletion Policy
          </h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto">
            At Snaapii, we value your privacy and provide a transparent way to manage or delete your personal data.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Effective Date: {effectiveDate}
          </p>
        </header>

        <section
          className="bg-gray-100 p-6 sm:p-8 md:p-12 rounded-3xl shadow-2xl border-2 border-purple-100 text-gray-800 leading-relaxed"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 pb-4 border-b border-purple-200">
            How Users Can Request Data Deletion
          </h2>
          <p className="mb-6 text-base md:text-lg">
            Users can request deletion of their account and associated data by emailing us at{' '}
            <a href="mailto:contact@snaapii.com" className="text-purple-600 hover:text-purple-800 hover:underline font-semibold">contact@snaapii.com</a>{' '}
            with the following details:
          </p>
          <ul className="list-disc list-inside mb-6 space-y-3 pl-4">
            <li className="text-base md:text-lg">
              Your registered **email address** or **phone number**.
            </li>
            <li className="text-base md:text-lg">
              Your **Instagram username** (if connected).
            </li>
            <li className="text-base md:text-lg">
              A message stating **“Request for Data Deletion.”**
            </li>
          </ul>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            Processing Time
          </h2>
          <p className="mb-6 text-base md:text-lg">
            Once we receive your request, we will:
          </p>
          <ul className="list-disc list-inside mb-6 space-y-3 pl-4">
            <li className="text-base md:text-lg">
              **Verify your identity** for security reasons.
            </li>
            <li className="text-base md:text-lg">
              **Permanently delete** all related data from our servers within **7 business days**.
            </li>
            <li className="text-base md:text-lg">
              **Send a confirmation email** once the deletion process is completed.
            </li>
          </ul>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            Automatic Deletion
          </h2>
          <p className="mb-6 text-base md:text-lg">
            If you **revoke Snaapii’s access** via Instagram account settings, all associated data will be **automatically removed** from our servers within **7 days**.
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 mt-8 pb-4 border-b border-purple-200">
            Contact
          </h2>
          <p className="mb-6 text-base md:text-lg">
            For all privacy-related queries or data deletion requests, email us at{' '}
            <a href="mailto:contact@snaapii.com" className="text-purple-600 hover:text-purple-800 hover:underline font-semibold">contact@snaapii.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}