"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";
import { signOut } from "firebase/auth";

// --- SVG Icon Component ---
function Icon({ name, className = "h-5 w-5" }: { name: string, className?: string }) {
    switch (name) {
        case 'Overview':
            return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
        case 'Become Creator':
            return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
        case 'Logout':
            return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
        default:
            return null;
    }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, loading] = useAuthState(auth);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const navLinks = [
    { name: "Overview", href: "/dashboard", icon: "Overview" },
    { name: "Become Creator", href: "/dashboard/profile", icon: "Become Creator" },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/signin");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (loading || !user) {
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
                    {/* Left side: Logo and Navigation */}
                    <div className="flex items-center gap-8">
                        <Link href="/dashboard">
                            <span className="text-2xl font-bold text-indigo-600 cursor-pointer">Creator Hub</span>
                        </Link>
                        <nav className="hidden md:flex items-center gap-4">
                            {navLinks.map((link) => (
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
                    </div>

                    {/* Right side: User info and Logout */}
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-gray-800">{user.displayName || user.email}</p>
                            <p className="text-xs text-gray-500">Creator</p>
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
            {/* Mobile Navigation */}
            <nav className="md:hidden border-t border-gray-200">
                 <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 flex justify-around">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`flex-1 flex flex-col items-center gap-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                            pathname === link.href
                                ? "bg-indigo-100 text-indigo-700"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            }`}
                        >
                            <Icon name={link.icon} />
                            {link.name}
                        </Link>
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
