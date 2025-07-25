"use client";

import { useState, useRef, useEffect } from "react";
import { db, storage, auth } from "@/lib/firebaseConfig";
import {
    collection, addDoc, serverTimestamp,
    query, where, onSnapshot, updateDoc, doc, Timestamp as FirestoreTimestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { useAuthState } from "react-firebase-hooks/auth";
import { User as FirebaseUser } from "firebase/auth";
import Image from "next/image";


// --- TypeScript Interfaces ---
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
    subscriptionStatus?: 'active' | 'inactive'; // Keeping this for existing data structure
    subscriptionExpiresAt?: FirestoreTimestamp; // Keeping this for existing data structure
    adminFeedback?: string;
}

interface ApplicationFormProps {
    user: FirebaseUser | null | undefined;
    existingApplication: ApplicationData | null;
    isSubscribed: boolean; // Keeping this prop, but its influence on payment flow is removed
}

interface ApplicationStatusProps {
    application: ApplicationData | null;
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


export default function CreatorDashboard() {
    const [user] = useAuthState(auth);
    const [activeTab, setActiveTab] = useState("application");
    const [existingApplication, setExistingApplication] = useState<ApplicationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false); // Kept for now, but its relevance to this form is removed.

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "creatorApplications"),
            where("userId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const applicationDoc = snapshot.docs[0];
                const applicationData = { id: applicationDoc.id, ...applicationDoc.data() } as ApplicationData;
                setExistingApplication(applicationData);

                // Subscription status check remains, but no payment required based on it in ApplicationForm.
                const status = applicationData.subscriptionStatus;
                const expiresAt = applicationData.subscriptionExpiresAt;

                if (status === 'active' && expiresAt && expiresAt.toDate() > new Date()) {
                    setIsSubscribed(true);
                } else {
                    setIsSubscribed(false);
                }
            } else {
                setExistingApplication(null);
                setIsSubscribed(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-3 sm:p-4">
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Creator Dashboard</h1>
                <div className="flex flex-wrap border-b border-gray-200">
                    <button
                        className={`py-2 px-4 sm:py-3 sm:px-6 font-medium text-sm sm:text-base ${activeTab === "application"
                                ? "text-purple-600 border-b-2 border-purple-600"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                        onClick={() => setActiveTab("application")}
                    >
                        {existingApplication ? "Update Application" : "New Application"}
                    </button>
                    <button
                        className={`py-2 px-4 sm:py-3 sm:px-6 font-medium text-sm sm:text-base ${activeTab === "status"
                                ? "text-purple-600 border-b-2 border-purple-600"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                        onClick={() => setActiveTab("status")}
                    >
                        Application Status
                    </button>
                </div>
            </div>

            {activeTab === "application" ? (
                <ApplicationForm
                    user={user}
                    existingApplication={existingApplication}
                    isSubscribed={isSubscribed}
                />
            ) : (
                <ApplicationStatus
                    application={existingApplication}
                />
            )}
        </div>
    );
}

function ApplicationForm({ user, existingApplication, isSubscribed }: ApplicationFormProps) {
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

    // REMOVED: useEffect to load Razorpay script
    useEffect(() => {
        // This useEffect is now empty or can be removed if no other side effects are needed.
        // It previously loaded the Razorpay script based on `isSubscribed`.
    }, []); // No dependencies as it's not loading external scripts anymore

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
                userId: user.uid, // Ensure userId is set
                status: "pending", // Application status is always pending upon submission
                timestamp: existingApplication?.timestamp || serverTimestamp(), // Keep original timestamp if updating
                updatedAt: serverTimestamp(), // Update timestamp on every submission
                // Removed subscription-related fields from dataToSend as they are no longer handled here:
                // subscriptionId, paymentId, subscriptionStatus, subscriptionExpiresAt
            };

            if (existingApplication) {
                await updateDoc(doc(db, "creatorApplications", existingApplication.id), dataToSend);
            } else {
                await addDoc(collection(db, "creatorApplications"), { ...dataToSend, timestamp: serverTimestamp() }); // Set timestamp for new applications
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

    // ===== UPDATED CATEGORIES ARRAY =====
    const contentCategories = [
        'Fashion', 'Beauty', 'Lifestyle', 'Fitness', 'Travel', 'Food', 'Technology',
        'Gaming', 'Comedy', 'Motivation', 'Music', 'Dance', 'Photography', 'Art',
        'DIY (Do It Yourself)', 'Education', 'Finance', 'Health & Wellness', 'Parenting',
        'Pets', 'Cars & Automobiles', "Men's Grooming", 'Home Decor', 'Spirituality',
        'Acting', 'Reviews & Unboxing', 'Astrology', 'Modeling', 'Vlogger',
        'Books & Reading', 'Makeup', 'Nails & Nail Art', 'Skincare',
        'Saree & Ethnic Wear', 'Luxury Lifestyle', 'Entertainment'
    ];
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
                {/* Subscription status display remains, but no payment action associated */}
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

function ApplicationStatus({ application }: ApplicationStatusProps) {
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