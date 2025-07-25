import {
  Mail,
  MapPin,
  Instagram,
  Linkedin,
} from "lucide-react"; // Removed Phone as we're using a custom SVG for WhatsApp
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="container mx-auto px-4 py-8 sm:py-10 md:py-12 pb-24 sm:pb-24 md:pb-24">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Company Info Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Image
                src="/snaapii.png"
                alt="SNAAPII Logo"
                width={100}
                height={40}
                className="h-auto"
              />
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
              <li>
                <Link href="/return-refund" className="text-gray-400 hover:text-white transition-colors duration-300">
                  Return & Refund Policy
                </Link>
              </li>
              {/* Add the new Data Deletion Policy link here */}
              <li>
                <Link href="/data-deletion-policy" className="text-gray-400 hover:text-white transition-colors duration-300">
                  Data Deletion Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Contact Us</h3>
            <div className="space-y-3">
              {/* Mailto link */}
              <a
                href="mailto:contact@snaapii.com"
                className="flex items-center space-x-3 text-gray-400 hover:text-white transition-colors duration-300"
              >
                <Mail className="h-4 w-4 text-blue-400" aria-hidden="true" />
                <span className="text-sm">contact@snaapii.com</span>
              </a>
              {/* WhatsApp link with custom SVG icon */}
              <a
                href="https://wa.me/917317016213"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 text-gray-400 hover:text-white transition-colors duration-300"
              >
                {/* WhatsApp SVG Icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4 text-green-400"
                  aria-hidden="true"
                >
                  <path d="M12.04 2C7.03 2 3 6.03 3 11.04c0 1.94.63 3.74 1.72 5.2L3.08 21.03l4.89-1.28c1.3.73 2.8 1.14 4.07 1.14h.01c5.01 0 9.04-4.03 9.04-9.04S17.05 2 12.04 2zm3.87 13.92c-.17.15-.3.2-.56.28-.27.08-.98.37-1.12.39-.14.02-.24.03-.49-.1s-1.5-.68-1.84-.81-.57-.2-.8-.2-.3-.15-.65.1-.9.84-1.12 1.01-.45.2-.84.02c-1.1-.55-2.2-1.25-3.07-2.3-1.07-1.32-1.79-2.8-1.8-3.04-.01-.24.16-.38.25-.47.09-.09.2-.18.27-.29.08-.1.17-.2.25-.33.08-.13.03-.25-.03-.35-.06-.1-.23-.25-.33-.27-.08-.02-.17-.02-.45-.02h-.48c-.27 0-.7-.08-.96.44s-.95 2.3.93 4.54c1.88 2.24 3.65 2.92 3.99 3.06.34.14.54.1.72.09.2-.01.65-.25.75-.38.1-.13.36-.3.51-.4.16-.1.29-.14.5-.07.2.07 1.3.84 1.49.95.19.1.33.15.36.16.03.01.18.06.31.02.13-.04.83-.34 1.05-.42.22-.08.3-.13.34-.2.04-.07.08-.13.12-.2.04-.07.08-.13.1-.2.01-.06.01-.12.02-.19v-.01c.02-.06.03-.12.03-.19.01-.06.01-.12.01-.19-.01-.15-.02-.2-.25-.34z" />
                </svg>
                <span className="text-sm">+91 7317016213</span>
              </a>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-purple-400" aria-hidden="true" />
                <span className="text-gray-400 text-sm">Sultanpur Uttar Pradesh 222303</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar - Copyright and Policies */}
        <div className="border-t border-gray-800 mt-8 pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
          <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2 text-sm mb-4">
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors duration-300">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-white transition-colors duration-300">
              Terms & Conditions
            </Link>
            <Link href="/cookiepolicy" className="text-gray-400 hover:text-white transition-colors duration-300">
              Cookie Policy
            </Link>
            <Link href="/return-refund" className="text-gray-400 hover:text-white transition-colors duration-300">
              Return & Refund Policy
            </Link>
            {/* Also add it to the bottom bar for consistency if desired */}
            <Link href="/datadeletion" className="text-gray-400 hover:text-white transition-colors duration-300">
              Data Deletion Policy
            </Link>
          </div>
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
        </div>
      </div>
    </footer>
  );
}