"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircleIcon, XCircleIcon, Loader2 } from 'lucide-react'; // Removed unused icons for cleaner import
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';

// --- Updated Type Definition for FULL Booking Details to match backend response ---
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
        // Removed optional fields like gender, contentLanguages unless explicitly needed on frontend confirmation
    };
    bookerDetails: {
        fullName: string;
        email: string;
        phoneNumber: string;
    };
    campaign: {
        name: string;
        description: string;
        deadline: string | null; // ISO string from backend
        // demoVideoUrl?: string; // Add if backend sends this and frontend needs it
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

    // --- Define your payment page URL ---
    // IMPORTANT: Replace this with the actual path to your payment page for the specific booking.
    // Ideally, this link should lead to the payment initiation page for this specific order_id.
    // For now, it's a generic link. You might need to construct it with the order_id or other params.
    const PAYMENT_PAGE_URL = `/checkout?order_id=${order_id}`; // Example: pass order_id to payment page

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
                    setBookingDetails(data.booking);
                    setMessage(`Your service is booked for **${data.booking.creatorDetails.fullName}**, and our team will reach out to you shortly.`);
                } else {
                    // This handles FAILED, PENDING, or other non-success statuses from backend
                    setStatus('failed');
                    setMessage(data.message || 'Payment verification failed. Please contact support or try again.');
                    setBookingDetails(null); // Clear booking details if payment failed
                }
            } catch (error) {
                console.error("Frontend: Error verifying payment:", error);
                setStatus('failed');
                setMessage('An unexpected error occurred. Please try again or contact support.');
                setBookingDetails(null);
            }
        };

        // Delay verification to allow backend processes (like webhooks) to complete
        const timer = setTimeout(verifyPayment, 3000);
        return () => clearTimeout(timer);
    }, [order_id]); // Depend on order_id to re-run if it changes (though usually fixed on this page)

    // --- Helper to render booked services ---
    const renderServices = (services: BookingDetails['services'], creatorDetails: BookingDetails['creatorDetails']) => {
        const serviceItems = [];
        if (services.reels > 0) {
            serviceItems.push({ name: 'Reels Post', count: services.reels, price: parseInt(creatorDetails.avgReelViews || '0') });
        }
        if (services.story > 0) {
            serviceItems.push({ name: 'Story Post', count: services.story, price: parseInt(creatorDetails.storyAverageViews || '0') });
        }
        if (services.reelsStory > 0) {
            // Placeholder: If you have a specific combo price, use it. Otherwise, price is 0 or needs calculation.
            serviceItems.push({ name: 'Reels + Story Combo', count: services.reelsStory, price: 0 });
        }

        if (serviceItems.length === 0) {
            return <p className="text-gray-500">No services specified.</p>;
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
                        <p className="text-gray-600 text-lg">{message}</p>
                    </div>
                )}

                {/* --- Success State: Rich Details UI --- */}
                {status === 'success' && bookingDetails && (
                    <div className="p-6 sm:p-8 space-y-6 bg-white rounded-2xl shadow-xl">
                        <div className="text-center">
                            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
                            <h1 className="text-3xl font-bold text-gray-800 mt-4">Booking Confirmed!</h1>
                            <p className="text-green-700 bg-green-50 p-3 rounded-lg text-md mt-4" dangerouslySetInnerHTML={{ __html: message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left !mt-8">
                            {/* Left Column */}
                            <div className="space-y-6">
                                {/* Creator Info */}
                                <div className="p-4 border rounded-lg">
                                    <h2 className="font-bold mb-3 text-lg">Creator Info</h2>
                                    <div className="flex items-center space-x-3 mb-4">
                                        <Image
                                            src={bookingDetails.creatorDetails.profilePictureUrl || '/images/default-avatar.png'} // Use default if URL is empty/null
                                            alt={bookingDetails.creatorDetails.fullName || 'Creator'}
                                            width={48}
                                            height={48}
                                            className="w-12 h-12 rounded-full border-2 border-purple-200 object-cover"
                                            onError={(e) => { // Robust fallback for broken images
                                                const target = e.target as HTMLImageElement;
                                                target.onerror = null; // Prevents infinite loop if fallback also fails
                                                target.src = '/images/default-avatar.png'; // Fallback to a local default image
                                            }}
                                        />
                                        <div>
                                            <p className="font-bold">{bookingDetails.creatorDetails.fullName || 'N/A'}</p>
                                            <p className="text-sm text-gray-500">@{bookingDetails.creatorDetails.instagramUsername || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="text-sm space-y-1 text-gray-600">
                                        <p><strong>Category:</strong> {bookingDetails.creatorDetails.contentCategory || 'N/A'}</p>
                                        <p><strong>Location:</strong> {bookingDetails.creatorDetails.cityState || 'N/A'}</p>
                                        <p><strong>Followers:</strong> {parseInt(bookingDetails.creatorDetails.totalFollowers || '0').toLocaleString()}</p>
                                        <p><strong>Avg. Reel Views:</strong> {parseInt(bookingDetails.creatorDetails.avgReelViews || '0').toLocaleString()}</p>
                                        <p><strong>Avg. Story Views:</strong> {parseInt(bookingDetails.creatorDetails.storyAverageViews || '0').toLocaleString()}</p>
                                        <p><strong>Delivery Duration:</strong> {bookingDetails.creatorDetails.deliveryDuration || 'N/A'} days</p>
                                    </div>
                                </div>
                                {/* Campaign Details */}
                                <div className="p-4 border rounded-lg">
                                    <h2 className="font-bold mb-3 text-lg">Campaign Details</h2>
                                    <div className="text-sm space-y-2 text-gray-600">
                                        <p><strong>Name:</strong> {bookingDetails.campaign.name || 'N/A'}</p>
                                        <p><strong>Description:</strong> {bookingDetails.campaign.description || 'N/A'}</p>
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
                                        {renderServices(bookingDetails.services, bookingDetails.creatorDetails)}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{bookingDetails.subTotalPrice.toLocaleString('en-IN')}</span></div>
                                        <div className="flex justify-between text-sm"><span>Service Charge</span><span>₹{bookingDetails.serviceCharge.toLocaleString('en-IN')}</span></div>
                                        <div className="flex justify-between font-bold text-md pt-1 border-t mt-1"><span>Grand Total</span><span>₹{bookingDetails.grandTotalPrice.toLocaleString('en-IN')}</span></div>
                                    </div>
                                    <div className="flex justify-between text-xs items-center mt-4 bg-gray-50 p-2 rounded">
                                        <span className="font-semibold text-gray-600">Transaction ID</span>
                                        <span className="font-mono text-gray-800">{bookingDetails.transactionId || 'N/A'}</span>
                                    </div>
                                </div>
                                {/* Your Details */}
                                <div className="p-4 border rounded-lg">
                                    <h2 className="font-bold mb-3 text-lg">Your Details</h2>
                                    <div className="text-sm space-y-1 text-gray-600">
                                        <p><strong>Name:</strong> {bookingDetails.bookerDetails.fullName || 'N/A'}</p>
                                        <p><strong>Email:</strong> {bookingDetails.bookerDetails.email || 'N/A'}</p>
                                        <p><strong>Phone:</strong> {bookingDetails.bookerDetails.phoneNumber || 'N/A'}</p>
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
                            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                                {/* IMPORTANT: Ensure PAYMENT_PAGE_URL correctly redirects to initiate payment for this order_id */}
                                <Link href={PAYMENT_PAGE_URL}>Try Again</Link>
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