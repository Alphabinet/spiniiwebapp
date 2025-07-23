"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircleIcon, XCircleIcon, Loader2, User, ShoppingCart, Hash, Info, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';

// --- Updated Type Definition for FULL Booking Details ---
interface BookingDetails {
    creatorDetails: {
        fullName: string;
        profilePictureUrl: string;
        instagramUsername: string;
        contentCategory: string;
        cityState: string;
        totalFollowers: string;
        avgReelViews: string;
        storyAverageViews: string;
        deliveryDuration: string;
        // Add any other specific creator details you might pass from the API
        // emailAddress: string; 
        // mobileNumber: string;
    };
    bookerDetails: {
        fullName: string;
        email: string;
        phoneNumber: string;
    };
    campaign: {
        name: string;
        description: string;
        deadline: string | null; // Keep as string here, format for display
        // If demoVideoUrl is passed back, add it here:
        // demoVideoUrl?: string; 
    };
    services: {
        reels: number;
        story: number;
        reelsStory: number;
    };
    subTotalPrice: number;
    serviceCharge: number;
    grandTotalPrice: number;
    transactionId: string;
}

function StatusContent() {
    const searchParams = useSearchParams();
    const order_id = searchParams.get('order_id');

    // --- State Management ---
    const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
    const [message, setMessage] = useState('Verifying your payment, please wait...');
    const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);

    useEffect(() => {
        if (!order_id) {
            setStatus('failed');
            setMessage('No order ID found. Invalid request.');
            return;
        }

        const verifyPayment = async () => {
            try {
                const response = await fetch('/api/cashfree/verify-booking-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order_id }),
                });
                const data = await response.json();

                if (data.success && data.status === 'PAID' && data.booking) {
                    setStatus('success');
                    // Set the detailed booking info from the API response
                    setBookingDetails(data.booking);
                    // Set the custom success message, dynamically including the creator's name
                    setMessage(`Your service is booked for ${data.booking.creatorDetails.fullName}, and our team will reach out to you shortly.`);
                } else {
                    setStatus('failed');
                    setMessage(data.message || 'Payment verification failed. Please contact support.');
                    setBookingDetails(null);
                }
            } catch (error) {
                setStatus('failed');
                setMessage('An error occurred while verifying your payment.');
                setBookingDetails(null);
            }
        };

        // Delay verification to allow backend processes (like webhooks) to complete
        const timer = setTimeout(verifyPayment, 3000);
        return () => clearTimeout(timer);
    }, [order_id]);

    // --- Helper to render booked services ---
    const renderServices = (services: BookingDetails['services'], creatorDetails: BookingDetails['creatorDetails']) => {
        const serviceItems = [];
        if (services.reels > 0) {
            serviceItems.push({ name: 'Reels Post', count: services.reels, price: parseInt(creatorDetails.avgReelViews) }); // Assuming avgReelViews is used for price here
        }
        if (services.story > 0) {
            serviceItems.push({ name: 'Story Post', count: services.story, price: parseInt(creatorDetails.storyAverageViews) }); // Assuming storyAverageViews for price
        }
        if (services.reelsStory > 0) {
            // This is a placeholder, you'd need the actual combo price from creatorDetails
            // For now, let's just show count. If you have a 'reelsStoryPrice' on creatorDetails, use that.
            serviceItems.push({ name: 'Reels + Story Combo', count: services.reelsStory, price: 0 }); 
        }

        return serviceItems.map(item => (
            <div key={item.name} className="flex justify-between items-center text-sm">
                <p className="text-gray-600">{item.name}</p>
                <p className="font-medium text-gray-800">x {item.count}</p>
            </div>
        ));
    };


    // --- UI Rendering ---
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 sm:p-6">
            <div className="w-full max-w-2xl text-center">
                {/* --- Processing State --- */}
                {status === 'processing' && (
                    <div className="w-full max-w-md mx-auto p-8 space-y-6 bg-white rounded-2xl shadow-xl">
                        <Loader2 className="h-16 w-16 animate-spin text-purple-600 mx-auto" />
                        <h1 className="text-2xl font-bold text-gray-800">Processing Payment</h1>
                        <p className="text-gray-600 text-lg">Verifying your payment, please wait...</p>
                    </div>
                )}

                {/* --- Success State: Rich Details UI --- */}
                {status === 'success' && bookingDetails && (
                    <div className="p-6 sm:p-8 space-y-6 bg-white rounded-2xl shadow-xl">
                        <div className="text-center">
                            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
                            <h1 className="text-3xl font-bold text-gray-800 mt-4">Booking Confirmed!</h1>
                            <p className="text-green-700 bg-green-50 p-3 rounded-lg text-md mt-4">
                                Your service is booked for **{bookingDetails.creatorDetails.fullName}**, and our team will reach out to you shortly.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left !mt-8">
                            {/* Left Column */}
                            <div className="space-y-6">
                                {/* Creator Info */}
                                <div className="p-4 border rounded-lg">
                                    <h2 className="font-bold mb-3 text-lg">Creator Info</h2>
                                    <div className="flex items-center space-x-3 mb-4">
                                        <Image
                                            src={bookingDetails.creatorDetails.profilePictureUrl}
                                            alt={bookingDetails.creatorDetails.fullName}
                                            width={48}
                                            height={48}
                                            className="w-12 h-12 rounded-full border-2 border-purple-200 object-cover"
                                            onError={(e) => { // Fallback for broken images
                                                const target = e.target as HTMLImageElement;
                                                target.onerror = null;
                                                target.src = `https://placehold.co/48x48/EEE2FE/6B21A8?text=${bookingDetails.creatorDetails.fullName.charAt(0)}`;
                                            }}
                                        />
                                        <div>
                                            <p className="font-bold">{bookingDetails.creatorDetails.fullName}</p>
                                            <p className="text-sm text-gray-500">@{bookingDetails.creatorDetails.instagramUsername}</p>
                                        </div>
                                    </div>
                                    <div className="text-sm space-y-1 text-gray-600">
                                        <p><strong>Category:</strong> {bookingDetails.creatorDetails.contentCategory}</p>
                                        <p><strong>Location:</strong> {bookingDetails.creatorDetails.cityState}</p>
                                        <p><strong>Followers:</strong> {parseInt(bookingDetails.creatorDetails.totalFollowers).toLocaleString()}</p>
                                        <p><strong>Avg. Reel Views:</strong> {parseInt(bookingDetails.creatorDetails.avgReelViews).toLocaleString()}</p>
                                        <p><strong>Avg. Story Views:</strong> {parseInt(bookingDetails.creatorDetails.storyAverageViews).toLocaleString()}</p>
                                        <p><strong>Delivery Duration:</strong> {bookingDetails.creatorDetails.deliveryDuration} days</p>
                                    </div>
                                </div>
                                {/* Campaign Details */}
                                <div className="p-4 border rounded-lg">
                                    <h2 className="font-bold mb-3 text-lg">Campaign Details</h2>
                                    <div className="text-sm space-y-2 text-gray-600">
                                        <p><strong>Name:</strong> {bookingDetails.campaign.name}</p>
                                        <p><strong>Description:</strong> {bookingDetails.campaign.description}</p>
                                        <p><strong>Deadline:</strong> {bookingDetails.campaign.deadline ? format(new Date(bookingDetails.campaign.deadline), "MMMM do, yyyy") : 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">
                                {/* Service & Payment Summary */}
                                <div className="p-4 border rounded-lg">
                                    <h2 className="font-bold mb-3 text-lg">Payment Summary</h2>
                                    <div className="space-y-2 border-b pb-2 mb-2">
                                        {/* Pass creatorDetails to renderServices for dynamic pricing/details if needed */}
                                        {renderServices(bookingDetails.services, bookingDetails.creatorDetails)} 
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{bookingDetails.subTotalPrice.toLocaleString('en-IN')}</span></div>
                                        <div className="flex justify-between text-sm"><span>Service Charge</span><span>₹{bookingDetails.serviceCharge.toLocaleString('en-IN')}</span></div>
                                        <div className="flex justify-between font-bold text-md pt-1 border-t mt-1"><span>Grand Total</span><span>₹{bookingDetails.grandTotalPrice.toLocaleString('en-IN')}</span></div>
                                    </div>
                                    <div className="flex justify-between text-xs items-center mt-4 bg-gray-50 p-2 rounded">
                                        <span className="font-semibold text-gray-600">Transaction ID</span>
                                        <span className="font-mono text-gray-800">{bookingDetails.transactionId}</span>
                                    </div>
                                </div>
                                {/* Your Details */}
                                <div className="p-4 border rounded-lg">
                                    <h2 className="font-bold mb-3 text-lg">Your Details</h2>
                                    <div className="text-sm space-y-1 text-gray-600">
                                        <p><strong>Name:</strong> {bookingDetails.bookerDetails.fullName}</p>
                                        <p><strong>Email:</strong> {bookingDetails.bookerDetails.email}</p>
                                        <p><strong>Phone:</strong> {bookingDetails.bookerDetails.phoneNumber}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button asChild className="mt-8 w-full sm:w-auto bg-purple-600 hover:bg-purple-700">
                            <Link href="/dashboard">Go to My Orders</Link>
                        </Button>
                    </div>
                )}

                {/* --- Failed State --- */}
                {status === 'failed' && (
                    <div className="w-full max-w-md mx-auto p-8 space-y-6 bg-white rounded-2xl shadow-xl">
                        <XCircleIcon className="h-16 w-16 text-red-500 mx-auto" />
                        <h1 className="text-3xl font-bold text-gray-800">Payment Failed</h1>
                        <p className="text-red-600 bg-red-50 p-4 rounded-lg text-lg !mt-6">{message}</p>
                        <div className="flex gap-4 !mt-8">
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/dashboard">Go to Dashboard</Link>
                            </Button>
                            <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
                                <Link href="/support">Contact Support</Link>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function BookingStatusPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-screen text-lg font-medium">
                Loading Booking Status...
            </div>
        }>
            <StatusContent />
        </Suspense>
    );
}