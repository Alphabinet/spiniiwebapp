"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseConfig';
import { User, onAuthStateChanged } from 'firebase/auth';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { format } from 'date-fns';
import { FileText, Users, IndianRupee, Calendar, PlusCircle, AlertCircle } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"; // Import Select components

// --- Type Definitions ---
interface Campaign {
    id: string; // Document ID from Firestore
    orderId: string;
    campaignName: string;
    numberOfCreators: number;
    costs: {
        totalAmount: number;
    };
    createdAt: Timestamp;
    status: 'pending_payment' | 'pending_review' | 'live' | 'completed' | 'failed' | 'cancelled';
}

// --- Helper Components ---

const CampaignCardSkeleton: React.FC = () => (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md space-y-5 animate-pulse">
        <div className="flex flex-col sm:flex-row justify-between items-start">
            <Skeleton className="h-7 w-3/4 sm:w-2/5 bg-purple-100 rounded-md" />
            <Skeleton className="h-8 w-28 mt-3 sm:mt-0 bg-purple-100 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            {[...Array(3)].map((_, i) => (
                <div key={i}>
                    <Skeleton className="h-4 w-24 mb-2 bg-purple-100" />
                    <Skeleton className="h-6 w-1/2 bg-purple-100" />
                </div>
            ))}
        </div>
        <div className="flex justify-end pt-5 border-t border-gray-100">
             <Skeleton className="h-10 w-40 bg-purple-100 rounded-lg" />
        </div>
    </div>
);

const EmptyState: React.FC = () => (
    <div className="text-center py-20 px-6 bg-purple-50 rounded-3xl border-2 border-dashed border-purple-200 text-purple-800">
        <FileText className="mx-auto h-20 w-20 text-purple-400 opacity-80" />
        <h3 className="mt-6 text-3xl font-extrabold ">No Campaigns Yet!</h3>
        <p className="mt-3 text-lg text-purple-700 max-w-md mx-auto">
            It looks like you haven't launched any campaigns. Let's create your first one!
        </p>
        <div className="mt-8">
            <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
                <Link href="/create-campaign">
                    <PlusCircle className="mr-3 h-6 w-6" />
                    Launch New Campaign
                </Link>
            </Button>
        </div>
    </div>
);

const ErrorState: React.FC<{ message: string }> = ({ message }) => (
     <div className="text-center py-20 px-6 bg-red-50 rounded-3xl border border-red-200 text-red-800">
        <AlertCircle className="mx-auto h-20 w-20 text-red-500 opacity-80" />
        <h3 className="mt-6 text-3xl font-extrabold ">Oops! Something Went Wrong</h3>
        <p className="mt-3 text-lg text-red-700 max-w-md mx-auto">
            {message || "We couldn't load your campaigns. Please try again later or contact support."}
        </p>
        <div className="mt-8">
            <Button className="bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
                Retry Loading
            </Button>
        </div>
    </div>
);


const CampaignCard: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
    const campaignStatus = campaign.status || '';

    const statusStyles = useMemo(() => {
        switch (campaignStatus) {
            case 'live':
                return "bg-green-100 text-green-800 border-green-200";
            case 'pending_review':
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case 'completed':
                return "bg-blue-100 text-blue-800 border-blue-200";
            case 'failed':
            case 'cancelled':
                return "bg-red-100 text-red-800 border-red-200";
            case 'pending_payment':
                return "bg-purple-100 text-purple-800 border-purple-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    }, [campaignStatus]);

    const formattedDate = campaign.createdAt ? format(campaign.createdAt.toDate(), 'PPP') : 'N/A';

    const totalAmount = campaign.costs?.totalAmount !== undefined
        ? campaign.costs.totalAmount
        : 0;

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md transition-all duration-300 hover:shadow-xl hover:border-purple-300 flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight pr-4 mb-2 sm:mb-0">
                    {campaign.campaignName}
                </h3>
                <Badge variant="outline" className={`text-sm font-semibold px-3 py-1.5 capitalize rounded-full ${statusStyles} flex-shrink-0`}>
                    {campaignStatus.replace('_', ' ')}
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 py-4 border-t border-b border-gray-100 flex-grow">
                <div className="flex items-center">
                    <IndianRupee className="h-5 w-5 mr-3 text-purple-500" />
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Total Budget</p>
                        <p className="font-semibold text-gray-800 text-base">₹{totalAmount.toLocaleString('en-IN')}</p>
                    </div>
                </div>
                <div className="flex items-center">
                    <Users className="h-5 w-5 mr-3 text-purple-500" />
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Creators</p>
                        <p className="font-semibold text-gray-800 text-base">{campaign.numberOfCreators}</p>
                    </div>
                </div>
                <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-3 text-purple-500" />
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Created On</p>
                        <p className="font-semibold text-gray-800 text-base">{formattedDate}</p>
                    </div>
                </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end items-center">
                <p className="text-xs text-gray-500 font-mono tracking-wide">Order ID: {campaign.orderId}</p>
            </div>
        </div>
    );
};


// --- Main Page Component ---

const MyCampaignsPage: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // State for sort order: 'desc' for latest (default), 'asc' for oldest
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) return;

        setLoading(true);
        const campaignsCollection = collection(db, 'campaigns');
        const q = query(
            campaignsCollection,
            where("userId", "==", user.uid),
            orderBy("createdAt", sortOrder) // Use the sortOrder state here
        );

        const unsubscribeSnapshot = onSnapshot(q, (querySnapshot) => {
            const fetchedCampaigns = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as Campaign));
            setCampaigns(fetchedCampaigns);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching campaigns:", err);
            setError("Failed to fetch your campaigns. Please try again later.");
            setLoading(false);
        });

        return () => unsubscribeSnapshot();
    }, [user, sortOrder]); // Add sortOrder to dependency array

    const renderContent = () => {
        if (loading) {
            return (
                <div className="space-y-6">
                    {[...Array(3)].map((_, i) => <CampaignCardSkeleton key={i} />)}
                </div>
            );
        }

        if (error) {
            return <ErrorState message={error} />;
        }

        if (campaigns.length === 0) {
            return <EmptyState />;
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {campaigns.map(campaign => <CampaignCard key={campaign.id} campaign={campaign} />)}
            </div>
        );
    };

    return (
        <div className="bg-purple-50  min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10 flex flex-col sm:flex-row justify-between sm:items-center gap-6">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-purple-900 tracking-tight leading-tight">Your Campaigns</h1>
                    </div>
                     <div className="flex flex-col sm:flex-col gap-2"> {/* Container for sort & create button */}
                        <Select onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)} defaultValue={sortOrder}>
                            <SelectTrigger className="w-[180px] bg-white text-purple-700 border-purple-200 hover:border-purple-300 focus:ring-purple-500">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent className="bg-white text-gray-800 border-purple-200">
                                <SelectItem value="desc">Latest</SelectItem>
                                <SelectItem value="asc">Oldest</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex-shrink-0">
                            <Link href="/campaign/create">
                                <PlusCircle className="mr-3 h-6 w-6" />
                                New Campaign
                            </Link>
                        </Button>
                    </div>
                </header>

                <main>
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default MyCampaignsPage;