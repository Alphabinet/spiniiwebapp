"use client";

import { useState, useCallback, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";

// UI and Icon Imports
import {
  Users,
  Eye,
  Languages,
  Gauge,
  ArrowRight,
  ChevronDown,
  ArrowUpWideNarrow,
  ArrowDownWideNarrow,
  MapPin,
  Tag,
  SlidersHorizontal,
  XCircle,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- TYPE DEFINITIONS ---
type Creator = {
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
  timestamp: Date;
  updatedAt?: Date;
  subscriptionStatus?: "active" | "inactive";
  subscriptionExpiresAt?: Date;
  adminFeedback?: string;
};

// --- HELPER FUNCTION FOR PARSING NUMBERS ---
const parseNumber = (str: string): number => {
  if (typeof str !== "string") return 0;
  const lowerStr = str.toLowerCase().trim();
  if (lowerStr.endsWith("k")) {
    return parseFloat(lowerStr) * 1000;
  }
  if (lowerStr.endsWith("m")) {
    return parseFloat(lowerStr) * 1000000;
  }
  return parseFloat(lowerStr) || 0;
};

// --- MAIN COMPONENT LOGIC ---
function CreatorListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [creators, setCreators] = useState<Creator[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [appliedCategory, setAppliedCategory] = useState(
    searchParams.get("category") || "All"
  );
  const [appliedLanguage, setAppliedLanguage] = useState(
    searchParams.get("language") || "All"
  );
  const [appliedCityState, setAppliedCityState] = useState(
    searchParams.get("location") || "All"
  );

  const [tempSelectedCategory, setTempSelectedCategory] =
    useState(appliedCategory);
  const [tempSelectedLanguage, setTempSelectedLanguage] =
    useState(appliedLanguage);
  const [tempSelectedCityState, setTempSelectedCityState] =
    useState(appliedCityState);

  const [sortBy, setSortBy] = useState<string>("followers_desc");
  const [showFilters, setShowFilters] = useState(false);

  const [categories, setCategories] = useState<string[]>(["All"]);
  const [languages, setLanguages] = useState<string[]>(["All"]);
  const [citiesStates, setCitiesStates] = useState<string[]>(["All"]);

  useEffect(() => {
    const fetchActiveCreators = async () => {
      try {
        setLoadingCreators(true);
        const creatorsCollectionRef = collection(db, "creatorApplications");

        // --- MODIFIED ---
        // Query now only filters for creators with an 'active' subscription.
        const q = query(
          creatorsCollectionRef,
          where("status", "==", "approved")
        );

        const querySnapshot = await getDocs(q);

        const creatorsData = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
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
            profilePictureUrl:
              data.profilePictureUrl || "/placeholder-avatar.jpg",
            userId: data.userId || "",
            status: data.status || "approved",
            timestamp: data.timestamp?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            subscriptionStatus: data.subscriptionStatus || "active",
            subscriptionExpiresAt:
              data.subscriptionExpiresAt?.toDate?.() || null,
            adminFeedback: data.adminFeedback || "",
          };
        }) as Creator[];

        setCreators(creatorsData);

        const uniqueCategories = new Set<string>();
        const uniqueLanguages = new Set<string>();
        const uniqueCitiesStates = new Set<string>();

        creatorsData.forEach((creator) => {
          if (creator.contentCategory)
            uniqueCategories.add(creator.contentCategory);
          if (creator.contentLanguages) {
            creator.contentLanguages
              .split(",")
              .forEach((lang) => uniqueLanguages.add(lang.trim()));
          }
          if (creator.cityState) uniqueCitiesStates.add(creator.cityState);
        });

        setCategories(["All", ...Array.from(uniqueCategories).sort()]);
        setLanguages(["All", ...Array.from(uniqueLanguages).sort()]);
        setCitiesStates(["All", ...Array.from(uniqueCitiesStates).sort()]);
      } catch (err) {
        setError("Failed to fetch active creators. Please try again later.");
        console.error("Error fetching active creators:", err);
      } finally {
        setLoadingCreators(false);
      }
    };

    fetchActiveCreators();
  }, []);

  // --- No other changes are needed below this line ---

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (appliedCategory !== "All") params.set("category", appliedCategory);
    if (appliedLanguage !== "All") params.set("language", appliedLanguage);
    if (appliedCityState !== "All") params.set("location", appliedCityState);
    router.replace(`/creator?${params.toString()}`);
  }, [searchTerm, appliedCategory, appliedLanguage, appliedCityState, router]);

  const handleApplyFilters = () => {
    setAppliedCategory(tempSelectedCategory);
    setAppliedLanguage(tempSelectedLanguage);
    setAppliedCityState(tempSelectedCityState);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setTempSelectedCategory("All");
    setTempSelectedLanguage("All");
    setTempSelectedCityState("All");
    setAppliedCategory("All");
    setAppliedLanguage("All");
    setAppliedCityState("All");
    setSortBy("followers_desc");
  };

  const sortedAndFilteredCreators = useMemo(() => {
    let currentCreators = creators;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    if (lowerCaseSearchTerm) {
      currentCreators = currentCreators.filter(
        (creator) =>
          creator.fullName.toLowerCase().includes(lowerCaseSearchTerm) ||
          creator.instagramUsername.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }

    if (appliedCategory !== "All") {
      currentCreators = currentCreators.filter(
        (creator) => creator.contentCategory === appliedCategory
      );
    }

    if (appliedLanguage !== "All") {
      currentCreators = currentCreators.filter((creator) =>
        creator.contentLanguages
          .split(",")
          .map((lang) => lang.trim())
          .includes(appliedLanguage)
      );
    }

    if (appliedCityState !== "All") {
      currentCreators = currentCreators.filter(
        (creator) => creator.cityState === appliedCityState
      );
    }

    return currentCreators.slice().sort((a, b) => {
      switch (sortBy) {
        case "followers_desc":
          return parseNumber(b.totalFollowers) - parseNumber(a.totalFollowers);
        case "reel_views_desc":
          return parseNumber(b.avgReelViews) - parseNumber(a.avgReelViews);
        case "story_views_desc":
          return (
            parseNumber(b.storyAverageViews) - parseNumber(a.storyAverageViews)
          );
        case "price_desc":
          return (
            parseNumber(b.reelPrice) +
            parseNumber(b.storyPrice) +
            parseNumber(b.reelsStoryPrice) -
            (parseNumber(a.reelPrice) +
              parseNumber(a.storyPrice) +
              parseNumber(a.reelsStoryPrice))
          );
        case "price_asc":
          return (
            parseNumber(a.reelPrice) +
            parseNumber(a.storyPrice) +
            parseNumber(a.reelsStoryPrice) -
            (parseNumber(b.reelPrice) +
              parseNumber(b.storyPrice) +
              parseNumber(b.reelsStoryPrice))
          );
        default:
          return 0;
      }
    });
  }, [
    searchTerm,
    appliedCategory,
    appliedLanguage,
    appliedCityState,
    sortBy,
    creators,
  ]);

  const getSortByLabel = useCallback(() => {
    switch (sortBy) {
      case "followers_desc":
        return "Followers (Highest)";
      case "reel_views_desc":
        return "Avg. Reel Views (Highest)";
      case "story_views_desc":
        return "Avg. Story Views (Highest)";
      case "price_desc":
        return "Price (High to Low)";
      case "price_asc":
        return "Price (Low to High)";
      default:
        return "Sort By";
    }
  }, [sortBy]);

  return (
    <div className="min-h-screen bg-purple-50 py-8 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-purple-900 mb-4 tracking-tight">
            Explore Creators
          </h1>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto mb-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400 z-10" />
          <Input
            placeholder="Search by name/ username..."
            className="w-full border border-purple-300 text-lg py-4 pl-10 pr-6 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Search creators"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Show/Hide Filters Button */}
        <div className="flex justify-end max-w-2xl mx-auto mb-8">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
            className="rounded-full px-4 py-2 font-semibold text-sm border-2 border-purple-200 hover:border-purple-500 transition-all duration-300 shadow-md focus:outline-none"
          >
            {showFilters ? (
              <>
                <XCircle className="h-4 w-4 mr-2" /> Hide Filters
              </>
            ) : (
              <>
                <SlidersHorizontal className="h-4 w-4 mr-2" /> Show Filters &
                Sorting
              </>
            )}
          </Button>
        </div>

        {/* Collapsible Filter & Sort Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-2xl mx-auto mb-12 bg-white p-6 rounded-2xl shadow-lg border border-purple-200 overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {/* Filter controls */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="category-select"
                    className="text-sm font-medium text-gray-700 flex items-center gap-1"
                  >
                    <Tag className="w-4 h-4 text-purple-500" />
                    Category
                  </label>
                  <Select
                    value={tempSelectedCategory}
                    onValueChange={setTempSelectedCategory}
                  >
                    <SelectTrigger
                      id="category-select"
                      className="w-full rounded-full border-2 border-gray-200 focus:ring-purple-500 focus:border-purple-500 transition-all focus:outline-none"
                    >
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-64 overflow-y-auto">
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="language-select"
                    className="text-sm font-medium text-gray-700 flex items-center gap-1"
                  >
                    <Languages className="w-4 h-4 text-purple-500" />
                    Language
                  </label>
                  <Select
                    value={tempSelectedLanguage}
                    onValueChange={setTempSelectedLanguage}
                  >
                    <SelectTrigger
                      id="language-select"
                      className="w-full rounded-full border-2 border-gray-200 focus:ring-purple-500 focus:border-purple-500 transition-all focus:outline-none"
                    >
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-64 overflow-y-auto">
                      {languages.map((language) => (
                        <SelectItem key={language} value={language}>
                          {language}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="city-select"
                    className="text-sm font-medium text-gray-700 flex items-center gap-1"
                  >
                    <MapPin className="w-4 h-4 text-purple-500" />
                    Location
                  </label>
                  <Select
                    value={tempSelectedCityState}
                    onValueChange={setTempSelectedCityState}
                  >
                    <SelectTrigger
                      id="city-select"
                      className="w-full rounded-full border-2 border-gray-200 focus:ring-purple-500 focus:border-purple-500 transition-all focus:outline-none"
                    >
                      <SelectValue placeholder="Select City/State" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-64 overflow-y-auto">
                      {citiesStates.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sort By Dropdown and Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 w-full mt-6 items-end justify-between">
                <div className="relative z-10 w-full sm:w-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full rounded-full px-5 py-2 flex items-center justify-center gap-2 transition-all duration-200 border-2 border-gray-200 hover:border-purple-400 focus:outline-none"
                      >
                        {sortBy.includes("desc") ? (
                          <ArrowDownWideNarrow className="h-4 w-4" />
                        ) : (
                          <ArrowUpWideNarrow className="h-4 w-4" />
                        )}
                        {getSortByLabel()}
                        <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup
                        value={sortBy}
                        onValueChange={setSortBy}
                      >
                        <DropdownMenuRadioItem value="followers_desc">
                          <Users className="mr-2 h-4 w-4" /> Followers (Highest)
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="reel_views_desc">
                          <Eye className="mr-2 h-4 w-4" /> Avg. Reel Views
                          (Highest)
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="story_views_desc">
                          <Eye className="mr-2 h-4 w-4" /> Avg. Story Views
                          (Highest)
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="price_desc">
                          <ArrowDownWideNarrow className="mr-2 h-4 w-4" /> Price
                          (High to Low)
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="price_asc">
                          <ArrowUpWideNarrow className="mr-2 h-4 w-4" /> Price
                          (Low to High)
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <Button
                    onClick={handleApplyFilters}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full px-6 py-3 transition-all duration-200 shadow-md"
                  >
                    Apply Filters
                  </Button>
                  <Button
                    onClick={handleResetFilters}
                    variant="outline"
                    className="w-full rounded-full px-6 py-3 font-semibold border-2 border-gray-300 hover:border-red-400 hover:text-red-600 transition-all duration-200"
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Reset
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Creator count */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <p className="text-md font-medium text-gray-600">
            Showing{" "}
            <span className="font-bold text-purple-600">
              {sortedAndFilteredCreators.length}
            </span>{" "}
            of{" "}
            <span className="font-bold text-gray-800">{creators.length}</span>{" "}
            creators
          </p>
        </div>
        <div className="border-b border-gray-200 mb-8"></div>

        {loadingCreators ? (
          <div className="text-center text-gray-600 py-20">
            <svg
              className="animate-spin inline-block h-8 w-8 text-purple-500 mr-3"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Loading creators...
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-20">
            <p>{error}</p>
          </div>
        ) : sortedAndFilteredCreators.length === 0 ? (
          <div className="text-center text-gray-600 py-20 bg-white rounded-2xl shadow-md">
            <p className="text-xl font-semibold">
              No creators found matching your criteria.
            </p>
            <p className="text-md mt-2">
              Try adjusting your search or filters.
            </p>
            <Button onClick={handleResetFilters} className="mt-6">
              Reset All Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedAndFilteredCreators.map((creator) => (
              <motion.div
                key={creator.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <Card className="group relative shadow-md hover:shadow-xl hover:ring-2 hover:ring-purple-400 transition-all duration-300 border border-purple-100 rounded-2xl overflow-hidden cursor-pointer h-full flex flex-col">
                  <Link href={`/creator/${creator.id}`} passHref>
                    <div className="p-6 flex flex-col h-full">
                      <div className="flex items-center gap-4 mb-5">
                        <Avatar className="w-20 h-20 ring-4 ring-purple-100 shadow-lg">
                          <AvatarImage
                            src={creator.profilePictureUrl}
                            alt={creator.fullName}
                          />
                          <AvatarFallback className="text-lg bg-purple-200 text-purple-800 font-bold">
                            {creator.fullName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-gray-900 line-clamp-1">
                            {creator.fullName}
                          </h3>
                          <p className="text-sm text-gray-500 font-medium line-clamp-1">
                            @{creator.instagramUsername}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge
                              variant="secondary"
                              className="text-xs px-3 py-1 bg-purple-100 text-purple-700 font-semibold"
                            >
                              {creator.contentCategory}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-xs px-3 py-1 text-gray-600 border-gray-300 font-semibold flex items-center gap-1"
                            >
                              <MapPin className="h-3 w-3" /> {creator.cityState}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-center my-4">
                        <div className="bg-purple-50 rounded-xl p-3 flex flex-col items-center">
                          <Users className="h-6 w-6 text-purple-600 mb-1" />
                          <p className="text-xl font-bold text-gray-900">
                            {creator.totalFollowers}
                          </p>
                          <p className="text-xs text-gray-600">Followers</p>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3 flex flex-col items-center">
                          <Eye className="h-6 w-6 text-purple-600 mb-1" />
                          <p className="text-xl font-bold text-gray-900">
                            {creator.avgReelViews}
                          </p>
                          <p className="text-xs text-gray-600">
                            Avg. Reel Views
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 my-2 text-sm text-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Avg. Story Views:</span>
                          <span className="font-bold text-gray-900">
                            {creator.storyAverageViews}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium flex items-center gap-1">
                            <Languages className="h-4 w-4" /> Languages:
                          </span>
                          <span className="font-bold text-gray-900 line-clamp-1">
                            {creator.contentLanguages}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium flex items-center gap-1">
                            <Gauge className="h-4 w-4" /> Delivery:
                          </span>
                          <span className="font-bold text-gray-900">
                            {creator.deliveryDuration}
                          </span>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl mt-4 flex-grow flex flex-col justify-center">
                        <p className="font-bold text-sm text-gray-800 mb-2 text-center">
                          Pricing
                        </p>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-xs text-gray-600 font-medium">
                              1 Reel
                            </p>
                            <p className="text-lg font-bold text-blue-600">
                              ₹{creator.reelPrice}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 font-medium">
                              1 Story
                            </p>
                            <p className="text-lg font-bold text-blue-600">
                              ₹{creator.storyPrice}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 font-medium">
                              Reel + Story
                            </p>
                            <p className="text-lg font-bold text-blue-600">
                              ₹{creator.reelsStoryPrice}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center mt-6">
                        <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-transform transform group-hover:scale-[1.02]">
                          View Profile <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Link>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Wrapper component with Suspense ---
export default function CreatorListPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-lg font-semibold text-gray-600">
          Loading Page...
        </div>
      }
    >
      <CreatorListPage />
    </Suspense>
  );
}
