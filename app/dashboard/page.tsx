// app/creator-dashboard/page.tsx (or wherever your CreatorDashboard is)
"use client";

import { useState, useRef, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebaseConfig";
import {
    collection,
    query,
    where,
    onSnapshot,
    DocumentData,
    doc,
    setDoc,
    updateDoc,
    serverTimestamp,
    orderBy,
    Timestamp,
    FieldValue,
    limit,
    writeBatch,
} from "firebase/firestore";
import Link from "next/link";
import { User as FirebaseUser } from "firebase/auth";
import {
    UsersIcon,
    PlayIcon,
    EyeIcon,
    BellAlertIcon,
    CheckCircleIcon,
    InformationCircleIcon,
    ChevronDownIcon,
    ChevronUpIcon,
} from '@heroicons/react/24/outline';
import Image from "next/image";
import React from 'react';

// --- Type Definitions (Keeping as is) ---
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
    timestamp: FirestoreTimestamp;
    updatedAt?: FirestoreTimestamp;
    subscriptionStatus?: 'active' | 'inactive';
    subscriptionExpiresAt?: Timestamp;
    adminFeedback?: string;
}

interface ApplicationFormProps {
    user: FirebaseUser | null | undefined;
    existingApplication: ApplicationData | null;
    isSubscribed: boolean;
}

interface ApplicationStatusProps {
    application: ApplicationData | null;
}

interface CreatorData extends DocumentData {
    profilePictureUrl?: string;
    fullName: string;
    instagramProfileLink: string;
    instagramUsername: string;
    totalFollowers?: string | number;
    avgReelViews?: string | number;
    storyAverageViews?: string | number;
    status: 'pending' | 'approved' | 'rejected';
    timestamp?: Timestamp;
    updatedAt?: Timestamp;
    subscriptionStatus?: 'active' | 'inactive';
    subscriptionExpiresAt?: Timestamp;
}

interface NotificationItem {
    id: string;
    message: string;
    timestamp: Timestamp;
    read: boolean;
    type: 'approval' | 'message' | 'announcement' | 'application_status';
    link?: string;
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

const formatNotificationTime = (timestamp: Timestamp) => {
    try {
        return new Date(timestamp.toDate()).toLocaleString();
    } catch (error) {
        console.error("Error formatting notification timestamp:", error);
        return 'Invalid Date';
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

export function NormalUserProfile({ user }: { user: FirebaseUser }) {
    const router = useRouter(); // Use useRouter here
    const [userData, setUserData] = useState<DocumentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ fullName: '', mobileNumber: '', cityState: '', gender: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isMobileNumberMissing, setIsMobileNumberMissing] = useState(false);

    useEffect(() => {
        if (!user) return;
        const userDocRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                setFormData({
                    fullName: data.fullName || user.displayName || '',
                    mobileNumber: data.mobileNumber || '',
                    cityState: data.cityState || '',
                    gender: data.gender || '',
                });
                if (!data.mobileNumber) {
                    setIsMobileNumberMissing(true);
                } else {
                    setIsMobileNumberMissing(false);
                }
            } else {
                setFormData(prev => ({ ...prev, fullName: user.displayName || '' }));
                setIsMobileNumberMissing(true);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const handleSave = async (e: React.FormEvent | string) => {
        if (typeof e !== 'string') {
            e.preventDefault();
        }
        setIsSaving(true);
        const userDocRef = doc(db, "users", user.uid);
        try {
            const dataToSave: UserData = {
                ...formData,
                email: user.email,
                userId: user.uid,
                accountType: 'normal',
                updatedAt: serverTimestamp(),
            };
            if (typeof e === 'string') {
                dataToSave.mobileNumber = e;
            }
            if (!userData) {
                dataToSave.createdAt = serverTimestamp();
            }
            await setDoc(userDocRef, dataToSave, { merge: true });
            if (isMobileNumberMissing && dataToSave.mobileNumber) {
                setIsMobileNumberMissing(false);
            }
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Failed to save profile", error);
            if (typeof e === 'string') throw error;
        }
        setIsSaving(false);
    };

    const handlePromptSave = async (mobileNumber: string) => {
        await handleSave(mobileNumber);
    };

    const handleStartSubscription = () => {
        // Redirect to the new subscription page
        router.push('/subscription');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (isMobileNumberMissing) {
        return <MobileNumberPrompt onSave={handlePromptSave} />;
    }

    const FeatureListItem = ({ children }: { children: React.ReactNode }) => (
        <li className="flex items-center gap-3">
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
            </svg>
            <span className="text-white/90">{children}</span>
        </li>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Personal Information Section (Left on larger screens) */}
            <div className="md:col-span-1 lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
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
            {/* Subscription Card for Normal User - always in the right column */}
            <div className="md:col-span-1 lg:col-span-1 bg-zinc-800 p-8 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 h-24 w-24">
                    <div className="absolute transform rotate-45 bg-red-600 text-center text-white font-semibold py-1 right-[-40px] top-[20px] w-[140px] shadow-lg">
                        OFF
                    </div>
                </div>
                <div className="text-center">
                    <p className="font-semibold text-yellow-400 tracking-widest">PREMIUM MEMBERSHIP</p>
                    <h3 className="text-xl font-bold text-white mt-1">EXCLUSIVE ACCESS</h3>
                </div>
                <div className="border border-yellow-400/50 rounded-xl p-6 my-8 text-center bg-zinc-900/50">
                    <p className="text-5xl font-bold text-white">
                        ₹249
                        <span className="text-2xl text-gray-400 line-through ml-2">₹999</span>
                    </p>
                    <p className="text-gray-300">per month</p>
                </div>
                <div className="text-center mb-8">
                    <p className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full inline-block font-semibold text-sm">
                        LIMITED TIME OFFER
                    </p>
                </div>
                <ul className="space-y-4 mb-10 flex-grow">
                    <FeatureListItem>Premium profile placement on homepage</FeatureListItem>
                    <FeatureListItem>Unlimited brand collaborations</FeatureListItem>
                    <FeatureListItem>Secure payment protection</FeatureListItem>
                    <FeatureListItem>Dedicated manager support 24/7</FeatureListItem>
                    <FeatureListItem>Priority access to new campaigns</FeatureListItem>
                </ul>
                <button
                    onClick={handleStartSubscription}
                    className="w-full text-center px-8 py-4 bg-gradient-to-b from-yellow-400 to-amber-500 text-zinc-900 rounded-lg font-bold hover:from-yellow-500 hover:to-amber-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                    GET STARTED NOW
                </button>
                <p className="text-xs text-gray-400 text-center mt-4">
                    By subscribing, you agree to our <Link href="/terms" className="underline">Terms of Service</Link> & <Link href="/privacy" className="underline">Privacy Policy</Link>. Cancel anytime.
                </p>
            </div>
        </div>
    );
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

    useEffect(() => {
        // This useEffect is now empty or can be removed if no other side effects are needed.
    }, []);

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
            // All applications now bypass subscription logic and directly submit/update
            const dataToSend = {
                ...formData,
                profilePictureUrl: imageUrl,
                userId: user.uid,
                status: "pending",
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
                        <div className="grid grid-cols-1 gap-4 sm:gap-6">
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
                        <div className="grid grid-cols-1 gap-4 sm:gap-6">
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
                        <div className="grid grid-cols-1 gap-4 sm:gap-6">
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
                            onClick={() => { /* Your reset logic */ }}
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

export function ApplicationStatus({ application }: ApplicationStatusProps) {
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

    const formatDate = (timestamp: FirestoreTimestamp) => {
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
                                        <p className="font-medium text-sm sm:text-base">{formatDate(application.timestamp)}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Last Updated</h3>
                                        <p className="font-medium text-sm sm:text-base">{application.updatedAt ? formatDate(application.updatedAt) : "N/A"}</p>
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

export default function CreatorDashboard() {
    const [user] = useAuthState(auth);
    const [creatorData, setCreatorData] = useState<CreatorData | null>(null);
    const [loading, setLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [notificationsLoading, setNotificationsLoading] = useState(true);
    const [showNotifications, setShowNotifications] = useState(false);

    // Effect for Creator Data & User Account Type
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const qCreator = query(collection(db, "creatorApplications"), where("userId", "==", user.uid));
        const unsubscribeCreator = onSnapshot(qCreator, async (snapshot) => {
            const userDocRef = doc(db, "users", user.uid);
            if (!snapshot.empty) {
                const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CreatorData;
                setCreatorData(data);

                try {
                    await setDoc(userDocRef, {
                        accountType: 'creator',
                        creatorApplicationId: data.id
                    }, { merge: true });
                } catch (error) {
                    console.error("Error updating user account type to creator:", error);
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

                try {
                    await setDoc(userDocRef, { accountType: 'normal' }, { merge: true });
                } catch (error) {
                    console.error("Error updating user account type to normal:", error);
                }
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching creator data:", error);
            setLoading(false);
        });

        return () => {
            unsubscribeCreator();
        };
    }, [user]);

    // Effect for User Notifications on Dashboard
    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setNotificationsLoading(false);
            return;
        }

        const notificationsCollectionRef = collection(db, `users/${user.uid}/notifications`);
        const q = query(notificationsCollectionRef, orderBy("timestamp", "desc"), limit(10));

        const unsubscribeNotifications = onSnapshot(q, (snapshot) => {
            const fetchedNotifications: NotificationItem[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data() as Omit<NotificationItem, 'id'>;
                fetchedNotifications.push({ id: doc.id, ...data });
            });
            setNotifications(fetchedNotifications);
            setNotificationsLoading(false);
        }, (error) => {
            console.error("Error fetching real-time dashboard notifications:", error);
            setNotificationsLoading(false);
        });

        return () => unsubscribeNotifications();
    }, [user]);

    // Function to mark a single notification as read
    const markNotificationAsRead = async (notificationId: string) => {
        if (!user) return;
        try {
            const notificationRef = doc(db, `users/${user.uid}/notifications`, notificationId);
            await updateDoc(notificationRef, { read: true });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    // Function to mark all notifications as read
    const markAllNotificationsAsRead = async () => {
        if (!user || notifications.filter(notif => !notif.read).length === 0) return;
        try {
            const batch = writeBatch(db);
            const notificationsCollectionRef = collection(db, `users/${user.uid}/notifications`);

            notifications.filter(notif => !notif.read).forEach(notif => {
                const notificationRef = doc(notificationsCollectionRef, notif.id);
                batch.update(notificationRef, { read: true });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    };

    const unreadNotificationsCount = notifications.filter(n => !n.read).length;


    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    // Define the Subscription Card component to avoid repetition
    // This component is now defined outside the main render logic to be reusable.
    const SubscriptionCard = ({ type }: { type: 'active' | 'expired' | 'new' }) => (
        <div className={`bg-zinc-800 p-8 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden ${type === 'expired' ? 'border-2 border-red-500' : ''}`}>
            {type !== 'active' && ( // Show OFF tag only for expired/new subscriptions
                <div className="absolute top-0 right-0 h-24 w-24">
                    <div className="absolute transform rotate-45 bg-red-600 text-center text-white font-semibold py-1 right-[-40px] top-[20px] w-[140px] shadow-lg">
                        OFF
                    </div>
                </div>
            )}
            <div className="text-center">
                <p className="font-semibold text-yellow-400 tracking-widest">PREMIUM MEMBERSHIP</p>
                <h3 className="text-xl font-bold text-white mt-1">EXCLUSIVE ACCESS</h3>
            </div>
            <div className="border border-yellow-400/50 rounded-xl p-6 my-8 text-center bg-zinc-900/50">
                <p className="text-5xl font-bold text-white">
                    ₹249
                    <span className="text-2xl text-gray-400 line-through ml-2">₹999</span>
                </p>
                <p className="text-gray-300">per month</p>
            </div>
            {type !== 'active' && ( // Show LIMITED TIME OFFER only for expired/new subscriptions
                <div className="text-center mb-8">
                    <p className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full inline-block font-semibold text-sm">
                        LIMITED TIME OFFER
                    </p>
                </div>
            )}
            <ul className="space-y-4 mb-10 flex-grow text-left">
                <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/90">Premium profile placement on homepage</span>
                </li>
                <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/90">Unlimited brand collaborations</span>
                </li>
                <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/90">Secure payment protection</span>
                </li>
                <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/90">Dedicated manager support 24/7</span>
                </li>
                <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/90">Priority access to new campaigns</span>
                </li>
            </ul>
            <Link href="/subscription" passHref> {/* Link to the new subscription page */}
                <span className="block w-full text-center px-8 py-4 bg-gradient-to-b from-yellow-400 to-amber-500 text-zinc-900 rounded-lg font-bold hover:from-yellow-500 hover:to-amber-600 transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer">
                    {type === 'active' ? 'MANAGE SUBSCRIPTION' : (type === 'expired' ? 'RENEW SUBSCRIPTION' : 'GET STARTED NOW')}
                </span>
            </Link>
            <p className="text-xs text-gray-400 text-center mt-4">
                By subscribing, you agree to our <Link href="/terms" className="underline">Terms of Service</Link> & <Link href="/privacy" className="underline">Privacy Policy</Link>. Cancel anytime.
            </p>
        </div>
    );


    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    // Determine what to render based on creatorData and subscription status
    if (creatorData) {
        // User has submitted a creator application
        const isSubscribed = creatorData.subscriptionStatus === 'active' && creatorData.subscriptionExpiresAt?.toDate() > new Date();
        const getStatusInfo = (status: string) => {
            switch (status) {
                case "approved": return { text: "Approved", color: "text-green-700", bgColor: "bg-green-100" };
                case "rejected": return { text: "Rejected", color: "text-red-700", bgColor: "bg-red-100" };
                default: return { text: "Pending Review", color: "text-yellow-700", bgColor: "bg-yellow-100" };
            }
        };
        const applicationStatus = getStatusInfo(creatorData.status);

        return (
            <div className="container mx-auto px-4 py-8 space-y-8 mb-24">
                {/* Always show this top banner regardless of subscription status */}
                <div className="bg-gradient-to-br from-purple-800 via-indigo-800 to-purple-900 text-white p-6 sm:p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full filter blur-2xl"></div>
                    <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-white/5 rounded-full filter blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-green-400 p-2 rounded-xl"></div>
                                <h2 className="text-xl sm:text-2xl font-bold tracking-wider uppercase">Creator Pro</h2>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isSubscribed ? 'bg-green-600 text-white' : 'bg-yellow-400 text-yellow-900'}`}>
                                {isSubscribed ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p className="mt-4 sm:mt-8 text-sm text-purple-200 text-center sm:text-left">
                            {isSubscribed ? `Your premium subscription is active until ${formatDate(creatorData.subscriptionExpiresAt)}.` : 'Your subscription has expired. Please renew.'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column (Main Content Area) - takes 2/3 width on large screens */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Creator Profile Summary */}
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
                                <Link href="/creator-dashboard" className="w-full sm:w-auto mt-4 sm:mt-0">
                                    <span className="inline-flex justify-center items-center px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 transition-colors shadow-md cursor-pointer w-full">
                                        Manage Application
                                    </span>
                                </Link>
                            </div>
                            <div className="mt-8 pt-8 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 bg-purple-50 rounded-xl">
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

                        {/* Subscription card for EXPIRED subscriptions (visible on small/medium screens here) */}
                        {!isSubscribed && (
                            <div className="lg:hidden"> {/* Only visible on screens smaller than lg */}
                                <SubscriptionCard type="expired" />
                            </div>
                        )}

                        {/* Application Status */}
                        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Application Status</h3>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${applicationStatus.bgColor} ${applicationStatus.color}`}>
                                {applicationStatus.text}
                            </div>
                            <p className="text-sm text-gray-600 mt-3">{creatorData.status === 'pending' ? 'Our team is reviewing your profile.' : 'You are a verified creator!'}</p>
                        </div>

                        {/* Recent Activity */}
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
                    </div> {/* End lg:col-span-2 (left column content) */}

                    {/* Right Column (Notifications and Subscription Card for Expired on large screens) */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* NEW: Collapsible Notifications Section (Right Column, for Creators) */}
                        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <BellAlertIcon className="w-6 h-6 text-purple-600" /> Notifications
                                    {unreadNotificationsCount > 0 && (
                                        <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                            {unreadNotificationsCount} New
                                        </span>
                                    )}
                                </h3>
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center gap-1 transition-colors"
                                >
                                    {showNotifications ? 'Hide Notifications' : 'View All Notifications'}
                                    {showNotifications ? (
                                        <ChevronUpIcon className="w-4 h-4" />
                                    ) : (
                                        <ChevronDownIcon className="w-4 h-4" />
                                    )}
                                </button>
                            </div>

                            {showNotifications && (
                                <>
                                    {notifications.filter(n => !n.read).length > 0 && (
                                        <button
                                            onClick={markAllNotificationsAsRead}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors mb-4 block"
                                        >
                                            Mark All As Read
                                        </button>
                                    )}
                                    {notificationsLoading ? (
                                        <div className="flex justify-center items-center h-32">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-400"></div>
                                        </div>
                                    ) : notifications.length > 0 ? (
                                        <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                            {notifications.map(notif => (
                                                <li
                                                    key={notif.id}
                                                    className={`p-3 rounded-lg flex items-start gap-3 ${notif.read ? 'bg-gray-50 text-gray-600' : 'bg-purple-50 text-gray-800 font-medium'} cursor-pointer hover:bg-purple-100 transition-colors`}
                                                    onClick={() => markNotificationAsRead(notif.id)}
                                                >
                                                    {notif.type === 'approval' || notif.type === 'application_status' ? (
                                                        <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                    ) : (
                                                        <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                                    )}
                                                    <div>
                                                        <p className="text-sm">{notif.message}</p>
                                                        <p className="text-xs text-gray-500 mt-1">{formatNotificationTime(notif.timestamp)}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-gray-500 text-sm">No notifications to display.</p>
                                    )}
                                </>
                            )}
                        </div>
                        {/* Subscription card for EXPIRED subscriptions (visible on large screens here) */}
                        {!isSubscribed && (
                            <div className="hidden lg:block"> {/* Only visible on screens larger than lg */}
                                <SubscriptionCard type="expired" />
                            </div>
                        )}
                    </div> {/* End lg:col-span-1 (Notifications) */}

                </div> {/* End grid-cols-1 lg:grid-cols-3 */}

            </div>
        );
    }

    // Default view for normal users (no creator application submitted yet)
    return (
        <div className="container mx-auto px-4 py-8 space-y-8 mb-24">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Always render NormalUserProfile in a column */}
                <div className="lg:col-span-2">
                    <NormalUserProfile user={user!} />
                </div>

                {/* Render the subscription card in the right column if no creator application exists */}
                <div className="lg:col-span-1"> {/* This div now directly contains the SubscriptionCard */}
                    <SubscriptionCard type="new" />
                </div>
            </div>

            {user && (
                <>
                    {/* Notifications section for Normal User (always in its own column/section) */}
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 mt-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <BellAlertIcon className="w-6 h-6 text-purple-600" /> Notifications
                                {unreadNotificationsCount > 0 && (
                                    <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                        {unreadNotificationsCount} New
                                    </span>
                                )}
                            </h3>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center gap-1 transition-colors"
                            >
                                {showNotifications ? 'Hide Notifications' : 'View All Notifications'}
                                {showNotifications ? (
                                    <ChevronUpIcon className="w-4 h-4" />
                                ) : (
                                    <ChevronDownIcon className="w-4 h-4" />
                                )}
                            </button>
                        </div>

                        {showNotifications && (
                            <>
                                {notifications.filter(n => !n.read).length > 0 && (
                                    <button
                                        onClick={markAllNotificationsAsRead}
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors mb-4 block"
                                    >
                                        Mark All As Read
                                    </button>
                                )}
                                {notificationsLoading ? (
                                    <div className="flex justify-center items-center h-32">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-400"></div>
                                    </div>
                                ) : notifications.length > 0 ? (
                                    <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                        {notifications.map(notif => (
                                            <li
                                                key={notif.id}
                                                className={`p-3 rounded-lg flex items-start gap-3 ${notif.read ? 'bg-gray-50 text-gray-600' : 'bg-purple-50 text-gray-800 font-medium'} cursor-pointer hover:bg-purple-100 transition-colors`}
                                                onClick={() => markNotificationAsRead(notif.id)}
                                            >
                                                {notif.type === 'approval' || notif.type === 'application_status' ? (
                                                    <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                ) : (
                                                    <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                                )}
                                                <div>
                                                    <p className="text-sm">{notif.message}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{formatNotificationTime(notif.timestamp)}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-500 text-sm">No notifications to display.</p>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}