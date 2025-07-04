"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { db, auth } from "@/lib/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";

// UI and Icon Imports
import {
  Search,
  Users,
  Eye,
  Sparkles,
  Music,
  Clapperboard,
  Laugh,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Grid,
  Heart,
  Palette,
  Code,
  Film,
  DollarSign,
  ShieldCheck,
  Target,
  Lock,
  BarChart,
  LifeBuoy,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

// Component Imports
import ContactModal from "./components/ContactModal";

// --- TYPE DEFINITIONS ---

type Banner = {
  id: string;
  image: string;
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
  status: 'pending' | 'approved' | 'rejected' | string;
};

type StepItem = {
  step: string;
  title: string;
  description: string;
};

type Client = {
  id: string;
  name: string;
  logoUrl: string;
};

const steps: StepItem[] = [
  { step: "1", title: "Creator Profile Creation", description: "First, the creator signs up and creates their profile on the platform, filling in all necessary details." },
  { step: "2", title: "Team Approval", description: "The admin reviews the creator’s profile and approves it if all requirements are met." },
  { step: "3", title: "Onboarding", description: "Once approved, the creator is officially onboarded onto the platform and can start offering their services." },
  { step: "4", title: "Brand Purchases Service", description: "Brands browse the platform, select the creator’s service, and place an order." },
  { step: "5", title: "Payment Processing", description: "After the service is delivered, the payment is released to the creator within 4 to 7 days." },
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
  const [searchQuery, setSearchQuery] = useState('');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [trustedClients, setTrustedClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Slider specific states
  const [currentCreatorSlide, setCurrentCreatorSlide] = useState(0);
  const [itemsPerCreatorSlide, setItemsPerCreatorSlide] = useState(1);
  const creatorSliderIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // States for new category sliders
  const [currentComedySlide, setCurrentComedySlide] = useState(0);
  const [currentEntertainmentSlide, setCurrentEntertainmentSlide] = useState(0);
  const [currentLifestyleSlide, setCurrentLifestyleSlide] = useState(0);
  const [currentBeautySlide, setCurrentBeautySlide] = useState(0);

  // Rotating categories for search placeholder
  const rotatingCategories = ["comedy", "fitness", "education", "beauty", "lifestyle", "tech"];
  const [rotatingCategoryIndex, setRotatingCategoryIndex] = useState(0);
  const rotatingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref for swipe gesture tracking
  const touchStartX = useRef<number>(0);

  // --- MEMOIZED VALUES ---
  const filteredCreators = useMemo(() => {
    let result = creators;
    if (selectedCategory !== "All") {
      result = result.filter(creator => creator.category === selectedCategory);
    }
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(creator =>
        creator.name.toLowerCase().includes(query) ||
        creator.category.toLowerCase().includes(query)
      );
    }
    return result;
  }, [selectedCategory, creators, searchQuery]);

  const comedyCreators = useMemo(() => creators.filter(c => c.category === "Comedy"), [creators]);
  const entertainmentCreators = useMemo(() => creators.filter(c => c.category === "Entertainment"), [creators]);
  const lifestyleCreators = useMemo(() => creators.filter(c => c.category === "Lifestyle"), [creators]);
  const beautyCreators = useMemo(() => creators.filter(c => c.category === "Beauty"), [creators]);

  const totalCreatorSlides = useMemo(() => Math.ceil(filteredCreators.length / itemsPerCreatorSlide) || 0, [filteredCreators.length, itemsPerCreatorSlide]);
  const totalComedySlides = useMemo(() => Math.ceil(comedyCreators.length / itemsPerCreatorSlide), [comedyCreators, itemsPerCreatorSlide]);
  const totalEntertainmentSlides = useMemo(() => Math.ceil(entertainmentCreators.length / itemsPerCreatorSlide), [entertainmentCreators, itemsPerCreatorSlide]);
  const totalLifestyleSlides = useMemo(() => Math.ceil(lifestyleCreators.length / itemsPerCreatorSlide), [lifestyleCreators, itemsPerCreatorSlide]);
  const totalBeautySlides = useMemo(() => Math.ceil(beautyCreators.length / itemsPerCreatorSlide), [beautyCreators, itemsPerCreatorSlide]);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchApprovedCreatorsAndCategories = async () => {
      try {
        setLoadingCreators(true);
        const creatorsCollectionRef = collection(db, "creatorApplications");
        const q = query(creatorsCollectionRef, where("status", "==", "approved"));
        const querySnapshot = await getDocs(q);

        const fetchedCreatorData: Creator[] = [];
        const uniqueCategories = new Set<string>(["All"]);

        querySnapshot.forEach(doc => {
          const data = doc.data();
          if (data.contentCategory) uniqueCategories.add(data.contentCategory);

          const services: string[] = [];
          if (data.reelPrice && data.reelPrice !== "N/A" && data.reelPrice !== "0") services.push("Reel");
          if (data.storyPrice && data.storyPrice !== "N/A" && data.storyPrice !== "0") services.push("Story");
          if (data.reelsStoryPrice && data.reelsStoryPrice !== "N/A" && data.reelsStoryPrice !== "0") services.push("Reel+Story");

          let featuredService = { name: "Custom Promotion", price: "Contact" };
          if (services.length > 0) {
            const firstValidService = services[0];
            featuredService = {
              name: firstValidService,
              price: firstValidService === "Reel" ? data.reelPrice : firstValidService === "Story" ? data.storyPrice : data.reelsStoryPrice
            };
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
            completedProjects: Math.floor(Math.random() * 50) + 1,
            featuredService,
            status: data.status || 'pending',
          });
        });

        setCreators(fetchedCreatorData);
        setAvailableCategories(Array.from(uniqueCategories).sort());
      } catch (err) {
        setError("Failed to fetch creators. Please try again later.");
        console.error("Error fetching creators:", err);
      } finally {
        setLoadingCreators(false);
      }
    };
    fetchApprovedCreatorsAndCategories();
  }, []);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoadingBanners(true);
        const querySnapshot = await getDocs(collection(db, "banners"));
        const fetchedBanners: Banner[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          image: doc.data().image || "/banner-placeholder.jpg",
        }));
        setBanners(fetchedBanners);
      } catch (err) {
        console.error("Error fetching banners:", err);
        setBanners([]);
      } finally {
        setLoadingBanners(false);
      }
    };
    fetchBanners();
  }, []);

  useEffect(() => {
    const fetchTrustedClients = async () => {
      try {
        setLoadingClients(true);
        const querySnapshot = await getDocs(collection(db, "trustedClients"));
        const fetchedClients: Client[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Unnamed Client',
          logoUrl: doc.data().logoUrl || '/placeholder-logo.png',
        }));
        setTrustedClients(fetchedClients);
      } catch (err) {
        console.error("Error fetching trusted clients:", err);
      } finally {
        setLoadingClients(false);
      }
    };
    fetchTrustedClients();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- UI EFFECTS & INTERVALS ---
  useEffect(() => {
    rotatingIntervalRef.current = setInterval(() => {
      setRotatingCategoryIndex(prev => (prev + 1) % rotatingCategories.length);
    }, 5000);
    return () => {
      if (rotatingIntervalRef.current) clearInterval(rotatingIntervalRef.current);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    };
  }, [rotatingCategories.length]);

  const handleSearchFocus = () => {
    if (rotatingIntervalRef.current) clearInterval(rotatingIntervalRef.current);
  };

  const handleSearchBlur = () => {
    restartTimeoutRef.current = setTimeout(() => {
      rotatingIntervalRef.current = setInterval(() => {
        setRotatingCategoryIndex(prev => (prev + 1) % rotatingCategories.length);
      }, 5000);
    }, 20000);
  };

  useEffect(() => {
    if (banners.length <= 1) return;
    bannerIntervalRef.current = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, 7000);
    return () => {
      if (bannerIntervalRef.current) clearInterval(bannerIntervalRef.current);
    };
  }, [banners]);

  const resetBannerInterval = useCallback(() => {
    if (bannerIntervalRef.current) clearInterval(bannerIntervalRef.current);
    if (banners.length > 1) {
      bannerIntervalRef.current = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % banners.length);
      }, 7000);
    }
  }, [banners]);

  const nextBanner = useCallback(() => {
    if (banners.length === 0) return;
    setCurrentBanner(prev => (prev + 1) % banners.length);
    resetBannerInterval();
  }, [resetBannerInterval, banners.length]);

  const prevBanner = useCallback(() => {
    if (banners.length === 0) return;
    setCurrentBanner(prev => (prev - 1 + banners.length) % banners.length);
    resetBannerInterval();
  }, [banners.length, resetBannerInterval]);

  // --- CREATOR SLIDER LOGIC ---
  const calculateItemsPerPage = useCallback(() => {
    if (typeof window === 'undefined') return 1;
    if (window.innerWidth >= 1024) return 4;
    if (window.innerWidth >= 768) return 2;
    return 1;
  }, []);

  useEffect(() => {
    const handleResize = () => setItemsPerCreatorSlide(calculateItemsPerPage());
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateItemsPerPage]);

  useEffect(() => {
    if (totalCreatorSlides <= 1) return;
    creatorSliderIntervalRef.current = setInterval(() => {
      setCurrentCreatorSlide(prev => (prev + 1) % totalCreatorSlides);
    }, 10000);
    return () => {
      if (creatorSliderIntervalRef.current) clearInterval(creatorSliderIntervalRef.current);
    };
  }, [totalCreatorSlides]);

  const createSlideHandlers = (setCurrentSlide: React.Dispatch<React.SetStateAction<number>>, totalSlides: number) => ({
    nextSlide: () => setCurrentSlide(prev => (totalSlides > 0 ? (prev + 1) % totalSlides : 0)),
    prevSlide: () => setCurrentSlide(prev => (totalSlides > 0 ? (prev - 1 + totalSlides) % totalSlides : 0)),
    goToSlide: (index: number) => setCurrentSlide(index),
  });

  const mainCreatorSlideHandlers = createSlideHandlers(setCurrentCreatorSlide, totalCreatorSlides);
  const comedySlideHandlers = createSlideHandlers(setCurrentComedySlide, totalComedySlides);
  const entertainmentSlideHandlers = createSlideHandlers(setCurrentEntertainmentSlide, totalEntertainmentSlides);
  const lifestyleSlideHandlers = createSlideHandlers(setCurrentLifestyleSlide, totalLifestyleSlides);
  const beautySlideHandlers = createSlideHandlers(setCurrentBeautySlide, totalBeautySlides);

  // --- SWIPE HANDLERS FOR SLIDERS ---
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const createTouchEndHandler = (slideHandlers: { nextSlide: () => void; prevSlide: () => void; }) => (e: React.TouchEvent<HTMLDivElement>) => {
    const touchEndX = e.changedTouches[0].clientX;
    const swipeDistance = touchStartX.current - touchEndX;
    if (Math.abs(swipeDistance) > 50) {
      if (swipeDistance > 0) slideHandlers.nextSlide();
      else slideHandlers.prevSlide();
    }
  };

  // --- EVENT HANDLERS ---
  const handleGetStarted = () => router.push(user ? "/dashboard" : "/signin");
  const handleSearchSubmit = () => router.push(searchQuery.trim() ? `/creator?search=${encodeURIComponent(searchQuery.trim())}` : "/creator");

  // --- RENDER METHOD ---
  const renderCreatorSlider = (
    creatorsToRender: Creator[],
    currentSlide: number,
    totalSlides: number,
    slideHandlers: { nextSlide: () => void; prevSlide: () => void; goToSlide: (index: number) => void; },
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void,
    onTouchEnd: (e: React.TouchEvent<HTMLDivElement>) => void
  ) => {
    if (loadingCreators) return <div className="text-center py-10">Loading creators...</div>;
    if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
    if (creatorsToRender.length === 0) return <div className="text-center py-10 text-gray-500">No approved creators found.</div>;

    return (
      <div className="relative">
        {totalSlides > 1 && (
          <>
            <button onClick={slideHandlers.prevSlide} className="absolute top-1/2 -left-4 transform -translate-y-1/2 p-2 rounded-full bg-white/80 shadow-md hover:bg-white z-20 hidden md:block" aria-label="Previous creator"><ChevronLeft className="h-6 w-6 text-gray-700" /></button>
            <button onClick={slideHandlers.nextSlide} className="absolute top-1/2 -right-4 transform -translate-y-1/2 p-2 rounded-full bg-white/80 shadow-md hover:bg-white z-20 hidden md:block" aria-label="Next creator"><ChevronRight className="h-6 w-6 text-gray-700" /></button>
          </>
        )}
        <div className="overflow-hidden rounded-lg cursor-grab active:cursor-grabbing" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <motion.div
            className="flex"
            animate={{ x: `-${currentSlide * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {creatorsToRender.map((creator) => (
              <motion.div
                key={creator.id}
                className="flex-shrink-0 p-2"
                style={{ width: `${100 / itemsPerCreatorSlide}%` }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <Card className="relative shadow-md hover:shadow-xl transition-all duration-300 border border-purple-300 rounded-2xl overflow-hidden h-full bg-purple-100/30">
                  <CardContent className="p-4 flex flex-col items-center text-center h-full">
                    <Avatar className="w-24 h-24 ring-2 ring-purple-300 mb-4 mt-4">
                      <AvatarImage src={creator.image} alt={creator.name} onError={(e) => { (e.target as HTMLImageElement).src = "/default-avatar.png"; }} />
                      <AvatarFallback className="text-2xl font-bold">{creator.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-center mb-4">
                      <h3 className="text-xl font-bold text-gray-900">{creator.name}</h3>
                      <p className="text-sm text-gray-500 font-medium">{creator.category}</p>
                    </div>
                    <div className="w-full flex justify-around mb-4">
                      <div className="text-center"><div className="font-bold text-green-600">{creator.followers}</div><div className="text-xs text-gray-500">Followers</div></div>
                      <div className="text-center"><div className="font-bold text-purple-600">{creator.avgViews}</div><div className="text-xs text-gray-500">Avg Views</div></div>
                    </div>
                    <div className="flex items-center justify-between w-full mt-auto bg-white/50 rounded-xl p-2">
                      <div className="text-left"><p className="text-sm font-semibold text-purple-900">Reels from</p><p className="font-bold text-purple-900">{creator.featuredService.price}Rs</p></div>
                      <Link href={`/creator/${creator.id}`} passHref>
                        <Button size="sm" className="rounded-xl bg-green-600 hover:bg-green-500 text-white"><ShoppingCart className="h-4 w-4 mr-1" /> Buy</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
        {totalSlides > 1 && (
          <div className="flex justify-center mt-4 space-x-2">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button key={index} onClick={() => slideHandlers.goToSlide(index)} className={`w-2 h-2 rounded-full transition-all ${currentSlide === index ? "bg-purple-600 scale-125" : "bg-gray-300"}`} aria-label={`Go to slide ${index + 1}`} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-purple-500 py-8 md:py-12 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="w-80 h-80 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 animate-blob"></div>
          <div className="w-80 h-80 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 absolute bottom-1/4 right-1/4 transform translate-x-1/2 -translate-y-1/2 animate-blob animation-delay-2000"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-8 md:mb-10">
            {/* Search Bar - UPDATED */}
            <div className="max-w-2xl mx-auto relative">
              <div className="relative flex items-center w-full bg-white rounded-xl shadow-lg border border-gray-100 focus-within:ring-4 focus-within:ring-purple-200 transition-all duration-300">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                <Input
                  placeholder={`Search in ${rotatingCategories[rotatingCategoryIndex]}...`}
                  className="w-full border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none text-sm sm:text-base py-3 pl-12 pr-28 sm:pr-32 rounded-xl placeholder:text-gray-400 bg-transparent"
                  aria-label="Search creators, services, and campaigns"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
                />
                <Button
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-4 sm:px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 text-sm"
                  onClick={handleSearchSubmit}
                >
                  Search
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4 sm:gap-10 flex-wrap">
            {[{ label: "All", icon: Grid }, { label: "Lifestyle", icon: Heart }, { label: "Beauty", icon: Palette }, { label: "Tech", icon: Code }, { label: "Entertainment", icon: Film }, { label: "Comedy", icon: Laugh }].map(({ label, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center text-sm sm:text-base text-white hover:text-purple-200 transition-colors cursor-pointer">
                <Icon className="h-4 w-4" />
                <span className="mt-1 font-small">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Banner Slider */}
      <section className="py-6">
        <div className="container mx-auto px-4">
          {loadingBanners ? (
            <div className="h-64 sm:h-96 flex items-center justify-center bg-gray-100 rounded-xl"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div>
          ) : banners.length > 0 ? (
            <div className="relative rounded-xl sm:rounded-3xl overflow-hidden shadow-lg h-64 sm:h-96">
              <div className="w-full h-full relative">
                {banners.map((banner, index) => (
                  <div key={banner.id} className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === currentBanner ? 'opacity-100' : 'opacity-0'}`}>
                    <Image src={banner.image} alt={`Banner ${index + 1}`} fill style={{ objectFit: 'cover' }} className="rounded-xl sm:rounded-3xl" priority={index === 0} sizes="100vw" />
                  </div>
                ))}
              </div>
              {banners.length > 1 && (
                <>
                  <button onClick={prevBanner} className="absolute top-1/2 left-4 transform -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white z-20"><ChevronLeft className="h-5 w-5" /></button>
                  <button onClick={nextBanner} className="absolute top-1/2 right-4 transform -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white z-20"><ChevronRight className="h-5 w-5" /></button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
                    {banners.map((_, index) => (
                      <button key={index} onClick={() => { setCurrentBanner(index); resetBannerInterval(); }} className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${index === currentBanner ? "bg-white scale-125" : "bg-white/50"}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-64 sm:h-96 flex items-center justify-center bg-gray-100 rounded-xl"><p className="text-gray-500">No banners available</p></div>
          )}
        </div>
      </section>

      {/* Featured Services */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10"><h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">SERVICES</h2><p className="text-lg text-gray-600 max-w-3xl mx-auto">Elevate your brand with targeted promotion strategies from top creators</p></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[{ name: "Brand Promotion", icon: Sparkles }, { name: "Song Promotion", icon: Music }, { name: "Movie Promotion", icon: Clapperboard }, { name: "Meme Promotion", icon: Laugh }].map((service, index) => (
              <motion.div key={index} whileHover={{ y: -5 }} className="bg-purple-200 border border-purple-400 rounded-xl text-center hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col overflow-hidden">
                <div className="flex-1 p-5 flex flex-col items-center justify-center"><service.icon className="h-16 w-16 text-purple-600 mb-3" /></div>
                <h4 className="text-lg font-semibold bg-purple-100 text-gray-900 py-4 w-full">{service.name}</h4>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Creators Slider - UPDATED */}
      <section id="creators" className="py-16 bg-white">
        <div className="container mx-auto px-4 relative">
          <div className="flex flex-row justify-between items-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Top Creators</h2>
            <Link href="/creator" passHref><Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50 whitespace-nowrap">View All</Button></Link>
          </div>
          <div className="mb-8 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex space-x-2 min-w-max">
              {availableCategories.map((category) => (
                <Button key={category} variant={selectedCategory === category ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(category)} className={`rounded-full px-4 py-1 transition-all duration-200 whitespace-nowrap ${selectedCategory === category ? 'bg-purple-600 text-white' : 'hover:bg-gray-100'}`} >{category}</Button>
              ))}
            </div>
          </div>
          {renderCreatorSlider(filteredCreators, currentCreatorSlide, totalCreatorSlides, mainCreatorSlideHandlers, handleTouchStart, createTouchEndHandler(mainCreatorSlideHandlers))}
        </div>
      </section>

      {/* Category Specific Sliders - UPDATED */}
      {comedyCreators.length > 0 && (
        <section id="comedy-creators" className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 relative">
            <div className="flex flex-row justify-between items-center mb-8"><h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Top Comedy</h2><Link href="/creator?category=Comedy" passHref><Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">View All</Button></Link></div>
            {renderCreatorSlider(comedyCreators, currentComedySlide, totalComedySlides, comedySlideHandlers, handleTouchStart, createTouchEndHandler(comedySlideHandlers))}
          </div>
        </section>
      )}
      {entertainmentCreators.length > 0 && (
        <section id="entertainment-creators" className="py-16 bg-white">
          <div className="container mx-auto px-4 relative">
            <div className="flex flex-row justify-between items-center mb-8"><h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Top Entertainment</h2><Link href="/creator?category=Entertainment" passHref><Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">View All</Button></Link></div>
            {renderCreatorSlider(entertainmentCreators, currentEntertainmentSlide, totalEntertainmentSlides, entertainmentSlideHandlers, handleTouchStart, createTouchEndHandler(entertainmentSlideHandlers))}
          </div>
        </section>
      )}
      {lifestyleCreators.length > 0 && (
        <section id="lifestyle-creators" className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 relative">
            <div className="flex flex-row justify-between items-center mb-8"><h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Top Lifestyle</h2><Link href="/creator?category=Lifestyle" passHref><Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">View All</Button></Link></div>
            {renderCreatorSlider(lifestyleCreators, currentLifestyleSlide, totalLifestyleSlides, lifestyleSlideHandlers, handleTouchStart, createTouchEndHandler(lifestyleSlideHandlers))}
          </div>
        </section>
      )}
      {beautyCreators.length > 0 && (
        <section id="beauty-creators" className="py-16 bg-white">
          <div className="container mx-auto px-4 relative">
            <div className="flex flex-row justify-between items-center mb-8"><h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Top Beauty</h2><Link href="/creator?category=Beauty" passHref><Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">View All</Button></Link></div>
            {renderCreatorSlider(beautyCreators, currentBeautySlide, totalBeautySlides, beautySlideHandlers, handleTouchStart, createTouchEndHandler(beautySlideHandlers))}
          </div>
        </section>
      )}

      {/* Why Choose Us, How It Works, Trusted Clients */}

      <section className="py-16 bg-white relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose SNAPII?
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
                  icon: DollarSign, // Changed from emoji
                },
                {
                  title: "Verified & Trustworthy Network",
                  text: "Every creator and brand goes through manual verification — no fake metrics, no fluff.",
                  icon: ShieldCheck, // Changed from emoji
                },
                {
                  title: "Timely & Secure Payments",
                  text: "Payments are processed safely and on time through our escrow system — fully trackable.",
                  icon: Lock, // Changed from emoji
                },
                {
                  title: "Smart Matching System",
                  text: "Get matched with brands that align with your content style — no random collaborations.",
                  icon: Target, // Changed from emoji
                },
                {
                  title: "Real-Time Campaign Dashboard",
                  text: "Track your performance, analyze insights, and monitor live results — no guesswork.",
                  icon: BarChart, // Changed from emoji
                },
                {
                  title: "All Creator Tiers Welcome",
                  text: "Whether you’re nano, micro, mid-tier or macro — we give equal opportunity to grow.",
                  icon: Users, // Changed from emoji
                },
                {
                  title: "Dedicated Support Team",
                  text: "From onboarding to payouts — live chat and personal assistance every step of the way.",
                  icon: LifeBuoy, // Changed from emoji
                },
              ].map(({ title, text, icon: Icon }) => ( // Renamed 'icon' to 'Icon'
                <div key={title} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:bg-purple-200/60 hover:shadow-md transition-all duration-300">
                  <Icon className="h-8 w-8 text-purple-600 mb-3" /> {/* Render as JSX component */}
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
                  icon: ShieldCheck, // Changed from emoji
                },
                {
                  title: "Better ROI, Every Time",
                  text: "Track every campaign with real-time performance data — reach, engagement, and conversions included.",
                  icon: TrendingUp, // Changed from emoji
                },
                {
                  title: "Intelligent Creator Matching",
                  text: "We recommend influencers based on your brand values and campaign goals.",
                  icon: Target, // Changed from emoji
                },
                {
                  title: "Full Transparency, Start to Finish",
                  text: "From briefs to final content — everything is visible, traceable, and organized.",
                  icon: Eye, // Changed from emoji (was ClipboardCheck, using Eye as in your imports)
                },
                {
                  title: "Timely Deliveries & Campaign Reports",
                  text: "No delays. No chasing. We ensure all deadlines and deliverables are met on time.",
                  icon: Clock, // Changed from emoji
                },
              ].map(({ title, text, icon: Icon }) => ( // Renamed 'icon' to 'Icon'
                <div key={title} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:bg-purple-200/60 hover:shadow-md transition-all duration-300">
                  <Icon className="h-8 w-8 text-purple-600 mb-3" /> {/* Render as JSX component */}
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
            {/* Adjusted line for better mobile centering with content */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-dashed bg-purple-300 z-0 sm:left-1/2 sm:-translate-x-1/2" />

            {steps.map((item, index) => {
              const isLeft = index % 2 === 0;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  // Adjusted classes for mobile to stack vertically, and use original for md+
                  className={`relative z-10 mb-12 flex items-start flex-col sm:flex-row ${isLeft ? "sm:justify-start sm:pr-12" : "sm:justify-end sm:pl-12"
                    }`}
                >
                  {/* Connector Line and Circle */}
                  <div
                    className={`absolute top-6 w-4 h-4 rounded-full bg-purple-600 z-10 border-4 border-white shadow-md
                    ${isLeft ? "left-1/2 -translate-x-1/2 sm:left-1/2 sm:-translate-x-1/2" : "left-1/2 -translate-x-1/2 sm:left-1/2 sm:-translate-x-1/2"
                      }`}
                  ></div>

                  <div className={`w-full sm:w-1/2 ${isLeft ? "sm:text-left text-center" : "sm:text-right text-center"} mt-8 sm:mt-0`}> {/* Added margin top for mobile */}
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      className={`group relative transition-all duration-300 border border-purple-200 bg-purple-50 hover:bg-purple-100/60 hover:shadow-xl rounded-xl p-6 backdrop-blur-sm`}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg border-4 border-white z-10 sm:left-6 sm:translate-x-0"> {/* Adjusted positioning for mobile */}
                        {item.step}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 pt-6 sm:pt-0"> {/* Added padding top for mobile */}
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
                className="bg-gray-300 text-gray-600 px-8 py-6 text-lg cursor-not-allowed w-full sm:w-auto"
                disabled
              >
                Loading...
              </Button>
            ) : (
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-6 text-lg w-full sm:w-auto"
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
                hidden: { opacity: 0, scale: 0.8 },
                visible: { opacity: 1, scale: 1 },
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
      <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} id="contact-modal" />
    </div>
  );
}
