'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Menu,
  Home,
  Search,
  Megaphone,
  Bell,
  User,
  LogIn,
  LogOut,
  Settings,
  LayoutDashboard,
  Info,
  ShieldCheck,
  Mail, // Added for Contact Us in Sheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import { auth, db } from '@/lib/firebaseConfig';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';

// --- Type Definitions ---
interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
  isAdmin: boolean;
}

interface NotificationItem {
  id: string;
  message: string;
  timestamp: Timestamp;
  read: boolean;
  type: 'approval' | 'message' | 'announcement';
  link?: string;
}

// --- Static Navigation Items (defined outside to prevent re-creation on every render) ---
const desktopNavItems = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Campaigns", href: "/campaign" },
  { name: "Contact", href: "/contact" },
];

// --- Component ---
export default function Navigation() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const pathname = usePathname();
  const displayedNotificationIdsRef = useRef(new Set<string>());

  const requestNotificationPermission = useCallback(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const displayDesktopNotification = useCallback((message: string, link?: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification("Snaapii Notification", {
        body: message,
        icon: "/snaapii.png",
      });
      if (link) {
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          router.push(link);
          notification.close();
        };
      }
    }
  }, [router]);

  // --- Firebase Authentication, Claims, and User Profile Listener ---
  useEffect(() => {
    if (loading) return;

    if (user) {
      const fetchUserProfileAndClaims = async () => {
        try {
          const idTokenResult = await user.getIdTokenResult(true);
          const isAdmin = idTokenResult.claims.admin === true;

          const userRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userRef);

          let profileData: Omit<UserProfile, 'uid' | 'email' | 'isAdmin'> = { name: null, photoURL: null };

          if (docSnap.exists()) {
            const userData = docSnap.data();
            profileData = {
              name: userData?.name || user.displayName,
              photoURL: user.photoURL,
            };
          } else {
            console.warn("User document not found in Firestore, using Auth data.");
            profileData = {
              name: user.displayName,
              photoURL: user.photoURL,
            };
          }

          setUserProfile({
            uid: user.uid,
            email: user.email,
            isAdmin: isAdmin,
            ...profileData,
          });

        } catch (error) {
          console.error("Error fetching user profile and claims:", error);
          setUserProfile({
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            photoURL: user.photoURL,
            isAdmin: false,
          });
        }
      };
      fetchUserProfileAndClaims();
    } else {
      setUserProfile(null);
      setUnreadCount(0);
      displayedNotificationIdsRef.current.clear();
    }
  }, [user, loading]);

  // --- Firestore Notifications Listener (for unread count and desktop alerts) ---
  useEffect(() => {
    if (!db || !userProfile?.uid) {
      setUnreadCount(0);
      displayedNotificationIdsRef.current.clear();
      return;
    }

    const notificationsCollectionRef = collection(db, `users/${userProfile.uid}/notifications`);
    const q = query(notificationsCollectionRef, orderBy("timestamp", "desc"), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let currentUnreadCount = 0;
      const newUnreadNotifications: NotificationItem[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<NotificationItem, 'id'>;
        if (!data.read) {
          currentUnreadCount++;
          if (!displayedNotificationIdsRef.current.has(doc.id)) {
            newUnreadNotifications.push({ id: doc.id, ...data });
          }
        }
      });

      setUnreadCount(currentUnreadCount);

      newUnreadNotifications.forEach((notification) => {
        displayDesktopNotification(notification.message, notification.link);
        displayedNotificationIdsRef.current.add(notification.id);
      });
    }, (error) => {
      console.error("Error fetching real-time notifications:", error);
    });

    return () => unsubscribe();
  }, [userProfile?.uid, displayDesktopNotification]);

  // --- Action Functions ---
  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
      router.push("/signin");
      setIsSheetOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [router]);

  const navigateTo = useCallback((path: string) => {
    router.push(path);
    setIsSheetOpen(false);
  }, [router]);

  const handleSearchClick = useCallback(() => {
    setIsSheetOpen(false);
    if (pathname === "/") {
      if (typeof window !== 'undefined' && typeof (window as any).focusHomepageSearchBar === 'function') {
        (window as any).focusHomepageSearchBar();
      } else {
        document.getElementById("homepage-search-section")?.scrollOfInterest({ behavior: "smooth", block: "center" });
      }
    } else {
      router.push("/#focus-search-input");
    }
  }, [pathname, router]);

  const mobileBottomNavItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Search", onClick: handleSearchClick, icon: Search },
    { name: "Campaigns", href: "/campaign", icon: Megaphone },
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: user ? "Profile" : "Sign In", icon: user ? User : LogIn },
  ];

  const renderProfileImage = useCallback((sizeClass: string, isMobileSheet = false) => {
    const defaultIcon = <User className={isMobileSheet ? "h-6 w-6" : "h-5 w-5"} />;
    const size = isMobileSheet ? 48 : 36; // Increased size for mobile sheet
    const char = userProfile?.name?.charAt(0).toUpperCase() || userProfile?.email?.charAt(0).toUpperCase() || 'U';

    if (userProfile?.photoURL) {
      return (
        <Image
          src={userProfile.photoURL}
          alt={userProfile.name || "User Profile"}
          width={size}
          height={size}
          className={`rounded-full object-cover`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = `https://placehold.co/${size}x${size}/DDA0DD/FFFFFF?text=${char}`; // Purple placeholder
          }}
        />
      );
    }
    return (
      <div className={`h-full w-full rounded-full bg-purple-200 flex items-center justify-center text-purple-800 font-semibold ${isMobileSheet ? 'text-xl' : 'text-sm'}`}>
        {userProfile?.name || userProfile?.email ? char : defaultIcon}
      </div>
    );
  }, [userProfile]); // Memoize renderProfileImage, depends on userProfile

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      {/* Desktop Navigation (unchanged for this request) */}
      <nav className="hidden md:block bg-white shadow-sm border-b sticky top-0 z-50 backdrop-blur-md bg-opacity-80 transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <Image
                src="/snaapii.png"
                alt="Snaapii Logo"
                width={100}
                height={100}
                className="transition-all duration-300 group-hover:scale-110"
                priority
              />
              <span className="sr-only">Snaapii</span>
            </Link>

            {/* Center: Nav Items */}
            <div className="flex-1 flex justify-center items-center gap-6">
              {desktopNavItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`py-2 px-3 rounded-md text-gray-700 hover:text-purple-700 font-medium transition-colors duration-200 relative group
                    ${pathname === item.href ? 'bg-purple-100 text-purple-700' : ''}`}
                >
                  {item.name}
                  {pathname !== item.href && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                  )}
                </Link>
              ))}
            </div>

            {/* Right: Notifications, Profile/Sign In */}
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Link href="/notifications" className="relative" aria-label="View Notifications">
                    <Button variant="ghost" size="icon" className="text-gray-700 hover:text-purple-600 transition-colors duration-200" onClick={requestNotificationPermission}>
                      <Bell className="w-6 h-6" />
                      {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-bounce-custom">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-9 w-9 rounded-full overflow-hidden p-0">
                        {renderProfileImage("h-9 w-9")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{userProfile?.name || "User"}</p>
                          {userProfile?.email && <p className="text-xs leading-none text-muted-foreground">{userProfile.email}</p>}
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => navigateTo("/dashboard")}>
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          <span>Dashboard</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigateTo("/dashboard")}>
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Manage Profile</span>
                        </DropdownMenuItem>
                        {userProfile?.isAdmin && (
                          <DropdownMenuItem onClick={() => navigateTo("/admin")}>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            <span>Admin Panel</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Link href="/signin" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transform hover:-translate-y-0.5 shadow-md text-white">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar with Side Sheet Trigger (unchanged for this request) */}
      <nav className="md:hidden bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/snaapii.png"
              alt="Snaapii Logo"
              width={100}
              height={100}
              priority
            />
            <span className="sr-only">Snaapii</span>
          </Link>

          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-700 hover:bg-gray-100 p-1"
            >
              <Menu className="h-10 w-10" />
            </Button>
          </SheetTrigger>
        </div>
      </nav>

      {/* Mobile Bottom Navigation (unchanged for this request) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t shadow-xl z-50 backdrop-blur-md bg-opacity-80">
        <div className="flex justify-around items-center h-16">
          {mobileBottomNavItems.map((item) => {
            const Icon = item.icon;
            const targetHref = item.href || (user ? "/dashboard" : "/signin");
            const isActive = item.onClick ? false : (pathname === targetHref);

            const commonClasses = `flex flex-col items-center text-xs font-medium text-gray-600 hover:text-purple-600 transition-colors duration-200 py-1 px-2 flex-1 relative group
              ${isActive ? 'bg-purple-50 text-purple-700 rounded-md mx-1' : ''}`;
            const iconClasses = "w-5 h-5 mb-1 group-hover:scale-110 transition-transform";

            const badge = (item.name === "Notifications" && unreadCount > 0) ? (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {unreadCount}
              </span>
            ) : null;

            const itemContent = (
              <>
                <div className="relative">
                  <Icon className={iconClasses} />
                  {badge}
                </div>
                <span className="truncate">{item.name}</span>
                {!isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-purple-600 group-hover:w-3/4 transition-all duration-300"></span>
                )}
              </>
            );

            if (item.onClick) {
              return (<button key={item.name} type="button" onClick={item.onClick} className={commonClasses}>{itemContent}</button>);
            }

            return (<Link key={item.name} href={targetHref} className={commonClasses}>{itemContent}</Link>);
          })}
        </div>
      </div>

      {/* Sheet Content for the mobile side panel (IMPROVED DESIGN) */}
      <SheetContent
        side="right"
        className="w-72 sm:w-80 flex flex-col bg-gradient-to-br from-purple-50 to-white p-0 overflow-y-auto" // Added gradient, removed padding here
      >
        <VisuallyHidden.Root><SheetTitle>Main Navigation</SheetTitle></VisuallyHidden.Root>

        {/* User Profile Section */}
        {user && userProfile && (
          <div className="flex items-center gap-4 p-6 bg-purple-600 text-white shadow-md">
            <div className="relative h-12 w-12 rounded-full overflow-hidden flex-shrink-0">
              {renderProfileImage("h-12 w-12", true)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-semibold text-lg leading-tight truncate">{userProfile.name || "User"}</span>
              {userProfile.email && <span className="text-sm opacity-90 truncate">{userProfile.email}</span>}
            </div>
          </div>
        )}

        {/* Main Navigation Links */}
        <div className="flex flex-col space-y-1 p-4 flex-grow">
          {desktopNavItems.map((item) => {
            const isActive = pathname === item.href;
            let IconComponent;
            switch (item.name) {
              case "Home": IconComponent = Home; break;
              case "About": IconComponent = Info; break;
              case "Campaigns": IconComponent = Megaphone; break;
              case "Contact": IconComponent = Mail; break; // Use Mail icon for Contact
              default: IconComponent = Home; // Fallback
            }

            return (
              <Link
                key={`sheet-${item.name}`}
                href={item.href}
                onClick={() => setIsSheetOpen(false)}
                className={`flex items-center gap-4 py-2.5 px-3 rounded-lg text-base font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-purple-100 hover:text-purple-700'
                  }`}
              >
                <IconComponent className={`h-5 w-5 ${isActive ? 'text-white' : 'text-purple-500'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <div className="border-t border-purple-200 my-4"></div> {/* More prominent separator */}

          {/* User-Specific Links */}
          {user && (
            <>
              <Link href="/dashboard" onClick={() => setIsSheetOpen(false)} className="flex items-center gap-4 py-2.5 px-3 rounded-lg text-base font-medium text-gray-700 hover:bg-purple-100 hover:text-purple-700 transition-all duration-200">
                <LayoutDashboard className="h-5 w-5 text-purple-500" /> Dashboard
              </Link>
              <Link href="/dashboard" onClick={() => setIsSheetOpen(false)} className="flex items-center gap-4 py-2.5 px-3 rounded-lg text-base font-medium text-gray-700 hover:bg-purple-100 hover:text-purple-700 transition-all duration-200">
                <Settings className="h-5 w-5 text-purple-500" /> Manage Profile
              </Link>
              {userProfile?.isAdmin && (
                <Link href="/admin" onClick={() => setIsSheetOpen(false)} className="flex items-center gap-4 py-2.5 px-3 rounded-lg text-base font-medium text-gray-700 hover:bg-purple-100 hover:text-purple-700 transition-all duration-200">
                  <ShieldCheck className="h-5 w-5 text-purple-500" /> Admin Panel
                </Link>
              )}
            </>
          )}
        </div>

        {/* Footer Action Button (Sticky) */}
        <div className="p-4 bg-white border-t border-purple-200 sticky bottom-0 z-10 shadow-lg">
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-3 text-red-600 bg-red-50 hover:bg-red-100 transition-colors py-3 px-3 rounded-lg font-semibold border border-red-200 shadow-sm"
            >
              <LogOut className="h-5 w-5" /> Log out
            </button>
          ) : (
            <Link
              href="/signin"
              onClick={() => setIsSheetOpen(false)}
              className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-lg text-base font-semibold transition-colors h-10 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg transform hover:-translate-y-0.5"
            >
              <LogIn className="mr-2 h-5 w-5" /> Sign In
            </Link>
          )}
        </div>
      </SheetContent>

      <style jsx>{`
        @keyframes bounce-custom { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .animate-bounce-custom { animation: bounce-custom 1s infinite; }
      `}</style>
    </Sheet>
  );
}