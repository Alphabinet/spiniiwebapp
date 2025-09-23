"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  ShoppingCart,
  AlertCircle,
  Instagram,
  IndianRupee,
  Briefcase,
  Globe,
  Users,
  PlayCircle,
  Eye,
  BarChart,
  Heart,
  MessageCircle,
  Activity,
  TrendingUp,
  Calendar,
  Languages,
  Gauge,
  MapPin,
  ImageIcon,
} from "lucide-react";
import Image from "next/image"; // Import the Next.js Image component
import Footer from "@/app/components/Footer";

// Type definition for Creator data
interface Creator {
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
    thumbnail?: string;
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

// A simple utility to format numbers for display (e.g., 10000 -> 10K, 1234567 -> 1.2M)
const formatNumber = (num: string | number): string => {
  if (typeof num === "string") {
    num = parseInt(num.replace(/,/g, ""));
    if (isNaN(num)) return "0";
  }

  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

export default function CreatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // const { toast } = useToast(); // Removed unused variable

  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCreator = useCallback(async () => {
    if (!id) {
      setError("Creator ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setCreator(null);

    try {
      const docRef = doc(db, "creatorApplications", id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setError("This creator was not found.");
        return;
      }

      const data = docSnap.data();
      setCreator({
        id: docSnap.id,
        fullName: data.fullName || "",
        mobileNumber: data.mobileNumber || "",
        emailAddress: data.emailAddress || "",
        cityState: data.cityState || "Unknown",
        gender: data.gender || "",
        instagramUsername: data.instagramUsername || "",
        instagramProfileLink: data.instagramProfileLink || "",
        totalFollowers: data.totalFollowers || "0",
        avgReelViews: data.avgReelViews || "0",
        storyAverageViews: data.storyAverageViews || "0",
        avgFeedViews: data.avgFeedViews || "0",
        avgLikes: data.avgLikes ?? 0,
        avgComments: data.avgComments ?? 0,
        topPosts: data.topPosts || [],
        postsPerWeek: data.postsPerWeek ?? 0,
        postsPerMonth: data.postsPerMonth ?? 0,
        engagementRate: data.engagementRate ?? 0,
        accountReach: data.accountReach ?? 0,
        profileUrl: data.profileUrl || "",
        contentCategory: data.contentCategory || "Uncategorized",
        contentLanguages: data.contentLanguages || "English",
        reelPrice: data.reelPrice || "0",
        storyPrice: data.storyPrice || "0",
        reelsStoryPrice: data.reelsStoryPrice || "0",
        deliveryDuration: data.deliveryDuration || "Varies",
        profilePictureUrl: data.profilePictureUrl || "/placeholder-avatar.jpg",
        userId: data.userId || "",
        status: data.status || "approved",
        timestamp: data.timestamp?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        subscriptionStatus: data.subscriptionStatus || "active",
        subscriptionExpiresAt: data.subscriptionExpiresAt?.toDate?.() || null,
        adminFeedback: data.adminFeedback || "",
      });
    } catch (err) {
      console.error("Error fetching creator:", err);
      setError("Failed to load creator details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCreator();
  }, [fetchCreator]);

  const contentCategoryTags = useMemo(() => {
    if (!creator) {
      return ["General Content"];
    }
    if (
      creator.contentCategory === "N/A" ||
      creator.contentCategory.trim() === "Uncategorized"
    ) {
      return ["General Content"];
    }
    return creator.contentCategory
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");
  }, [creator]);

  const topLocationDisplay = useMemo(() => {
    if (
      !creator ||
      creator.cityState === "N/A" ||
      creator.cityState.trim() === ""
    )
      return "Not specified";
    return creator.cityState;
  }, [creator]);

  const contentLanguagesDisplay = useMemo(() => {
    if (
      !creator ||
      creator.contentLanguages === "N/A" ||
      creator.contentLanguages.trim() === ""
    )
      return "Not specified";
    return creator.contentLanguages
      .split(",")
      .map((lang) => lang.trim())
      .join(", ");
  }, [creator]);

  const deliveryDurationDisplay = useMemo(() => {
    if (
      !creator ||
      creator.deliveryDuration === "N/A" ||
      creator.deliveryDuration.trim() === ""
    )
      return "Varies";
    return `${creator.deliveryDuration} days`;
  }, [creator]);

  // --- NEW: Function to handle navigation to the new booking page ---
  const handleBookServiceClick = useCallback(() => {
    if (creator) {
      // Navigate to the dedicated booking page using the creator's ID.
      // You must create a new page at the '/booking/[id]' route.
      router.push(`/booking/${creator.id}`);
    }
  }, [creator, router]);

  // =====================================================================
  // CONDITIONAL RENDERING STARTS HERE, AFTER ALL HOOKS ARE DECLARED
  // =====================================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center w-full max-w-md bg-white rounded-3xl p-8 shadow-xl animate-pulse">
          <Skeleton className="w-20 h-20 rounded-full bg-gray-200 mx-auto md:mx-0 mb-4" />
          <Skeleton className="h-10 w-3/4 mx-auto md:ml-4 mb-2 bg-gray-200" />
          <Skeleton className="h-6 w-1/2 mx-auto md:ml-4 mb-8 bg-gray-200" />
          <div className="flex justify-around mb-8">
            <Skeleton className="h-16 w-1/3 rounded-lg bg-gray-200" />
            <Skeleton className="h-16 w-1/3 rounded-lg bg-gray-200" />
          </div>
          <Skeleton className="h-8 w-full rounded-lg mb-4 bg-gray-200" />
          <div className="flex flex-wrap gap-2 mb-8">
            <Skeleton className="h-8 w-20 rounded-full bg-gray-200" />
            <Skeleton className="h-8 w-24 rounded-full bg-gray-200" />
          </div>
          <Skeleton className="h-8 w-full rounded-lg mb-4 bg-gray-200" />
          <div className="grid grid-cols-2 gap-4 mb-8">
            <Skeleton className="h-24 rounded-lg bg-gray-200" />
            <Skeleton className="h-24 rounded-lg bg-gray-200" />
          </div>
          <Skeleton className="h-24 rounded-lg bg-gray-200" />{" "}
          {/* Added skeleton for third grid item if needed */}
          <Skeleton className="h-12 w-2/3 mx-auto mt-8 rounded-full bg-gray-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="text-center max-w-md p-10 bg-white rounded-3xl shadow-2xl border border-purple-300">
          <AlertCircle className="h-20 w-20 text-purple-500 mx-auto mb-6 animate-shake" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Error Loading Page
          </h2>
          <p className="text-gray-600 mb-8 text-lg">{error}</p>
          <div className="flex flex-col gap-4">
            <Button
              onClick={fetchCreator}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md"
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="w-full border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
            >
              <ArrowLeft className="mr-2 h-5 w-5" /> Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="text-center max-w-md p-10 bg-white rounded-3xl shadow-2xl border border-gray-300">
          <AlertCircle className="h-20 w-20 text-gray-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Creator Not Found
          </h2>
          <p className="text-gray-600 mb-8 text-lg">
            The profile you&apos;re looking for does not exist or may have been
            removed.
          </p>
          <Button
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md"
            onClick={() => router.push("/creator")}
          >
            <ArrowLeft className="mr-2 h-5 w-5" /> Browse All Creators
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      <div className="container mx-auto py-8 px-4 mb-24 max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-6xl">
        {" "}
        {/* Added margin-bottom here */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
          {/* HEADER */}
          <section className="bg-gradient-to-br from-purple-200 to-indigo-200 text-white p-8 pt-12 pb-10 relative z-10 rounded-t-3xl">
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start mb-6 text-center sm:text-left">
              <Image
                src={creator.profilePictureUrl}
                alt={`${creator.fullName}'s profile`}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg mb-4 sm:mb-0 sm:mr-4 object-cover transform transition-transform duration-300 hover:scale-105 hover:rotate-3"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src =
                    "https://placehold.co/200x200/CFD8DC/455A64?text=Profile";
                }}
              />
              <div className="flex-grow">
                <h1 className="text-3xl sm:text-4xl font-extrabold mb-0 drop-shadow-sm text-gray-800 leading-tight">
                  {creator.fullName}
                </h1>
                <p className="text-purple-700 text-lg sm:text-xl font-medium mb-2">
                  @{creator.instagramUsername}
                </p>
                <a
                  href={creator.instagramProfileLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-purple-700 hover:text-indigo-800 hover:underline transition-colors duration-200 text-base py-1 px-3 rounded-full border border-purple-300 bg-white bg-opacity-70 hover:bg-opacity-100"
                >
                  <Instagram className="mr-2 h-5 w-5" /> View Profile
                </a>
              </div>
            </div>

            {/* KPI STATS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 text-center">
              <div className="bg-white/70 rounded-xl p-4 shadow-inner flex flex-col items-center">
                <Users className="h-6 w-6 text-purple-600 mb-1" />
                <p className="text-2xl font-bold text-gray-800">
                  {formatNumber(creator.totalFollowers)}
                </p>
                <p className="text-sm font-semibold text-gray-600">Followers</p>
              </div>
              <div className="bg-white/70 rounded-xl p-4 shadow-inner flex flex-col items-center">
                <PlayCircle className="h-6 w-6 text-purple-600 mb-1" />
                <p className="text-2xl font-bold text-gray-800">
                  {formatNumber(creator.avgReelViews)}
                </p>
                <p className="text-sm font-semibold text-gray-600">
                  Avg. Reel Views
                </p>
              </div>
              <div className="bg-white/70 rounded-xl p-4 shadow-inner flex flex-col items-center">
                <Eye className="h-6 w-6 text-purple-600 mb-1" />
                <p className="text-2xl font-bold text-gray-800">
                  {formatNumber(creator.storyAverageViews)}
                </p>
                <p className="text-sm font-semibold text-gray-600">
                  Story Views
                </p>
              </div>
            </div>
          </section>

          {/* BODY */}
          <div className="p-6 space-y-8">
            {/* EXTRA ANALYTICS */}
            <section>
              <h2 className="text-md font-bold text-gray-900 mb-4 flex items-center">
                <BarChart className="h-6 w-6 text-gray-600 mr-2" /> Analytics
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                <div className="bg-pink-50 p-4 rounded-xl flex flex-col items-center">
                  <Heart className="h-6 w-6 text-pink-600 mb-1" />
                  <p className="text-lg font-bold text-gray-800">
                    {creator.avgLikes ?? 0}
                  </p>
                  <p className="text-sm text-gray-600">Avg Likes</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-xl flex flex-col items-center">
                  <MessageCircle className="h-6 w-6 text-yellow-600 mb-1" />
                  <p className="text-lg font-bold text-gray-800">
                    {creator.avgComments ?? 0}
                  </p>
                  <p className="text-sm text-gray-600">Avg Comments</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl flex flex-col items-center">
                  <Activity className="h-6 w-6 text-green-600 mb-1" />
                  <p className="text-lg font-bold text-gray-800">
                    {creator.engagementRate ?? 0}%
                  </p>
                  <p className="text-sm text-gray-600">Engagement</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl flex flex-col items-center">
                  <TrendingUp className="h-6 w-6 text-blue-600 mb-1" />
                  <p className="text-lg font-bold text-gray-800">
                    {creator.accountReach ?? 0}
                  </p>
                  <p className="text-sm text-gray-600">Reach</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-xl flex flex-col items-center">
                  <Calendar className="h-6 w-6 text-indigo-600 mb-1" />
                  <p className="text-lg font-bold text-gray-800">
                    {creator.postsPerWeek ?? 0}
                  </p>
                  <p className="text-sm text-gray-600">Posts/Week</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-xl flex flex-col items-center">
                  <Calendar className="h-6 w-6 text-indigo-600 mb-1" />
                  <p className="text-lg font-bold text-gray-800">
                    {creator.postsPerMonth ?? 0}
                  </p>
                  <p className="text-sm text-gray-600">Posts/Month</p>
                </div>
              </div>
            </section>

            {/* CONTENT DETAILS */}
            <section>
              <h2 className="text-md font-bold text-gray-900 mb-4 flex items-center">
                <Globe className="h-6 w-6 text-gray-600 mr-2" /> Content Details
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl shadow-sm flex flex-col items-center">
                  <Languages className="h-5 w-5 text-purple-600 mb-1" />
                  <p className="text-sm font-semibold text-gray-800">
                    Languages
                  </p>
                  <p className="text-gray-700 text-base text-center">
                    {contentLanguagesDisplay}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl shadow-sm flex flex-col items-center">
                  <Gauge className="h-5 w-5 text-purple-600 mb-1" />
                  <p className="text-sm font-semibold text-gray-800">
                    Delivery
                  </p>
                  <p className="text-gray-700 text-base text-center">
                    {deliveryDurationDisplay}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl shadow-sm flex flex-col items-center">
                  <MapPin className="h-5 w-5 text-purple-600 mb-1" />
                  <p className="text-sm font-semibold text-gray-800">
                    Base Location
                  </p>
                  <p className="text-gray-700 text-base text-center">
                    {topLocationDisplay}
                  </p>
                </div>
              </div>
            </section>

            {/* PRICING */}
            <section>
              <h2 className="text-md font-bold text-gray-900 mb-4 flex items-center">
                <IndianRupee className="h-6 w-6 text-gray-600 mr-2" /> Pricing
              </h2>
              <div
                className={
                  parseInt(creator.reelsStoryPrice) > 0
                    ? "grid grid-cols-2 md:grid-cols-3 gap-4"
                    : "grid grid-cols-1 sm:grid-cols-2 gap-4"
                }
              >
                <div className="bg-gray-50 p-4 rounded-2xl shadow flex flex-col items-center hover:scale-105 transition-transform">
                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    Reel
                  </p>
                  <p className="text-purple-600 font-bold text-xl">
                    ₹{parseInt(creator.reelPrice).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl shadow flex flex-col items-center hover:scale-105 transition-transform">
                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    Story
                  </p>
                  <p className="text-purple-600 font-bold text-xl">
                    ₹{parseInt(creator.storyPrice).toLocaleString("en-IN")}
                  </p>
                </div>
                {parseInt(creator.reelsStoryPrice) > 0 && (
                  <div className="bg-gray-50 p-4 rounded-2xl shadow flex flex-col items-center hover:scale-105 transition-transform">
                    <p className="text-sm font-semibold text-gray-800 mb-1">
                      Reel + Story
                    </p>
                    <p className="text-purple-600 font-bold text-xl">
                      ₹
                      {parseInt(creator.reelsStoryPrice).toLocaleString(
                        "en-IN"
                      )}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* TOP POSTS */}
            {creator.topPosts && creator.topPosts?.length > 0 && (
              <section>
                <h2 className="text-md font-bold text-gray-900 mb-4 flex items-center">
                  <ImageIcon className="h-6 w-6 text-gray-600 mr-2" /> Top
                  Performing Posts
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {creator.topPosts.slice(0, 6).map((post, i) => (
                    <a
                      key={i}
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square overflow-hidden rounded-xl"
                    >
                      <img
                        src={post.thumbnail}
                        alt="Top Post"
                        className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-300"
                      />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-xl shadow-md transition-transform hover:scale-105"
                onClick={handleBookServiceClick}
              >
                <ShoppingCart className="mr-2 h-5 w-5" /> Book Service
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/creator")}
                className="px-8 py-3 rounded-xl text-gray-700 font-semibold border-2 border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-transform hover:scale-105"
              >
                <ArrowLeft className="mr-2 h-5 w-5" /> Back to Creators
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Footer */}
      <Footer />
    </div>
  );
}
