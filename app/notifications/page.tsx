'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { auth, db } from '@/lib/firebaseConfig';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import {
  BellOff,
  CheckCircle2,
  Info,
  Mail,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';
import { format, formatDistanceToNow, isPast, subDays } from 'date-fns';

// --- Type Definitions ---
interface NotificationItem {
  id: string;
  message: string;
  timestamp: Timestamp;
  read: boolean;
  type: 'approval' | 'message' | 'announcement';
  link?: string;
}

// --- Helper Components ---

const NotificationSkeleton: React.FC = () => (
  <div className="flex items-start space-x-4 p-4 bg-white border border-purple-100 rounded-lg">
    <Skeleton className="h-10 w-10 rounded-full bg-purple-100" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-full bg-purple-100" />
      <Skeleton className="h-4 w-5/6 bg-purple-100" />
      <Skeleton className="h-3 w-1/4 bg-purple-100 mt-2" />
    </div>
  </div>
);

const EmptyState: React.FC<{ filter: 'all' | 'unread' }> = ({ filter }) => {
    const title = filter === 'all' ? "All Caught Up!" : "No Unread Notifications";
    const body = filter === 'all' ? "You have no new notifications." : "You've read all your notifications. Good job!";

    return (
        <div className="text-center py-20 px-6 bg-white rounded-2xl border-2 border-dashed border-purple-200">
            <BellOff className="mx-auto h-16 w-16 text-purple-300" />
            <h3 className="mt-4 text-2xl font-semibold text-purple-800">{title}</h3>
            <p className="mt-2 text-purple-600">{body}</p>
        </div>
    );
};

const NotificationCard: React.FC<{ notification: NotificationItem, onMarkRead: (id: string) => void }> = ({ notification, onMarkRead }) => {
  const Icon = useMemo(() => {
    switch (notification.type) {
      case 'approval': return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'message': return <Mail className="h-6 w-6 text-blue-500" />;
      default: return <Info className="h-6 w-6 text-purple-500" />;
    }
  }, [notification.type]);
  
  const formattedTimestamp = useMemo(() => {
    const date = notification.timestamp.toDate();
    // If the date is more than a day old, show the specific date, otherwise show relative time.
    if (isPast(subDays(new Date(), 1))) {
        return format(date, 'MMM d, yyyy');
    }
    return formatDistanceToNow(date, { addSuffix: true });
  }, [notification.timestamp]);


  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only mark as read if the click is on the card itself, not a button or link inside
    if (e.target === e.currentTarget && !notification.read) {
        onMarkRead(notification.id);
    }
  };

  const cardContent = (
    <div
      onClick={handleCardClick}
      className={`relative flex items-start space-x-4 p-4 rounded-lg border transition-colors duration-300 ${!notification.link && 'cursor-pointer'}
        ${notification.read
          ? 'bg-white border-purple-100'
          : 'bg-purple-100/60 border-purple-300'
      }`}
    >
      <div className="flex-shrink-0 mt-1">{Icon}</div>
      <div className="flex-1">
        <p className={`text-sm ${notification.read ? 'text-gray-600' : 'font-medium text-purple-900'}`}>
          {notification.message}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {formattedTimestamp}
        </p>
         {!notification.read && (
            <Button
                variant="link"
                size="sm"
                className="text-purple-600 h-auto p-0 mt-2 text-xs"
                onClick={(e) => {
                    e.stopPropagation(); // Prevent card click event from firing
                    onMarkRead(notification.id);
                }}
            >
                <Check className="mr-1 h-3 w-3" />
                Mark as Read
            </Button>
        )}
      </div>
      {!notification.read && (
        <div className="h-2.5 w-2.5 rounded-full bg-purple-500 flex-shrink-0 mt-1" aria-label="Unread"></div>
      )}
    </div>
  );

  if (notification.link) {
    return <Link href={notification.link} onClick={() => !notification.read && onMarkRead(notification.id)}>{cardContent}</Link>;
  }

  return cardContent;
};

// --- Main Page Component ---
export default function NotificationsPage() {
  const [user, authLoading] = useAuthState(auth);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPageLoading(false);
      return;
    }

    const notificationsRef = collection(db, `users/${user.uid}/notifications`);
    const q = query(notificationsRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as NotificationItem));
      setNotifications(fetchedNotifications);
      setPageLoading(false);
    }, (err) => {
      console.error("Error fetching notifications:", err);
      setError("Could not load notifications. Please try again later.");
      setPageLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'unread') {
        return notifications.filter(n => !n.read);
    }
    return notifications;
  }, [notifications, activeFilter]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    if (!user) return;
    const notificationRef = doc(db, `users/${user.uid}/notifications`, id);
    try {
      await updateDoc(notificationRef, { read: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  }, [user]);

  const handleMarkAllAsRead = useCallback(async () => {
    if (!user || unreadCount === 0) return;
    const batch = writeBatch(db);
    const notificationsToUpdate = notifications.filter(n => !n.read);
    
    notificationsToUpdate.forEach(notification => {
      const docRef = doc(db, `users/${user.uid}/notifications`, notification.id);
      batch.update(docRef, { read: true });
    });

    try {
      await batch.commit();
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  }, [user, notifications, unreadCount]);
  
  const renderContent = () => {
    if (pageLoading) {
      return (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <NotificationSkeleton key={i} />)}
        </div>
      );
    }

    if (error) {
        return (
            <div className="text-center py-20 px-6 bg-red-50 rounded-2xl">
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-20 px-6 bg-white rounded-2xl">
                <h3 className="text-2xl font-semibold text-purple-800">Please Sign In</h3>
                <p className="mt-2 text-purple-600">You need to be signed in to view your notifications.</p>
                <Button asChild className="mt-6 bg-purple-600 hover:bg-purple-700">
                    <Link href="/signin">Sign In</Link>
                </Button>
            </div>
        );
    }
    
    if (filteredNotifications.length === 0) {
        return <EmptyState filter={activeFilter} />;
    }

    return (
      <div className="space-y-3">
        {filteredNotifications.map(notification => (
          <NotificationCard key={notification.id} notification={notification} onMarkRead={handleMarkAsRead} />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-purple-50 min-h-screen py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-purple-900 tracking-tight">
                    Notifications
                </h1>
                {unreadCount > 0 && (
                    <Button 
                        variant="ghost" 
                        className="mt-4 sm:mt-0 text-purple-600 hover:bg-purple-100 hover:text-purple-700 self-start sm:self-center"
                        onClick={handleMarkAllAsRead}
                    >
                    Mark all as read ({unreadCount})
                    </Button>
                )}
            </div>
             <div className="mt-6 border-b border-purple-200">
                <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as 'all' | 'unread')} className="w-full sm:w-auto">
                    <TabsList className="bg-transparent p-0">
                        <TabsTrigger value="all" className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-700 text-gray-500 rounded-none pb-2">All</TabsTrigger>
                        <TabsTrigger value="unread" className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-700 text-gray-500 rounded-none pb-2">Unread</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </header>

        <main>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}