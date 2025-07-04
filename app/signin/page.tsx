"use client";

import React, { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, User, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";

// Firebase imports for Authentication
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User as FirebaseAuthUser,
  AuthError,
} from 'firebase/auth';

// Firebase imports for Firestore
import {
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';

// Assuming you have this file for Firebase initialization
import { auth, db } from "@/lib/firebaseConfig"; // Import the initialized auth and db instances

export default function SignInSignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "", // Added name for signup
  });
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

  // State to track if auth and db objects are ready for use
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  // Helper function to store/update user details in Firestore
  const storeUserInFirestore = async (user: FirebaseAuthUser, userName: string | null = null) => {
    if (!db) {
      console.error("Firestore DB instance is not available.");
      return;
    }
    const userRef = doc(db, "users", user.uid); // Reference to the user's document in 'users' collection

    try {
      const docSnap = await getDoc(userRef); // Check if user document already exists

      if (docSnap.exists()) {
        // User exists, update lastSignInTime
        console.log("User already exists in Firestore, updating lastSignInTime.");
        await setDoc(userRef, {
          lastSignInTime: new Date().toISOString(), // Update last sign-in time
        }, { merge: true }); // Use merge: true to update specific fields without overwriting
      } else {
        // New user, create new document
        console.log("New user, creating document in Firestore.");
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          name: userName || user.displayName || 'Anonymous User', // Use provided name, or Google displayName, or fallback
          createdAt: new Date().toISOString(), // Record creation time
          lastSignInTime: new Date().toISOString(), // Record first sign-in time
          // You can add more user-specific fields here if needed
        });
      }
    } catch (firestoreError) {
      console.error("Error storing/updating user in Firestore:", firestoreError);
      setAuthError("Failed to save user data. Please try again.");
    }
  };

  // --- Firebase Authentication Listener ---
  useEffect(() => {
    if (!auth || !db) {
      console.error("Firebase Auth or DB instance is not available.");
      setAuthError("Authentication or database service not initialized. Please check Firebase config.");
      setIsFirebaseReady(true); // Mark ready to stop loader, but with an error
      return;
    }

    // Set up initial authentication state listener
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseAuthUser | null) => {
      // This listener runs on initial load and on any auth state change (login/logout)
      if (user) {
        console.log("Auth state changed: User is logged in with UID:", user.uid);
        // We only store user details after a successful explicit sign-in/up action,
        // not just on auth state change from page load, to avoid redundant writes.
      } else {
        console.log("Auth state changed: No user is logged in.");
      }
      setIsFirebaseReady(true); // Mark Firebase services as ready after initial auth check
    });

    return () => unsubscribe(); // Cleanup auth listener on component unmount
  }, []); // Empty dependency array means this runs once on mount

  // --- Form Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setAuthError(null); // Clear errors on input change
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseReady) {
      setAuthError("Firebase services not ready.");
      return;
    }
    setLoading(true);
    setAuthError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      console.log("User signed in successfully!");
      // Store/update user details in Firestore after successful sign-in
      await storeUserInFirestore(userCredential.user);
      router.push("/dashboard"); // Redirect to dashboard on successful login
    } catch (error: unknown) {
      console.error("Sign-in failed:", error);
      let errorMessage = "Sign-in failed. Please check your credentials.";
      if (error instanceof Error && 'code' in error) {
        const authError = error as AuthError;
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
          errorMessage = "Invalid email or password.";
        } else if (authError.code === 'auth/invalid-email') {
          errorMessage = "Please enter a valid email address.";
        } else if (authError.code === 'auth/too-many-requests') {
          errorMessage = "Too many failed login attempts. Please try again later.";
        }
      }
      setAuthError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseReady) {
      setAuthError("Firebase services not ready.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }
    if (formData.password.length < 6) {
      setAuthError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      console.log("User signed up successfully!");
      // Store/update user details in Firestore after successful sign-up
      await storeUserInFirestore(userCredential.user, formData.name);
      router.push("/dashboard"); // Redirect to dashboard on successful signup
    } catch (error: unknown) {
      console.error("Sign-up failed:", error);
      let errorMessage = "Sign-up failed. Please try again.";
      if (error instanceof Error && 'code' in error) {
        const authError = error as AuthError;
        if (authError.code === 'auth/email-already-in-use') {
          errorMessage = "This email is already in use.";
        } else if (authError.code === 'auth/invalid-email') {
          errorMessage = "Please enter a valid email address.";
        } else if (authError.code === 'auth/weak-password') {
          errorMessage = "Password is too weak. It must be at least 6 characters.";
        }
      }
      setAuthError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!isFirebaseReady) {
      setAuthError("Firebase services not ready.");
      return;
    }
    setLoading(true);
    setAuthError(null);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      console.log("Signed in with Google successfully!");
      // Store/update user details in Firestore after successful Google login
      // Google Auth often provides displayName directly, so we use that as fallback
      await storeUserInFirestore(userCredential.user, userCredential.user.displayName);
      router.push("/dashboard"); // Redirect to dashboard on successful Google login
    } catch (error: unknown) {
      console.error("Google authentication failed:", error);
      let errorMessage = "Google sign-in failed. Please try again.";
      if (error instanceof Error && 'code' in error) {
        const authError = error as AuthError;
        if (authError.code === 'auth/popup-closed-by-user') {
          errorMessage = "Google sign-in was cancelled.";
        } else if (authError.code === 'auth/cancelled-popup-request') {
          errorMessage = "Another sign-in pop-up is already open.";
        } else if (authError.code === 'auth/account-exists-with-different-credential') {
          errorMessage = "An account with this email already exists using different credentials.";
        }
      }
      setAuthError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Display loading state until Firebase Auth and DB are confirmed ready
  if (!isFirebaseReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="ml-3 text-lg text-gray-700">Initializing authentication and database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm w-full border border-gray-100 transform hover:scale-[1.005] transition-transform duration-300">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          SNAPII
        </h1>
        <p className="text-center text-gray-600 mb-8 text-lg">Your gateway to powerful collaborations.</p>

        {authError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6 text-sm" role="alert">
            <span className="block sm:inline">{authError}</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 rounded-full p-1">
            <TabsTrigger
              value="signin"
              className="text-base sm:text-lg font-semibold text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-full transition-all duration-200"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="text-base sm:text-lg font-semibold text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-full transition-all duration-200"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-signin" className="text-sm font-medium text-gray-700">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="email-signin"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password-signin" className="text-sm font-medium text-gray-700">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="password-signin"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-200"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 py-2.5 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign In
              </Button>
            </form>

            <div className="text-center">
              <button className="text-sm text-blue-600 hover:underline font-medium" disabled={loading}>Forgot your password?</button>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="space-y-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name-signup" className="text-sm font-medium text-gray-700">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="name-signup"
                    name="name"
                    type="text"
                    placeholder="Enter your full name"
                    className="pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-signup" className="text-sm font-medium text-gray-700">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="email-signup"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password-signup" className="text-sm font-medium text-gray-700">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="password-signup"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password (min 6 chars)"
                    className="pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-200"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword-signup" className="text-sm font-medium text-gray-700">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="confirmPassword-signup"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 py-2.5 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative my-6">
          <Separator className="bg-gray-200" />
          <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-sm text-gray-500 font-medium">
            or
          </span>
        </div>

        <Button
          variant="outline"
          className="w-full py-2.5 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600 transition-colors duration-200 rounded-lg shadow-sm"
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
