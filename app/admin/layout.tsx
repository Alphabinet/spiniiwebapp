'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { db } from '@/lib/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    pendingBookings: 0,
    pendingApplications: 0,
    pendingCampaigns: 0,
  });
  const pathname = usePathname();

  // Fetch stats for notification badges
  useEffect(() => {
    const fetchStats = async () => {
      if (!db) return;
      
      const bookingsSnapshot = await getDocs(collection(db, "bookings"));
      const pendingBookings = bookingsSnapshot.docs.filter(doc => doc.data().status === 'pending').length;

      const appsSnapshot = await getDocs(collection(db, "creatorApplications"));
      const pendingApplications = appsSnapshot.docs.filter(doc => doc.data().status === 'pending').length;
      
      const campaignsSnapshot = await getDocs(collection(db, "campaigns"));
      const pendingCampaigns = campaignsSnapshot.docs.filter(doc => doc.data().status === 'pending').length;

      setStats({ pendingBookings, pendingApplications, pendingCampaigns });
    };
    fetchStats();
  }, []);

  const getLinkClass = (path: string) => {
    return pathname === path
      ? 'bg-white border-t border-l border-r border-gray-200 text-indigo-600'
      : 'text-gray-500 hover:text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Admin Dashboard</h1>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded-lg border border-gray-200 py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
             <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex flex-wrap border-b border-gray-200">
          <Link href="/admin" className={`py-3 px-4 sm:px-6 font-medium text-sm sm:text-base rounded-t-lg transition-all duration-200 ease-in-out ${getLinkClass('/admin')}`}>
            Dashboard
          </Link>
          <Link href="/admin/bookings" className={`py-3 px-4 sm:px-6 font-medium text-sm sm:text-base rounded-t-lg transition-all duration-200 ease-in-out flex items-center ${getLinkClass('/admin/bookings')}`}>
            Bookings
            {stats.pendingBookings > 0 && <span className="ml-2 bg-yellow-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{stats.pendingBookings}</span>}
          </Link>
          <Link href="/admin/applications" className={`py-3 px-4 sm:px-6 font-medium text-sm sm:text-base rounded-t-lg transition-all duration-200 ease-in-out flex items-center ${getLinkClass('/admin/applications')}`}>
            Applications
            {stats.pendingApplications > 0 && <span className="ml-2 bg-yellow-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{stats.pendingApplications}</span>}
          </Link>
          <Link href="/admin/clients" className={`py-3 px-4 sm:px-6 font-medium text-sm sm:text-base rounded-t-lg transition-all duration-200 ease-in-out ${getLinkClass('/admin/clients')}`}>
            Clients
          </Link>
          <Link href="/admin/campaigns" className={`py-3 px-4 sm:px-6 font-medium text-sm sm:text-base rounded-t-lg transition-all duration-200 ease-in-out flex items-center ${getLinkClass('/admin/campaigns')}`}>
            Campaigns
            {stats.pendingCampaigns > 0 && <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{stats.pendingCampaigns}</span>}
          </Link>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Pass search term to children or use context/URL params */}
        {React.cloneElement(children as React.ReactElement, { searchTerm })}
      </main>
    </div>
  );
}