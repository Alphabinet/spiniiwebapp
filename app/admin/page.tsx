// DashboardPage.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    CartesianGrid,
    Cell
} from 'recharts';

// --- Constants ---
const BOOKING_COLORS = {
    pending: '#fbbf24',
    confirmed: '#3b82f6',
    completed: '#22c55e',
    cancelled: '#ef4444',
};

const APPLICATION_COLORS = {
    pending: '#fbbf24',
    approved: '#22c55e',
    rejected: '#ef4444',
};

// Type-safe color mapping for Tailwind
const STATUS_COLOR_CLASSES = {
    booking: {
        pending: 'bg-yellow-100 text-yellow-800',
        confirmed: 'bg-blue-100 text-blue-800',
        completed: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
    },
    application: {
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
    }
};

// --- TypeScript Interfaces ---
interface FirestoreTimestamp {
    seconds: number;
    nanoseconds: number;
}

interface ActivityItem {
    id: string;
    createdAt?: FirestoreTimestamp;
    timestamp?: FirestoreTimestamp;
    status: string;
    type: 'booking' | 'application' | 'campaign';
}

interface Booking extends ActivityItem {
    type: 'booking';
    userId: string;
    userEmail: string;
    creatorId: string;
    creatorName: string;
    creatorUsername: string;
    creatorProfile: string;
    services: { reels: number; story: number; reelsStory: number; };
    campaign: { name: string; description: string; deadline: FirestoreTimestamp | null; demoVideoUrl: string; demoVideoName: string; };
    bookerDetails: { fullName: string; email: string; phoneNumber: string; };
    payment: { status: string; transactionId: string; amount: number; currency: string; };
    totalPrice: number;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

interface CreatorApplication extends ActivityItem {
    type: 'application';
    userId: string;
    fullName: string;
    emailAddress: string;
    mobileNumber: string;
    cityState: string;
    gender: string;
    instagramUsername: string;
    instagramProfileLink: string;
    totalFollowers: string;
    avgReelViews: string;
    storyAverageViews: string;
    profilePictureUrl: string;
    contentCategory: string;
    contentLanguages: string;
    reelPrice: string;
    storyPrice: string;
    reelsStoryPrice: string;
    deliveryDuration: string;
    status: 'pending' | 'approved' | 'rejected';
    adminFeedback?: string;
}

interface Campaign extends ActivityItem {
    type: 'campaign';
    name: string;
    description: string;
    deadline: FirestoreTimestamp;
    status: 'pending' | 'approved' | 'rejected';
    createdBy: { userId: string; fullName: string; email: string; };
}

// NOTE: Notification interface removed from DashboardPage

interface ChartData {
    name: string;
    value: number;
    color: string;
}

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

const formatCurrency = (amount: number | undefined | null): string => {
    if (typeof amount !== 'number') {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(0);
    }
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

// --- UI Helper Components ---
const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex flex-col items-center justify-center text-center transform transition duration-300 hover:scale-105 hover:shadow-lg">
        <div className="rounded-full bg-indigo-50 p-3 mb-2">{icon}</div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-600">{title}</p>
    </div>
);

const StatusBarChart: React.FC<{ title: string, data: ChartData[], totalItems: number }> = ({ title, data, totalItems }) => (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
        {totalItems > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '0.5rem', borderColor: '#e5e7eb' }} />
                    <Legend iconSize={10} />
                    <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        ) : (
            <div className="flex items-center justify-center h-[300px]">
                <p className="text-gray-500 text-sm">No data available.</p>
            </div>
        )}
    </div>
);

// --- Main Dashboard Page Component ---
const DashboardPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalBookings: 0,
        completedBookings: 0,
        totalApplications: 0,
        pendingApplications: 0,
        pendingCampaigns: 0,
        bookingStatusData: [] as ChartData[],
        applicationStatusData: [] as ChartData[],
    });
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    // const [notifications, setNotifications] = useState<Notification[]>([]); // Removed
    // const [isDialogOpen, setIsDialogOpen] = useState(false); // Removed

    const isInitialLoad = useRef({ bookings: true, applications: true, campaigns: true });

    // createNotification function removed as notifications are handled on a separate page
    // const createNotification = useCallback((message: string, type: Notification['type']) => { ... }, []);

    const processAllData = useCallback((
        bookingsData: Booking[],
        appsData: CreatorApplication[],
        campaignsData: Campaign[]
    ) => {
        const bookingStatusCounts: { [key: string]: number } = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
        bookingsData.forEach(booking => {
            if (booking.status && bookingStatusCounts.hasOwnProperty(booking.status)) {
                bookingStatusCounts[booking.status]++;
            }
        });

        const appStatusCounts: { [key: string]: number } = { pending: 0, approved: 0, rejected: 0 };
        appsData.forEach(app => {
            if (app.status && appStatusCounts.hasOwnProperty(app.status)) {
                appStatusCounts[app.status]++;
            }
        });

        const pendingCampaigns = campaignsData.filter(doc => doc.status === 'pending').length;

        setStats({
            totalBookings: bookingsData.length,
            completedBookings: bookingStatusCounts.completed,
            totalApplications: appsData.length,
            pendingApplications: appStatusCounts.pending,
            pendingCampaigns,
            bookingStatusData: Object.keys(bookingStatusCounts).map(status => ({
                name: status.charAt(0).toUpperCase() + status.slice(1),
                value: bookingStatusCounts[status],
                color: BOOKING_COLORS[status as keyof typeof BOOKING_COLORS] || '#cccccc',
            })),
            applicationStatusData: Object.keys(appStatusCounts).map(status => ({
                name: status.charAt(0).toUpperCase() + status.slice(1),
                value: appStatusCounts[status],
                color: APPLICATION_COLORS[status as keyof typeof APPLICATION_COLORS] || '#cccccc',
            })),
        });

        const combinedActivity = [
            ...bookingsData.map(b => ({ ...b, type: 'booking' as const })),
            ...appsData.map(a => ({ ...a, type: 'application' as const })),
            // Campaigns are now just for pending count, not for recent activity display
        ].sort((a, b) => {
            const dateA = (a.createdAt?.seconds || a.timestamp?.seconds || 0);
            const dateB = (b.createdAt?.seconds || b.timestamp?.seconds || 0);
            return dateB - dateA;
        }).slice(0, 5);

        setRecentActivity(combinedActivity);

        if (loading) {
            setLoading(false);
        }
    }, [loading]);

    useEffect(() => {
        if (!db) {
            console.warn("Firebase is not initialized.");
            setLoading(false);
            return;
        }

        let currentBookings: Booking[] = [];
        let currentApps: CreatorApplication[] = [];
        let currentCampaigns: Campaign[] = [];

        const triggerProcess = () => {
            processAllData(currentBookings, currentApps, currentCampaigns);
        };

        const unsubBookings = onSnapshot(query(collection(db, "bookings"), orderBy("createdAt", "desc")), (snapshot) => {
            // Notification logic for "added" type removed from here
            currentBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
            triggerProcess();
            isInitialLoad.current.bookings = false;
        });

        const unsubApps = onSnapshot(query(collection(db, "creatorApplications"), orderBy("timestamp", "desc")), (snapshot) => {
            // Notification logic for "added" type removed from here
            currentApps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreatorApplication));
            triggerProcess();
            isInitialLoad.current.applications = false;
        });

        const unsubCampaigns = onSnapshot(query(collection(db, "campaigns"), orderBy("createdAt", "desc")), (snapshot) => {
            // Notification logic for "added" type removed from here
            currentCampaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
            triggerProcess();
            isInitialLoad.current.campaigns = false;
        });

        return () => {
            unsubBookings();
            unsubApps();
            unsubCampaigns();
        };
    }, [processAllData]); // createNotification removed from dependency array

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500 mb-4"></div>
                <p className="text-lg font-medium text-gray-700">Loading Dashboard...</p>
                <p className="text-sm text-gray-500 mt-1">Fetching real-time data.</p>
            </div>
        );
    }

    return (
        <>
            {/* Desktop Notifications removed */}
            {/* Mobile Notification Dialog removed */}

            <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>

                        {/* Mobile Notification Icon removed */}
                    </div>

                    {/* --- Statistics Cards --- */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <StatCard
                            title="Total Bookings"
                            value={stats.totalBookings}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                        />
                        <StatCard
                            title="Total Applications"
                            value={stats.totalApplications}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                        />
                        <StatCard
                            title="Completed Bookings"
                            value={stats.completedBookings}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        />
                        <StatCard
                            title="Pending Apps"
                            value={stats.pendingApplications}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        />
                        <StatCard
                            title="Pending Campaigns"
                            value={stats.pendingCampaigns}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.433 13.649l.612-1.749m.893-2.548l.54-1.542M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                        />
                    </div>

                    {/* Bar Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <StatusBarChart title="Booking Status" data={stats.bookingStatusData} totalItems={stats.totalBookings} />
                        <StatusBarChart title="Application Status" data={stats.applicationStatusData} totalItems={stats.totalApplications} />
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 ">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
                        <div className="space-y-4">
                            {recentActivity.length > 0 ? (
                                recentActivity.map(item => (
                                    <div key={`${item.type}-${item.id}`} className="flex flex-wrap items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0 gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 text-sm truncate">
                                                {item.type === 'booking'
                                                    ? `New booking from ${(item as Booking).bookerDetails.fullName}`
                                                    : `New application from ${(item as CreatorApplication).fullName}`}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {formatDate(item.type === 'booking' ? (item as Booking).createdAt : (item as CreatorApplication).timestamp)}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 capitalize ${
                                            item.type === 'booking'
                                                ? STATUS_COLOR_CLASSES.booking[item.status as keyof typeof STATUS_COLOR_CLASSES.booking]
                                                : STATUS_COLOR_CLASSES.application[item.status as keyof typeof STATUS_COLOR_CLASSES.application]
                                            }`}>
                                            {item.status}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <p className="text-gray-500 text-sm">No recent activity.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
};

export default DashboardPage;