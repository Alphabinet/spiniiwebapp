"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { db, auth } from "@/lib/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";

// UI and Icon Imports
import {
  Search,
  Star,
  Users,
  Shield,
  Zap,
  Eye,
  Sparkles,
  Music,
  Clapperboard,
  Laugh,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  User as UserIcon, // Renamed to avoid conflict with `User` type
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

// Component Imports
import ContactModal from "./components/ContactModal";

// --- TYPE DEFINITIONS ---

type Banner = {
  title: string;
  subtitle: string;
  image: string;
  cta: string;
  gradient: string;
};

type Creator = {
  id: string;
  name: string;
  category: string;
  followers: string;
  avgViews: string;
  services: string[];
  image: string;
  verified: boolean;
  completedProjects: number;
  featuredService: {
    name: string;
    price: string;
  };
  status: 'pending' | 'approved' | 'rejected' | string; // Creator's application status
};


type StepItem = {
  step: string;
  title: string;
  description: string;
};

// --- NEW TYPE DEFINITION FOR CLIENTS ---
type Client = {
  id: string;
  name: string;
  logoUrl: string;
};

// --- STATIC DATA (Keep these as they are not coming from Firebase) ---
const banners: Banner[] = [
  {
    title: "Connect with Top Digital Creators",
    subtitle: "Build powerful collaborations that drive real results for your brand",
    image: "/banner1.jpg",
    cta: "Start Collaborating",
    gradient: "from-blue-600 to-blue-700",
  },
  {
    title: "Premium Creator Services",
    subtitle: "Access verified creators for content, campaigns, and brand partnerships",
    image: "/banner2.jpg",
    cta: "Browse Services",
    gradient: "from-purple-600 to-purple-700",
  },
  {
    title: "Campaign Management Made Simple",
    subtitle: "Track, manage, and optimize your creator collaborations in one place",
    cta: "Create Campaign",
    image: "/banner2.jpg",
    gradient: "from-pink-600 to-pink-700",
  },
];


const steps: StepItem[] = [
  {
    step: "1",
    title: "Creator Profile Creation",
    description: "First, the creator signs up and creates their profile on the platform, filling in all necessary details.",
  },
  {
    step: "2",
    title: "Team Approval",
    description: "The admin reviews the creator’s profile and approves it if all requirements are met.",
  },
  {
    step: "3",
    title: "Onboarding",
    description: "Once approved, the creator is officially onboarded onto the platform and can start offering their services.",
  },
  {
    step: "4",
    title: "Brand Purchases Service",
    description: "Brands browse the platform, select the creator’s service, and place an order.",
  },
  {
    step: "5",
    title: "Payment Processing",
    description: "After the service is delivered, the payment is released to the creator within 4 to 7 days.",
  },
];



// --- MAIN COMPONENT ---

export default function HomePage() {
  const router = useRouter();
  // --- STATE MANAGEMENT ---
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const bannerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<string[]>(["All"]);

  // --- NEW STATE FOR CLIENTS ---
  const [trustedClients, setTrustedClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Slider specific states
  const [currentCreatorSlide, setCurrentCreatorSlide] = useState(0);
  const [itemsPerCreatorSlide, setItemsPerCreatorSlide] = useState(1);
  const creatorSliderIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- MEMOIZED VALUES (Defined early to ensure availability) ---
  const filteredCreators = useMemo(() => {
    if (selectedCategory === "All") {
      return creators;
    }
    return creators.filter(creator => creator.category === selectedCategory);
  }, [selectedCategory, creators]);

  const totalCreatorSlides = useMemo(() => {
    if (!filteredCreators.length || itemsPerCreatorSlide === 0) return 0;
    return Math.ceil(filteredCreators.length / itemsPerCreatorSlide);
  }, [filteredCreators.length, itemsPerCreatorSlide]);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchApprovedCreatorsAndCategories = async () => {
      try {
        setLoadingCreators(true);
        const creatorsCollectionRef = collection(db, "creatorApplications");
        // Query only approved creators
        const q = query(creatorsCollectionRef, where("status", "==", "approved"));
        const querySnapshot = await getDocs(q);

        const fetchedCreatorData: Creator[] = [];
        const uniqueCategories = new Set<string>();
        uniqueCategories.add("All");

        querySnapshot.forEach(doc => {
          const data = doc.data();

          if (data.contentCategory && typeof data.contentCategory === 'string') {
            uniqueCategories.add(data.contentCategory);
          }

          const services: string[] = [];
          if (data.reelPrice && data.reelPrice !== "N/A" && data.reelPrice !== "0") services.push("Reel");
          if (data.storyPrice && data.storyPrice !== "N/A" && data.storyPrice !== "0") services.push("Story");
          if (data.reelsStoryPrice && data.reelsStoryPrice !== "N/A" && data.reelsStoryPrice !== "0") services.push("Reel+Story");

          let featuredService = { name: "Custom Promotion", price: "Contact for pricing" };
          if (services.length > 0) {
            const firstValidService = services.find(serviceName => {
              if (serviceName === "Reel" && data.reelPrice && data.reelPrice !== "N/A" && data.reelPrice !== "0") return true;
              if (serviceName === "Story" && data.storyPrice && data.storyPrice !== "N/A" && data.storyPrice !== "0") return true;
              if (serviceName === "Reel+Story" && data.reelsStoryPrice && data.reelsStoryPrice !== "N/A" && data.reelsStoryPrice !== "0") return true;
              return false;
            });

            if (firstValidService) {
              featuredService = {
                name: firstValidService,
                price:
                  firstValidService === "Reel" ? data.reelPrice :
                    firstValidService === "Story" ? data.storyPrice :
                      data.reelsStoryPrice
              };
            }
          }

          fetchedCreatorData.push({
            id: doc.id,
            name: data.fullName || 'Unnamed Creator',
            category: data.contentCategory || 'Uncategorized',
            followers: data.totalFollowers || '0',
            avgViews: data.avgReelViews || '0',
            services,
            image: data.profilePictureUrl || '/placeholder-avatar.jpg',
            verified: true,
            completedProjects: Math.floor(Math.random() * 50) + 1, // Placeholder
            featuredService,
            status: data.status || 'pending',
          } as Creator);
        });

        setCreators(fetchedCreatorData);
        setAvailableCategories(Array.from(uniqueCategories).sort());
      } catch (err) {
        setError("Failed to fetch creators or categories. Please try again later.");
        console.error("Error fetching creators or categories:", err);
      } finally {
        setLoadingCreators(false);
      }
    };

    fetchApprovedCreatorsAndCategories();
  }, []);

  // --- NEW: FETCH TRUSTED CLIENTS FROM FIREBASE ---
  useEffect(() => {
    const fetchTrustedClients = async () => {
      try {
        setLoadingClients(true);
        const clientsCollectionRef = collection(db, "trustedClients");
        const querySnapshot = await getDocs(clientsCollectionRef);
        const fetchedClients: Client[] = [];
        querySnapshot.forEach(doc => {
          const data = doc.data();
          fetchedClients.push({
            id: doc.id,
            name: data.name || 'Unnamed Client',
            logoUrl: data.logoUrl || '/placeholder-logo.png', // Fallback image
          });
        });
        setTrustedClients(fetchedClients);
      } catch (err) {
        console.error("Error fetching trusted clients:", err);
        // Optionally, set an error state here as well if needed
      } finally {
        setLoadingClients(false);
      }
    };

    fetchTrustedClients();
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- GENERAL BANNER SLIDER LOGIC ---
  useEffect(() => {
    bannerIntervalRef.current = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, 7000);

    return () => {
      if (bannerIntervalRef.current) {
        clearInterval(bannerIntervalRef.current);
      }
    };
  }, []);

  const resetBannerInterval = useCallback(() => {
    if (bannerIntervalRef.current) {
      clearInterval(bannerIntervalRef.current);
    }
    bannerIntervalRef.current = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, 7000);
  }, []);

  const nextBanner = useCallback(() => {
    setCurrentBanner(prev => (prev + 1) % banners.length);
    resetBannerInterval();
  }, [resetBannerInterval, banners.length]);

  const prevBanner = useCallback(() => {
    setCurrentBanner(prev => (prev - 1 + banners.length) % banners.length);
    resetBannerInterval();
  }, [banners.length, resetBannerInterval]);

  // --- CREATOR SLIDER LOGIC ---

  // Calculate items per page based on screen width
  const calculateItemsPerPage = useCallback(() => {
    if (typeof window === 'undefined') return 1; // Default for SSR
    if (window.innerWidth >= 1024) return 4; // lg
    if (window.innerWidth >= 768) return 2;  // md
    return 1; // mobile
  }, []);

  // Effect to update itemsPerPage on resize and set up creator auto-slide
  useEffect(() => {
    const handleResize = () => {
      setItemsPerCreatorSlide(calculateItemsPerPage());
    };

    // Set initial items per page
    handleResize();

    window.addEventListener('resize', handleResize);

    // Setup auto-slide for creators
    creatorSliderIntervalRef.current = setInterval(() => {
      setCurrentCreatorSlide(prev => {
        // Ensure totalSlides is at least 1 to prevent division by zero if no creators
        if (totalCreatorSlides === 0) return 0;
        return (prev + 1) % totalCreatorSlides;
      });
    }, 10000); // Auto-slide every 10 seconds

    return () => {
      window.removeEventListener('resize', handleResize);
      if (creatorSliderIntervalRef.current) {
        clearInterval(creatorSliderIntervalRef.current);
      }
    };
    // Re-run if totalCreatorSlides or itemsPerCreatorSlide changes, but NOT filteredCreators.length directly to avoid loop
  }, [totalCreatorSlides, itemsPerCreatorSlide, calculateItemsPerPage]);


  const goToCreatorSlide = useCallback((slideIndex: number) => {
    setCurrentCreatorSlide(slideIndex);
    // Reset auto-slide when manual navigation occurs
    if (creatorSliderIntervalRef.current) {
      clearInterval(creatorSliderIntervalRef.current);
      creatorSliderIntervalRef.current = setInterval(() => {
        setCurrentCreatorSlide(prev => {
          if (totalCreatorSlides === 0) return 0; // Prevent division by zero
          return (prev + 1) % totalCreatorSlides;
        });
      }, 10000);
    }
  }, [totalCreatorSlides]); // dependencies for goToCreatorSlide

  const nextCreatorSlide = useCallback(() => {
    goToCreatorSlide((currentCreatorSlide + 1) % totalCreatorSlides);
  }, [currentCreatorSlide, totalCreatorSlides, goToCreatorSlide]);

  const prevCreatorSlide = useCallback(() => {
    goToCreatorSlide((currentCreatorSlide - 1 + totalCreatorSlides) % totalCreatorSlides);
  }, [currentCreatorSlide, totalCreatorSlides, goToCreatorSlide]);

  // --- Event Handlers ---
  const handleGetStarted = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/signin");
    }
  };

  // --- RENDER METHOD ---
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-purple-500 py-8 md:py-16 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="w-60 h-60 sm:w-80 sm:h-80 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 animate-blob"></div>
          <div className="w-60 h-60 sm:w-80 sm:h-80 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 absolute bottom-1/4 right-1/4 transform translate-x-1/2 -translate-y-1/2 animate-blob animation-delay-2000"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-8 md:mb-12">
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative flex flex-col sm:flex-row items-center bg-white rounded-xl shadow-lg border border-gray-100 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all duration-300 ease-in-out p-2 gap-2">
              <div className="relative flex items-center w-full">
                <Search className="h-5 w-5 text-gray-400 ml-3 mr-2" />
                <Input
                  placeholder="Search creators, services, campaigns..."
                  className="flex-grow border-none focus:outline-none focus:ring-0 text-sm sm:text-base py-3 pr-2 placeholder:text-gray-400"
                  aria-label="Search creators, services, and campaigns"
                />
              </div>
              <Link href="/services" passHref legacyBehavior>
                <Button className="w-full sm:w-auto rounded-lg px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 text-sm sm:text-base">
                  Search
                </Button>
              </Link>
            </div>
          </div>

          {/* Category Icons */}
          <div className="flex justify-center gap-6 sm:gap-10 flex-wrap">
            {[
              { label: "All", icon: "👜" },
              { label: "Lifestyle", icon: "🧥" },
              { label: "Beauty", icon: "💄" },
              { label: "Tech", icon: "🔗" },
              { label: "Entertainment", icon: "🍿" },
              { label: "Comedy", icon: "😄" },
            ].map(({ label, icon }) => (
              <div key={label} className="flex flex-col items-center text-sm sm:text-base text-gray-700 hover:text-blue-600 transition-colors">
                <div className="text-2xl sm:text-3xl">{icon}</div>
                <span className="mt-1">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Banner Slider - Mobile Optimized */}
      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="relative rounded-xl sm:rounded-3xl overflow-hidden shadow-lg" aria-label="Promotional banners">
            <div className={`relative h-64 sm:h-80 md:h-96 bg-gradient-to-r ${banners[currentBanner].gradient}`}>
              <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              <div className="relative z-10 flex items-center justify-between h-full px-4 sm:px-8">
                <button
                  onClick={prevBanner}
                  className="p-2 sm:p-3 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all backdrop-blur-sm"
                  aria-label="Previous banner"
                >
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </button>
                <div className="text-center flex-1 mx-4 sm:mx-8 text-white">
                  <h2 className="text-xl sm:text-2xl md:text-4xl font-bold mb-4">{banners[currentBanner].title}</h2>
                  <p className="text-sm sm:text-base md:text-xl mb-6 opacity-90">{banners[currentBanner].subtitle}</p>
                  <Link href="/services" passHref>
                    <Button
                      size="sm"
                      className="bg-white text-gray-900 hover:bg-gray-100 text-sm sm:text-base px-4 sm:px-6 py-2"
                    >
                      {banners[currentBanner].cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <button
                  onClick={nextBanner}
                  className="p-2 sm:p-3 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all backdrop-blur-sm"
                  aria-label="Next banner"
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </button>
              </div>
            </div>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentBanner(index);
                    resetBannerInterval();
                  }}
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${index === currentBanner ? "bg-white scale-125" : "bg-white bg-opacity-50"
                    }`}
                  aria-label={`Go to banner ${index + 1}`}
                  aria-current={index === currentBanner ? "true" : "false"}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section className="py-12 bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            {/* Removed Badge and updated heading text */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              SERVICE
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
              Elevate your brand with targeted promotion strategies from top creators
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-8xl mx-auto h-[400px] md:h-[300px] lg:h-[300px]">
            {[
              { name: "Brand Promotion", icon: Sparkles },
              { name: "Song Promotion", icon: Music },
              { name: "Movie Promotion", icon: Clapperboard },
              { name: "Meme Promotion", icon: Laugh },
            ].map((service, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -5 }}
                className="bg-purple-200 border border-purple-400 rounded-xl text-center hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col overflow-hidden"
              >
                {/* Icon section with padding */}
                <div className="flex-1 p-5 flex flex-col items-center justify-center">
                  <service.icon className="h-16 w-16 text-purple-600 mb-3" />
                </div>

                {/* Full-width footer section */}
                <h4 className="text-base sm:text-lg font-semibold bg-purple-100 text-gray-900 py-4 w-full">
                  {service.name}
                </h4>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Creators Slider */}
      <section id="creators" className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
              Top Creators
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Connect with verified creators across niches and boost your brand's digital presence.
            </p>
          </div>

          {/* Category Filters - Scrollable on mobile */}
          <div className="mb-8 overflow-x-auto pb-2">
            <div className="flex space-x-2 min-w-max">
              {availableCategories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="rounded-full px-4 py-1 hover:scale-105 transition-transform duration-200 whitespace-nowrap"
                  role="tab"
                  aria-selected={selectedCategory === category}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Conditional Rendering for Creators */}
          {loadingCreators ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-4 text-gray-600">Loading creators...</span>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <div className="text-red-500 mb-2">{error}</div>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : filteredCreators.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 mb-4">No approved creators found in this category.</p>
              <Button
                variant="outline"
                onClick={() => setSelectedCategory("All")}
              >
                Show All Creators
              </Button>
            </div>
          ) : (
            <div className="relative">
              {/* Slider Controls (Prev/Next) */}
              {totalCreatorSlides > 1 && (
                <>
                  <button
                    onClick={prevCreatorSlide}
                    className="absolute top-1/2 left-0 md:-left-8 transform -translate-y-1/2 p-2 rounded-full bg-white bg-opacity-80 shadow-md hover:bg-opacity-100 transition-all z-20 hidden md:block"
                    aria-label="Previous creator"
                  >
                    <ChevronLeft className="h-6 w-6 text-gray-700" />
                  </button>
                  <button
                    onClick={nextCreatorSlide}
                    className="absolute top-1/2 right-0 md:-right-8 transform -translate-y-1/2 p-2 rounded-full bg-white bg-opacity-80 shadow-md hover:bg-opacity-100 transition-all z-20 hidden md:block"
                    aria-label="Next creator"
                  >
                    <ChevronRight className="h-6 w-6 text-gray-700" />
                  </button>
                </>
              )}

              {/* Slider Container */}
              <div className="overflow-hidden rounded-lg">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentCreatorSlide * (100 / itemsPerCreatorSlide)}%)` }}
                >
                  {/* Map over filteredCreators directly */}
                  {filteredCreators.map((creator) => (
                    <motion.div
                      key={creator.id}
                      className="flex-shrink-0 p-3"
                      style={{
                        width: `${100 / itemsPerCreatorSlide}%`, // Responsive width
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      <Card className="relative shadow-md hover:shadow-xl transition-all duration-300 border border-purple-300 md:border-2 rounded-2xl overflow-hidden h-full bg-purple-100/30 backdrop-blur-md">
                        <CardContent className="p-5 flex flex-col items-center text-center">
                          {/* Profile Image - Top Center */}
                          <Avatar className="w-24 h-24 ring-2 ring-purple-300 mb-4 mt-8">
                            <AvatarImage
                              src={creator.image}
                              alt={creator.name}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/default-avatar.png"; // Fallback if image fails
                              }}
                            />
                            <AvatarFallback className="text-2xl font-bold">
                              {creator.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>

                          {/* Name and Category */}
                          <div className="flex flex-col items-center mb-5">
                            <h3 className="text-xl font-bold text-gray-900">{creator.name}</h3>
                            <p className="text-sm text-gray-500 font-medium">{creator.category}</p>
                          </div>

                          {/* Followers and Avg. Views */}
                          <div className="w-full flex flex-col items-center mb-6">
                            <div className="flex items-center space-x-2 mb-2">
                              <Users className="h-4 w-4 text-green-600" />
                              <p className="text-base font-semibold text-gray-800">
                                <span className="text-gray-600">Followers:</span>{" "}
                                <span className="text-green-600">{creator.followers}</span>
                              </p>

                            </div>
                            <div className="flex items-center space-x-2">
                              <Eye className="h-4 w-4 text-purple-600" />
                              <p className="text-base font-semibold text-gray-800">
                                <span className="text-gray-600">Avg. Views:</span>{" "}
                                <span className="text-purple-600">{creator.avgViews}</span>
                              </p>

                            </div>
                          </div>

                          {/* Reels and Button */}
                          <div className="flex items-center justify-between w-full mt-auto rounded-xl p-2">
                            <div className="flex flex-col bg-purple-400/20 backdrop-blur-md items-start rounded-xl p-2 shadow-md">
                              <p className="text-base font-semibold text-purple-900">
                                Reels {creator.featuredService.price}Rs
                              </p>
                            </div>

                            {/* Replaced Cart button with Visit Profile button */}
                            <Link href={`/creator/${creator.id}`} passHref>
                              <Button size="sm" className="rounded-xl bg-green-600 hover:bg-green-500 text-white flex items-center">
                                <ShoppingCart className="h-4 w-4 mr-1" /> Buy Service
                              </Button>
                            </Link>
                          </div>

                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Slider Dots */}
              {totalCreatorSlides > 1 && (
                <div className="flex justify-center mt-6 space-x-2">
                  {Array.from({ length: totalCreatorSlides }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToCreatorSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${currentCreatorSlide === index ? "bg-blue-600 scale-125" : "bg-gray-300 hover:bg-gray-400"
                        }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* View All Button */}
          <div className="mt-10 text-center">
            <Link href="/creator" passHref>
              <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                View All Creators
              </Button>
            </Link>
          </div>
        </div>
      </section >

      <section className="py-16 bg-white relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose CollabSphere?
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              The most trusted platform for brand-creator collaborations
            </p>
          </div>

          {/* Section: For Creators */}
          <div className="mb-16">
            <h3 className="text-2xl sm:text-3xl font-semibold text-center text-blue-700 mb-10">
              🎯 What We Do Better – For Creators
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ">
              {[
                {
                  title: "Zero Hidden Charges",
                  text: "Transparent pricing and earnings — 100% clarity for both creators and brands.",
                  icon: "💸",
                },
                {
                  title: "Verified & Trustworthy Network",
                  text: "Every creator and brand goes through manual verification — no fake metrics, no fluff.",
                  icon: "✅",
                },
                {
                  title: "Timely & Secure Payments",
                  text: "Payments are processed safely and on time through our escrow system — fully trackable.",
                  icon: "🔐",
                },
                {
                  title: "Smart Matching System",
                  text: "Get matched with brands that align with your content style — no random collaborations.",
                  icon: "🤖",
                },
                {
                  title: "Real-Time Campaign Dashboard",
                  text: "Track your performance, analyze insights, and monitor live results — no guesswork.",
                  icon: "📊",
                },
                {
                  title: "All Creator Tiers Welcome",
                  text: "Whether you’re nano, micro, mid-tier or macro — we give equal opportunity to grow.",
                  icon: "🌍",
                },
                {
                  title: "Dedicated Support Team",
                  text: "From onboarding to payouts — live chat and personal assistance every step of the way.",
                  icon: "💡",
                },
              ].map(({ title, text, icon }) => (
                <div key={title} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:bg-purple-200/60 hover:shadow-md transition-all duration-300">
                  <div className="text-3xl mb-3">{icon}</div>
                  <h4 className="text-lg font-semibold mb-2 text-gray-800">{title}</h4>
                  <p className="text-sm text-gray-600">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section: For Brands */}
          <div>
            <h3 className="text-2xl sm:text-3xl font-semibold text-center text-purple-700 mb-10">
              🏢 What We Do Better – For Brands
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Verified & Authentic Creators Only",
                  text: "No bots. No fake followers. Only real, engaged creators who fit your niche.",
                  icon: "✅",
                },
                {
                  title: "Better ROI, Every Time",
                  text: "Track every campaign with real-time performance data — reach, engagement, and conversions included.",
                  icon: "📈",
                },
                {
                  title: "Intelligent Creator Matching",
                  text: "We recommend influencers based on your brand values and campaign goals.",
                  icon: "🔍",
                },
                {
                  title: "Full Transparency, Start to Finish",
                  text: "From briefs to final content — everything is visible, traceable, and organized.",
                  icon: "🔎",
                },
                {
                  title: "Timely Deliveries & Campaign Reports",
                  text: "No delays. No chasing. We ensure all deadlines and deliverables are met on time.",
                  icon: "🕒",
                },
              ].map(({ title, text, icon }) => (
                <div key={title} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:bg-purple-200/60 hover:shadow-md transition-all duration-300">
                  <div className="text-3xl mb-3">{icon}</div>
                  <h4 className="text-lg font-semibold mb-2 text-gray-800">{title}</h4>
                  <p className="text-sm text-gray-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      <section className="py-20 bg-gray-50 relative">
        <div className="container mx-auto px-4">
          <div className="text-left mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">HOW IT WORKS?</h2>
          </div>

          <div className="relative">
            {/* Roadmap line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-dashed bg-purple-300 z-0" />

            {steps.map((item, index) => {
              const isLeft = index % 2 === 0;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className={`relative z-10 mb-12 flex items-start ${isLeft ? "justify-start pr-12" : "justify-end pl-12"
                    }`}
                >
                  {/* Connector Line */}
                  <div
                    className={`absolute top-6 w-4 h-4 rounded-full bg-purple-600 z-10 border-4 border-white shadow-md ${isLeft ? "left-1/2 -translate-x-1/2" : "left-1/2 -translate-x-1/2"
                      }`}
                  ></div>

                  <div className={`w-full md:w-1/2 ${isLeft ? "text-left" : "text-right"}`}>
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      className={`group relative transition-all duration-300 border border-purple-200 bg-purple-50 hover:bg-purple-100/60 hover:shadow-xl rounded-xl p-6 backdrop-blur-sm`}
                    >
                      <div className="absolute -top-6 left-6 bg-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg border-4 border-white z-10">
                        {item.step}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* CTA Button */}
          <div className="mt-20 text-center">
            {authLoading ? (
              <Button
                size="lg"
                className="bg-gray-300 text-gray-600 px-8 py-6 text-lg cursor-not-allowed"
                disabled
              >
                Loading...
              </Button>
            ) : (
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-6 text-lg"
                onClick={handleGetStarted}
              >
                {user ? "Go to Dashboard" : "Get Started Today"}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* --- REPLACED SECTION: Trusted Clients (Formerly Testimonials) --- */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Trusted Clients
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
              Collaborations with top brands that trust our platform
            </p>
          </div>

          {loadingClients ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
              <span className="ml-4 text-gray-600">Loading clients...</span>
            </div>
          ) : trustedClients.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No client logos available at the moment.</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 items-center justify-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1,
                  },
                },
              }}
            >
              {trustedClients.map((client) => (
                <motion.div
                  key={client.id}
                  className="aspect-square flex items-center justify-center p-4 rounded-xl border border-gray-200 bg-white hover:grayscale-0 transition-all duration-300 cursor-pointer shadow-sm"
                  variants={{
                    hidden: { opacity: 0, scale: 0.8 },
                    visible: { opacity: 1, scale: 1 },
                  }}
                  whileHover={{ scale: 1.05 }}
                  title={client.name}
                >
                  <Image
                    src={client.logoUrl}
                    alt={`${client.name} logo`}
                    width={150}
                    height={150}
                    style={{ objectFit: "contain", width: "100%", height: "100%" }}
                    className="p-2"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder-logo.png"; // fallback
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Modals */}
      < ContactModal isOpen={showContact} onClose={() => setShowContact(false)
      } id="contact-modal" />
    </div >
  );
}
