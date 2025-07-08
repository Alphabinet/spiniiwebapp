import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Sparkles, // Icon for Lifestyle
  Film,     // Icon for Entertainment
  Laptop,   // Icon for Tech
  Banknote  // Icon for Finance
} from "lucide-react";
import Link from 'next/link'; // Import the Link component

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Container for overall padding and max-width */}
      {/* Added pb-24 for extra bottom padding on all screen sizes to accommodate a potential fixed bottom nav */}
      <div className="container mx-auto px-4 py-8 sm:py-10 md:py-12 pb-24 sm:pb-24 md:pb-24">
        {/* Main grid for footer sections, responsive layout */}
        {/* Adjusted gap for smaller screens, and ensured consistent column behavior */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Company Info Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                SNAAPII
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              The ultimate platform connecting brands with verified digital creators for impactful collaborations and
              campaigns.
            </p>
            {/* Social Media Icons with updated links */}
            <div className="flex space-x-4">
              <a href="https://www.instagram.com/snaapii?igsh=MXF2bzVqbWVvYnR2dQ==" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-400 transition-colors duration-300">
                <Instagram className="h-5 w-5" aria-label="Instagram" />
              </a>
              <a href="https://www.linkedin.com/company/snaapii/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors duration-300">
                <Linkedin className="h-5 w-5" aria-label="LinkedIn" />
              </a>
            </div>
          </div>

          {/* Quick Links Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors duration-300">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors duration-300">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/campaign" className="text-gray-400 hover:text-white transition-colors duration-300">
                  Campaign
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors duration-300">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

         
          {/* Contact Info Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-blue-400" aria-hidden="true" />
                <span className="text-gray-400 text-sm">business@snaapii.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-green-400" aria-hidden="true" />
                <span className="text-gray-400 text-sm">+91 70849 89378</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-purple-400" aria-hidden="true" />
                <span className="text-gray-400 text-sm">Sultanpur Uttar Pradesh 222303</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar - Copyright and Policies */}
        <div className="border-t border-gray-800 mt-8 pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} SNAAPII. All rights reserved. {" "}
            Developed by{" "}
            <a
              href="https://alphabinet.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-white transition-colors duration-300"
            >
              Alphabinet.com
            </a>
          </p>
          <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2 text-sm">
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors duration-300">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-white transition-colors duration-300">
              Terms & Conditions
            </Link>
            <Link href="/cookiepolicy" className="text-gray-400 hover:text-white transition-colors duration-300">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}