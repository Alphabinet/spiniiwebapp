'use client';

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebaseConfig"; // Ensure 'db' (Firestore instance) is imported
import { doc, onSnapshot } from "firebase/firestore"; // Import doc and onSnapshot
import { signOut } from "firebase/auth";

// --- SVG Icon Component ---
function Icon({ name, className = "h-5 w-5" }: { name: string, className?: string }) {
    switch (name) {
        case 'Overview':
            return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
        case 'Creator': // This icon will be used for both "Become Creator" and "Update Creator Application"
            return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
        case 'My Bookings': // New icon for My Bookings
            return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
        case 'My Orders':
            return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M12 16h.01" /></svg>;
        case 'Logout':
            return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
        default:
            return null;
    }
}

// Define possible account types - MUST match what you set in Firestore
type AccountType = 'normal' | 'creator';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, loading] = useAuthState(auth);
    const pathname = usePathname();
    const router = useRouter();

    // State to manage user's account type fetched from Firestore
    const [accountType, setAccountType] = useState<AccountType | null>(null);
    // State to manage loading of account type data
    const [accountTypeLoading, setAccountTypeLoading] = useState(true);

    // --- Move handleLogout definition here, before it's used ---
    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push("/signin");
        } catch (err) {
            console.error("Logout error:", err);
        }
    };
    // --- End of moved handleLogout ---

    useEffect(() => {
        // Redirect if not authenticated
        if (!loading && !user) {
            router.push("/signin");
            return; // Stop further execution if redirecting
        }

        // If user is present, listen to their user document for account type
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    // Ensure the type matches your definition
                    setAccountType(userData.accountType as AccountType || 'normal'); // Default to 'normal' if not set
                } else {
                    // If user document doesn't exist, they are 'normal' by default
                    setAccountType('normal');
                }
                setAccountTypeLoading(false);
            }, (error) => {
                console.error("Error fetching user account type:", error);
                setAccountType('normal'); // Default to 'normal' on error
                setAccountTypeLoading(false);
            });

            // Cleanup listener on unmount or user change
            return () => unsubscribe();
        } else {
            // If no user (and not loading), set account type to null and stop loading
            setAccountType(null);
            setAccountTypeLoading(false);
        }
    }, [user, loading, router]); // Depend on user and loading state

    // Dynamically adjust the "Creator" link text and visibility
    const creatorNavLink = (() => {
        if (accountType === 'creator') {
            return { name: "Update Profile", href: "/dashboard/profile", icon: "Creator" };
        } else if (accountType === 'normal') {
            return { name: "Become Creator", href: "/dashboard/profile", icon: "Creator" };
        }
        return null; // Don't show the link if accountType is null (still loading) or another type
    })();

    // Construct the navigation links array
    const navLinks = [
        { name: "Overview", href: "/dashboard", icon: "Overview" },
        { name: "My Orders", href: "/dashboard/my-orders", icon: "My Orders" },
    ];

    if (creatorNavLink) {
        navLinks.push(creatorNavLink);
    }
    
    // Add Logout to mobile navLinks AFTER handleLogout is defined
    navLinks.push({ name: "Logout", href: "#", icon: "Logout", onClick: handleLogout });


    // Show loading state for both authentication and account type fetching
    if (loading || !user || accountTypeLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-700">
                <div className="animate-spin border-4 border-gray-300 border-t-indigo-600 rounded-full h-12 w-12 mb-4" />
                <p className="font-semibold">Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-sm sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Left side: Logo */}
                        <div className="flex items-center">
                            <Link href="/dashboard">
                                <span className="text-2xl font-bold text-indigo-600 cursor-pointer">Creator Hub</span>
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-4">
                            {navLinks.filter(link => link.name !== "Logout").map((link) => ( // Filter out logout for desktop nav
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                        pathname === link.href
                                            ? "bg-indigo-100 text-indigo-700"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                    }`}
                                >
                                    <Icon name={link.icon} className="h-4 w-4" />
                                    {link.name}
                                </Link>
                            ))}
                        </nav>

                        {/* Right side: User info and Logout (Desktop Only) */}
                        <div className="flex items-center gap-4 hidden md:flex"> {/* Hide for mobile */}
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-800">{user.displayName || user.email}</p>
                                <p className="text-xs text-gray-500">Current User</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                aria-label="Sign Out"
                            >
                                <Icon name="Logout" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation - Horizontal Scroll */}
                <nav className="md:hidden border-t border-gray-200 bg-white">
                    <div className="flex overflow-x-auto whitespace-nowrap px-4 py-2 custom-scrollbar">
                        {navLinks.map((link) => (
                            // For logout link, use button directly to trigger handler
                            link.name === "Logout" ? (
                                <button
                                    key={link.name}
                                    onClick={link.onClick} // Use the onClick handler for the button
                                    className="flex flex-shrink-0 flex-col items-center gap-1 px-4 py-2 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors mr-2 last:mr-0"
                                >
                                    <Icon name={link.icon} className="h-5 w-5" />
                                    {link.name}
                                </button>
                            ) : (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`flex flex-shrink-0 flex-col items-center gap-1 px-4 py-2 rounded-md text-xs font-medium transition-colors mr-2 last:mr-0 ${
                                        pathname === link.href
                                            ? "bg-indigo-100 text-indigo-700"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                    }`}
                                >
                                    <Icon name={link.icon} className="h-5 w-5" />
                                    {link.name}
                                </Link>
                            )
                        ))}
                    </div>
                </nav>
            </header>

            <main className="flex-1">
                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>
        </div>
    );
}