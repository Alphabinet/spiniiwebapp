"use client";

import { useState, useEffect } from "react";
import { Mail, MapPin, Send, User2 } from "lucide-react";
// To use the WhatsApp icon, you'll need to install the 'react-icons' package:
// npm install react-icons
import { FaWhatsapp } from "react-icons/fa";

// Shadcn UI Components (assuming these are correctly set up in your project)
// You might need to adjust the import paths based on your project structure.
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Firebase Imports (assuming firebaseConfig is correctly set up)
import { db, auth } from "@/lib/firebaseConfig";
import { User as FirebaseUser } from "firebase/auth";
import { collection, addDoc, Timestamp } from "firebase/firestore";


// --- MAIN COMPONENT ---
export default function ContactPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  // --- Firebase Authentication Listener ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        setFormData((prev) => ({
          ...prev,
          name: user.displayName || "",
          email: user.email || "",
        }));
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) {
      setError("You must be logged in to send a message.");
      setSubmitStatus("error");
      return;
    }
    if (!formData.name || !formData.email || !formData.message) {
      setError("Please fill out all fields.");
      setSubmitStatus("error");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSubmitStatus("idle");

    try {
      // Save message to a user-specific collection for privacy and organization
      const messagesCollectionRef = collection(
        db,
        `users/${currentUser.uid}/contactMessages`
      );

      await addDoc(messagesCollectionRef, {
        ...formData,
        userId: currentUser.uid,
        timestamp: Timestamp.now(),
      });

      setSubmitStatus("success");
      setFormData((prev) => ({ ...prev, message: "" })); // Clear message field on success
    } catch (submitError) {
      console.error("Error submitting form:", submitError);
      setError("Failed to send message. Please try again.");
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while checking authentication
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <header className="text-center mb-12">
          <Badge variant="secondary" className="mb-3 bg-blue-100 text-blue-800">
            Get in Touch
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            We&apos;d Love to Hear From You
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Have a question or a suggestion? Feel free to reach out.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Information Section */}
          <div className="flex flex-col gap-6">
            <Card className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full">
              <CardContent className="p-0 flex flex-col gap-6">
                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <Mail className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Email Us</h3>
                    <a href="mailto:business@snaapii.com" className="text-gray-600 hover:text-purple-600">
                      business@snaapii.com
                    </a>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="flex items-start gap-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <FaWhatsapp className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Message on WhatsApp</h3>
                    <a href="https://wa.me/917084989378" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-green-600">
                      +91 70849 89378
                    </a>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <MapPin className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Visit Us</h3>
                    <address className="text-gray-600 not-italic">
                      222303 Sultanpur, <br />
                      Uttar Pradesh, India
                    </address>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form Section */}
          <div className="w-full">
            <Card className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                Send a Message
              </h2>
              {!currentUser ? (
                <div className="text-center bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-lg flex flex-col items-center gap-3">
                  <User2 className="h-10 w-10 text-yellow-600" />
                  <p className="font-semibold">Please log in to send a message.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Your Name</Label>
                      <Input id="name" type="text" value={formData.name} readOnly className="bg-gray-100 cursor-not-allowed h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Your Email</Label>
                      <Input id="email" type="email" value={formData.email} readOnly className="bg-gray-100 cursor-not-allowed h-12" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Your Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us what's on your mind..."
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="p-4"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-bold rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Sending..." : <><Send className="h-4 w-4 mr-2" />Send Message</>}
                  </Button>
                  {submitStatus === "success" && (
                    <p className="mt-3 text-center text-green-600 font-semibold">
                      Message sent successfully!
                    </p>
                  )}
                  {submitStatus === "error" && error && (
                    <p className="mt-3 text-center text-red-600 font-semibold">
                      {error}
                    </p>
                  )}
                </form>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
