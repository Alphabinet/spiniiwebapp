"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";
import { signOut } from "firebase/auth";

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
    { name: "Overview", href: "/dashboard" },
    { name: "Profile", href: "/dashboard/profile" },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-700">
        <div className="animate-spin border-4 border-gray-300 border-t-purple-600 rounded-full h-12 w-12 mb-4" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center border-b">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Welcome, <span className="text-purple-600">{user.displayName || user.email}</span>
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
        >
          Sign Out
        </button>
      </header>

      <nav className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap gap-2 border-b">
        {navLinks.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            className={`px-4 py-2 rounded text-sm ${
              pathname === link.href
                ? "bg-purple-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {link.name}
          </Link>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white border rounded-lg p-5">{children}</div>
      </main>
    </div>
  );
}
