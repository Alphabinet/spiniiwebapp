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
  // ShoppingCart, // Removed unused import
  LogOut,
  Settings,
  LayoutDashboard,
  CheckCircle,
  Info,
  ShieldCheck, // Added for Admin Panel
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
import Image from 'next/image'; // Import the Next.js Image component
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Centralized Firebase imports for consistency
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
  updateDoc,
  writeBatch,
  Timestamp, // Import Firestore Timestamp
} from 'firebase/firestore';


// --- Type Definitions ---
interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
  isAdmin: boolean; // Added to track admin status
}

interface NotificationItem {
  id: string;
  message: string;
  timestamp: Timestamp; // Use the imported Firestore Timestamp type
  read: boolean;
  type: 'approval' | 'message' | 'announcement';
  link?: string;
}

// --- Component ---
export default function Navigation() { // Removed empty props interface
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const displayedNotificationIdsRef = useRef(new Set<string>());

  const requestNotificationPermission = useCallback(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const displayDesktopNotification = useCallback((message: string, link?: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification("SNAPII Notification", {
        body: message,
        icon: "/snapi_logo.png",
      });
      if (link) {
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          notification.close();
        };
      }
    }
  }, []);

  // --- Firebase Authentication, Claims, and User Profile Listener ---
  useEffect(() => {
    if (loading) return;

    if (user) {
      const fetchUserProfileAndClaims = async () => {
        try {
          // Force a refresh of the token to get the latest custom claims
          const idTokenResult = await user.getIdTokenResult(true);
          const isAdmin = idTokenResult.claims.admin === true;

          // Keep your existing logic to fetch user data from Firestore
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

          // Set the complete user profile, including the admin status
          setUserProfile({
            uid: user.uid,
            email: user.email,
            isAdmin: isAdmin, // Set admin status from claims
            ...profileData,
          });

        } catch (error) {
          console.error("Error fetching user profile and claims:", error);
          // Provide a safe fallback if fetching claims fails
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
      // This part remains the same
      setUserProfile(null);
      setNotifications([]);
      setUnreadCount(0);
      displayedNotificationIdsRef.current.clear();
    }
  }, [user, loading]);


  // --- Firestore Notifications Listener ---
  useEffect(() => {
    if (!db || !userProfile?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      displayedNotificationIdsRef.current.clear();
      return;
    }

    const appIdGlobal = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    const notificationsCollectionRef = collection(db, `artifacts/${appIdGlobal}/users/${userProfile.uid}/notifications`);
    const q = query(notificationsCollectionRef, orderBy("timestamp", "desc"), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications: NotificationItem[] = [];
      let currentUnreadCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<NotificationItem, 'id'>;
        fetchedNotifications.push({ id: doc.id, ...data });
        if (!data.read) {
          currentUnreadCount++;
        }
      });

      const newUnreadNotifications = fetchedNotifications.filter(
        (notif) => !notif.read && !displayedNotificationIdsRef.current.has(notif.id)
      );

      setNotifications(fetchedNotifications);
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
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/signin");
      setIsSheetOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const navigateTo = (path: string) => {
    router.push(path);
    setIsSheetOpen(false);
  }

  const scrollToSearchBar = () => {
    if (window.location.pathname === "/") {
      document.getElementById("homepage-search-bar")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      router.push("/#homepage-search-bar");
    }
    setIsSheetOpen(false);
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!db || !userProfile?.uid) return;
    try {
      const appIdGlobal = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const notificationRef = doc(db, `artifacts/${appIdGlobal}/users/${userProfile.uid}/notifications`, notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!db || !userProfile?.uid || unreadCount === 0) return;
    try {
      const batch = writeBatch(db);
      const appIdGlobal = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

      notifications.filter(notif => !notif.read).forEach(notif => {
        const notificationRef = doc(db, `artifacts/${appIdGlobal}/users/${userProfile.uid}/notifications`, notif.id);
        batch.update(notificationRef, { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };


  // --- Navigation Items Configuration ---
  const desktopNavItems = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Campaigns", href: "/campaign" },
  ];

  const mobileBottomNavItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Search", action: scrollToSearchBar, icon: Search },
    { name: "Campaigns", href: "/campaign", icon: Megaphone },
    { name: "Notifications", icon: Bell },
    { name: user ? "Profile" : "Sign In", icon: user ? User : LogIn },
  ];

  const renderProfileImage = (sizeClass: string, isMobileSheet = false) => {
    const defaultIcon = <User className={isMobileSheet ? "h-6 w-6" : "h-5 w-5"} />;
    const size = isMobileSheet ? 40 : 36;
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
            target.src = `https://placehold.co/${size}x${size}/cccccc/000000?text=${char}`;
          }}
        />
      );
    }
    return (
      <div className={`h-full w-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold ${isMobileSheet ? 'text-lg' : 'text-sm'}`}>
        {userProfile?.name || userProfile?.email ? char : defaultIcon}
      </div>
    );
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-white shadow-sm border-b sticky top-0 z-50 backdrop-blur-md bg-opacity-80 transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                <span className="text-white font-extrabold text-lg">S</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-600 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity duration-300">
                SNAPII
              </span>
            </Link>

            {/* Center: Nav Items */}
            <div className="flex-1 flex justify-center items-center gap-6">
              {desktopNavItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 relative group"
                >
                  {item.name}
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                </Link>
              ))}
              <Link
                href="/contact"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 relative group"
              >
                Contact
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </Link>
            </div>

            {/* Right: Notifications, Profile/Sign In */}
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative text-gray-700 hover:text-blue-600 transition-colors duration-200" onClick={requestNotificationPermission}>
                        <Bell className="w-6 h-6" />
                        {unreadCount > 0 && (
                          <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-bounce-custom">
                            {unreadCount}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80" align="end" forceMount>
                      <DropdownMenuLabel className="font-semibold text-base flex justify-between items-center">
                        Notifications
                        {unreadCount > 0 && (
                          <Button variant="ghost" size="sm" onClick={markAllNotificationsAsRead} className="text-blue-600 text-xs px-2 py-1 rounded-md hover:bg-blue-50">
                            Mark All Read
                          </Button>
                        )}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        {notifications.length > 0 ? (
                          notifications.map((notif) => (
                            <DropdownMenuItem
                              key={notif.id}
                              onClick={() => notif.read || markNotificationAsRead(notif.id)}
                              className={`flex items-start gap-2 py-2 px-3 cursor-pointer ${notif.read ? 'text-gray-500' : 'font-medium text-gray-800 bg-blue-50/50 hover:bg-blue-100'}`}
                            >
                              {notif.type === 'approval' ? (
                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                              ) : (
                                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                              )}
                              <div className="flex flex-col flex-grow">
                                <p className="text-sm line-clamp-2">{notif.message}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {notif.timestamp?.toDate ? new Date(notif.timestamp.toDate()).toLocaleString() : new Date(notif.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <DropdownMenuItem className="text-gray-500 italic py-3" disabled>
                            No new notifications
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Profile Dropdown */}
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
                        {/* Desktop Admin Panel Link */}
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
                <Link href="/signin" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:-translate-y-0.5 shadow-md">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar with Side Sheet Trigger */}
      <nav className="md:hidden bg-white shadow-sm border-b sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
        <div className="flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SNAPII
            </span>
          </Link>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-700 hover:bg-gray-100">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t shadow-xl z-50 backdrop-blur-md bg-opacity-80">
        <div className="flex justify-around items-center h-16">
          {mobileBottomNavItems.map((item) => {
            const Icon = item.icon;
            const isNotifications = item.name === "Notifications";
            const isProfileOrSignIn = item.name === (user ? "Profile" : "Sign In");

            const commonClasses = "flex flex-col items-center text-xs font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 py-1 px-2 flex-1 relative group";
            const iconClasses = "w-5 h-5 mb-1 group-hover:scale-110 transition-transform";
            const badge = isNotifications && unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {unreadCount}
              </span>
            ) : null;
            const underline = <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-3/4 transition-all duration-300"></span>;

            const itemContent = (
              <>
                <div className="relative">
                  <Icon className={iconClasses} />
                  {badge}
                </div>
                <span className="truncate">{item.name}</span>
                {underline}
              </>
            );

            if (isNotifications && user) {
              return (
                <DropdownMenu key={item.name}>
                  <DropdownMenuTrigger asChild>
                    <button className={commonClasses} onClick={requestNotificationPermission}>
                      {itemContent}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80 mb-2" align="center" forceMount>
                    <DropdownMenuLabel className="font-semibold text-base flex justify-between items-center">
                      Notifications
                      {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllNotificationsAsRead} className="text-blue-600 text-xs px-2 py-1 rounded-md hover:bg-blue-50">
                          Mark All Read
                        </Button>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <DropdownMenuItem
                            key={notif.id}
                            onClick={() => notif.read || markNotificationAsRead(notif.id)}
                            className={`flex items-start gap-2 py-2 px-3 cursor-pointer ${notif.read ? 'text-gray-500' : 'font-medium text-gray-800 bg-blue-50/50 hover:bg-blue-100'}`}
                          >
                            {notif.type === 'approval' ? <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" /> : <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />}
                            <div className="flex flex-col flex-grow"><p className="text-sm line-clamp-2">{notif.message}</p><p className="text-xs text-gray-400 mt-0.5">{notif.timestamp?.toDate ? new Date(notif.timestamp.toDate()).toLocaleString() : new Date(notif.timestamp).toLocaleString()}</p></div>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem className="text-gray-500 italic py-3" disabled>
                          No new notifications
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            } else if (isProfileOrSignIn) {
              return (<SheetTrigger asChild key={item.name}><button className={commonClasses}>{itemContent}</button></SheetTrigger>);
            } else if (item.action) {
              return (<button key={item.name} onClick={item.action} className={commonClasses}>{itemContent}</button>);
            } else {
              return (<Link key={item.name} href={item.href || "#"} className={commonClasses}>{itemContent}</Link>);
            }
          })}
        </div>
      </div>

      {/* Sheet Content for the mobile side panel */}
      <SheetContent side="right" className="w-72 sm:w-80 flex flex-col">
        <VisuallyHidden.Root><SheetTitle>Main Navigation</SheetTitle></VisuallyHidden.Root>
        {user && userProfile && (
          <div className="flex items-center gap-3 p-4 border-b border-gray-200">
            <div className="relative h-10 w-10 rounded-full overflow-hidden">{renderProfileImage("h-10 w-10", true)}</div>
            <div className="flex flex-col"><span className="font-semibold text-gray-800 text-base leading-tight">{userProfile.name || "User"}</span>{userProfile.email && <span className="text-xs text-gray-500">{userProfile.email}</span>}</div>
          </div>
        )}
        <div className="flex flex-col space-y-2 mt-4 text-gray-800 text-lg font-medium flex-1">
          <Link href="/" onClick={() => setIsSheetOpen(false)} className="flex items-center gap-3 hover:text-blue-600 transition-colors py-2 px-3 rounded-md hover:bg-gray-50"><Home className="h-5 w-5 text-gray-600" /> Home</Link>
          <Link href="/about" onClick={() => setIsSheetOpen(false)} className="flex items-center gap-3 hover:text-blue-600 transition-colors py-2 px-3 rounded-md hover:bg-gray-50"><Info className="h-5 w-5 text-gray-600" /> About Us</Link>
          <Link href="/campaign" onClick={() => setIsSheetOpen(false)} className="flex items-center gap-3 hover:text-blue-600 transition-colors py-2 px-3 rounded-md hover:bg-gray-50"><Megaphone className="h-5 w-5 text-gray-600" /> Campaigns</Link>
          <Link href="/contact" onClick={() => setIsSheetOpen(false)} className="flex items-center gap-3 hover:text-blue-600 transition-colors py-2 px-3 rounded-md hover:bg-gray-50"><Search className="h-5 w-5 text-gray-600" /> Contact Us</Link>
          <div className="border-t my-2"></div>
          {user ? (
            <>
              <Link href="/dashboard" onClick={() => setIsSheetOpen(false)} className="flex items-center gap-3 hover:text-blue-600 transition-colors py-2 px-3 rounded-md hover:bg-gray-50"><LayoutDashboard className="h-5 w-5 text-gray-600" /> Dashboard</Link>
              <Link href="/dashboard" onClick={() => setIsSheetOpen(false)} className="flex items-center gap-3 hover:text-blue-600 transition-colors py-2 px-3 rounded-md hover:bg-gray-50"><Settings className="mr-0 h-5 w-5 text-gray-600" /> Manage Profile</Link>
              {/* Mobile Admin Panel Link */}
              {userProfile?.isAdmin && (
                <Link href="/admin" onClick={() => setIsSheetOpen(false)} className="flex items-center gap-3 hover:text-blue-600 transition-colors py-2 px-3 rounded-md hover:bg-gray-50">
                  <ShieldCheck className="h-5 w-5 text-gray-600" /> Admin Panel
                </Link>
              )}
              <div className="mt-auto pt-4">
                <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-3 text-left text-red-600 hover:bg-red-50 transition-colors py-3 px-3 rounded-md border border-red-200"><LogOut className="h-5 w-5" /> Log out</button>
              </div>
            </>
          ) : (
            <div className="mt-auto pt-4">
              <Link href="/signin" onClick={() => setIsSheetOpen(false)} className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md"><LogIn className="mr-2 h-4 w-4" /> Sign In</Link>
            </div>
          )}
        </div>
      </SheetContent>

      <style jsx>{`
        @keyframes bounce-custom { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .animate-bounce-custom { animation: bounce-custom 1s infinite; }
        html, body { height: 100%; margin: 0; padding: 0; overflow-x: hidden; }
        body { display: flex; flex-direction: column; min-height: 100vh; }
        main { flex-grow: 1; }
      `}</style>
    </Sheet>
  );
}
