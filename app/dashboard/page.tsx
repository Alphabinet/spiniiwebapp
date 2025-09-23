"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, storage } from "@/lib/firebaseConfig";
import { v4 as uuidv4 } from "uuid";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  FieldValue,
  limit,
  addDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useRouter } from "next/navigation";
import { User as FirebaseUser } from "firebase/auth";
import {
  UsersIcon,
  PlayIcon,
  EyeIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  SparklesIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
// removed unused imports (Link, Script, React) per cleanup

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
  avgFeedViews?: string;
  avgLikes?: number;
  avgComments?: number;
  topPosts?: Array<{
    id: string;
    permalink?: string;
    likes?: number;
    comments?: number;
    totalEngagement?: number;
    insights?: Record<string, any> | null;
  }>;
  postsPerWeek?: number;
  postsPerMonth?: number;
  engagementRate?: number;
  accountReach?: number;
  instagramState?: string;
  profileUrl?: string;
  contentCategory: string;
  contentLanguages: string;
  reelPrice: string;
  storyPrice: string;
  reelsStoryPrice: string;
  deliveryDuration: string;
  profilePictureUrl: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
  timestamp: Timestamp;
  updatedAt?: Timestamp;
  subscriptionStatus?: "active" | "inactive";
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
  accountType?: "normal" | "creator";
  updatedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
  subscriptionStatus?: "active" | "inactive";
  subscriptionExpiresAt?: Timestamp;
}

interface Activity {
  type: string;
  description: string;
  time: string;
}

function SuccessModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-purple-100 mb-4 sm:mb-6">
          <svg
            className="h-8 w-8 sm:h-12 sm:w-12 text-purple-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
          Congratulations!
        </h3>
        <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">
          Your application has been successfully submitted. We will notify you
          via email once it has been reviewed and approved by our team.
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
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date timestamp:", error);
    return "Invalid Date";
  }
};

export function InfoCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center space-x-3 p-4 bg-purple-100 rounded-lg">
      <div className="text-gray-700 flex-shrink-0">{icon}</div>
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
    case "approved":
      return (
        <div className={`${baseStyle} bg-green-500`}>
          <CheckCircleIcon className={iconStyle} />
        </div>
      );
    case "update":
      return (
        <div className={`${baseStyle} bg-purple-500`}>
          <svg
            className={iconStyle}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </div>
      );
    case "submitted":
    default:
      return (
        <div className={`${baseStyle} bg-gray-400`}>
          <svg
            className={iconStyle}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
      );
  }
}

// ===== Personal Information Component =====
export function PersonalInformationForm({
  user,
  userData,
  isMandatory,
}: {
  user: FirebaseUser;
  userData: UserData | null;
  isMandatory: boolean;
}) {
  const [formData, setFormData] = useState({
    fullName: "",
    mobileNumber: "",
    cityState: "",
    gender: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    setFormData({
      fullName: userData?.fullName || user.displayName || "",
      mobileNumber: userData?.mobileNumber || "",
      cityState: userData?.cityState || "",
      gender: userData?.gender || "",
    });
  }, [user, userData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // --- Validation ---
    if (!formData.fullName.trim() || formData.fullName.length < 3) {
      setMessage({ text: "Please enter your full name.", type: "error" });
      return;
    }
    if (!/^[6-9]\d{9}$/.test(formData.mobileNumber)) {
      setMessage({
        text: "Please enter a valid 10-digit mobile number.",
        type: "error",
      });
      return;
    }
    if (!formData.cityState.trim()) {
      setMessage({ text: "Please enter your City / State.", type: "error" });
      return;
    }
    if (!formData.gender) {
      setMessage({ text: "Please select your gender.", type: "error" });
      return;
    }

    setIsSaving(true);
    const userDocRef = doc(db, "users", user.uid);
    try {
      const dataToSave: UserData = {
        ...userData, // Preserve existing data like accountType, etc.
        fullName: formData.fullName,
        mobileNumber: formData.mobileNumber,
        cityState: formData.cityState,
        gender: formData.gender,
        email: user.email ?? undefined,
        userId: user.uid,
        updatedAt: serverTimestamp(),
      };
      if (!userData?.createdAt) {
        dataToSave.createdAt = serverTimestamp();
      }
      await setDoc(userDocRef, dataToSave, { merge: true });

      setMessage({ text: "Profile updated successfully!", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Failed to save profile", error);
      setMessage({
        text: "Failed to save profile. Please try again.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Personal Information
          </h2>
          {isMandatory ? (
            <p className="text-red-600 mt-1 text-sm">
              Please complete your profile to continue.
            </p>
          ) : (
            <p className="text-gray-500 mt-1 text-sm">
              Keep your personal details up to date.
            </p>
          )}
        </div>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold uppercase tracking-wider self-start sm:self-center">
          {userData?.accountType === "creator"
            ? "Creator Account"
            : "Standard Account"}
        </span>
      </div>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              value={formData.mobileNumber}
              onChange={(e) =>
                setFormData({ ...formData, mobileNumber: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={user.email || ""}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City / State
            </label>
            <input
              type="text"
              value={formData.cityState}
              onChange={(e) =>
                setFormData({ ...formData, cityState: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) =>
                setFormData({ ...formData, gender: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="">Select...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-purple-300 transition-colors flex items-center justify-center gap-2"
          >
            <PencilSquareIcon className="w-5 h-5" />
            {isSaving ? "Saving..." : "Save Information"}
          </button>
          {message && (
            <p
              className={`text-sm font-medium ${
                message.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {message.text}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

// ===== Application Form Component =====
interface ApplicationFormProps {
  user: FirebaseUser | null | undefined;
  userData: UserData | null;
  existingApplication: ApplicationData | null;
  isSubscribed: boolean;
}

export function ApplicationForm({
  user,
  userData,
  existingApplication,
  isSubscribed,
}: ApplicationFormProps) {
  // Form states
  // removed unused isAutoFilling / isUploading to avoid unused-variable warnings
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    existingApplication?.profilePictureUrl || null
  );
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: existingApplication?.fullName || userData?.fullName || "",
    mobileNumber:
      existingApplication?.mobileNumber || userData?.mobileNumber || "",
    emailAddress: existingApplication?.emailAddress || userData?.email || "",
    cityState: existingApplication?.cityState || userData?.cityState || "",
    gender: existingApplication?.gender || userData?.gender || "",
    instagramUsername: existingApplication?.instagramUsername || "",
    instagramProfileLink: existingApplication?.instagramProfileLink || "",
    totalFollowers: existingApplication?.totalFollowers || "",
    avgReelViews: existingApplication?.avgReelViews || "",
    storyAverageViews: existingApplication?.storyAverageViews || "",
    avgFeedViews: existingApplication?.avgFeedViews || "",
    // Instagram metrics
    avgLikes: (existingApplication as any)?.avgLikes ?? "",
    avgComments: (existingApplication as any)?.avgComments ?? "",
    topPosts: (existingApplication as any)?.topPosts || [],
    postsPerWeek: (existingApplication as any)?.postsPerWeek ?? "",
    postsPerMonth: (existingApplication as any)?.postsPerMonth ?? "",
    engagementRate: (existingApplication as any)?.engagementRate ?? "",
    accountReach: (existingApplication as any)?.accountReach ?? "",
    instagramState: (existingApplication as any)?.instagramState ?? "",
    profileUrl: (existingApplication as any)?.profileUrl ?? "",
    contentCategory: existingApplication?.contentCategory || "",
    contentLanguages: existingApplication?.contentLanguages || "",
    reelPrice: existingApplication?.reelPrice || "",
    storyPrice: existingApplication?.storyPrice || "",
    reelsStoryPrice: existingApplication?.reelsStoryPrice || "",
    deliveryDuration: existingApplication?.deliveryDuration || "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [instagramError, setInstagramError] = useState<string | null>(null);
  // const fileInputRef = useRef<HTMLInputElement>(null);
  const instagramModalRef = useRef<HTMLDivElement | null>(null);

  // --- Multi-step form state ---
  const [step, setStep] = useState<number>(1);
  const totalSteps = 3;
  const isLastStep = step === totalSteps;

  const validateStep = () => {
    const stepErrors: { [key: string]: string } = {};
    if (step === 1) {
      if (!formData.fullName.trim())
        stepErrors.fullName = "Full Name is required.";
      if (!/^[0-9]{10}$/.test(formData.mobileNumber))
        stepErrors.mobileNumber =
          "Please enter a valid 10-digit mobile number.";
      if (!/\S+@\S+\.\S+/.test(formData.emailAddress))
        stepErrors.emailAddress = "Please enter a valid email address.";
      if (!formData.cityState.trim())
        stepErrors.cityState = "City / State is required.";
      if (!formData.gender) stepErrors.gender = "Gender is required.";
    }
    if (step === 2) {
      if (!formData.contentCategory)
        stepErrors.contentCategory = "Content Category is required.";
      if (!formData.contentLanguages.trim())
        stepErrors.contentLanguages = "Content Language(s) is required.";
      if (!formData.reelPrice.trim())
        stepErrors.reelPrice = "Reel Price is required.";
      if (!formData.storyPrice.trim())
        stepErrors.storyPrice = "Story Price is required.";
      if (!formData.reelsStoryPrice.trim())
        stepErrors.reelsStoryPrice = "Reels + Story Price is required.";
      if (!formData.deliveryDuration.trim())
        stepErrors.deliveryDuration = "Delivery Duration is required.";
    }
    if (step === 3) {
      if (!formData.instagramUsername.trim())
        stepErrors.instagramUsername = "Instagram Username is required.";
      if (
        !formData.instagramProfileLink.trim() ||
        !/^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/.test(
          formData.instagramProfileLink
        )
      )
        stepErrors.instagramProfileLink =
          "Please enter a valid Instagram profile URL.";
      if (!formData.totalFollowers.trim())
        stepErrors.totalFollowers = "Total Followers count is required.";
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const goNext = () => {
    if (validateStep()) setStep((s) => Math.min(totalSteps, s + 1));
  };
  const goPrev = () => setStep((s) => Math.max(1, s - 1));

  const onFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLastStep) {
      goNext();
      return;
    }
    await handleSubmit(e);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // --- Instagram OAuth popup handling ---
  useEffect(() => {
    const listener = (ev: MessageEvent) => {
      if (!ev?.data) return;
      const payload = ev.data;
      if (payload?.success === true && payload.profile) {
        const p = payload.profile;
        // Merge full profile + metrics into formData so we have a single source of truth
        try {
          setFormData((prev) => ({
            ...prev,
            instagramUsername: p.username || prev.instagramUsername,
            instagramProfileLink: p.profileUrl || prev.instagramProfileLink,
            totalFollowers: String(
              p.followers_count ?? prev.totalFollowers ?? ""
            ),
            avgReelViews: String(p.avgReelViews ?? prev.avgReelViews ?? ""),
            storyAverageViews: String(
              p.storyAverageViews ?? prev.storyAverageViews ?? ""
            ),
            avgFeedViews: String(p.avgFeedViews ?? prev.avgFeedViews ?? ""),
            fullName: String(p.name || prev.fullName || ""),
            // metrics
            avgLikes: p.avgLikes ?? prev.avgLikes ?? "",
            avgComments: p.avgComments ?? prev.avgComments ?? "",
            topPosts: Array.isArray(p.topPosts)
              ? p.topPosts
              : prev.topPosts || [],
            postsPerWeek: p.postsPerWeek ?? prev.postsPerWeek ?? "",
            postsPerMonth: p.postsPerMonth ?? prev.postsPerMonth ?? "",
            engagementRate: p.engagementRate ?? prev.engagementRate ?? "",
            accountReach: p.accountReach ?? prev.accountReach ?? "",
            instagramState: p.state ?? prev.instagramState ?? "",
            profileUrl:
              p.profileUrl ??
              prev.profileUrl ??
              prev.instagramProfileLink ??
              "",
          }));
        } catch (err) {
          console.warn("Failed to merge IG profile into formData:", err);
        }
        if (p.profile_picture_url) setImagePreview(p.profile_picture_url);
        setInstagramError(null);
        setShowInstagramModal(false);
      } else if (payload?.success === false) {
        setInstagramError(payload.error || "Instagram connection failed");
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  // Focus modal and handle Escape key
  useEffect(() => {
    if (!showInstagramModal) return;
    const el = instagramModalRef.current;
    if (el) {
      el.focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowInstagramModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showInstagramModal]);

  // Derived connected profile values (used in Panel 3 display)
  const connectedProfile = {
    username: formData.instagramUsername || "",
    profileUrl: formData.instagramProfileLink || "",
    followers_count: formData.totalFollowers
      ? Number(formData.totalFollowers)
      : undefined,
    avgReelViews: formData.avgReelViews
      ? Number(formData.avgReelViews)
      : undefined,
    storyAverageViews: formData.storyAverageViews
      ? Number(formData.storyAverageViews)
      : undefined,
    avgFeedViews: formData.avgFeedViews
      ? Number(formData.avgFeedViews)
      : undefined,
    profile_picture_url: imagePreview || undefined,
    name: formData.fullName || formData.instagramUsername || "",
    // additional metrics for preview
    avgLikes: (formData as any).avgLikes ?? undefined,
    avgComments: (formData as any).avgComments ?? undefined,
    postsPerWeek: (formData as any).postsPerWeek ?? undefined,
    postsPerMonth: (formData as any).postsPerMonth ?? undefined,
    engagementRate: (formData as any).engagementRate ?? undefined,
    accountReach: (formData as any).accountReach ?? undefined,
    topPosts: Array.isArray((formData as any).topPosts)
      ? (formData as any).topPosts
      : [],
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.fullName.trim())
      newErrors.fullName = "Full Name is required.";
    if (!formData.mobileNumber.trim())
      newErrors.mobileNumber = "Mobile Number is required.";
    if (!/^\d{10}$/.test(formData.mobileNumber))
      newErrors.mobileNumber = "Please enter a valid 10-digit mobile number.";
    if (!formData.emailAddress.trim())
      newErrors.emailAddress = "Email Address is required.";
    if (!/\S+@\S+\.\S+/.test(formData.emailAddress))
      newErrors.emailAddress = "Please enter a valid email address.";
    if (!formData.cityState.trim())
      newErrors.cityState = "City / State is required.";
    if (!formData.gender) newErrors.gender = "Gender is required.";
    if (!formData.instagramUsername.trim())
      newErrors.instagramUsername = "Instagram Username is required.";
    if (!formData.instagramProfileLink.trim())
      newErrors.instagramProfileLink = "Instagram Profile Link is required.";
    if (
      !/^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/.test(
        formData.instagramProfileLink
      )
    )
      newErrors.instagramProfileLink =
        "Please enter a valid Instagram profile URL.";
    // if (!formData.totalFollowers.trim())
    //   newErrors.totalFollowers = "Total Followers count is required.";
    // avgReelViews and storyAverageViews are optional (can be auto-filled via OAuth). Do not block submission if missing.
    // Allow imagePreview (autofilled from Instagram OAuth) as a valid profile picture
    // if (!image && !imagePreview && !existingApplication?.profilePictureUrl)
    //   newErrors.profilePicture = "Profile Picture is required.";
    if (!formData.contentCategory)
      newErrors.contentCategory = "Content Category is required.";
    if (!formData.contentLanguages.trim())
      newErrors.contentLanguages = "Content Language(s) is required.";
    if (!formData.reelPrice.trim())
      newErrors.reelPrice = "Reel Price is required.";
    if (!formData.storyPrice.trim())
      newErrors.storyPrice = "Story Price is required.";
    if (!formData.reelsStoryPrice.trim())
      newErrors.reelsStoryPrice = "Reels + Story Price is required.";
    if (!formData.deliveryDuration.trim())
      newErrors.deliveryDuration = "Delivery Duration is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!user) {
      alert("You must be logged in.");
      return;
    }
    setUploading(true);

    try {
      // Prefer newly uploaded File `image`. If not present, fall back to
      // `imagePreview` (this may contain the Instagram autofill URL).
      let imageUrl = existingApplication?.profilePictureUrl || "";

      if (imagePreview) {
        // Use the third-party platform’s image if available
        imageUrl = String(imagePreview);
      }

      // Send formData (which now includes IG metrics) to Firestore
      const dataToSend = {
        ...formData,
        profilePictureUrl: imageUrl,
        userId: user.uid,
        status:
          existingApplication?.status === "rejected"
            ? "pending"
            : existingApplication?.status || "pending",
        updatedAt: serverTimestamp(),
      } as any;

      if (existingApplication) {
        await updateDoc(
          doc(db, "creatorApplications", existingApplication.id),
          dataToSend
        );
      } else {
        await addDoc(collection(db, "creatorApplications"), {
          ...dataToSend,
          timestamp: serverTimestamp(),
        });
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
    "Fashion",
    "Beauty",
    "Lifestyle",
    "Fitness",
    "Travel",
    "Food",
    "Technology",
    "Gaming",
    "Comedy",
    "Motivation",
    "Music",
    "Dance",
    "Photography",
    "Art",
    "DIY (Do It Yourself)",
    "Education",
    "Finance",
    "Health & Wellness",
    "Parenting",
    "Pets",
    "Cars & Automobiles",
    "Men's Grooming",
    "Home Decor",
    "Spirituality",
    "Acting",
    "Reviews & Unboxing",
    "Astrology",
    "Modeling",
    "Vlogger",
    "Books & Reading",
    "Makeup",
    "Nails & Nail Art",
    "Skincare",
    "Saree & Ethnic Wear",
    "Luxury Lifestyle",
    "Entertainment",
  ];
  const genders = ["Male", "Female", "Other", "Prefer not to say"];

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
      />

      <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-4 sm:p-6 text-white">
        <div className="flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-semibold">
            {existingApplication
              ? "Update Your Creator Profile"
              : "Creator Application"}
          </h3>
          <div className="text-sm">
            Step {step} of {totalSteps}
          </div>
        </div>
        <div className="mt-3 w-full bg-purple-500/20 rounded-full h-1 sm:h-2">
          <div
            className={`h-1 sm:h-2 rounded-full bg-white`}
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-4 sm:p-6 md:p-8">
        {isSubscribed && (
          <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-300 shadow-sm flex items-center">
            <span className="text-purple-900 font-medium text-xs sm:text-sm">
              <span className="block sm:inline">👑 Creator Pro:</span> You have
              an active subscription. Enjoy all premium features freely.
            </span>
          </div>
        )}

        <form onSubmit={onFormSubmit} className="space-y-6 sm:space-y-8">
          {/* Instagram Connect Modal */}
          {showInstagramModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop: blocks interaction and blurs background */}
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setShowInstagramModal(false)}
              />
              <div
                ref={instagramModalRef}
                role="dialog"
                aria-modal="true"
                className="relative bg-white rounded-lg p-4 sm:p-6 z-50 w-full max-w-md shadow-2xl ring-1 ring-black/5"
                onClick={(e) => e.stopPropagation()}
                tabIndex={-1}
              >
                <h3 className="text-lg font-semibold mb-2">
                  Connect your Instagram
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  To auto-fill your Instagram data we require a Business or
                  Creator Instagram account linked to a Facebook Page. We will
                  collect username, followers count, profile picture, and
                  average views for reels and stories.
                </p>
                <ul className="text-sm text-gray-700 mb-4 list-disc pl-5 space-y-1">
                  <li>Account type needed: Business or Creator</li>
                  <li>Account must be linked to a Facebook Page you manage</li>
                  <li>
                    We will fetch: username, followers, profile picture, average
                    reel & story views
                  </li>
                </ul>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowInstagramModal(false)}
                    className="px-4 py-2 rounded-md bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Open OAuth popup
                      // Use public NEXT_PUBLIC_* env vars in the browser. Fall back to sensible defaults.
                      const appId =
                        process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID ||
                        process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID ||
                        process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID ||
                        "";
                      // Prefer a configured NEXT_PUBLIC redirect, but ensure it points to our server callback when possible.
                      let redirect =
                        process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI || "";
                      if (
                        !redirect ||
                        !redirect.includes("/api/auth/instagram")
                      ) {
                        // fallback to the API route used by the server-side callback
                        redirect = `${window.location.origin}/api/auth/instagram/callback`;
                      }
                      const state = Math.random().toString(36).substring(2);
                      // Requested scope: instagram_basic, pages_show_list, instagram_manage_insights
                      console.log(
                        "opening instagram oauth, appId:",
                        appId,
                        "redirect:",
                        redirect
                      );
                      const scope = encodeURIComponent(
                        "instagram_basic,instagram_manage_insights,pages_show_list"
                      );
                      const authUrl = `https://www.facebook.com/v17.0/dialog/oauth?client_id=${encodeURIComponent(
                        appId
                      )}&redirect_uri=${encodeURIComponent(
                        redirect
                      )}&state=${encodeURIComponent(state)}&scope=${scope}`;
                      // Open centered popup
                      const w = 600,
                        h = 700;
                      const left = screen.width / 2 - w / 2;
                      const top = screen.height / 2 - h / 2;
                      window.open(
                        authUrl,
                        "InstagramConnect",
                        `width=${w},height=${h},top=${top},left=${left}`
                      );
                      // keep modal open briefly to show action, then close
                      setTimeout(() => setShowInstagramModal(false), 200);
                    }}
                    className="px-4 py-2 rounded-md bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                  >
                    Proceed
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Panels rendered in normal flow to avoid overlapping header on mobile */}
          <div className="min-h-0 sm:min-h-[360px]">
            {/* Panel 1 */}
            {step === 1 && (
              <div className="transition-all duration-300">
                <h4 className="text-md font-medium mb-4">Personal Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Full Name
                    </label>
                    <input
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.fullName ? "border-red-500" : "border-gray-200"
                      }`}
                    />
                    {errors.fullName && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.fullName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Mobile Number
                    </label>
                    <input
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.mobileNumber
                          ? "border-red-500"
                          : "border-gray-200"
                      }`}
                    />
                    {errors.mobileNumber && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.mobileNumber}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Email Address
                    </label>
                    <input
                      name="emailAddress"
                      value={formData.emailAddress}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.emailAddress
                          ? "border-red-500"
                          : "border-gray-200"
                      }`}
                    />
                    {errors.emailAddress && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.emailAddress}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      City / State
                    </label>
                    <input
                      name="cityState"
                      value={formData.cityState}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.cityState ? "border-red-500" : "border-gray-200"
                      }`}
                    />
                    {errors.cityState && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.cityState}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.gender ? "border-red-500" : "border-gray-200"
                      }`}
                    >
                      <option value="">Select</option>
                      {genders.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    {errors.gender && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.gender}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Panel 2 */}
            {step === 2 && (
              <div className="transition-all duration-300">
                <h4 className="text-md font-medium mb-4">Content & Pricing</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Content Category
                    </label>
                    <select
                      name="contentCategory"
                      value={formData.contentCategory}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.contentCategory
                          ? "border-red-500"
                          : "border-gray-200"
                      }`}
                    >
                      <option value="">Select category</option>
                      {contentCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {errors.contentCategory && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.contentCategory}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Content Languages
                    </label>
                    <input
                      name="contentLanguages"
                      value={formData.contentLanguages}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.contentLanguages
                          ? "border-red-500"
                          : "border-gray-200"
                      }`}
                    />
                    {errors.contentLanguages && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.contentLanguages}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Reel Price (INR)
                    </label>
                    <input
                      name="reelPrice"
                      value={formData.reelPrice}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.reelPrice ? "border-red-500" : "border-gray-200"
                      }`}
                    />
                    {errors.reelPrice && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.reelPrice}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Story Price (INR)
                    </label>
                    <input
                      name="storyPrice"
                      value={formData.storyPrice}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.storyPrice ? "border-red-500" : "border-gray-200"
                      }`}
                    />
                    {errors.storyPrice && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.storyPrice}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Reels + Story Price (INR)
                    </label>
                    <input
                      name="reelsStoryPrice"
                      value={formData.reelsStoryPrice}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.reelsStoryPrice
                          ? "border-red-500"
                          : "border-gray-200"
                      }`}
                    />
                    {errors.reelsStoryPrice && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.reelsStoryPrice}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Delivery Duration
                    </label>
                    <input
                      name="deliveryDuration"
                      value={formData.deliveryDuration}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.deliveryDuration
                          ? "border-red-500"
                          : "border-gray-200"
                      }`}
                    />
                    {errors.deliveryDuration && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.deliveryDuration}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Panel 3 */}
            {step === 3 && (
              <div className="transition-all duration-300">
                {/* === Instagram Details (UI) === */}
                <h4 className="text-md font-medium mb-4">Instagram Details</h4>

                {/* Keep your existing Connect Instagram button exactly as-is */}
                <div className="mb-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowInstagramModal(true)}
                    className="px-3 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-md"
                  >
                    Connect Instagram
                  </button>
                  {instagramError && (
                    <p className="text-sm text-red-500">{instagramError}</p>
                  )}
                </div>

                {/* Profile Card (shows after connect) */}
                {connectedProfile ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-neutral-900 rounded-3xl p-6 text-white shadow-lg">
                    {/* Left: avatar + identity */}
                    <div className="flex flex-col items-center justify-center space-y-4 p-4">
                      <div className="relative">
                        <div className="rounded-full bg-neutral-800 p-2 ring-4 ring-neutral-800">
                          <img
                            src={connectedProfile.profile_picture_url}
                            alt={connectedProfile.username}
                            className="w-44 h-44 sm:w-52 sm:h-52 rounded-full object-cover"
                          />
                        </div>
                      </div>

                      <div className="text-center">
                        <h2 className="text-2xl sm:text-3xl font-semibold">
                          {connectedProfile.name || connectedProfile.username}
                        </h2>
                        <p className="text-neutral-400">
                          @{connectedProfile.username}
                        </p>
                        <p className="mt-2 text-pink-400 font-medium">
                          Followers:{" "}
                          {connectedProfile.followers_count?.toLocaleString?.() ??
                            connectedProfile.followers_count}
                        </p>
                        <a
                          href={connectedProfile.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-blue-400 hover:underline break-all"
                        >
                          {connectedProfile.profileUrl}
                        </a>
                      </div>
                    </div>

                    {/* Right: stats grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-neutral-800">
                        <p className="text-neutral-400 text-xs">
                          Avg. Reel Views
                        </p>
                        <p className="text-2xl font-semibold mt-1">
                          {connectedProfile.avgReelViews ?? 0}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-neutral-800">
                        <p className="text-neutral-400 text-xs">
                          Avg. Story Views
                        </p>
                        <p className="text-2xl font-semibold mt-1">
                          {connectedProfile.storyAverageViews ?? 0}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-neutral-800">
                        <p className="text-neutral-400 text-xs">
                          Avg. Feed Views
                        </p>
                        <p className="text-2xl font-semibold mt-1">
                          {connectedProfile.avgFeedViews ?? 0}
                        </p>
                      </div>

                      {/* Additional metric cards */}
                      <div className="p-4 rounded-2xl bg-neutral-800">
                        <p className="text-neutral-400 text-xs">Avg. Likes</p>
                        <p className="text-2xl font-semibold mt-1">
                          {(connectedProfile.avgLikes as number) ?? 0}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-neutral-800">
                        <p className="text-neutral-400 text-xs">
                          Avg. Comments
                        </p>
                        <p className="text-2xl font-semibold mt-1">
                          {(connectedProfile.avgComments as number) ?? 0}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-neutral-800">
                        <p className="text-neutral-400 text-xs">
                          Engagement Rate
                        </p>
                        <p className="text-2xl font-semibold mt-1">
                          {typeof connectedProfile.engagementRate === "number"
                            ? `${connectedProfile.engagementRate.toFixed(1)}%`
                            : "—"}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-neutral-800">
                        <p className="text-neutral-400 text-xs">Posts / Week</p>
                        <p className="text-2xl font-semibold mt-1">
                          {(connectedProfile.postsPerWeek as number) ?? "—"}
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-neutral-800">
                        <p className="text-neutral-400 text-xs">
                          Posts / Month
                        </p>
                        <p className="text-2xl font-semibold mt-1">
                          {(connectedProfile.postsPerMonth as number) ?? "—"}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-neutral-800">
                        <p className="text-neutral-400 text-xs">
                          Account Reach
                        </p>
                        <p className="text-2xl font-semibold mt-1">
                          {(connectedProfile.accountReach as number) ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Gentle empty state until connected
                  <div className="rounded-2xl border border-neutral-200/10 bg-neutral-900 p-6 text-neutral-300">
                    Connect your Instagram to see your profile, followers and
                    average views here.
                  </div>
                )}
                {/* Top Posts Preview */}
                {connectedProfile.topPosts &&
                  connectedProfile.topPosts.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-300 mb-2">
                        Top Posts
                      </h5>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
                        {connectedProfile.topPosts.slice(0, 6).map((p: any) => (
                          <a
                            key={p.id || p.media_id || Math.random()}
                            href={p.permalink || p.permalink_url || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="relative aspect-[4/5] bg-neutral-800 rounded-md overflow-hidden group"
                          >
                            {p.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.thumbnail}
                                alt={p.id}
                                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm text-neutral-400">
                                No Image
                              </div>
                            )}

                            {/* Overlay with Likes & Comments */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="flex items-center gap-4 text-white text-sm font-medium">
                                <div className="flex items-center gap-1">
                                  {/* Like Icon */}
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                    className="w-4 h-4"
                                  >
                                    <path
                                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 
                5.42 4.42 3 7.5 3c1.74 0 3.41.81 
                4.5 2.09C13.09 3.81 14.76 3 16.5 
                3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 
                6.86-8.55 11.54L12 21.35z"
                                    />
                                  </svg>
                                  {p.likes ?? p.like_count ?? "—"}
                                </div>
                                <div className="flex items-center gap-1">
                                  {/* Comment Icon */}
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                    className="w-4 h-4"
                                  >
                                    <path
                                      d="M20 2H4C2.9 2 2 2.9 2 
                4v20l4-4h14c1.1 0 2-.9 
                2-2V4c0-1.1-.9-2-2-2z"
                                    />
                                  </svg>
                                  {p.comments ?? p.comments_count ?? "—"}
                                </div>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1">
              {step > 1 && (
                <button
                  type="button"
                  onClick={goPrev}
                  className="w-full sm:w-auto px-4 py-3 rounded-lg bg-gray-100 text-gray-700"
                >
                  Back
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {!isLastStep && (
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep()) goNext();
                  }}
                  className="w-full sm:w-auto px-4 py-3 rounded-lg bg-purple-600 text-white"
                >
                  Next
                </button>
              )}
              {isLastStep && (
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-3 rounded-lg bg-purple-600 text-white font-medium"
                >
                  {uploading
                    ? "Submitting..."
                    : existingApplication
                    ? "Update Application"
                    : "Submit Application"}
                </button>
              )}
            </div>
          </div>

          {/* Reset */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  fullName: "",
                  mobileNumber: "",
                  emailAddress: "",
                  cityState: "",
                  gender: "",
                  instagramUsername: "",
                  instagramProfileLink: "",
                  totalFollowers: "",
                  avgReelViews: "",
                  storyAverageViews: "",
                  avgFeedViews: "",
                  // Instagram metrics
                  avgLikes: "",
                  avgComments: "",
                  topPosts: [],
                  postsPerWeek: "",
                  postsPerMonth: "",
                  engagementRate: "",
                  accountReach: "",
                  instagramState: "",
                  profileUrl: "",
                  contentCategory: "",
                  contentLanguages: "",
                  reelPrice: "",
                  storyPrice: "",
                  reelsStoryPrice: "",
                  deliveryDuration: "",
                });
                setImage(null);
                setImagePreview(null);
                setErrors({});
                setStep(1);
              }}
              className="w-full py-2.5 px-4 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition duration-200 text-sm"
            >
              Reset Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Application Status Component =====
export function ApplicationStatus({
  application,
}: {
  application: ApplicationData | null;
}) {
  if (!application) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 text-center">
        <div className="bg-gray-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
          <svg
            className="h-6 w-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
          No Application Found
        </h2>
        <p className="text-gray-600 mb-4 text-sm sm:text-base">
          You haven&apos;t submitted an application yet. Please submit your
          creator application to get started.
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
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDateForStatus = (timestamp: Timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate();
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-4 sm:p-6 text-white">
        <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">
          Application Status
        </h1>
        <p className="text-purple-100 text-sm sm:text-base">
          Track your creator application progress
        </p>
      </div>
      <div className="p-4 sm:p-6">
        <div className="flex flex-col gap-5 sm:gap-8">
          <div className="sm:pr-4">
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 sm:mb-4 gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                  Application Details
                </h2>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(
                    application.status
                  )}`}
                >
                  {application.status.charAt(0).toUpperCase() +
                    application.status.slice(1)}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                      Submitted On
                    </h3>
                    <p className="font-medium text-sm sm:text-base">
                      {formatDateForStatus(application.timestamp)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                      Last Updated
                    </h3>
                    <p className="font-medium text-sm sm:text-base">
                      {application.updatedAt
                        ? formatDateForStatus(application.updatedAt)
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                      Full Name
                    </h3>
                    <p className="font-medium text-sm sm:text-base">
                      {application.fullName}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                      Instagram
                    </h3>
                    <a
                      href={application.instagramProfileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-purple-600 hover:underline text-sm sm:text-base"
                    >
                      @{application.instagramUsername}
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-5 sm:pt-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
                Pricing Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                    Reel Price
                  </h3>
                  <p className="text-base sm:text-lg font-bold">
                    ₹{application.reelPrice}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                    Story Price
                  </h3>
                  <p className="text-base sm:text-lg font-bold">
                    ₹{application.storyPrice}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                    Reel + Story
                  </h3>
                  <p className="text-base sm:text-lg font-bold">
                    ₹{application.reelsStoryPrice}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="sm:pl-4">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">
                Profile Information
              </h2>
              {application.profilePictureUrl ? (
                <div className="mb-3 sm:mb-4">
                  <Image
                    src={application.profilePictureUrl}
                    alt="Profile"
                    width={128}
                    height={128}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg object-cover mx-auto border-2 border-gray-300"
                  />
                </div>
              ) : (
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                  <svg
                    className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 012-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500">
                    Email
                  </h3>
                  <p className="font-medium text-sm sm:text-base">
                    {application.emailAddress}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500">
                    Phone
                  </h3>
                  <p className="font-medium text-sm sm:text-base">
                    {application.mobileNumber}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500">
                    Location
                  </h3>
                  <p className="font-medium text-sm sm:text-base">
                    {application.cityState}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500">
                    Gender
                  </h3>
                  <p className="font-medium text-sm sm:text-base">
                    {application.gender}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500">
                    Delivery Time
                  </h3>
                  <p className="font-medium text-sm sm:text-base">
                    {application.deliveryDuration}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 sm:mt-8 pt-5 border-t border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
            Next Steps
          </h2>
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 sm:p-4">
            {application.status === "pending" ? (
              <p className="text-purple-800 text-sm sm:text-base">
                Your application is under review. Our team will evaluate your
                profile and get back to you within 3-5 business days.
                You&apos;ll receive an email notification once a decision has
                been made.
              </p>
            ) : application.status === "approved" ? (
              <p className="text-green-800 text-sm sm:text-base">
                Congratulations! Your application has been approved. You can now
                start collaborating with brands on our platform. Check your
                email for more details on how to get started.
              </p>
            ) : (
              <p className="text-red-800 text-sm sm:text-base">
                Your application has been reviewed but not approved at this
                time. Please see the admin feedback for more details. You may
                update your application and resubmit for reconsideration.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Main Page & Dashboard =====
export default function CreatorDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          Loading...
        </div>
      }
    >
      <CreatorDashboard />
    </Suspense>
  );
}

// CORRECTED CreatorDashboard Component
function CreatorDashboard() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [creatorData, setCreatorData] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [view, setView] = useState<"dashboard" | "applicationForm" | "profile">(
    "dashboard"
  );
  const searchParams = useSearchParams();

  // This ref ensures the initial view is set only once.
  const initialViewIsSet = useRef(false);

  // --- EFFECT 1: Handles data fetching and subscriptions ---
  useEffect(() => {
    if (!user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    // Listener for the user's main profile data
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(
      userDocRef,
      (userSnap) => {
        if (userSnap.exists()) {
          const fetchedUserData = userSnap.data() as UserData;
          // Check for and handle expired subscription
          if (
            fetchedUserData.subscriptionStatus === "active" &&
            fetchedUserData.subscriptionExpiresAt &&
            fetchedUserData.subscriptionExpiresAt.toDate() < new Date()
          ) {
            updateDoc(userDocRef, {
              subscriptionStatus: "active",
              subscriptionExpiresAt: Timestamp.fromDate(new Date("2099-12-31")),
              updatedAt: serverTimestamp(),
            });
            // No need to set local state here, onSnapshot will fire again with updated data
          } else {
            setUserData(fetchedUserData);
          }
        } else {
          // If user document doesn't exist, create it
          const initialData: UserData = {
            userId: user.uid,
            email: user.email ?? undefined,
            fullName: user.displayName || "",
            createdAt: serverTimestamp(),
            accountType: "creator",
            subscriptionStatus: "active",
            subscriptionExpiresAt: Timestamp.fromDate(new Date("2099-12-31")),
          };
          setDoc(userDocRef, initialData, { merge: true });
          setUserData(initialData);
        }
      },
      (error) => {
        console.error("Error fetching user data:", error);
        setLoading(false);
      }
    );

    // Listener for the user's creator application
    const qCreator = query(
      collection(db, "creatorApplications"),
      where("userId", "==", user.uid),
      limit(1)
    );
    const unsubscribeCreator = onSnapshot(
      qCreator,
      async (snapshot) => {
        if (!snapshot.empty) {
          const data = {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data(),
          } as ApplicationData;
          setCreatorData(data);

          // Set recent activity based on application data
          const activities: Activity[] = [];
          if (data.timestamp)
            activities.push({
              type: "submitted",
              description: "Application was submitted.",
              time: formatDate(data.timestamp),
            });
          if (data.updatedAt)
            activities.push({
              type: "update",
              description: "Profile was recently updated.",
              time: formatDate(data.updatedAt),
            });
          if (data.status === "approved")
            activities.push({
              type: "approved",
              description: "Congratulations! Application approved.",
              time: formatDate(data.updatedAt || data.timestamp),
            });
          setRecentActivity(
            activities.sort(
              (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
            )
          );
        } else {
          setCreatorData(null);
        }
        // Once creator data status is known, we can stop the main loading indicator
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching creator data:", error);
        setLoading(false);
      }
    );

    // Cleanup listeners on component unmount
    return () => {
      unsubscribeUser();
      unsubscribeCreator();
    };
  }, [user, router]);

  // --- EFFECT 2: Handles account type update when application is approved ---
  // This effect runs whenever the creator application status changes to 'approved'.
  useEffect(() => {
    if (
      user &&
      creatorData?.status === "approved" &&
      userData?.accountType !== "creator"
    ) {
      const userDocRef = doc(db, "users", user.uid);
      console.log("Application approved. Updating account type to 'creator'.");
      updateDoc(userDocRef, {
        accountType: "creator",
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        console.error("Failed to update user account type:", err);
      });
    }
  }, [user, userData, creatorData]); // Dependencies ensure this logic runs with the latest data.

  // --- EFFECT 3: Sets the initial view after data is loaded ---
  useEffect(() => {
    // This effect should only run once after data is loaded.
    if (loading || initialViewIsSet.current || !userData) {
      return;
    }

    const isProfileComplete = !!(
      userData.fullName &&
      userData.mobileNumber &&
      userData.cityState &&
      userData.gender
    );

    // Prefer showing the dashboard by default. If the user is already an approved creator, show dashboard.
    // If their profile is incomplete, do NOT force navigation to the profile edit — show dashboard and a non-blocking prompt instead.
    if (creatorData?.status === "approved") {
      setView("dashboard");
    } else if (isProfileComplete) {
      // Profile complete but not approved -> send them to application form by default
      setView("dashboard");
    } else {
      // Profile incomplete -> still show dashboard by default
      setView("dashboard");
    }

    // Mark the initial view as set to prevent this from running again
    initialViewIsSet.current = true;
  }, [loading, userData, creatorData]);

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

  // --- Core Logic: Check if personal information is complete ---
  const isProfileComplete = !!(
    userData.fullName &&
    userData.mobileNumber &&
    userData.cityState &&
    userData.gender
  );

  // --- If profile is NOT complete, force the user to fill it out ---
  if (!isProfileComplete) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mb-8">
          <div className="flex">
            <div className="py-1">
              <svg
                className="fill-current h-6 w-6 text-yellow-500 mr-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM9 5v6h2V5H9zm0 8h2v-2H9v2z" />
              </svg>
            </div>
            <div>
              <p className="font-bold">Action Required</p>
              <p className="text-sm">
                Welcome! Please complete your personal information to access the
                dashboard and all website features.
              </p>
            </div>
          </div>
        </div>
        <PersonalInformationForm
          user={user}
          userData={userData}
          isMandatory={true}
        />
      </div>
    );
  }

  const isUserSubscribed =
    userData?.subscriptionStatus === "active" &&
    (userData?.subscriptionExpiresAt?.toDate() ?? new Date(0)) > new Date();

  const renderMainContent = () => {
    switch (view) {
      case "profile":
        return (
          <PersonalInformationForm
            user={user}
            userData={userData}
            isMandatory={false}
          />
        );

      case "applicationForm":
        return (
          <ApplicationForm
            user={user}
            userData={userData}
            existingApplication={creatorData}
            isSubscribed={isUserSubscribed}
          />
        );

      case "dashboard":
      default:
        if (creatorData && creatorData.status === "approved") {
          // --- CREATOR'S DASHBOARD VIEW (when approved) ---
          return (
            <>
              {/* Creator Profile Summary */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                  <Image
                    src={
                      creatorData.profilePictureUrl ||
                      "https://placehold.co/120x120/E9D5FF/4C1D95?text=Photo"
                    }
                    alt="Profile"
                    width={120}
                    height={120}
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-purple-200 shadow-sm"
                  />
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {creatorData.fullName}
                    </h2>
                    <a
                      href={creatorData.instagramProfileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline font-medium text-sm sm:text-base inline-block"
                    >
                      @{creatorData.instagramUsername}
                    </a>
                  </div>
                  <button
                    onClick={() => setView("applicationForm")}
                    className="w-full sm:w-auto mt-4 sm:mt-0 inline-flex justify-center items-center px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 transition-colors shadow-md cursor-pointer gap-2"
                  >
                    <PencilSquareIcon className="w-5 h-5" /> Manage Creator
                    Profile
                  </button>
                </div>
                <div className="mt-8 pt-8 border-t border-gray-200 bg-purple-50 rounded-xl p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <InfoCard
                      title="Followers"
                      value={creatorData.totalFollowers || "N/A"}
                      icon={<UsersIcon className="w-6 h-6" />}
                    />
                    <InfoCard
                      title="Avg. Reel Views"
                      value={creatorData.avgReelViews || "N/A"}
                      icon={<PlayIcon className="w-6 h-6" />}
                    />
                    <InfoCard
                      title="Avg. Story Views"
                      value={creatorData.storyAverageViews || "N/A"}
                      icon={<EyeIcon className="w-6 h-6" />}
                    />
                    <InfoCard
                      title="Avg. Feed Views"
                      value={creatorData.avgFeedViews || "N/A"}
                      icon={<SparklesIcon className="w-6 h-6" />}
                    />
                    <InfoCard
                      title="Avg. Likes"
                      value={(creatorData as any).avgLikes ?? "N/A"}
                      icon={<HeartIcon className="w-6 h-6" />}
                    />
                    <InfoCard
                      title="Avg. Comments"
                      value={(creatorData as any).avgComments ?? "N/A"}
                      icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <h4 className="text-xs text-gray-500 mb-1">
                        Posting Frequency
                      </h4>
                      <div className="flex items-baseline gap-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {(creatorData as any).postsPerWeek ?? "-"}
                          </div>
                          <div className="text-xs text-gray-500">per week</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {(creatorData as any).postsPerMonth ?? "-"}
                          </div>
                          <div className="text-xs text-gray-500">per month</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <h4 className="text-xs text-gray-500 mb-1">
                        Engagement & Reach
                      </h4>
                      <div className="flex items-baseline gap-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {(creatorData as any).engagementRate ?? "-"}%
                          </div>
                          <div className="text-xs text-gray-500">
                            engagement rate
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {(creatorData as any).accountReach ?? "-"}
                          </div>
                          <div className="text-xs text-gray-500">reach</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-white rounded-lg p-3 border border-gray-100">
                    <h4 className="text-xs text-gray-500 mb-2">
                      Instagram Profile
                    </h4>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <a
                          href={
                            (creatorData as any).instagramProfileLink ||
                            (creatorData as any).profileUrl ||
                            "#"
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 font-medium hover:underline text-sm"
                        >
                          @{creatorData.instagramUsername}
                        </a>
                        <div className="text-xs text-gray-500">
                          State: {(creatorData as any).instagramState ?? "-"}
                        </div>
                      </div>
                      <div>
                        {creatorData.profilePictureUrl ? (
                          <Image
                            src={creatorData.profilePictureUrl}
                            alt="Profile"
                            width={64}
                            height={64}
                            className="w-14 h-14 rounded-md object-cover border"
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Application Status */}
              <ApplicationStatus application={creatorData} />

              {/* Recent Activity */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Recent Activity
                </h3>
                <ul className="space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <li key={index} className="flex items-center gap-4">
                        <ActivityIcon type={activity.type} />
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {activity.time}
                          </p>
                        </div>
                      </li>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No recent activity.</p>
                  )}
                </ul>
              </div>
            </>
          );
        } else if (
          creatorData &&
          (creatorData.status === "pending" ||
            creatorData.status === "rejected")
        ) {
          // --- CREATOR'S DASHBOARD VIEW (when pending/rejected) ---
          return (
            <>
              {/* Application Status */}
              <ApplicationStatus application={creatorData} />

              {/* Prompt to manage application */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
                <DocumentTextIcon className="w-16 h-16 mx-auto text-purple-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900">
                  Your Application Status
                </h2>
                <p className="text-gray-600 mt-2 mb-6 max-w-xl mx-auto">
                  {creatorData.status === "pending"
                    ? "Your creator application is currently under review. We'll notify you once a decision is made."
                    : "Your creator application was not approved. Please review the feedback and update your profile."}
                </p>
                <button
                  onClick={() => setView("applicationForm")}
                  className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold text-base hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg cursor-pointer gap-2"
                >
                  <PencilSquareIcon className="w-5 h-5" /> Manage Application
                </button>
              </div>
            </>
          );
        } else {
          // --- NORMAL USER'S DASHBOARD VIEW ---
          return (
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
              <SparklesIcon className="w-16 h-16 mx-auto text-purple-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">
                Ready to Become a Creator?
              </h2>
              <p className="text-gray-600 mt-2 mb-6 max-w-xl mx-auto">
                Join our exclusive network of influencers and start
                collaborating with amazing brands. Apply today to unlock new
                opportunities!
              </p>
              <button
                onClick={() => setView("applicationForm")}
                className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold text-base hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg cursor-pointer gap-2"
              >
                Become a Creator Now
              </button>
            </div>
          );
        }
    }
  };

  // --- This is the main return for a user with a COMPLETE profile ---
  return (
    <div className="container mx-auto px-4 space-y-4 mb-24">
      {/* Header section with view-switching buttons */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
        {/* Non-blocking prompt if profile incomplete */}
        {!isProfileComplete && (
          <div className="w-full sm:w-auto mb-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-md text-sm text-yellow-800">
              Your personal info is incomplete.
              <button
                onClick={() => setView("profile")}
                className="underline font-medium ml-1"
              >
                Complete now
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b flex gap-6">
          {/* Dashboard Tab */}
          <button
            onClick={() => setView("dashboard")}
            className={`pb-3 flex items-center gap-2 text-sm sm:text-base font-medium transition-colors ${
              view === "dashboard"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
            title="Dashboard"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
            <span>Dashboard</span>
          </button>

          {/* Creator Profile Tab */}
          <button
            onClick={() => setView("applicationForm")}
            className={`pb-3 flex items-center gap-2 text-sm sm:text-base font-medium transition-colors ${
              view === "applicationForm"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
            title={creatorData ? "Manage Creator Profile" : "Become a Creator"}
          >
            <DocumentTextIcon className="h-5 w-5" />
            <span>{creatorData ? "Creator Profile" : "Apply"}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main column: will expand to occupy available space when the subscription card is absent */}
        <div className="flex-1 space-y-8">{renderMainContent()}</div>
      </div>
    </div>
  );
}
