"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseConfig';
import { User, onAuthStateChanged } from 'firebase/auth';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, Tag, ShoppingBag, AlertCircle, Clock, CheckCircle2, XCircle, LucideIcon } from 'lucide-react';

// --- Type Definitions ---
type OrderStatus = 'pending_payment' | 'confirmed' | 'completed' | 'failed' | 'cancelled';

interface Booking {
    id: string;
    orderId: string;
    creatorName: string;
    creatorId: string;
    creatorDetails: {
        profilePictureUrl: string;
    };
    campaign: {
        name: string;
    };
    grandTotalPrice: number;
    createdAt: Timestamp | { seconds: number; nanoseconds: number };
    status: OrderStatus;
}

// --- Helper Components ---

const OrderCardSkeleton: React.FC = () => (
    <div className="bg-white p-5 rounded-xl border border-purple-100 shadow-sm flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6">
        <Skeleton className="h-20 w-20 rounded-lg bg-purple-100" />
        <div className="flex-grow space-y-3">
            <Skeleton className="h-5 w-3/4 bg-purple-100" />
            <Skeleton className="h-4 w-1/2 bg-purple-100" />
            <div className="flex items-center space-x-4 pt-2">
                <Skeleton className="h-4 w-24 bg-purple-100" />
                <Skeleton className="h-4 w-24 bg-purple-100" />
            </div>
        </div>
        <div className="flex-shrink-0">
            <Skeleton className="h-8 w-28 bg-purple-100 rounded-full" />
        </div>
    </div>
);

const EmptyState: React.FC<{ filter: string }> = ({ filter }) => {
    const messages: Record<string, { title: string; body: string }> = {
        all: { title: 'No Bookings Yet', body: "When you book a creator, your bookings will appear here." },
        pending_payment: { title: 'No Pending Bookings', body: 'You have no bookings awaiting payment.' },
        completed: { title: 'No Completed Bookings', body: 'You have no completed bookings to show.' },
        cancelled: { title: 'No Cancelled Bookings', body: 'You have no cancelled or failed bookings.' },
    };
    const { title, body } = messages[filter] || messages.all;

    return (
        <div className="text-center py-16 px-6 bg-white rounded-2xl border-2 border-dashed border-purple-200">
            <ShoppingBag className="mx-auto h-16 w-16 text-purple-300" />
            <h3 className="mt-4 text-2xl font-semibold text-purple-800">{title}</h3>
            <p className="mt-2 text-purple-600">{body}</p>
        </div>
    );
};

const ErrorState: React.FC<{ message: string | null }> = ({ message }) => (
     <div className="text-center py-16 px-6 bg-red-50 rounded-2xl border border-red-200">
        <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
        <h3 className="mt-4 text-2xl font-semibold text-red-800">Something Went Wrong</h3>
        <p className="mt-2 text-red-600">{message || "We couldn't load your bookings. Please try again later."}</p>
    </div>
);

const OrderCard: React.FC<{ order: Booking }> = ({ order }) => {
    const statusInfo: { className: string; icon: LucideIcon; text: string } = useMemo(() => {
        switch (order.status) {
            case 'completed':
                return { className: "bg-purple-600 text-white", icon: CheckCircle2, text: "Completed" };
            case 'pending_payment':
            case 'confirmed':
                return { className: "bg-purple-100 text-purple-800", icon: Clock, text: order.status === 'pending_payment' ? "Pending Payment" : "Confirmed" };
            case 'failed':
            case 'cancelled':
                return { className: "bg-gray-100 text-gray-600", icon: XCircle, text: "Cancelled" };
            default:
                return { className: "bg-gray-100 text-gray-800", icon: Clock, text: "Status Unknown" };
        }
    }, [order.status]);

    const dateObject = order.createdAt && typeof (order.createdAt as Timestamp).toDate === 'function'
        ? (order.createdAt as Timestamp).toDate()
        : order.createdAt?.seconds
            ? new Date(order.createdAt.seconds * 1000)
            : null;

    const formattedDate = dateObject ? format(dateObject, 'PPP') : 'Date not available';

    return (
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-purple-100 shadow-sm transition-all hover:shadow-md hover:border-purple-300">
            <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-5">
                <Image
                    src={order.creatorDetails?.profilePictureUrl || `https://placehold.co/80x80/EEE2FE/6B21A8?text=${order.creatorName.charAt(0)}`}
                    alt={order.creatorName}
                    width={80}
                    height={80}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border border-purple-100 flex-shrink-0"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = `https://placehold.co/80x80/EEE2FE/6B21A8?text=${order.creatorName.charAt(0)}`;
                    }}
                />
                <div className="flex-grow">
                    <div className="flex justify-between items-start">
                        <div>
                           <p className="text-sm font-medium text-purple-600 hover:underline">
                                <Link href={`/creator/${order.creatorId}`}>{order.creatorName}</Link>
                            </p>
                            <h3 className="text-lg font-bold text-gray-800 leading-tight">{order.campaign.name}</h3>
                        </div>
                        <Badge variant="outline" className={`border-0 text-xs sm:text-sm font-semibold capitalize flex items-center gap-1.5 ${statusInfo.className}`}>
                            <statusInfo.icon className="h-4 w-4" />
                            {statusInfo.text}
                        </Badge>
                    </div>
                    <div className="mt-3 pt-3 border-t border-purple-100 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
                        <div className="flex items-center">
                            <Tag className="h-4 w-4 mr-1.5 text-purple-300" />
                            Booking ID: <span className="font-medium text-gray-700 ml-1 text-xs sm:text-sm">{order.orderId}</span>
                        </div>
                        <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1.5 text-purple-300" />
                            Booked on: <span className="font-medium text-gray-700 ml-1">{formattedDate}</span>
                        </div>
                    </div>
                </div>
            </div>
             <div className="mt-4 pt-4 border-t border-purple-100 flex justify-end items-center">
                <div>
                     <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-xl font-bold text-purple-900">
                        ₹{order.grandTotalPrice.toLocaleString('en-IN')}
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- Main Page Component ---
const OrdersPage: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [orders, setOrders] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState<'latest' | 'oldest'>('latest');

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) setLoading(false);
        });

        if (user) {
            const q = query(collection(db, 'bookings'), where("userId", "==", user.uid));
            const unsubscribeSnapshot = onSnapshot(q, (querySnapshot) => {
                const fetchedOrders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
                setOrders(fetchedOrders); setLoading(false);
            }, (err) => {
                console.error("Error fetching bookings:", err);
                setError("Failed to fetch bookings."); setLoading(false);
            });
            return () => unsubscribeSnapshot();
        }
        return () => unsubscribeAuth();
    }, [user]);
    
    const displayedOrders = useMemo(() => {
        const getEpochMillis = (timestamp: Booking['createdAt']): number => {
            if (!timestamp) return 0;
            if (typeof (timestamp as Timestamp).toDate === 'function') return (timestamp as Timestamp).toDate().getTime();
            if (timestamp.seconds) return timestamp.seconds * 1000;
            return 0;
        };

        const filtered = orders.filter(order => {
            if (filterStatus === 'all') return true;
            if (filterStatus === 'cancelled') return ['cancelled', 'failed'].includes(order.status);
            if (filterStatus === 'pending') return ['pending_payment', 'confirmed'].includes(order.status);
            return order.status === filterStatus;
        });

        return [...filtered].sort((a, b) => {
            const dateA = getEpochMillis(a.createdAt);
            const dateB = getEpochMillis(b.createdAt);
            return sortBy === 'latest' ? dateB - dateA : dateA - dateB;
        });
    }, [orders, filterStatus, sortBy]);

    const renderContent = () => {
        if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <OrderCardSkeleton key={i} />)}</div>;
        if (error) return <ErrorState message={error} />;
        if (!user) return <ErrorState message="Please sign in to view your bookings." />;
        if (displayedOrders.length === 0) return <EmptyState filter={filterStatus} />;
        return <div className="space-y-4">{displayedOrders.map(order => <OrderCard key={order.id} order={order} />)}</div>;
    };

    return (
        <div className="bg-purple-50 min-h-screen">
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
                <header className="mb-6">
                    <h1 className="text-3xl sm:text-4xl font-bold text-purple-900 tracking-tight">My Creator Bookings</h1>
                </header>
                
                <div className="my-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <Tabs value={filterStatus} onValueChange={setFilterStatus}>
                        <TabsList className="grid grid-cols-4 w-full sm:w-auto bg-purple-100 p-1">
                            <TabsTrigger value="all" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-800">All</TabsTrigger>
                            <TabsTrigger value="pending" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-800">Pending</TabsTrigger>
                            <TabsTrigger value="completed" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-800">Completed</TabsTrigger>
                            <TabsTrigger value="cancelled" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-800">Cancelled</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Select value={sortBy} onValueChange={(value: 'latest' | 'oldest') => setSortBy(value)}>
                        <SelectTrigger className="w-full sm:w-[180px] border-purple-300 text-purple-900 focus:ring-purple-500">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent className="border-purple-200">
                            <SelectItem value="latest">Sort by: Latest</SelectItem>
                            <SelectItem value="oldest">Sort by: Oldest</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <main>
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default OrdersPage;