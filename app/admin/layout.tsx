'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// Import the initialized db instance from your central config file
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface AdminLayoutProps {
    children: React.ReactNode;
}

// The global __app_id is still needed if your collection path depends on it.
// Ensure this is available in the environment where your app is deployed.
declare const __app_id: string | undefined;

const AdminLayout = ({ children }: AdminLayoutProps) => {
    const pathname = usePathname();
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

    // This effect now correctly handles listening for unread notifications
    // without trying to re-initialize Firebase.
    useEffect(() => {
        // If the db instance isn't ready, don't do anything.
        if (!db) {
            console.warn("Firestore is not initialized. Cannot fetch notification count.");
            return;
        }

        // Use the globally available app ID or a default for the collection path.
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        // Reference to the notifications collection
        const notificationsCollectionRef = collection(db, `artifacts/${appId}/public/data/adminNotifications`);

        // Create a query to get only the documents where 'read' is false
        const q = query(notificationsCollectionRef, where("read", "==", false));

        // Set up the real-time listener
        const unsubscribe = onSnapshot(q, (snapshot) => {
            // The 'snapshot.size' gives the count of documents matching the query
            setUnreadNotificationCount(snapshot.size);
        }, (error) => {
            // Handle any errors during listening
            console.error("Error fetching unread notifications count:", error);
        });

        // Cleanup function: This will be called when the component unmounts
        // to prevent memory leaks by detaching the listener.
        return () => {
            unsubscribe();
        };
    }, []); // The empty dependency array [] ensures this effect runs only once on mount.


    const navItems = [
        { name: 'Dashboard', href: '/admin' },
        { name: 'Notifications', href: '/admin/notifications', count: unreadNotificationCount },
        { name: 'Bookings', href: '/admin/bookings' },
        { name: 'Applications', href: '/admin/applications' },
        { name: 'Campaigns', href: '/admin/campaigns' },
        { name: 'Clients', href: '/admin/clients' },
        { name: 'Messages', href: '/admin/messages' },
        // The 'count' property will now be updated by our listener
    ];

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 font-sans">

            {/* Tab Navigation - Always Visible */}
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
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 whitespace-nowrap flex items-center gap-1
                                        ${
                                            isActive
                                                ? 'bg-indigo-600 text-white shadow'
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    {item.name}
                                    {item.name === 'Notifications' && item.count > 0 && (
                                        <span className={`ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none rounded-full
                                            ${isActive ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>
                                            {item.count}
                                        </span>
                                    )}
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
