'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebaseConfig';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';

// Declare global Firebase variables for __app_id
declare const __app_id: string | undefined;

// --- TypeScript Interfaces ---
interface FirestoreTimestamp {
    seconds: number;
    nanoseconds: number;
}

// Updated NotificationItem to reflect direct data from sources
interface NotificationItem {
    id: string; // A unique ID combining type and source ID
    message: string;
    type: 'booking' | 'application' | 'campaign';
    createdAt: FirestoreTimestamp;
    sourceId: string; // The original document ID
}

// Type-safe color mapping for Tailwind
const NOTIFICATION_COLOR_CLASSES = {
    booking: 'bg-blue-100 text-blue-800 border-blue-200',
    application: 'bg-purple-100 text-purple-800 border-purple-200',
    campaign: 'bg-red-100 text-red-800 border-red-200',
};

// --- Helper Functions ---
const formatDate = (timestamp: FirestoreTimestamp | null | undefined): string => {
    if (!timestamp || typeof timestamp.seconds !== 'number') {
        return 'N/A';
    }
    try {
        return format(new Date(timestamp.seconds * 1000), 'MMM d, y, h:mm a');
    } catch (error) {
        console.error("Error formatting date:", error, "with timestamp:", timestamp);
        return 'Invalid Date';
    }
};

// --- AdminNotificationsPage Component ---
const AdminNotificationsPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // This function processes data from all sources and updates the state
    const processAllData = useCallback((
        bookings: any[],
        applications: any[],
        campaigns: any[]
    ) => {
        // Transform bookings into notifications
        const bookingNotifications = bookings.map(doc => ({
            id: `booking_${doc.id}`,
            message: `New Pending Booking from ${doc.bookerDetails?.fullName || 'N/A'}`,
            type: 'booking' as const,
            createdAt: doc.createdAt,
            sourceId: doc.id,
        }));

        // Transform applications into notifications
        const applicationNotifications = applications.map(doc => ({
            id: `application_${doc.id}`,
            message: `New Pending Application from ${doc.fullName || 'N/A'}`,
            type: 'application' as const,
            createdAt: doc.timestamp, // Note: uses 'timestamp' field
            sourceId: doc.id,
        }));
        
        // Transform campaigns into notifications
        const campaignNotifications = campaigns.map(doc => ({
            id: `campaign_${doc.id}`,
            message: `New Pending Campaign: ${doc.name || 'N/A'}`,
            type: 'campaign' as const,
            createdAt: doc.createdAt,
            sourceId: doc.id,
        }));

        // Combine, sort by date, and set the final notifications list
        const allNotifications = [
            ...bookingNotifications,
            ...applicationNotifications,
            ...campaignNotifications
        ].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        setNotifications(allNotifications);
        setLoading(false);
    }, []);


    useEffect(() => {
        if (!db) {
            console.warn("Firebase is not initialized.");
            setLoading(false);
            return;
        }

        // We'll hold the data from each stream in a local variable
        let currentBookings: any[] = [];
        let currentApps: any[] = [];
        let currentCampaigns: any[] = [];
        
        const triggerProcess = () => processAllData(currentBookings, currentApps, currentCampaigns);

        // Listener 1: Pending Bookings
        const qBookings = query(collection(db, "bookings"), where("status", "==", "pending"));
        const unsubBookings = onSnapshot(qBookings, (snapshot) => {
            currentBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            triggerProcess();
        });

        // Listener 2: Pending Applications
        const qApps = query(collection(db, "creatorApplications"), where("status", "==", "pending"));
        const unsubApps = onSnapshot(qApps, (snapshot) => {
            currentApps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            triggerProcess();
        });
        
        // Listener 3: Pending Campaigns
        const qCampaigns = query(collection(db, "campaigns"), where("status", "==", "pending"));
        const unsubCampaigns = onSnapshot(qCampaigns, (snapshot) => {
            currentCampaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            triggerProcess();
        });


        // Cleanup all subscriptions on component unmount
        return () => {
            unsubBookings();
            unsubApps();
            unsubCampaigns();
        };
    }, [processAllData]);


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500 mb-4"></div>
                <p className="text-lg font-medium text-gray-700">Loading Pending Items...</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Pending Notifications</h1>
                <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                        {notifications.length > 0 ? (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`bg-white rounded-lg shadow-sm p-4 flex items-center border transition-all duration-200 hover:shadow-md ${NOTIFICATION_COLOR_CLASSES[n.type]}`}
                                >
                                    <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mr-3
                                        ${n.type === 'booking' ? 'bg-blue-600' :
                                            n.type === 'application' ? 'bg-purple-600' : 'bg-red-600'
                                        }`}>
                                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">{n.message}</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {formatDate(n.createdAt)} - <span className="capitalize">{n.type}</span>
                                        </p>
                                    </div>
                                    {/* Mark as read functionality is removed */}
                                </div>
                            ))
                        ) : (
                            <div className="py-10 text-center">
                                <p className="text-gray-500 text-sm">No pending items found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default AdminNotificationsPage;