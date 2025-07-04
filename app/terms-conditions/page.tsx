import Navigation from "../components/Navigation"
import Footer from "../components/Footer"

export default function TermsConditionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onContact={() => {}} />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 text-center">Terms & Conditions</h1>

          <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  By accessing and using CollabSphere ("the Platform"), you accept and agree to be bound by the terms
                  and provision of this agreement. If you do not agree to abide by the above, please do not use this
                  service.
                </p>
                <p>
                  These Terms and Conditions govern your use of our website and services. By using our platform, you
                  acknowledge that you have read, understood, and agree to be bound by these terms.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Use License</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Permission is granted to temporarily download one copy of the materials on CollabSphere's website for
                  personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of
                  title, and under this license you may not:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Modify or copy the materials</li>
                  <li>Use the materials for any commercial purpose or for any public display</li>
                  <li>Attempt to reverse engineer any software contained on the website</li>
                  <li>Remove any copyright or other proprietary notations from the materials</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
              <div className="space-y-4 text-gray-700">
                <p>To access certain features of our platform, you must create an account. You are responsible for:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Maintaining the confidentiality of your account credentials</li>
                  <li>All activities that occur under your account</li>
                  <li>Providing accurate and complete information during registration</li>
                  <li>Updating your information to keep it current and accurate</li>
                  <li>Notifying us immediately of any unauthorized use of your account</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Platform Services</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  CollabSphere provides a platform that connects brands with digital creators. Our services include:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Creator discovery and verification services</li>
                  <li>Campaign management tools</li>
                  <li>Payment processing and escrow services</li>
                  <li>Communication and collaboration tools</li>
                  <li>Analytics and reporting features</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Payment Terms</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  All payments are processed through our secure payment system. By using our services, you agree to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Pay all fees and charges associated with your account</li>
                  <li>Provide valid payment information</li>
                  <li>Accept our refund and cancellation policies</li>
                  <li>Pay applicable taxes and fees</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Content and Intellectual Property</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Users retain ownership of content they create and upload to the platform. However, by using our
                  services, you grant us:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>A license to use, display, and distribute your content on the platform</li>
                  <li>The right to moderate and remove content that violates our policies</li>
                  <li>Permission to use your content for promotional purposes</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Prohibited Activities</h2>
              <div className="space-y-4 text-gray-700">
                <p>Users are prohibited from engaging in the following activities:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Violating any applicable laws or regulations</li>
                  <li>Infringing on intellectual property rights</li>
                  <li>Posting harmful, offensive, or inappropriate content</li>
                  <li>Attempting to circumvent platform security measures</li>
                  <li>Engaging in fraudulent or deceptive practices</li>
                  <li>Spamming or sending unsolicited communications</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Privacy Policy</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your
                  information when you use our services. By using our platform, you consent to the collection and use of
                  information in accordance with our Privacy Policy.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitation of Liability</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  In no event shall CollabSphere or its suppliers be liable for any damages (including, without
                  limitation, damages for loss of data or profit, or due to business interruption) arising out of the
                  use or inability to use the materials on CollabSphere's website.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Termination</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  We reserve the right to terminate or suspend your account and access to our services at our sole
                  discretion, without notice, for conduct that we believe violates these Terms and Conditions or is
                  harmful to other users, us, or third parties.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to Terms</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  CollabSphere reserves the right to revise these Terms and Conditions at any time without notice. By
                  using this platform, you are agreeing to be bound by the then current version of these Terms and
                  Conditions.
                </p>
                <p className="text-sm text-gray-500">Last updated: December 2024</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Information</h2>
              <div className="space-y-4 text-gray-700">
                <p>If you have any questions about these Terms and Conditions, please contact us at:</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p>
                    <strong>Email:</strong> legal@collabsphere.com
                  </p>
                  <p>
                    <strong>Phone:</strong> +91 98765 43210
                  </p>
                  <p>
                    <strong>Address:</strong> Mumbai, India
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
