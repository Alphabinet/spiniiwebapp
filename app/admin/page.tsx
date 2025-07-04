'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

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

interface Notification {
  id: string;
  message: string;
  type: 'booking' | 'application' | 'campaign';
}

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
  <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex items-center transform transition duration-300 hover:scale-105 hover:shadow-md">
    <div className="rounded-lg bg-indigo-50 p-3">{icon}</div>
    <div className="ml-4">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const StatusPieChart: React.FC<{ title: string, data: ChartData[], totalItems: number }> = ({ title, data, totalItems }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
    <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
    {totalItems > 0 ? (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={90}
            fill="#8884d8"
            dataKey="value"
            labelLine={false}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [`${value} items`, name]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    ) : (
      <p className="text-gray-500 text-sm text-center py-10">No data available.</p>
    )}
  </div>
);

// --- Main Dashboard Page Component ---
const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
    totalApplications: 0,
    pendingApplications: 0,
    pendingCampaigns: 0,
    bookingStatusData: [] as ChartData[],
    applicationStatusData: [] as ChartData[],
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isInitialLoad = useRef({ bookings: true, applications: true, campaigns: true });

  const createNotification = useCallback((message: string, type: Notification['type']) => {
    const newNotification: Notification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      type
    };
    setNotifications(prev => [...prev, newNotification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  }, []);

  const processAllData = useCallback((
    bookingsData: Booking[],
    appsData: CreatorApplication[],
    campaignsData: Campaign[]
  ) => {
    let totalRevenue = 0;
    const bookingStatusCounts: { [key: string]: number } = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    bookingsData.forEach(booking => {
      if (booking.status && bookingStatusCounts.hasOwnProperty(booking.status)) {
        bookingStatusCounts[booking.status]++;
      }
      if (booking.status === 'completed' && typeof booking.totalPrice === 'number') {
        totalRevenue += booking.totalPrice;
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
      totalRevenue,
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
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !isInitialLoad.current.bookings) {
          const newBooking = change.doc.data() as Booking;
          if (newBooking.status === 'pending') {
            createNotification(`New Booking from ${newBooking.bookerDetails.fullName}`, 'booking');
          }
        }
      });
      currentBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      triggerProcess();
      isInitialLoad.current.bookings = false;
    });

    const unsubApps = onSnapshot(query(collection(db, "creatorApplications"), orderBy("timestamp", "desc")), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !isInitialLoad.current.applications) {
          const newApp = change.doc.data() as CreatorApplication;
          if (newApp.status === 'pending') {
            createNotification(`New Application from ${newApp.fullName}`, 'application');
          }
        }
      });
      currentApps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreatorApplication));
      triggerProcess();
      isInitialLoad.current.applications = false;
    });

    const unsubCampaigns = onSnapshot(query(collection(db, "campaigns"), orderBy("createdAt", "desc")), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !isInitialLoad.current.campaigns) {
          const newCampaign = change.doc.data() as Campaign;
          if (newCampaign.status === 'pending') {
            createNotification(`New Campaign: ${newCampaign.name}`, 'campaign');
          }
        }
      });
      currentCampaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
      triggerProcess();
      isInitialLoad.current.campaigns = false;
    });

    return () => {
      unsubBookings();
      unsubApps();
      unsubCampaigns();
    };
  }, [createNotification, processAllData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-10">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500 mb-4"></div>
        <p className="text-lg font-medium text-gray-700">Loading Dashboard Data...</p>
        <p className="text-sm text-gray-500 mt-1">Connecting to Firebase and fetching real-time updates.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Notifications */}
      <div className="hidden sm:block fixed top-5 right-5 z-50 space-y-3 w-80 max-h-[90vh] overflow-y-auto">
        {notifications.map(n => (
          <div
            key={n.id}
            className="bg-white rounded-lg shadow-lg p-4 flex items-start animate-fade-in-down transform transition-all duration-300 hover:scale-105"
            role="alert"
          >
            <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${n.type === 'booking' ? 'bg-blue-500' :
                n.type === 'application' ? 'bg-purple-500' : 'bg-red-500'
              }`}>
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">{n.message}</p>
            </div>
            <button
              onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
              className="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8"
              aria-label="Dismiss"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8 lg:p-10 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Admin Dashboard</h1>

          {/* Mobile Notification Icon */}
          <div className="sm:hidden relative">
            <button
              className="p-2 rounded-full bg-gray-200 text-gray-700"
              onClick={() => setIsDialogOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                {notifications.length}
              </span>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
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
            title="Pending Applications"
            value={stats.pendingApplications}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            title="Pending Campaigns"
            value={stats.pendingCampaigns}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.433 13.649l.612-1.749m.893-2.548l.54-1.542M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
        </div>

        {/* Pie Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <StatusPieChart title="Booking Status Overview" data={stats.bookingStatusData} totalItems={stats.totalBookings} />
          <StatusPieChart title="Application Status Overview" data={stats.applicationStatusData} totalItems={stats.totalApplications} />
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map(item => (
                <div key={`${item.type}-${item.id}`} className="flex items-center pb-4 border-b border-gray-100 last:border-0 last:pb-0">
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
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ml-2 flex-shrink-0 capitalize ${
                      item.type === 'booking'
                        ? STATUS_COLOR_CLASSES.booking[item.status as keyof typeof STATUS_COLOR_CLASSES.booking]
                        : STATUS_COLOR_CLASSES.application[item.status as keyof typeof STATUS_COLOR_CLASSES.application]
                    }`}>
                    {item.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center py-10">No recent activity.</p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Notification Dialog */}
      {isDialogOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setIsDialogOpen(false)}
            aria-hidden="true"
          ></div>

          {/* Dialog */}
          <div className="relative bg-white rounded-xl shadow-2xl m-4 w-full max-w-sm max-h-[80vh] flex flex-col transform transition-all">
            <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10 flex justify-between items-center rounded-t-xl">
              <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
              <button
                className="p-2 text-gray-500 rounded-full hover:bg-gray-100"
                onClick={() => setIsDialogOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div key={n.id} className="p-4">
                      <p className="font-medium text-gray-900">{n.message}</p>
                      <p className="text-xs text-gray-500 mt-1 capitalize">
                        {n.type}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">No new notifications</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 640px) {
          .min-h-screen {
            padding-bottom: 60px;
          }
        }
      `}</style>
    </>
  );
};

export default DashboardPage;
