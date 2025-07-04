import Navigation from "../components/Navigation"
import Footer from "../components/Footer"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onContact={() => {}} />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 text-center">Terms of Commission</h1>

          <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Commission Structure</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Mann Agro operates on a transparent commission-based model to ensure fair compensation for all parties
                  involved in our platform.
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Platform commission: 10% on all completed transactions</li>
                  <li>Payment processing fee: 2.9% + ₹3 per transaction</li>
                  <li>Creator earnings: 87.1% of the total project value</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Terms</h2>
              <div className="space-y-4 text-gray-700">
                <p>All payments are processed securely through our platform with the following terms:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Payments are released to creators within 24-48 hours of project completion</li>
                  <li>Brands are charged upfront when confirming a project</li>
                  <li>Refunds are processed within 5-7 business days if applicable</li>
                  <li>All transactions are subject to our dispute resolution process</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Creator Responsibilities</h2>
              <div className="space-y-4 text-gray-700">
                <p>Creators on our platform agree to the following terms:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Deliver high-quality work as per agreed specifications</li>
                  <li>Meet all deadlines and communication requirements</li>
                  <li>Maintain professional conduct throughout the project</li>
                  <li>Provide necessary revisions within the agreed scope</li>
                  <li>Comply with platform guidelines and brand requirements</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Brand Responsibilities</h2>
              <div className="space-y-4 text-gray-700">
                <p>Brands using our platform agree to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide clear project briefs and requirements</li>
                  <li>Make timely payments as per agreed terms</li>
                  <li>Provide constructive feedback and timely approvals</li>
                  <li>Respect creator intellectual property rights</li>
                  <li>Maintain professional communication standards</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Dispute Resolution</h2>
              <div className="space-y-4 text-gray-700">
                <p>In case of disputes between brands and creators:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Both parties should first attempt to resolve the issue directly</li>
                  <li>If unresolved, either party can escalate to our support team</li>
                  <li>Our team will review all evidence and communications</li>
                  <li>Decisions will be made within 3-5 business days</li>
                  <li>All decisions are final and binding</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Platform Fees</h2>
              <div className="space-y-4 text-gray-700">
                <p>Additional fees may apply for:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Premium account features: ₹999/month</li>
                  <li>Featured listing placement: ₹499/month</li>
                  <li>Advanced analytics dashboard: ₹299/month</li>
                  <li>Priority customer support: ₹199/month</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Terms Updates</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  These terms may be updated from time to time. Users will be notified of any significant changes via
                  email and platform notifications. Continued use of the platform constitutes acceptance of updated
                  terms.
                </p>
                <p className="text-sm text-gray-500">Last updated: December 2024</p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
