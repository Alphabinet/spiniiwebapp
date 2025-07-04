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

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Container for overall padding and max-width */}
      <div className="container mx-auto px-4 py-8 sm:py-10 md:py-12">
        {/* Main grid for footer sections, responsive layout */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Company Info Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                SNAPII
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              The ultimate platform connecting brands with verified digital creators for impactful collaborations and
              campaigns.
            </p>
            {/* Social Media Icons with updated links */}
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-300">
                <Facebook className="h-5 w-5" aria-label="Facebook" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-300">
                <Twitter className="h-5 w-5" aria-label="Twitter" />
              </a>
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
                <a href="/" className="text-gray-400 hover:text-white transition-colors duration-300">
                  Home
                </a>
              </li>
              <li>
                <a href="/about" className="text-gray-400 hover:text-white transition-colors duration-300">
                  About Us
                </a>
              </li>
              <li>
                <a href="/campaign" className="text-gray-400 hover:text-white transition-colors duration-300">
                  Campaign
                </a>
              </li>
              <li>
                <a href="/terms-conditions" className="text-gray-400 hover:text-white transition-colors duration-300">
                  Terms & Conditions
                </a>
              </li>
            </ul>
          </div>

          {/* Influencer Categories Section - Icons with Purple Color and Dark Purple Background */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Influencer Categories</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <div className="flex items-center mb-1">
                  <span className="p-2 bg-purple-900 rounded-full flex items-center justify-center mr-2">
                    <Sparkles className="h-4 w-4 text-purple-300" aria-hidden="true" />
                  </span>
                  <strong className="text-white">Lifestyle</strong>
                </div>
                <ul className="ml-10 space-y-1"> {/* Adjusted margin-left for better alignment */}
                  <li><span className="text-gray-400">Fashion & Styling</span></li>
                  <li><span className="text-gray-400">Skincare & Beauty</span></li>
                  <li><span className="text-gray-400">Fitness & Wellness</span></li>
                  <li><span className="text-gray-400">Home Decor</span></li>
                  <li><span className="text-gray-400">Travel & Experiences</span></li>
                </ul>
              </li>
              <li>
                <div className="flex items-center mb-1">
                  <span className="p-2 bg-purple-900 rounded-full flex items-center justify-center mr-2">
                    <Film className="h-4 w-4 text-purple-300" aria-hidden="true" />
                  </span>
                  <strong className="text-white">Entertainment</strong>
                </div>
                <ul className="ml-10 space-y-1">
                  <li><span className="text-gray-400">Comedy</span></li>
                  <li><span className="text-gray-400">Memes</span></li>
                  <li><span className="text-gray-400">Music Videos</span></li>
                  <li><span className="text-gray-400">Series Reviews</span></li>
                  <li><span className="text-gray-400">Funny</span></li>
                </ul>
              </li>
              <li>
                <div className="flex items-center mb-1">
                  <span className="p-2 bg-purple-900 rounded-full flex items-center justify-center mr-2">
                    <Laptop className="h-4 w-4 text-purple-300" aria-hidden="true" />
                  </span>
                  <strong className="text-white">Tech</strong>
                </div>
                <ul className="ml-10 space-y-1">
                  <li><span className="text-gray-400">Mobile & Gadget Review</span></li>
                  <li><span className="text-gray-400">Unboxing & Tech Setup</span></li>
                  <li><span className="text-gray-400">Laptop / PC Accessories</span></li>
                  <li><span className="text-gray-400">App & Software Tutorials</span></li>
                  <li><span className="text-gray-400">Tech Tips & Hacks</span></li>
                </ul>
              </li>
              <li>
                <div className="flex items-center mb-1">
                  <span className="p-2 bg-purple-900 rounded-full flex items-center justify-center mr-2">
                    <Banknote className="h-4 w-4 text-purple-300" aria-hidden="true" />
                  </span>
                  <strong className="text-white">Finance</strong>
                </div>
                <ul className="ml-10 space-y-1">
                  <li><span className="text-gray-400">Stock Market & Investing</span></li>
                  <li><span className="text-gray-400">Crypto</span></li>
                  <li><span className="text-gray-400">Saving Tips</span></li>
                  <li><span className="text-gray-400">Income Ideas</span></li>
                  <li><span className="text-gray-400">Startup Advice</span></li>
                </ul>
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
            © {new Date().getFullYear()} SNAPII. All rights reserved. {" "}
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
            <a href="/privacy" className="text-gray-400 hover:text-white transition-colors duration-300">
              Privacy Policy
            </a>
            <a href="/terms-conditions" className="text-gray-400 hover:text-white transition-colors duration-300">
              Terms & Conditions
            </a>
            <a href="/cookie-policy" className="text-gray-400 hover:text-white transition-colors duration-300">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
