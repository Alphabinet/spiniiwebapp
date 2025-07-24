"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, storage } from "@/lib/firebaseConfig";
import {
    collection, query, where, onSnapshot, DocumentData, doc, setDoc,
    updateDoc, serverTimestamp, orderBy, Timestamp, FieldValue, limit,
    addDoc, getDocs
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { User as FirebaseUser } from "firebase/auth";
import {
    UsersIcon, PlayIcon, EyeIcon, CheckCircleIcon, UserCircleIcon, DocumentTextIcon
} from '@heroicons/react/24/outline';
import Image from "next/image";
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import Script from 'next/script';

// --- Type Definitions ---
interface ApplicationData {
    id: string;
    fullName: string;
    mobileNumber: string;
    emailAddress: string;
    cityState: string;
    gender: string;
    instagramUsername: string;
    instagramProfileLink: string;
    totalFollowers: string;
    avgReelViews: string;
    storyAverageViews: string;
    contentCategory: string;
    contentLanguages: string;
    reelPrice: string;
    storyPrice: string;
    reelsStoryPrice: string;
    deliveryDuration: string;
    profilePictureUrl: string;
    userId: string;
    status: 'pending' | 'approved' | 'rejected';
    timestamp: Timestamp;
    updatedAt?: Timestamp;
    subscriptionStatus?: 'active' | 'inactive';
    subscriptionExpiresAt?: Timestamp;
    adminFeedback?: string;
}

interface UserData {
    fullName?: string;
    mobileNumber?: string;
    cityState?: string;
    gender?: string;
    email?: string;
    userId?: string;
    accountType?: 'normal' | 'creator';
    updatedAt?: Timestamp | FieldValue;
    createdAt?: Timestamp | FieldValue;
    subscriptionStatus?: 'active' | 'inactive';
    subscriptionExpiresAt?: Timestamp;
}

interface Activity {
    type: string;
    description: string;
    time: string;
}

// ===== Subscription Component (Updated & Fixed) =====
function SubscriptionCard({ user, userData, creatorApplication }: { user: FirebaseUser, userData: UserData | null, creatorApplication: ApplicationData | null }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isSDKReady, setIsSDKReady] = useState(false);

    const plan = { name: "Creator Pro Monthly", amount: 1.00 };

    const isProfileApproved = creatorApplication?.status === 'approved';

    const handlePurchase = async () => {
        // More robust client-side check to provide immediate feedback.
        // The server provides the definitive validation.
        if (!isSDKReady) {
            setMessage('Payment SDK is not ready yet. Please wait a moment.');
            return;
        }
        if (!userData?.fullName || userData.fullName.length < 2) {
            setMessage('Your full name is required. Please update your profile first.');
            return;
        }
        if (!userData?.mobileNumber || !/^[6-9]\d{9}$/.test(userData.mobileNumber)) {
            setMessage('A valid 10-digit mobile number is required. Please update your profile.');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const token = await user.getIdToken();

            const response = await fetch('/api/cashfree/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userEmail: user.email,
                    userName: userData.fullName,
                    userPhone: userData.mobileNumber,
                    plan: plan,
                    userId: user.uid,
                }),
            });

            const data = await response.json();

            // Handle both success and specific failure messages from the server
            if (data.success && data.payment_session_id) {
                const cashfree = (window as any).Cashfree({ mode: process.env.NEXT_PUBLIC_CASHFREE_MODE || "production" });
                cashfree.checkout({
                    paymentSessionId: data.payment_session_id,
                    redirectTarget: "_self"
                });
            } else {
                // Display the specific, user-friendly error from the server
                setMessage(`Error: ${data.message || 'Could not initiate payment.'}`);
            }
        } catch (error) {
            setMessage('An unexpected error occurred. Please try again.');
            console.error("Subscription purchase error:", error);
        } finally {
            setLoading(false);
        }
    };

    const isSubscribed = userData?.subscriptionStatus === 'active' &&
        (userData?.subscriptionExpiresAt?.toDate() ?? new Date(0)) > new Date();

    if (!isProfileApproved) {
        return (
            <div className="p-6 sm:p-8 rounded-2xl shadow-2xl flex flex-col bg-zinc-800 text-center">
                <div className="text-center">
                    <p className="font-semibold text-sm sm:text-base text-yellow-400">PREMIUM MEMBERSHIP</p>
                    <h3 className="text-xl sm:text-2xl font-bold mt-1 text-white">EXCLUSIVE ACCESS</h3>
                </div>
                <div className="border border-yellow-400/50 rounded-xl p-6 my-6 sm:my-8 text-center bg-zinc-900/50 flex-grow flex flex-col justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h4 className="font-bold text-lg text-white">Profile Not Approved</h4>
                    <p className="text-gray-300 mt-2 text-sm">
                        {creatorApplication?.status === 'pending'
                            ? "Your application is under review. Once approved, you'll be able to subscribe."
                            : "Please update your application based on our feedback to become eligible for a subscription."
                        }
                    </p>
                </div>
            </div>
        );
    }
    
    return (
        <>
            <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" onLoad={() => setIsSDKReady(true)} strategy="afterInteractive" />
            <div className={`p-6 sm:p-8 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden ${isSubscribed ? 'bg-green-700 text-white' : 'bg-zinc-800'}`}>
                {!isSubscribed && (
                    <div className="absolute top-0 right-0 h-24 w-24">
                        <div className="absolute transform rotate-45 bg-red-600 text-center text-white font-semibold py-1 right-[-40px] top-[20px] w-[140px] shadow-lg">
                            OFF
                        </div>
                    </div>
                )}
                <div className="text-center">
                    <p className={`font-semibold text-sm sm:text-base ${isSubscribed ? 'text-green-200' : 'text-yellow-400'}`}>PREMIUM MEMBERSHIP</p>
                    <h3 className="text-xl sm:text-2xl font-bold mt-1">EXCLUSIVE ACCESS</h3>
                </div>
                {isSubscribed ? (
                    <div className="border border-green-400/50 rounded-xl p-6 my-6 sm:my-8 text-center bg-green-900/50">
                        <p className="text-3xl sm:text-4xl font-bold">Expires On:</p>
                        <p className="text-2xl sm:text-3xl font-bold mt-1">
                            {userData?.subscriptionExpiresAt ? new Date(userData.subscriptionExpiresAt.toDate()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                        </p>
                    </div>
                ) : (
                    <div className="border border-yellow-400/50 rounded-xl p-6 my-6 sm:my-8 text-center bg-zinc-900/50">
                        <p className="text-4xl sm:text-5xl font-bold text-white">₹{plan.amount} <span className="text-xl sm:text-2xl text-gray-400 line-through ml-2">₹999</span></p>
                        <p className="text-gray-300 text-sm sm:text-base">per month</p>
                    </div>
                )}
                {!isSubscribed && (
                    <div className="text-center mb-6 sm:mb-8">
                        <p className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full inline-block font-semibold text-sm">
                            LIMITED TIME OFFER
                        </p>
                    </div>
                )}
                <ul className={`space-y-3 sm:space-y-4 mb-8 sm:mb-10 flex-grow text-left text-white/90 text-sm sm:text-base ${isSubscribed ? 'text-green-100' : ''}`}>
                    <li className="flex items-center gap-3"><CheckCircleIcon className={`w-5 h-5 ${isSubscribed ? 'text-green-200' : 'text-yellow-400'}`}/> Get Featured on Homepage</li>
                    <li className="flex items-center gap-3"><CheckCircleIcon className={`w-5 h-5 ${isSubscribed ? 'text-green-200' : 'text-yellow-400'}`}/> Unlimited Brand Collaborations</li>
                    <li className="flex items-center gap-3"><CheckCircleIcon className={`w-5 h-5 ${isSubscribed ? 'text-green-200' : 'text-yellow-400'}`}/> No Direct Talk with Brands – We Handle Everything</li>
                    <li className="flex items-center gap-3"><CheckCircleIcon className={`w-5 h-5 ${isSubscribed ? 'text-green-200' : 'text-yellow-400'}`}/> 100% Payment Security</li>
                    <li className="flex items-center gap-3"><CheckCircleIcon className={`w-5 h-5 ${isSubscribed ? 'text-green-200' : 'text-yellow-400'}`}/> 24×7 Priority Support</li>
                    <li className="flex items-center gap-3"><CheckCircleIcon className={`w-5 h-5 ${isSubscribed ? 'text-green-200' : 'text-yellow-400'}`}/> No hidden charges</li>
                </ul>
                <button
                    onClick={handlePurchase}
                    disabled={loading || isSubscribed}
                    className="w-full text-center px-6 py-3 sm:py-4 bg-gradient-to-b from-yellow-400 to-amber-500 text-zinc-900 rounded-lg font-bold hover:from-yellow-500 hover:to-amber-600 transition-transform transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg"
                >
                    {loading ? "Processing..." : (isSubscribed ? "Subscribed" : "Get Started")}
                </button>
                {message && <p className={`text-center mt-4 text-sm ${isSubscribed ? 'text-green-100' : 'text-red-400'}`}>{message}</p>}
                {isSubscribed && <p className="text-center mt-4 text-xs sm:text-sm text-green-100">Enjoy your premium benefits!</p>}
                <p className={`text-xs text-center mt-4 ${isSubscribed ? 'text-green-200' : 'text-gray-400'}`}>
                    By {isSubscribed ? "being subscribed" : "subscribing"}, you agree to our <Link href="/terms" className="underline">Terms of Service</Link> & <Link href="/privacy" className="underline">Privacy Policy</Link>. Cancel anytime.
                </p>
            </div>
        </>
    );
}

// ===== Success Modal Component =====
function SuccessModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-purple-100 mb-4 sm:mb-6">
                    <svg className="h-8 w-8 sm:h-12 sm:w-12 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Congratulations!</h3>
                <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">
                    Your application has been successfully submitted. We will notify you via email once it has been reviewed and approved by our team.
                </p>
                <button
                    onClick={onClose}
                    className="w-full bg-purple-600 text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg hover:bg-purple-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 text-sm sm:text-base"
                >
                    Got it, thanks!
                </button>
            </div>
        </div>
    );
}

// --- Helper Components & Functions ---

const formatDate = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp) return "N/A";
    try {
        const date = timestamp.toDate();
        return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch (error) {
        console.error("Error formatting date timestamp:", error);
        return "Invalid Date";
    }
};

export function InfoCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
    return (
        <div className="flex items-center space-x-3 p-4 bg-purple-100 rounded-lg">
            <div className="text-gray-700 flex-shrink-0">
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500">{title}</p>
                <p className="text-lg font-bold text-purple-900">{value}</p>
            </div>
        </div>
    );
}

export function ActivityIcon({ type }: { type: string }) {
    const baseStyle = "h-10 w-10 rounded-lg flex items-center justify-center";
    const iconStyle = "h-5 w-5 text-white";
    switch (type) {
        case 'approved':
            return <div className={`${baseStyle} bg-green-500`}><CheckCircleIcon className={iconStyle} /></div>;
        case 'update':
            return <div className={`${baseStyle} bg-purple-500`}><svg className={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></div>;
        case 'submitted':
        default:
            return <div className={`${baseStyle} bg-gray-400`}><svg className={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>;
    }
}

export function MobileNumberPrompt({ onSave }: { onSave: (mobileNumber: string) => Promise<void> }) {
    const [mobileNumber, setMobileNumber] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mobileNumber.trim() || !/^\d{10,15}$/.test(mobileNumber)) {
            setError('Please enter a valid mobile number (10-15 digits).');
            return;
        }
        setError('');
        setIsSaving(true);
        try {
            await onSave(mobileNumber);
        } catch (err) {
            setError('Failed to save. Please try again.');
            console.error(err);
        }
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md text-center">
                <div className="mb-4 text-5xl">📱</div>
                <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
                <p className="text-gray-600 mt-2 mb-6">Please provide your mobile number to continue. This is required to use all features of your account.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 text-left mb-1">Mobile Number</label>
                        <input
                            id="mobileNumber"
                            type="tel"
                            value={mobileNumber}
                            onChange={e => setMobileNumber(e.target.value)}
                            placeholder="Enter your 10-digit mobile number"
                            className="w-full px-4 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        {error && <p className="text-red-500 text-sm mt-2 text-left">{error}</p>}
                    </div>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-purple-300 transition-colors"
                    >
                        {isSaving ? "Saving..." : "Save and Continue"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export function NormalUserProfile({ user, userData, onMobileNumberSave }: { user: FirebaseUser, userData: UserData | null, onMobileNumberSave: (mobileNumber: string) => Promise<void> }) {
    const [formData, setFormData] = useState({ fullName: '', mobileNumber: '', cityState: '', gender: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isMobileNumberMissing, setIsMobileNumberMissing] = useState(false);

    useEffect(() => {
        if (!user || !userData) return;
        setFormData({
            fullName: userData.fullName || user.displayName || '',
            mobileNumber: userData.mobileNumber || '',
            cityState: userData.cityState || '',
            gender: userData.gender || '',
        });
        setIsMobileNumberMissing(!userData.mobileNumber);
    }, [user, userData]);

    const handleSave = async (e: React.FormEvent | string) => {
        let mobileNumberToSave = typeof e === 'string' ? e : formData.mobileNumber;

        if (typeof e !== 'string') {
            e.preventDefault();
        }

        if (!mobileNumberToSave.trim() || !/^\d{10,15}$/.test(mobileNumberToSave)) {
            console.error("Invalid mobile number provided.");
            if (typeof e !== 'string') {
                setSuccessMessage("Please enter a valid mobile number (10-15 digits).");
                setTimeout(() => setSuccessMessage(''), 3000);
            }
            return;
        }

        setIsSaving(true);
        const userDocRef = doc(db, "users", user.uid);
        try {
            const dataToSave: UserData = {
                ...formData,
                mobileNumber: mobileNumberToSave,
                email: user.email,
                userId: user.uid,
                accountType: 'normal',
                updatedAt: serverTimestamp(),
            };
            if (!userData || !userData.createdAt) {
                dataToSave.createdAt = serverTimestamp();
            }
            await setDoc(userDocRef, dataToSave, { merge: true });

            setIsMobileNumberMissing(false);
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Failed to save profile", error);
            setSuccessMessage('Failed to save profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) {
        return null;
    }

    if (isMobileNumberMissing) {
        return <MobileNumberPrompt onSave={onMobileNumberSave} />;
    }

    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold uppercase tracking-wider">Normal User</span>
            </div>
            <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input type="text" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                        <input type="tel" value={formData.mobileNumber} onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input type="email" value={user.email || ''} disabled className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City / State</label>
                        <input type="text" value={formData.cityState} onChange={e => setFormData({ ...formData, cityState: e.target.value })} className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500">
                            <option value="">Select...</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4">
                    <button type="submit" disabled={isSaving} className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-purple-300 transition-colors">
                        {isSaving ? "Saving..." : "Update Profile"}
                    </button>
                    {successMessage && <p className="text-green-600 text-sm font-medium">{successMessage}</p>}
                </div>
            </form>
        </div>
    );
}

interface ApplicationFormProps {
    user: FirebaseUser | null | undefined;
    existingApplication: ApplicationData | null;
    isSubscribed: boolean;
}

export function ApplicationForm({ user, existingApplication, isSubscribed }: ApplicationFormProps) {
    const [formData, setFormData] = useState({
        fullName: existingApplication?.fullName || "",
        mobileNumber: existingApplication?.mobileNumber || "",
        emailAddress: existingApplication?.emailAddress || "",
        cityState: existingApplication?.cityState || "",
        gender: existingApplication?.gender || "",
        instagramUsername: existingApplication?.instagramUsername || "",
        instagramProfileLink: existingApplication?.instagramProfileLink || "",
        totalFollowers: existingApplication?.totalFollowers || "",
        avgReelViews: existingApplication?.avgReelViews || "",
        storyAverageViews: existingApplication?.storyAverageViews || "",
        contentCategory: existingApplication?.contentCategory || "",
        contentLanguages: existingApplication?.contentLanguages || "",
        reelPrice: existingApplication?.reelPrice || "",
        storyPrice: existingApplication?.storyPrice || "",
        reelsStoryPrice: existingApplication?.reelsStoryPrice || "",
        deliveryDuration: existingApplication?.deliveryDuration || "",
    });

    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | ArrayBuffer | null>(
        existingApplication?.profilePictureUrl || null
    );
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) { setErrors(prev => ({ ...prev, [name]: "" })); }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => { setImagePreview(reader.result); };
            reader.readAsDataURL(file);
            if (errors.profilePicture) { setErrors(prev => ({ ...prev, profilePicture: "" })); }
        }
    };

    const triggerFileInput = () => { fileInputRef.current?.click(); };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required.";
        if (!formData.mobileNumber.trim()) newErrors.mobileNumber = "Mobile Number is required.";
        if (!/^\d{10}$/.test(formData.mobileNumber)) newErrors.mobileNumber = "Please enter a valid 10-digit mobile number.";
        if (!formData.emailAddress.trim()) newErrors.emailAddress = "Email Address is required.";
        if (!/\S+@\S+\.\S+/.test(formData.emailAddress)) newErrors.emailAddress = "Please enter a valid email address.";
        if (!formData.cityState.trim()) newErrors.cityState = "City / State is required.";
        if (!formData.gender) newErrors.gender = "Gender is required.";
        if (!formData.instagramUsername.trim()) newErrors.instagramUsername = "Instagram Username is required.";
        if (!formData.instagramProfileLink.trim()) newErrors.instagramProfileLink = "Instagram Profile Link is required.";
        if (!/^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/.test(formData.instagramProfileLink)) newErrors.instagramProfileLink = "Please enter a valid Instagram profile URL.";
        if (!formData.totalFollowers.trim()) newErrors.totalFollowers = "Total Followers count is required.";
        if (!formData.avgReelViews.trim()) newErrors.avgReelViews = "Average Reel Views is required.";
        if (!formData.storyAverageViews.trim()) newErrors.storyAverageViews = "Story Average Views is required.";
        if (!image && !existingApplication?.profilePictureUrl) newErrors.profilePicture = "Profile Picture is required.";
        if (!formData.contentCategory) newErrors.contentCategory = "Content Category is required.";
        if (!formData.contentLanguages.trim()) newErrors.contentLanguages = "Content Language(s) is required.";
        if (!formData.reelPrice.trim()) newErrors.reelPrice = "Reel Price is required.";
        if (!formData.storyPrice.trim()) newErrors.storyPrice = "Story Price is required.";
        if (!formData.reelsStoryPrice.trim()) newErrors.reelsStoryPrice = "Reels + Story Price is required.";
        if (!formData.deliveryDuration.trim()) newErrors.deliveryDuration = "Delivery Duration is required.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validateForm()) return;
        if (!user) { alert("You must be logged in."); return; }
        setUploading(true);

        try {
            let imageUrl = existingApplication?.profilePictureUrl || "";
            if (image) {
                const imageRef = ref(storage, `creator_profiles/${uuidv4()}`);
                await uploadBytes(imageRef, image);
                imageUrl = await getDownloadURL(imageRef);
            }
            
            const dataToSend = {
                ...formData,
                profilePictureUrl: imageUrl,
                userId: user.uid,
                status: existingApplication?.status || "pending",
                timestamp: existingApplication?.timestamp || serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            if (existingApplication) {
                await updateDoc(doc(db, "creatorApplications", existingApplication.id), dataToSend);
            } else {
                await addDoc(collection(db, "creatorApplications"), { ...dataToSend, timestamp: serverTimestamp() });
            }
            setShowSuccessModal(true);
        } catch (err: unknown) {
            console.error("Error submitting/updating creator application:", err);
            if (err instanceof Error) {
                alert(`An error occurred: ${err.message}`);
            } else {
                alert("An unknown error occurred.");
            }
        } finally {
            setUploading(false);
        }
    };

    const contentCategories = ["Fashion", "Tech", "Comedy", "Fitness", "Beauty", "Travel", "Food", "Gaming", "Lifestyle", "Education", "DIY", "Art", "Music", "Dance", "Vlogging", "Health & Wellness"];
    const genders = ["Male", "Female", "Other", "Prefer not to say"];

    return (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
            <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} />

            <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-4 sm:p-6 text-white">
                <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">
                    {existingApplication ? "Update Your Application" : "Creator Application Form"}
                </h1>
                <p className="text-purple-100 text-sm sm:text-base">
                    {existingApplication
                        ? "Make changes to your application details"
                        : "Join our network of talented creators and collaborate with top brands"}
                </p>
            </div>

            <div className="p-4 sm:p-6 md:p-8">
                {isSubscribed && (
                    <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-300 shadow-sm flex items-center">
                        <span className="text-purple-900 font-medium text-xs sm:text-sm">
                            <span className="block sm:inline">👑 Creator Pro:</span> You have an active subscription. Enjoy all premium features freely.
                        </span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                    <div className="space-y-4 sm:space-y-6">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 border-b pb-2">Personal Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <label htmlFor="fullName" className="block text-sm font-medium text-gray-800">Full Name</label>
                                <p className="text-xs text-gray-500 mb-1">Enter your full legal name.</p>
                                <input type="text" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm sm:text-base" />
                                {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                            </div>
                            <div>
                                <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-800">Mobile Number</label>
                                <p className="text-xs text-gray-500 mb-1">Provide your active WhatsApp number.</p>
                                <input type="tel" id="mobileNumber" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm sm:text-base" />
                                {errors.mobileNumber && <p className="text-red-500 text-xs mt-1">{errors.mobileNumber}</p>}
                            </div>
                            <div>
                                <label htmlFor="emailAddress" className="block text-sm font-medium text-gray-800">Email Address</label>
                                <p className="text-xs text-gray-500 mb-1">Enter your email for communication.</p>
                                <input type="email" id="emailAddress" name="emailAddress" value={formData.emailAddress} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm sm:text-base" />
                                {errors.emailAddress && <p className="text-red-500 text-xs mt-1">{errors.emailAddress}</p>}
                            </div>
                            <div>
                                <label htmlFor="cityState" className="block text-sm font-medium text-gray-800">City / State</label>
                                <p className="text-xs text-gray-500 mb-1">Where are you currently based?</p>
                                <input type="text" id="cityState" name="cityState" value={formData.cityState} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm sm:text-base" />
                                {errors.cityState && <p className="text-red-500 text-xs mt-1">{errors.cityState}</p>}
                            </div>
                            <div>
                                <label htmlFor="gender" className="block text-sm font-medium text-gray-800">Gender</label>
                                <p className="text-xs text-gray-500 mb-1">Select your gender.</p>
                                <select id="gender" name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm sm:text-base">
                                    <option value="">Select Gender</option>
                                    {genders.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                                {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 sm:space-y-6 pt-4 border-t">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 border-b pb-2">Instagram Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <label htmlFor="instagramUsername" className="block text-sm font-medium text-gray-800">Instagram Username</label>
                                <p className="text-xs text-gray-500 mb-1">Example: @yourusername</p>
                                <input type="text" id="instagramUsername" name="instagramUsername" value={formData.instagramUsername} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm sm:text-base" />
                                {errors.instagramUsername && <p className="text-red-500 text-xs mt-1">{errors.instagramUsername}</p>}
                            </div>
                            <div>
                                <label htmlFor="instagramProfileLink" className="block text-sm font-medium text-gray-800">Instagram Profile Link</label>
                                <p className="text-xs text-gray-500 mb-1">e.g. https://instagram.com/yourname</p>
                                <input type="url" id="instagramProfileLink" name="instagramProfileLink" value={formData.instagramProfileLink} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm sm:text-base" />
                                {errors.instagramProfileLink && <p className="text-red-500 text-xs mt-1">{errors.instagramProfileLink}</p>}
                            </div>
                            <div>
                                <label htmlFor="totalFollowers" className="block text-sm font-medium text-gray-800">Total Followers</label>
                                <p className="text-xs text-gray-500 mb-1">Enter your current follower count.</p>
                                <input type="number" id="totalFollowers" name="totalFollowers" value={formData.totalFollowers} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm sm:text-base" />
                                {errors.totalFollowers && <p className="text-red-500 text-xs mt-1">{errors.totalFollowers}</p>}
                            </div>
                            <div>
                                <label htmlFor="avgReelViews" className="block text-sm font-medium text-gray-800">Average Reel Views</label>
                                <p className="text-xs text-gray-500 mb-1">How many views do your reels get on average?</p>
                                <input type="number" id="avgReelViews" name="avgReelViews" value={formData.avgReelViews} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm sm:text-base" />
                                {errors.avgReelViews && <p className="text-red-500 text-xs mt-1">{errors.avgReelViews}</p>}
                            </div>
                            <div>
                                <label htmlFor="storyAverageViews" className="block text-sm font-medium text-gray-800">Story Average Views</label>
                                <p className="text-xs text-gray-500 mb-1">How many views do your stories get on average?</p>
                                <input type="number" id="storyAverageViews" name="storyAverageViews" value={formData.storyAverageViews} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm sm:text-base" />
                                {errors.storyAverageViews && <p className="text-red-500 text-xs mt-1">{errors.storyAverageViews}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-800">Profile Picture</label>
                                <p className="text-xs text-gray-500 mb-1">Upload your profile photo.</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 border overflow-hidden flex items-center justify-center">
                                        {imagePreview ? (
                                            <Image src={imagePreview as string} alt="Profile preview" width={64} height={64} className="w-full h-full object-cover" />
                                        ) : (
                                            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        )}
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                                    <button type="button" onClick={triggerFileInput} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50">
                                        Upload
                                    </button>
                                </div>
                                {errors.profilePicture && <p className="text-red-500 text-xs mt-1">{errors.profilePicture}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 sm:space-y-6 pt-4 border-t">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 border-b pb-2">Content & Pricing</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <label htmlFor="contentCategory" className="block text-sm font-medium text-gray-800">Content Category</label>
                                <p className="text-xs text-gray-500 mb-1">e.g. Fashion, Tech, Comedy, etc.</p>
                                <select id="contentCategory" name="contentCategory" value={formData.contentCategory} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm sm:text-base">
                                    <option value="">Select Category</option>
                                    {contentCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                {errors.contentCategory && <p className="text-red-500 text-xs mt-1">{errors.contentCategory}</p>}
                            </div>
                            <div>
                                <label htmlFor="contentLanguages" className="block text-sm font-medium text-gray-800">Content Language(s)</label>
                                <p className="text-xs text-gray-500 mb-1">Which language(s) do you use?</p>
                                <input type="text" id="contentLanguages" name="contentLanguages" value={formData.contentLanguages} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm sm:text-base" />
                                {errors.contentLanguages && <p className="text-red-500 text-xs mt-1">{errors.contentLanguages}</p>}
                            </div>
                            <div>
                                <label htmlFor="reelPrice" className="block text-sm font-medium text-gray-800">Reel Price</label>
                                <p className="text-xs text-gray-500 mb-1">Your charge for 1 Instagram Reel.</p>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">₹</span>
                                    <input type="number" id="reelPrice" name="reelPrice" value={formData.reelPrice} onChange={handleChange} className="w-full pl-7 pr-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm sm:text-base" />
                                </div>
                                {errors.reelPrice && <p className="text-red-500 text-xs mt-1">{errors.reelPrice}</p>}
                            </div>
                            <div>
                                <label htmlFor="storyPrice" className="block text-sm font-medium text-gray-800">Story Price</label>
                                <p className="text-xs text-gray-500 mb-1">Your charge for 1 Instagram Story.</p>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">₹</span>
                                    <input type="number" id="storyPrice" name="storyPrice" value={formData.storyPrice} onChange={handleChange} className="w-full pl-7 pr-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm sm:text-base" />
                                </div>
                                {errors.storyPrice && <p className="text-red-500 text-xs mt-1">{errors.storyPrice}</p>}
                            </div>
                            <div>
                                <label htmlFor="reelsStoryPrice" className="block text-sm font-medium text-gray-800">Reels + Story Price</label>
                                <p className="text-xs text-gray-500 mb-1">Your charge for a combo deal.</p>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">₹</span>
                                    <input type="number" id="reelsStoryPrice" name="reelsStoryPrice" value={formData.reelsStoryPrice} onChange={handleChange} className="w-full pl-7 pr-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm sm:text-base" />
                                </div>
                                {errors.reelsStoryPrice && <p className="text-red-500 text-xs mt-1">{errors.reelsStoryPrice}</p>}
                            </div>
                            <div>
                                <label htmlFor="deliveryDuration" className="block text-sm font-medium text-gray-800">Delivery Duration</label>
                                <p className="text-xs text-gray-500 mb-1">e.g., &quot;3-5 days&quot;</p>
                                <input type="text" id="deliveryDuration" name="deliveryDuration" value={formData.deliveryDuration} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm sm:text-base" />
                                {errors.deliveryDuration && <p className="text-red-500 text-xs mt-1">{errors.deliveryDuration}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 flex flex-col sm:flex-row gap-3">
                        <button
                            type="submit"
                            disabled={uploading}
                            className={`w-full py-2.5 px-4 rounded-lg text-white font-medium ${uploading ? "bg-purple-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
                                } transition duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 text-sm sm:text-base`}
                        >
                            {uploading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : existingApplication ? "Update Application" : "Submit Application"}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setFormData({
                                    fullName: "", mobileNumber: "", emailAddress: "", cityState: "", gender: "",
                                    instagramUsername: "", instagramProfileLink: "", totalFollowers: "", avgReelViews: "",
                                    storyAverageViews: "", contentCategory: "", contentLanguages: "", reelPrice: "",
                                    storyPrice: "", reelsStoryPrice: "", deliveryDuration: "",
                                });
                                setImage(null);
                                setImagePreview(null);
                                setErrors({});
                            }}
                            className="w-full py-2.5 px-4 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-sm sm:text-base"
                        >
                            Reset Form
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export function ApplicationStatus({ application }: { application: ApplicationData | null }) {
    if (!application) {
        return (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 text-center">
                <div className="bg-gray-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">No Application Found</h2>
                <p className="text-gray-600 mb-4 text-sm sm:text-base">
                    You haven&apos;t submitted an application yet. Please submit your creator application to get started.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-5 py-2.5 bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700 transition-colors text-sm sm:text-base"
                >
                    Submit Application
                </button>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "approved": return "bg-green-100 text-green-800";
            case "rejected": return "bg-red-100 text-red-800";
            case "pending": return "bg-yellow-100 text-yellow-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const formatDateForStatus = (timestamp: Timestamp) => {
        if (!timestamp) return "N/A";
        const date = timestamp.toDate();
        return date.toLocaleDateString("en-US", {
            year: "numeric", month: "long", day: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    return (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-4 sm:p-6 text-white">
                <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Application Status</h1>
                <p className="text-purple-100 text-sm sm:text-base">Track your creator application progress</p>
            </div>
            <div className="p-4 sm:p-6">
                <div className="flex flex-col gap-5 sm:gap-8">
                    <div className="sm:pr-4">
                        <div className="mb-6">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 sm:mb-4 gap-2">
                                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Application Details</h2>
                                <span className={`px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(application.status)}`}>
                                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                                </span>
                            </div>
                            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 sm:p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Submitted On</h3>
                                        <p className="font-medium text-sm sm:text-base">{formatDateForStatus(application.timestamp)}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Last Updated</h3>
                                        <p className="font-medium text-sm sm:text-base">{application.updatedAt ? formatDateForStatus(application.updatedAt) : "N/A"}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Full Name</h3>
                                        <p className="font-medium text-sm sm:text-base">{application.fullName}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Instagram</h3>
                                        <a href={application.instagramProfileLink} target="_blank" rel="noopener noreferrer" className="font-medium text-purple-600 hover:underline text-sm sm:text-base">
                                            @{application.instagramUsername}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-200 pt-5 sm:pt-6">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Pricing Information</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                                <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Reel Price</h3>
                                <p className="text-base sm:text-lg font-bold">₹{application.reelPrice}</p>
                            </div>
                            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                                <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Story Price</h3>
                                <p className="text-base sm:text-lg font-bold">₹{application.storyPrice}</p>
                            </div>
                            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                                <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Reel + Story</h3>
                                <p className="text-base sm:text-lg font-bold">₹{application.reelsStoryPrice}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="sm:pl-4">
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Profile Information</h2>
                        {application.profilePictureUrl ? (
                            <div className="mb-3 sm:mb-4">
                                <Image src={application.profilePictureUrl} alt="Profile" width={128} height={128} className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg object-cover mx-auto border-2 border-gray-300" />
                            </div>
                        ) : (
                            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                                <svg className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 012-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                        <div className="space-y-2 sm:space-y-3">
                            <div>
                                <h3 className="text-xs sm:text-sm font-medium text-gray-500">Email</h3>
                                <p className="font-medium text-sm sm:text-base">{application.emailAddress}</p>
                            </div>
                            <div>
                                <h3 className="text-xs sm:text-sm font-medium text-gray-500">Phone</h3>
                                <p className="font-medium text-sm sm:text-base">{application.mobileNumber}</p>
                            </div>
                            <div>
                                <h3 className="text-xs sm:text-sm font-medium text-gray-500">Location</h3>
                                <p className="font-medium text-sm sm:text-base">{application.cityState}</p>
                            </div>
                            <div>
                                <h3 className="text-xs sm:text-sm font-medium text-gray-500">Gender</h3>
                                <p className="font-medium text-sm sm:text-base">{application.gender}</p>
                            </div>
                            <div>
                                <h3 className="text-xs sm:text-sm font-medium text-gray-500">Delivery Time</h3>
                                <p className="font-medium text-sm sm:text-base">{application.deliveryDuration}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-6 sm:mt-8 pt-5 border-t border-gray-200">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Next Steps</h2>
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 sm:p-4">
                        {application.status === "pending" ? (
                            <p className="text-purple-800 text-sm sm:text-base">Your application is under review. Our team will evaluate your profile and get back to you within 3-5 business days. You&apos;ll receive an email notification once a decision has been made.</p>
                        ) : application.status === "approved" ? (
                            <p className="text-green-800 text-sm sm:text-base">Congratulations! Your application has been approved. You can now start collaborating with brands on our platform. Check your email for more details on how to get started.</p>
                        ) : (
                            <p className="text-red-800 text-sm sm:text-base">Your application has been reviewed but not approved at this time. Please see the admin feedback for more details. You may update your application and resubmit for reconsideration.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CreatorDashboardPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
            <CreatorDashboard />
        </Suspense>
    );
}

function CreatorDashboard() {
    const [user] = useAuthState(auth);
    const router = useRouter();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [creatorData, setCreatorData] = useState<ApplicationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
    const [view, setView] = useState<'dashboard' | 'applicationForm' | 'profile'>('profile');


    useEffect(() => {
        if (!user) {
            setLoading(false);
            router.push('/login');
            return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, async (userSnap) => {
            let fetchedUserData: UserData | null = null;
            if (userSnap.exists()) {
                fetchedUserData = userSnap.data() as UserData;
                setUserData(fetchedUserData);

                if (fetchedUserData.subscriptionStatus === 'active' && fetchedUserData.subscriptionExpiresAt) {
                    const now = new Date();
                    const expiryDate = fetchedUserData.subscriptionExpiresAt.toDate();
                    if (now > expiryDate) {
                        console.log("Subscription expired. Setting to inactive.");
                        await updateDoc(userDocRef, {
                            subscriptionStatus: 'inactive',
                            updatedAt: serverTimestamp(),
                        });
                        fetchedUserData.subscriptionStatus = 'inactive';
                    }
                }

                if (!fetchedUserData.mobileNumber) {
                    setView('profile');
                }
            } else {
                const initialData = {
                    userId: user.uid,
                    email: user.email,
                    fullName: user.displayName || '',
                    createdAt: serverTimestamp(),
                    accountType: 'normal',
                    subscriptionStatus: 'inactive',
                };
                await setDoc(userDocRef, initialData, { merge: true });
                fetchedUserData = initialData as UserData;
                setUserData(initialData as UserData);
                setView('profile');
            }

            const qCreator = query(collection(db, "creatorApplications"), where("userId", "==", user.uid), limit(1));
            const unsubscribeCreator = onSnapshot(qCreator, async (snapshot) => {
                if (!snapshot.empty) {
                    const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ApplicationData;
                    setCreatorData(data);

                    if (fetchedUserData?.accountType !== 'creator') {
                        await setDoc(userDocRef, { accountType: 'creator' }, { merge: true });
                    }
                    
                    if (data.status === 'approved') {
                        setView('dashboard');
                    } else {
                        setView('applicationForm');
                    }


                    const activities: Activity[] = [];
                    if (data.timestamp) activities.push({ type: 'submitted', description: 'Your creator application was submitted.', time: formatDate(data.timestamp) });
                    if (data.updatedAt && data.timestamp && data.updatedAt.toMillis() !== data.timestamp.toMillis()) {
                        activities.push({ type: 'update', description: 'Your profile was recently updated.', time: formatDate(data.updatedAt) });
                    } else if (data.updatedAt && !data.timestamp) {
                        activities.push({ type: 'update', description: 'Your profile was recently updated.', time: formatDate(data.updatedAt) });
                    }

                    if (data.status === 'approved') activities.push({ type: 'approved', description: 'Congratulations! Your application was approved.', time: formatDate(data.updatedAt || data.timestamp) });
                    setRecentActivity(activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()));

                } else {
                    setCreatorData(null);
                    if (fetchedUserData?.accountType !== 'normal') {
                        await setDoc(userDocRef, { accountType: 'normal' }, { merge: true });
                    }
                    
                    if (!fetchedUserData?.mobileNumber) {
                        setView('profile');
                    } else {
                        setView('applicationForm');
                    }
                }
                setLoading(false);
            }, (error) => {
                console.error("Error fetching creator data:", error);
                setLoading(false);
            });

            return () => unsubscribeCreator();
        }, (error) => {
            console.error("Error fetching user data:", error);
            setLoading(false);
        });

        return () => unsubscribeUser();
    }, [user, router]);

    const handleMobileNumberSave = async (mobileNumber: string) => {
        if (!user) throw new Error("User not authenticated.");
        const userDocRef = doc(db, "users", user.uid);
        try {
            await updateDoc(userDocRef, { mobileNumber: mobileNumber, updatedAt: serverTimestamp() });
            setUserData(prev => prev ? { ...prev, mobileNumber: mobileNumber } : null);
            
            if (creatorData && creatorData.status === 'approved') {
                setView('dashboard');
            } else {
                setView('applicationForm');
            }
        } catch (error) {
            console.error("Failed to save mobile number from prompt:", error);
            throw error;
        }
    };


    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (!user || !userData) {
        return null;
    }

    const isUserSubscribed = userData?.subscriptionStatus === 'active' &&
        (userData?.subscriptionExpiresAt?.toDate() ?? new Date(0)) > new Date();

    const renderMainContent = () => {
        if (!userData.mobileNumber) {
            return <NormalUserProfile user={user} userData={userData} onMobileNumberSave={handleMobileNumberSave} />;
        }

        switch (view) {
            case 'profile':
                return <NormalUserProfile user={user} userData={userData} onMobileNumberSave={handleMobileNumberSave} />;
            case 'applicationForm':
                return <ApplicationForm user={user} existingApplication={creatorData} isSubscribed={isUserSubscribed} />;
            case 'dashboard':
            default:
                if (creatorData) {
                    const statusDisplay = {
                        "approved": { text: "Approved", color: "text-green-700", bgColor: "bg-green-100" },
                        "rejected": { text: "Rejected", color: "text-red-700", bgColor: "bg-red-100" },
                        "pending": { text: "Pending Review", color: "text-yellow-700", bgColor: "bg-yellow-100" },
                    }[creatorData.status];

                    return (
                        <>
                            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
                                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                                    <Image
                                        src={creatorData.profilePictureUrl || 'https://placehold.co/120x120/E9D5FF/4C1D95?text=Photo'}
                                        alt="Profile"
                                        width={120}
                                        height={120}
                                        className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-purple-200 shadow-sm"
                                    />
                                    <div className="flex-1 text-center sm:text-left space-y-1">
                                        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-3">
                                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{creatorData.fullName}</h2>
                                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wider">Creator</span>
                                        </div>
                                        <a
                                            href={creatorData.instagramProfileLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-600 hover:underline font-medium text-sm sm:text-base"
                                        >
                                            @{creatorData.instagramUsername}
                                        </a>
                                    </div>
                                    <button onClick={() => setView('applicationForm')} className="w-full sm:w-auto mt-4 sm:mt-0 inline-flex justify-center items-center px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 transition-colors shadow-md cursor-pointer">
                                        Manage Application
                                    </button>
                                </div>
                                <div className="mt-8 pt-8 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 bg-purple-50 rounded-xl p-4">
                                    <InfoCard
                                        title="Followers"
                                        value={creatorData.totalFollowers || 'N/A'}
                                        icon={<UsersIcon className="w-6 h-6" />}
                                    />
                                    <InfoCard
                                        title="Avg. Reel Views"
                                        value={creatorData.avgReelViews || 'N/A'}
                                        icon={<PlayIcon className="w-6 h-6" />}
                                    />
                                    <InfoCard
                                        title="Avg. Story Views"
                                        value={creatorData.storyAverageViews || 'N/A'}
                                        icon={<EyeIcon className="w-6 h-6" />}
                                    />
                                </div>
                            </div>

                            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Application Status</h3>
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${statusDisplay.bgColor} ${statusDisplay.color}`}>
                                    {statusDisplay.text}
                                </div>
                                <p className="text-sm text-gray-600 mt-3">{creatorData.status === 'pending' ? 'Our team is reviewing your profile.' : 'You are a verified creator!'}</p>
                                {creatorData.status === 'rejected' && creatorData.adminFeedback && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                                        <p className="font-semibold mb-1">Admin Feedback:</p>
                                        <p>{creatorData.adminFeedback}</p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
                                <ul className="space-y-4">
                                    {recentActivity.length > 0 ?
                                        recentActivity.map((activity, index) => (
                                            <li key={index} className="flex items-center gap-4">
                                                <ActivityIcon type={activity.type} />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">{activity.description}</p>
                                                    <p className="text-xs text-gray-500">{activity.time}</p>
                                                </div>
                                            </li>
                                        )) : (
                                            <p className="text-sm text-gray-500">No recent activity.</p>
                                        )}
                                </ul>
                            </div>
                        </>
                    );
                } else {
                    return <ApplicationForm user={user} existingApplication={creatorData} isSubscribed={isUserSubscribed} />;
                }
        }
    };


    return (
        <div className="container mx-auto px-4 py-8 space-y-8 mb-24">
            {creatorData && (
                <div className="bg-gradient-to-br from-purple-800 via-indigo-800 to-purple-900 text-white p-6 sm:p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full filter blur-2xl"></div>
                    <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-white/5 rounded-full filter blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
                            <div className="flex items-center gap-4">
                                <span className="p-2 rounded-xl bg-purple-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-yellow-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.92 19.4a.562.562 0 0 1-.84-.61l1.285-5.385a.562.562 0 0 0-.182-.557L3.92 9.499a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                                    </svg>
                                </span>
                                <h2 className="text-xl sm:text-2xl font-bold tracking-wider uppercase">Creator Pro</h2>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isUserSubscribed ? 'bg-green-600 text-white' : 'bg-yellow-400 text-yellow-900'}`}>
                                {isUserSubscribed ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p className="mt-4 sm:mt-8 text-sm text-purple-200 text-center sm:text-left">
                            {isUserSubscribed ? `Your premium subscription is active until ${formatDate(userData.subscriptionExpiresAt)}.` : 'Your subscription has expired or is inactive. Please renew to continue enjoying premium features.'}
                        </p>
                    </div>
                </div>
            )}


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome, {userData.fullName || 'User'}!</h2>
                            <p className="text-gray-500 text-sm sm:text-base">{userData.accountType === 'creator' ? "Creator Account" : "Standard Account"}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center sm:justify-end">
                            <button
                                onClick={() => setView('profile')}
                                className={`p-3 rounded-lg flex items-center gap-2 text-sm sm:text-base ${view === 'profile' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                title="My Profile"
                            >
                                <UserCircleIcon className="h-5 w-5"/> <span className="hidden sm:inline">Profile</span>
                            </button>
                            <button
                                onClick={() => setView('applicationForm')}
                                className={`p-3 rounded-lg flex items-center gap-2 text-sm sm:text-base ${view === 'applicationForm' || !creatorData ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                title="Creator Application"
                            >
                                <DocumentTextIcon className="h-5 w-5"/> <span className="hidden sm:inline">Application</span>
                            </button>
                            {creatorData?.status === 'approved' && (
                                <button
                                    onClick={() => setView('dashboard')}
                                    className={`p-3 rounded-lg flex items-center gap-2 text-sm sm:text-base ${view === 'dashboard' && creatorData?.status === 'approved' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    title="Creator Dashboard"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25v9m-4.5 0l4.5 4.5M3 12h9.75M3 18h9.75" />
                                    </svg> <span className="hidden sm:inline">Dashboard</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {renderMainContent()}
                </div>

                <div className="lg:col-span-1">
                    {user && userData && (
                        <SubscriptionCard 
                            user={user} 
                            userData={userData} 
                            creatorApplication={creatorData} 
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
