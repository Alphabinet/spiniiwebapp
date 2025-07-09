"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebaseConfig";
import { collection, query, where, onSnapshot, DocumentData, doc, setDoc, updateDoc, serverTimestamp, orderBy, Timestamp, FieldValue } from "firebase/firestore";
import Link from "next/link";
import { User as FirebaseUser } from "firebase/auth";
import { UsersIcon, PlayIcon, EyeIcon } from '@heroicons/react/24/outline'; // Importing specific icons from Heroicons
import Image from "next/image";
import React from 'react'; // Ensure React is imported as it's used for JSX

// --- Type Definitions ---
interface Activity {
    type: 'submitted' | 'update' | 'approved';
    description: string;
    time: string;
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
    createdAt?: Timestamp | FieldValue; // Corrected Field to FieldValue
}

// Define the CreatorData interface based on your Firestore structure
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

// --- Helper Components & Functions ---

const formatDate = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate();
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

function InfoCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
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

function ActivityIcon({ type }: { type: string }) {
    const baseStyle = "h-10 w-10 rounded-lg flex items-center justify-center";
    const iconStyle = "h-5 w-5 text-white";
    switch (type) {
        case 'approved':
            return <div className={`${baseStyle} bg-green-500`}><svg className={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
        case 'update':
            return <div className={`${baseStyle} bg-purple-500`}><svg className={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></div>;
        case 'submitted':
        default:
            return <div className={`${baseStyle} bg-gray-400`}><svg className={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>;
    }
}

// --- Mobile Number Prompt Modal ---
function MobileNumberPrompt({ onSave }: { onSave: (mobileNumber: string) => Promise<void> }) {
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

// --- Component for Normal User Profile Management ---
function NormalUserProfile({ user }: { user: FirebaseUser }) {
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
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
                            {isSaving ? "Saving..." : "Update Application"}
                        </button>
                        {successMessage && <p className="text-green-600 text-sm font-medium">{successMessage}</p>}
                    </div>
                </form>
            </div>
            <div className="bg-zinc-800 p-8 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden">
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
                <Link href="/dashboard/profile" className="w-full">
                    <span className="block w-full text-center px-8 py-4 bg-gradient-to-b from-yellow-400 to-amber-500 text-zinc-900 rounded-lg font-bold hover:from-yellow-500 hover:to-amber-600 transition-all duration-300 transform hover:scale-105 shadow-lg">
                        Become Creator
                    </span>
                </Link>
                <p className="text-xs text-gray-400 text-center mt-4">
                    By subscribing, you agree to our <Link href="/terms" className="underline">Terms of Service</Link> & <Link href="/privacy" className="underline">Privacy Policy</Link>. Cancel anytime.
                </p>
            </div>
        </div>
    );
}

// --- Main OverviewPage Component ---
export default function OverviewPage() {
    const [user] = useAuthState(auth);
    const [creatorData, setCreatorData] = useState<CreatorData | null>(null);
    const [loading, setLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
    const [bookings, setBookings] = useState<DocumentData[]>([]);
    const [bookingsLoading, setBookingsLoading] = useState(true);

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
                    await updateDoc(userDocRef, {
                        accountType: 'creator',
                        creatorApplicationId: data.id
                    });
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

        setBookingsLoading(true);
        const qBookings = query(collection(db, "bookings"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
        const unsubscribeBookings = onSnapshot(qBookings, (snapshot) => {
            const bookedServices: DocumentData[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBookings(bookedServices);
            setBookingsLoading(false);
        }, (error) => {
            console.error("Error fetching bookings:", error);
            setBookingsLoading(false);
        });

        return () => {
            unsubscribeCreator();
            unsubscribeBookings();
        };
    }, [user]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (creatorData) {
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
                        <p className="mt-4 sm:mt-8 text-sm text-purple-200 text-center sm:text-left">{isSubscribed ? `Your premium subscription is active until ${formatDate(creatorData.subscriptionExpiresAt)}.` : 'Your subscription has expired. Please renew.'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
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
                                <Link href="/dashboard/profile" className="w-full sm:w-auto mt-4 sm:mt-0">
                                    <span className="inline-flex justify-center items-center px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 transition-colors shadow-md cursor-pointer w-full">
                                        Manage Profile
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
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Application Status</h3>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${applicationStatus.bgColor} ${applicationStatus.color}`}>
                                {applicationStatus.text}
                            </div>
                            <p className="text-sm text-gray-600 mt-3">{creatorData.status === 'pending' ? 'Our team is reviewing your profile.' : 'You are a verified creator!'}</p>
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
                    </div>
                </div>

                {user && (
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 mt-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Bookings</h2>
                        {bookingsLoading ? (
                            <div className="flex justify-center items-center h-32">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-400"></div>
                            </div>
                        ) : bookings.length > 0 ? (
                            <div className="space-y-4">
                                {bookings.map(booking => (
                                    <div key={booking.id} className="p-4 border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-50 transition-colors gap-3">
                                        <div>
                                            <p className="text-lg font-semibold text-gray-800">{booking.campaign?.name || 'N/A Service'}</p>
                                            <p className="text-sm text-gray-600">Creator: {booking.creatorName || 'N/A Creator'}{booking.creatorUsername && ` (@${booking.creatorUsername})`}</p>
                                            {booking.totalFollowers && <p className="text-xs text-gray-500">Followers: {booking.totalFollowers}</p>}
                                            <p className="text-sm text-gray-500">Booked on: {formatDate(booking.createdAt)}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${booking.status === 'completed' ? 'bg-green-100 text-green-700' : booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : booking.status === 'success' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'} flex-shrink-0`}>
                                            {booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : 'N/A'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">No service bookings found yet.</p>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Default view for new/normal users
    return (
        <div className="container mx-auto px-4 py-8 space-y-8 mb-24">
            <NormalUserProfile user={user!} />
            {user && (
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 mt-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Bookings</h2>
                    {bookingsLoading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-400"></div>
                        </div>
                    ) : bookings.length > 0 ? (
                        <div className="space-y-4">
                            {bookings.map(booking => (
                                <div key={booking.id} className="p-4 border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-50 transition-colors gap-3">
                                    <div>
                                        <p className="text-lg font-semibold text-gray-800">{booking.campaign?.name || 'N/A Service'}</p>
                                        <p className="text-sm text-gray-600">Creator: {booking.creatorName || 'N/A Creator'}{booking.creatorUsername && ` (@${booking.creatorUsername})`}</p>
                                        {booking.totalFollowers && <p className="text-xs text-gray-500">Followers: {booking.totalFollowers}</p>}
                                        <p className="text-sm text-gray-500">Booked on: {formatDate(booking.createdAt)}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${booking.status === 'completed' ? 'bg-green-100 text-green-700' : booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : booking.status === 'success' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'} flex-shrink-0`}>
                                        {booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : 'N/A'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No service bookings found yet.</p>
                    )}
                </div>
            )}
        </div>
    );
}