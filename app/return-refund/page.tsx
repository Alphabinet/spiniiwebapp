import React from 'react';

export default function ReturnRefundPolicy() {
  return (
    // Main container for the policy page, using a white background
    // Added mb-12 for a consistent bottom margin
    // The padding classes (px-4 sm:px-6 lg:px-8) and max-width ensure responsiveness.
    <div className="min-h-screen bg-white text-gray-800 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center mb-12">
      <div className="max-w-4xl mx-auto bg-gray-100 p-6 sm:p-8 rounded-lg shadow-xl w-full"> {/* Added w-full for better mobile width */}
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-purple-600 mb-8">
          Return & Refund Policy
        </h1>

        <div className="space-y-6 text-gray-700">
          <p className="text-base sm:text-lg leading-relaxed"> {/* Adjusted font size for better mobile readability */}
            Thank you for choosing SNAAPII. We are committed to providing you with the best possible service and platform for connecting brands with digital creators.
          </p>

          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mt-8 mb-4"> {/* Adjusted heading size */}
            Our Policy on Returns and Refunds
          </h2>

          <p className="text-base sm:text-lg leading-relaxed font-bold text-red-600">
            Please read this policy carefully before making any payments.
          </p>

          <p className="text-base sm:text-lg leading-relaxed">
            Due to the nature of the services provided on the SNAAPII platform, which involve immediate access to our network, tools, and resources for collaborations and campaigns, we operate under a strict No Return and No Refund Policy after payment has been successfully processed.
          </p>

          <p className="text-base sm:text-lg leading-relaxed">
            This means that once a payment is made for any service, subscription, or campaign on SNAAPII, it is considered final and non-refundable. We do not offer refunds, exchanges, or credits for any reason, including but not limited to:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-2 text-base sm:text-lg leading-relaxed"> {/* Adjusted list item font size */}
            <li>Change of mind or cancellation of services.</li>
            <li>Unused services or features.</li>
            <li>Dissatisfaction with the outcome of a campaign (unless explicitly covered by a separate, written service level agreement).</li>
            <li>Technical issues on the user's end.</li>
          </ul>

          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Before You Pay
          </h2>
          <p className="text-base sm:text-lg leading-relaxed">
            We encourage all users to thoroughly review the details of their chosen service, campaign, or subscription plan before completing the payment process. If you have any questions or require clarification regarding our services, please contact our support team at <span className="text-blue-600">business@snaapii.com</span> before making a payment.
          </p>

          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Contact Us
          </h2>
          <p className="text-base sm:text-lg leading-relaxed">
            If you have any questions about this Return & Refund Policy, please contact us:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-2 text-base sm:text-lg leading-relaxed">
            <li>By email: <a href="mailto:business@snaapii.com" className="text-blue-600 hover:underline">business@snaapii.com</a></li>
            <li>By phone: <span className="text-green-600">+91 70849 89378</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
