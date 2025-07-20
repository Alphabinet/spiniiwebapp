'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseConfig';
import { User } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Package, Calendar, User as UserIcon, Tag, Hash, CheckCircle, XCircle, Hourglass, ArrowRight, IndianRupee, ExternalLink, ThumbsUp, ThumbsDown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface CreatorProfile {
  id: string;
  displayName: string;
  photoURL: string;
  username?: string;
  category?: string;
}

interface Booking {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorDetails?: {
    profilePictureUrl: string;
  };
  createdAt: any;
  grandTotalPrice: number;
  // REMOVED: old payment status type from here if it's no longer relevant for the *main* booking status
  // If payment status still exists in Firestore and you need to display it elsewhere, keep this.
  // For this specific request, I'm assuming you just want to focus on the 'status' property below.
  payment: {
    status: 'success' | 'failed' | 'pending'; // Keep this if you still track payment separately in data
    transactionId: string;
    method?: string;
  };
  campaign: {
    id: string;
    name: string;
    thumbnail?: string;
  };
  // Keeping deliveryStatus for the progress bar, as requested.
  deliveryStatus?: 'pending' | 'in_progress' | 'completed' | 'delayed';
  // This is the primary status we're now displaying
  status: 'pending' | 'accepted' | 'completed' | 'rejected';
  estimatedDelivery?: any;
}

// This component handles the 'pending', 'accepted', 'completed', 'rejected' statuses
const BookingStatusBadge = ({ status }: { status: Booking['status'] }) => {
  let badgeClasses = "";
  let icon = null;

  switch (status) {
    case 'pending':
      badgeClasses = "bg-yellow-100 text-yellow-800 border-yellow-200";
      icon = <Hourglass className="mr-1 h-3 w-3" />;
      break;
    case 'accepted':
      badgeClasses = "bg-blue-100 text-blue-800 border-blue-200";
      icon = <ThumbsUp className="mr-1 h-3 w-3" />;
      break;
    case 'completed':
      badgeClasses = "bg-green-100 text-green-800 border-green-200";
      icon = <CheckCircle className="mr-1 h-3 w-3" />;
      break;
    case 'rejected':
      badgeClasses = "bg-red-100 text-red-800 border-red-200";
      icon = <ThumbsDown className="mr-1 h-3 w-3" />;
      break;
    default:
      badgeClasses = "bg-gray-100 text-gray-800 border-gray-200";
      icon = null;
  }

  return (
    <Badge variant="outline" className={`${badgeClasses} text-xs sm:text-sm capitalize`}>
      {icon}
      {status}
    </Badge>
  );
};


const MyOrdersPage = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, CreatorProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setCurrentUser(user);
      } else {
        setLoading(false);
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    const q = query(
      collection(db, "bookings"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const userBookings: Booking[] = [];
      const creatorIds = new Set<string>();

      querySnapshot.forEach((doc) => {
        const bookingData = { id: doc.id, ...doc.data() } as Booking;
        userBookings.push(bookingData);
        if (bookingData.creatorId) {
          creatorIds.add(bookingData.creatorId);
        }
      });

      if (creatorIds.size > 0) {
        const profiles = await fetchCreatorProfiles(Array.from(creatorIds));
        setCreatorProfiles(profiles);
      }

      setBookings(userBookings);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching bookings:", err);
      setError("Failed to load your orders. Please try again later.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const fetchCreatorProfiles = async (creatorIds: string[]) => {
    const profiles: Record<string, CreatorProfile> = {};

    await Promise.all(creatorIds.map(async (id) => {
      try {
        const docRef = doc(db, "creators", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          profiles[id] = {
            id: docSnap.id,
            displayName: docSnap.data().displayName || 'Unknown Creator',
            photoURL: docSnap.data().photoURL || '',
            username: docSnap.data().username,
            category: docSnap.data().category
          };
        }
      } catch (error) {
        console.error(`Error fetching creator profile for ${id}:`, error);
      }
    }));

    return profiles;
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeliveryProgress = (status?: string) => {
    switch (status) {
      case 'pending': return 25;
      case 'in_progress': return 50;
      case 'completed': return 100;
      case 'delayed': return 75;
      default: return 0;
    }
  };

  const getDeliveryStatusText = (status?: string) => {
    switch (status) {
      case 'pending': return 'Order Received';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Delivered';
      case 'delayed': return 'Delayed';
      default: return 'Processing';
    }
  };

  // REMOVED: StatusBadge for payment status
  // const StatusBadge = ({ status }: { status: string }) => {
  //   switch (status) {
  //     case 'success':
  //       return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200 text-xs sm:text-sm"><CheckCircle className="mr-1 h-3 w-3" />Success</Badge>;
  //     case 'failed':
  //       return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 text-xs sm:text-sm"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>;
  //     case 'pending':
  //       return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-xs sm:text-sm"><Hourglass className="mr-1 h-3 w-3" />Pending</Badge>;
  //     default:
  //       return <Badge variant="outline" className="text-xs sm:text-sm">{status}</Badge>;
  //   }
  // };

  // REMOVED: DeliveryBadge for delivery status
  // const DeliveryBadge = ({ status }: { status?: string }) => {
  //   switch (status) {
  //     case 'pending':
  //       return <Badge variant="outline" className="border-blue-200 text-blue-800 bg-blue-50 text-xs sm:text-sm"><Hourglass className="mr-1 h-3 w-3" />Pending</Badge>;
  //     case 'in_progress':
  //       return <Badge variant="outline" className="border-purple-200 text-purple-800 bg-purple-50 text-xs sm:text-sm"><Hourglass className="mr-1 h-3 w-3" />In Progress</Badge>;
  //     case 'completed':
  //       return <Badge variant="outline" className="border-green-200 text-green-800 bg-green-50 text-xs sm:text-sm"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>;
  //     case 'delayed':
  //       return <Badge variant="outline" className="border-orange-200 text-orange-800 bg-orange-50 text-xs sm:text-sm"><Hourglass className="mr-1 h-3 w-3" />Delayed</Badge>;
  //     default:
  //       return <Badge variant="outline" className="text-xs sm:text-sm">Processing</Badge>;
  //   }
  // };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="bg-gray-100 p-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-6 w-48" />
                  </div>
                  <div className="flex gap-2">
                    {/* Only showing one skeleton badge for the main booking status */}
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 col-span-2">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-100 p-4">
                <div className="w-full space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-gray-50 rounded-lg mx-4 sm:mx-6 lg:mx-8">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <UserIcon className="w-12 h-12 text-gray-400 mb-4 mx-auto" />
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">Please Sign In</h2>
          <p className="text-gray-600 mb-6">You need to be logged in to view your orders.</p>
          <Link href="/login" className="block">
            <Button className="w-full sm:w-auto px-6 py-3 text-base">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-xl p-6 sm:p-8 max-w-md mx-auto shadow-sm border border-gray-200">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 text-center">Error Loading Orders</h2>
          <p className="text-gray-600 mb-6 text-center">{error}</p>
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => window.location.reload()} className="px-6 py-3">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="bg-gray-50 min-h-screen pb-12">
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Orders</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                You have {bookings.length} {bookings.length === 1 ? 'order' : 'orders'} placed.
              </p>
            </div>
            <Link href="/creator" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800 transition-all"
              >
                Explore More Creators <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white rounded-xl shadow-sm p-6 sm:p-8 text-center border border-gray-200">
              <Package className="w-12 h-12 text-gray-400 mb-4" />
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">No Orders Yet</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                It looks like you haven't placed any orders with us yet. Explore our creators and make your first booking!
              </p>
              <Link href="/creator" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto gap-2 px-6 py-3 text-base bg-purple-600 hover:bg-purple-700 transition-colors">
                  Browse Creators <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {bookings.map((booking) => {
                const creatorProfile = creatorProfiles[booking.creatorId] || {
                  displayName: booking.creatorName,
                  photoURL: booking.creatorDetails?.profilePictureUrl || '',
                  username: undefined,
                  category: undefined
                };

                return (
                  <Card
                    key={booking.id}
                    className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-200 rounded-lg"
                  >
                    <CardHeader className="bg-purple-50/50 p-4 border-b border-purple-100">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-purple-700" />
                          <CardTitle className="text-lg sm:text-xl font-bold text-purple-800 line-clamp-1">
                            {booking.campaign.name}
                          </CardTitle>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {/* Display only the new BookingStatusBadge */}
                          <BookingStatusBadge status={booking.status} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-center bg-white">
                      <div className="flex items-center space-x-3 sm:space-x-4 col-span-1">
                        <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-purple-300">
                          <AvatarImage
                            src={creatorProfile.photoURL || `https://placehold.co/80x80/EDE9FE/6B21A8?text=${creatorProfile.displayName.charAt(0)}&font=lato`}
                            alt={creatorProfile.displayName}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = `https://placehold.co/80x80/EDE9FE/6B21A8?text=${creatorProfile.displayName.charAt(0)}&font=lato`;
                            }}
                          />
                          <AvatarFallback className="text-purple-700 text-xl font-bold">
                            {creatorProfile.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs sm:text-sm text-gray-500 font-medium">Creator</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                href={`/creator/${creatorProfile.username || booking.creatorId}`}
                                className="text-base sm:text-lg font-bold text-purple-700 hover:text-purple-900 transition-colors block line-clamp-1"
                              >
                                {creatorProfile.displayName}
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-800 text-white text-xs py-1 px-2 rounded-md shadow-lg">
                              <p>View creator profile</p>
                            </TooltipContent>
                          </Tooltip>
                          {creatorProfile.category && (
                            <Badge
                              variant="outline"
                              className="mt-1 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 border-purple-300 rounded-full"
                            >
                              {creatorProfile.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="col-span-1 md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                        <div className="flex flex-col">
                          <span className="text-gray-500 flex items-center gap-1 font-medium">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                            <span className="hidden sm:inline">Order Date</span>
                            <span className="sm:hidden">Date</span>
                          </span>
                          <span className="font-medium sm:font-semibold text-gray-800">
                            {formatDateTime(booking.createdAt)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 flex items-center gap-1 font-medium">
                            <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                            <span className="hidden sm:inline">Transaction ID</span>
                            <span className="sm:hidden">Txn ID</span>
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="font-medium sm:font-semibold text-gray-800 truncate">
                                {booking.payment.transactionId}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-800 text-white text-xs py-1 px-2 rounded-md shadow-lg">
                              {booking.payment.transactionId}
                            </TooltipContent>
                          </Tooltip>
                          {booking.payment.method && (
                            <span className="text-xs text-gray-500 mt-1 font-medium truncate">
                              Paid with {booking.payment.method}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col col-span-2 sm:col-span-1">
                          <span className="text-gray-500 font-medium">Total Amount</span>
                          <span className="font-bold text-xl sm:text-2xl text-purple-600 flex items-center mt-1">
                            <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
                            {booking.grandTotalPrice.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-gray-50 p-4 border-t border-gray-100">
                      <div className="w-full">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 text-xs sm:text-sm font-medium gap-1">
                          <span className="text-gray-600">
                            {getDeliveryStatusText(booking.deliveryStatus)}
                          </span>
                          {booking.estimatedDelivery && (
                            <span className="text-gray-600">
                              Estimated: <span className="font-semibold">{formatDate(booking.estimatedDelivery)}</span>
                            </span>
                          )}
                        </div>
                        <Progress
                          value={getDeliveryProgress(booking.deliveryStatus)}
                          className="h-2 rounded-full"
                          indicatorClassName={
                            booking.deliveryStatus === 'delayed'
                              ? 'bg-orange-500'
                              : booking.deliveryStatus === 'completed'
                                ? 'bg-green-500'
                                : 'bg-purple-600'
                          }
                        />
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default MyOrdersPage;