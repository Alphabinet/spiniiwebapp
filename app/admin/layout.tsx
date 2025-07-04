'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/admin' },
    { name: 'Bookings', href: '/admin/bookings' },
    { name: 'Applications', href: '/admin/applications' },
    { name: 'Campaigns', href: '/admin/campaigns' },
    { name: 'Clients', href: '/admin/clients' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans">

      {/* Tab Navigation - Always Visible */}
      {/* The 'top-16' class was replaced with 'top-0' to remove the empty space */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4">
          {/* Horizontal Scroll Container */}
          <div className="flex overflow-x-auto py-2 space-x-1 hide-scrollbar">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 whitespace-nowrap
                    ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Custom Scrollbar Style */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
        .hide-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;