// This file should be placed at `app/contact/page.tsx`

"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, User2 } from "lucide-react";

// Shadcn UI Components
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Firebase Imports from your centralized config
import { db, auth } from "@/lib/firebaseConfig";
import { User as FirebaseUser } from "firebase/auth";
import { collection, addDoc, Timestamp } from "firebase/firestore";

// Declare global __app_id if it's injected by the environment
declare const __app_id: string;

// --- MAIN COMPONENT ---
export default function ContactPage() {
  // Firebase State (simplified as we import db and auth)
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false); // Tracks if Firebase auth state has been checked
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  
  // Ref to prevent multiple initializations
  const isInitialized = useRef(false);

  // --- Firebase Authentication Listener ---
  useEffect(() => {
    // Prevent re-initialization on re-renders
    if (isInitialized.current) {
        return;
    }
    isInitialized.current = true;

    if (!auth) {
      setError("Firebase Auth not initialized. Check firebaseConfig.ts");
      setIsAuthReady(true);
      return;
    }

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setUserId(user ? user.uid : null);
      setIsAuthReady(true); // Auth state has been checked
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [auth]); // Depend on 'auth' instance

  // --- Auto-fill form data based on authenticated user ---
  useEffect(() => {
    if (currentUser) {
      setFormData((prevData) => ({
        ...prevData,
        name: currentUser.displayName || "",
        email: currentUser.email || "",
      }));
    } else {
      // Clear fields if user logs out
      setFormData((prevData) => ({
        ...prevData,
        name: "",
        email: "",
      }));
    }
  }, [currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!currentUser || !userId || !db) {
      setSubmitStatus("error");
      setError("You must be logged in to send a message.");
      return;
    }

    if (!formData.name || !formData.email || !formData.message) {
      setSubmitStatus("error");
      setError("All fields are required.");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      // The __app_id is provided by the Canvas environment for the Firestore path
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      
      // Define the Firestore collection path
      const contactMessagesCollectionRef = collection(
        db,
        `artifacts/${appId}/users/${userId}/contactMessages`
      );

      await addDoc(contactMessagesCollectionRef, {
        name: formData.name,
        email: formData.email,
        message: formData.message,
        userId: userId,
        userEmail: currentUser.email || "N/A",
        userName: currentUser.displayName || "N/A",
        timestamp: Timestamp.now(),
      });

      setSubmitStatus("success");
      setFormData((prevData) => ({
        ...prevData,
        message: "", // Clear the message field on success
      }));
    } catch (submitError) {
      console.error("Error submitting contact form:", submitError);
      setSubmitStatus("error");
      setError("Failed to send message. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Conditional rendering for content based on Firebase auth readiness
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-purple-50 py-8 md:py-12">
        <div className="text-center text-gray-600 py-10">
          <svg className="animate-spin inline-block h-6 w-6 text-blue-500 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading application...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 py-8 md:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl"> {/* Reduced max-width */}
        <motion.header
          className="text-center mb-12 md:mb-16" // Reduced margin
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="secondary" className="text-xs px-3 py-1 rounded-full mb-3 bg-blue-200 text-blue-800"> {/* Smaller badge */}
            Get in Touch
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight"> {/* Smaller heading */}
            We'd Love to Hear from You
          </h1>
          <p className="text-base text-gray-600 max-w-2xl mx-auto"> {/* Smaller paragraph text */}
            Whether you have a question, a suggestion, or just want to say hi, feel free to reach out.
          </p>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12"> {/* Reduced gap */}
          {/* Contact Information Section */}
          <motion.div
            className="flex flex-col gap-6" // Reduced gap
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-purple-100 h-full"> {/* Reduced padding and border radius */}
              <CardContent className="p-0 flex flex-col gap-6">
                <div className="flex items-start gap-4"> {/* Reduced gap */}
                  <div className="bg-purple-100 p-3 rounded-full"> {/* Smaller icon container */}
                    <Mail className="h-6 w-6 text-purple-600" /> {/* Smaller icon */}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Email Us</h3> {/* Smaller heading */}
                    <a
                      href="mailto:business@snaapii.com"
                      className="text-base text-gray-600 font-medium hover:text-purple-600 transition-colors"
                    >
                      business@snaapii.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Phone className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Call Us</h3>
                    <a
                      href="tel:+917084989378"
                      className="text-base text-gray-600 font-medium hover:text-blue-600 transition-colors"
                    >
                      +91 70849 89378
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <MapPin className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Visit Us</h3>
                    <address className="text-base text-gray-600 font-medium not-italic">
                      222303 Sultanpur, <br />
                      Uttar Pradesh, India
                    </address>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Form Section */}
          <motion.div
            className="w-full"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-purple-100"> {/* Reduced padding and border radius */}
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center"> {/* Smaller heading */}
                Send a Message
              </h2>
              {/* Conditional Rendering based on Authentication */}
              {!currentUser ? (
                <div className="text-center bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-xl flex flex-col items-center gap-3"> {/* Reduced padding */}
                  <User2 className="h-10 w-10 text-yellow-600" /> {/* Smaller icon */}
                  <p className="text-lg font-semibold">Please log in to send a message.</p> {/* Smaller text */}
                  <p className="text-sm text-yellow-700">
                    This form is exclusively for authenticated users.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5"> {/* Reduced space */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5"> {/* Reduced gap */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-700">Your Name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        readOnly={!!currentUser?.displayName}
                        className={`rounded-xl p-4 h-12 text-base transition-all ${ // Smaller input height
                          !!currentUser?.displayName ? 'bg-gray-100 cursor-not-allowed' : 'focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
                        }`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-700">Your Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        readOnly={!!currentUser?.email}
                        className={`rounded-xl p-4 h-12 text-base transition-all ${ // Smaller input height
                          !!currentUser?.email ? 'bg-gray-100 cursor-not-allowed' : 'focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-gray-700">Your Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us what's on your mind..."
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5} // Reduced rows
                      className="rounded-xl p-4 text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-bold rounded-xl // Smaller button height and font
                    bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700
                    transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2"
                    disabled={isSubmitting || !currentUser}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Message <Send className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                  {submitStatus === "success" && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 text-center text-green-600 text-sm font-semibold"
                    >
                      Thank you! Your message has been sent successfully.
                    </motion.p>
                  )}
                  {submitStatus === "error" && error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 text-center text-red-600 text-sm font-semibold"
                    >
                      {error}
                    </motion.p>
                  )}
                </form>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}