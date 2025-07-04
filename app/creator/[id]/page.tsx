"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ShoppingCart, AlertCircle, Instagram, DollarSign, Briefcase, Globe } from "lucide-react";
import Image from "next/image"; // Import the Next.js Image component

// Type definition for Creator data
interface Creator {
  id: string;
  fullName: string;
  profilePictureUrl: string;
  instagramUsername: string;
  instagramProfileLink: string;
  totalFollowers: string;
  avgReelViews: string;
  storyAverageViews: string;
  cityState: string;
  gender: string;
  contentCategory: string;
  contentLanguages: string;
  reelPrice: string;
  storyPrice: string;
  reelsStoryPrice: string;
  deliveryDuration: string;
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
        fullName: data.fullName || 'N/A',
        profilePictureUrl: data.profilePictureUrl || 'https://placehold.co/400x400/ECEFF1/607D8B?text=Profile',
        instagramUsername: data.instagramUsername || 'N/A',
        instagramProfileLink: data.instagramProfileLink || '#',
        totalFollowers: data.totalFollowers || '0',
        avgReelViews: data.avgReelViews || '0',
        storyAverageViews: data.storyAverageViews || '0',
        cityState: data.cityState || 'N/A',
        gender: data.gender || 'N/A',
        contentCategory: data.contentCategory || 'Uncategorized',
        contentLanguages: data.contentLanguages || 'Not specified',
        reelPrice: data.reelPrice || '0',
        storyPrice: data.storyPrice || '0',
        reelsStoryPrice: data.reelsStoryPrice || '0',
        deliveryDuration: data.deliveryDuration || 'Varies',
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
      return ['General Content'];
    }
    if (creator.contentCategory === 'N/A' || creator.contentCategory.trim() === 'Uncategorized') {
      return ['General Content'];
    }
    return creator.contentCategory.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
  }, [creator]);

  const topLocationDisplay = useMemo(() => {
    if (!creator || creator.cityState === 'N/A' || creator.cityState.trim() === '') return 'Not specified';
    return creator.cityState;
  }, [creator]);

  const contentLanguagesDisplay = useMemo(() => {
    if (!creator || creator.contentLanguages === 'N/A' || creator.contentLanguages.trim() === '') return 'Not specified';
    return creator.contentLanguages.split(',').map(lang => lang.trim()).join(', ');
  }, [creator]);

  const deliveryDurationDisplay = useMemo(() => {
    if (!creator || creator.deliveryDuration === 'N/A' || creator.deliveryDuration.trim() === '') return 'Varies';
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
          <Skeleton className="h-8 w-full rounded-lg mb-4 bg-gray-200" />
          <div className="grid grid-cols-2 gap-4 mb-8">
            <Skeleton className="h-24 rounded-lg bg-gray-200" />
            <Skeleton className="h-24 rounded-lg bg-gray-200" />
          </div>
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
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Error Loading Page</h2>
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
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Creator Not Found</h2>
          <p className="text-gray-600 mb-8 text-lg">
            The profile you&apos;re looking for does not exist or may have been removed.
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
      <div className="container max-w-xl mx-auto py-8 px-4">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">

          <section className="bg-gradient-to-br from-purple-200 to-indigo-200 text-white p-8 pt-12 pb-10 relative z-10 rounded-t-3xl">
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start mb-6 text-center sm:text-left">
              <Image
                src={creator.profilePictureUrl}
                alt={`${creator.fullName}'s profile`}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg mb-4 sm:mb-0 sm:mr-4 object-cover transform transition-transform duration-300 hover:scale-105 hover:rotate-3"
                onError={(e) => { const target = e.target as HTMLImageElement; target.src = 'https://placehold.co/200x200/CFD8DC/455A64?text=Profile'; }}
              />
              <div className="flex-grow">
                <h1 className="text-3xl sm:text-4xl font-extrabold mb-0 drop-shadow-sm text-gray-800 leading-tight">
                  {creator.fullName}
                </h1>
                <p className="text-purple-600 text-lg sm:text-xl font-medium mb-2">
                  @{creator.instagramUsername}
                </p>
                <a href={creator.instagramProfileLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center text-purple-700 hover:text-indigo-800 hover:underline transition-colors duration-200 text-base py-1 px-3 rounded-full border border-purple-300 bg-white bg-opacity-70 hover:bg-opacity-100">
                  <Instagram className="mr-2 h-5 w-5" /> View Profile
                </a>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 text-center">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 shadow-inner">
                <p className="text-3xl font-bold text-gray-800">{formatNumber(creator.totalFollowers)}</p>
                <p className="text-sm font-semibold text-gray-600">Followers</p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 shadow-inner">
                <p className="text-3xl font-bold text-gray-800">{formatNumber(creator.avgReelViews)}</p>
                <p className="text-sm font-semibold text-gray-600">Avg. Reel Views</p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 shadow-inner">
                <p className="text-3xl font-bold text-gray-800">{formatNumber(creator.storyAverageViews)}</p>
                <p className="text-sm font-semibold text-gray-600">Avg. Story Views</p>
              </div>
            </div>
          </section>

          <div className="p-6 space-y-8">
            <section>
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-xl font-bold text-gray-900 flex items-center shrink-0">
                  <Briefcase className="h-6 w-6 text-gray-600 mr-2" /> Content Category:
                </h2>
                <div className="flex flex-wrap gap-2">
                  {contentCategoryTags.map((tag, index) => (
                    <span key={index} className="bg-gray-100 text-gray-700 text-sm px-4 py-2 rounded-full font-medium shadow-sm transition-colors duration-200 hover:bg-gray-200">
                      {tag}
                    </span>
                  ))}
                  {contentCategoryTags.length === 0 && (
                    <span className="text-gray-500 text-sm">No specific categories listed.</span>
                  )}
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Globe className="h-6 w-6 text-gray-600 mr-2" /> Content Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-200">
                  <p className="text-lg font-semibold text-gray-800">Languages:</p>
                  <p className="text-gray-700 text-base">{contentLanguagesDisplay}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-200">
                  <p className="text-lg font-semibold text-gray-800">Delivery:</p>
                  <p className="text-gray-700 text-base">{deliveryDurationDisplay}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-200">
                  <p className="text-lg font-semibold text-gray-800">Base Location:</p>
                  <p className="text-gray-700 text-base">{topLocationDisplay}</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-6 w-6 text-gray-600 mr-2" /> Pricing
              </h2>
              <div className={
                parseInt(creator.reelsStoryPrice) > 0 && parseInt(creator.reelsStoryPrice) !== 0
                  ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
                  : "grid grid-cols-1 sm:grid-cols-2 gap-4"
              }>
                <div className="bg-gray-50 p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center transition-transform duration-200 hover:scale-105 hover:shadow-md">
                  <h3 className="text-base font-semibold text-gray-800 mb-1">Reel</h3>
                  <p className="text-purple-600 font-bold text-2xl">
                    ₹{parseInt(creator.reelPrice).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center transition-transform duration-200 hover:scale-105 hover:shadow-md">
                  <h3 className="text-base font-semibold text-gray-800 mb-1">Story</h3>
                  <p className="text-purple-600 font-bold text-2xl">
                    ₹{parseInt(creator.storyPrice).toLocaleString('en-IN')}
                  </p>
                </div>
                {parseInt(creator.reelsStoryPrice) > 0 && parseInt(creator.reelsStoryPrice) !== 0 && (
                  <div className="bg-gray-50 p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center transition-transform duration-200 hover:scale-105 hover:shadow-md">
                    <h3 className="text-base font-semibold text-gray-800 mb-1">Reel + Story (Bundle)</h3>
                    <p className="text-purple-600 font-bold text-2xl">
                      ₹{parseInt(creator.reelsStoryPrice).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {/* This button now redirects the user to the new booking page */}
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center"
                onClick={handleBookServiceClick}
              >
                <ShoppingCart className="mr-2 h-5 w-5" /> Book Service
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/creator")}
                className="px-8 py-3 rounded-xl text-gray-700 font-semibold border-2 border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center"
              >
                <ArrowLeft className="mr-2 h-5 w-5" /> Back to Creators
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
