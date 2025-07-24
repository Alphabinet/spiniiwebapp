// api/cashfree/verify-booking-payment.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore'; // Import Timestamp

// Define a type for your Firestore Booking Document for better type safety
interface FirestoreBookingData {
    creatorDetails?: {
        fullName?: string;
        profilePictureUrl?: string;
        instagramUsername?: string;
        instagramProfileLink?: string;
        totalFollowers?: string;
        avgReelViews?: string;
        storyAverageViews?: string;
        cityState?: string;
        gender?: string;
        contentCategory?: string;
        contentLanguages?: string[];
        deliveryDuration?: string; // Assuming string like "5" or "5 days"
    };
    creatorName?: string; // Old field, if any
    bookerDetails: {
        fullName: string;
        email: string;
        phoneNumber: string;
    };
    campaign: {
        name: string;
        description: string;
        deadline?: Timestamp | null; // Firebase Timestamp
        demoVideoUrl?: string;
    };
    services: {
        reels: number;
        story: number;
        reelsStory: number;
    };
    subTotalPrice: number;
    serviceCharge: number;
    grandTotalPrice: number;
    payment: {
        status: string;
        transactionId?: string;
        paidAt?: Timestamp;
        message?: string; // To store Cashfree failure reason or general message
    };
    status: string; // Main booking status (e.g., 'pending_payment', 'pending_approval', 'failed')
    // Add other fields from your booking document
}

export async function POST(req: NextRequest) {
    if (!adminDb) {
        console.error("Firebase Admin not initialized.");
        return NextResponse.json({ success: false, message: 'Server configuration error.' }, { status: 500 });
    }

    try {
        const { order_id } = await req.json();
        if (!order_id) {
            return NextResponse.json({ success: false, message: 'Order ID is required.' }, { status: 400 });
        }

        const appId = process.env.CASHFREE_APP_ID;
        const secretKey = process.env.CASHFREE_SECRET_KEY;
        const apiUrl = process.env.CASHFREE_API_URL;

        if (!appId || !secretKey || !apiUrl) {
            console.error("Cashfree environment variables are not set.");
            return NextResponse.json({ success: false, message: 'Payment gateway not configured.' }, { status: 500 });
        }

        const headers = {
            'x-api-version': '2022-09-01',
            'x-client-id': appId,
            'x-client-secret': secretKey,
            'Content-Type': 'application/json'
        };

        const cashfreeResponse = await fetch(`${apiUrl}/orders/${order_id}`, { headers });
        const cashfreeOrder = await cashfreeResponse.json();

        if (!cashfreeResponse.ok) {
            console.error(`Cashfree API error for order ${order_id}:`, cashfreeOrder);
            return NextResponse.json({ success: false, message: cashfreeOrder.message || 'Failed to fetch order details from payment gateway.' }, { status: cashfreeResponse.status });
        }

        const bookingDocRef = adminDb.collection("bookings").doc(order_id);
        const bookingDoc = await bookingDocRef.get();

        if (!bookingDoc.exists) {
            console.warn(`Booking document not found for order ID: ${order_id}`);
            return NextResponse.json({ success: false, message: 'Booking not found in our system.' }, { status: 404 });
        }

        const bookingData = bookingDoc.data() as FirestoreBookingData; // Type assertion here

        // Determine the new payment status and main booking status based on Cashfree response
        let newPaymentStatus: string;
        let newBookingMainStatus: string;
        let paymentMessage: string | undefined;

        switch (cashfreeOrder.order_status) {
            case 'PAID':
                newPaymentStatus = 'PAID';
                newBookingMainStatus = 'pending_approval'; // Or 'completed', depending on your workflow
                paymentMessage = 'Payment successful.';
                break;
            case 'FAILED':
                newPaymentStatus = 'FAILED';
                newBookingMainStatus = 'payment_failed';
                paymentMessage = cashfreeOrder.order_failure_reason || 'Payment failed due to an unknown reason.';
                break;
            case 'PENDING':
                newPaymentStatus = 'PENDING';
                newBookingMainStatus = 'pending_payment'; // Keep as pending
                paymentMessage = 'Payment is pending.';
                break;
            case 'CANCELLED': // If Cashfree supports this status for direct cancellation
                newPaymentStatus = 'CANCELLED';
                newBookingMainStatus = 'cancelled';
                paymentMessage = 'Payment was cancelled.';
                break;
            default:
                newPaymentStatus = cashfreeOrder.order_status;
                newBookingMainStatus = 'unknown_status'; // Fallback for unexpected statuses
                paymentMessage = `Payment is in an unexpected state: ${cashfreeOrder.order_status}`;
                break;
        }

        // --- Update Firestore based on determined status ---
        if (bookingData.payment.status !== newPaymentStatus) {
            const updatePayload: any = {
                'payment.status': newPaymentStatus,
                'payment.message': paymentMessage,
                'status': newBookingMainStatus,
                'updatedAt': FieldValue.serverTimestamp(), // Always update updatedAt
            };

            if (newPaymentStatus === 'PAID') {
                updatePayload['payment.transactionId'] = cashfreeOrder.cf_order_id;
                updatePayload['payment.paidAt'] = FieldValue.serverTimestamp();
            } else {
                // Clear transactionId if it's not PAID (e.g., if retrying)
                updatePayload['payment.transactionId'] = FieldValue.delete(); 
                updatePayload['payment.paidAt'] = FieldValue.delete();
            }

            await bookingDocRef.update(updatePayload);
            console.log(`Booking ${order_id} updated to status: ${newBookingMainStatus}`);
        } else {
            console.log(`Booking ${order_id} payment status is already ${newPaymentStatus}, no update needed.`);
        }

        // --- Prepare response for frontend ---
        if (newPaymentStatus === 'PAID') {
            const bookingDetailsForFrontend = {
                creatorDetails: {
                    fullName: bookingData.creatorDetails?.fullName || bookingData.creatorName || '',
                    profilePictureUrl: bookingData.creatorDetails?.profilePictureUrl || '/images/default-avatar.png', // Use a local default if available
                    instagramUsername: bookingData.creatorDetails?.instagramUsername || '',
                    // instagramProfileLink: bookingData.creatorDetails?.instagramProfileLink, // Frontend doesn't use this directly on confirmation page
                    totalFollowers: bookingData.creatorDetails?.totalFollowers || '0',
                    avgReelViews: bookingData.creatorDetails?.avgReelViews || '0',
                    storyAverageViews: bookingData.creatorDetails?.storyAverageViews || '0',
                    cityState: bookingData.creatorDetails?.cityState || '',
                    // gender: bookingData.creatorDetails?.gender, // Frontend doesn't use this
                    contentCategory: bookingData.creatorDetails?.contentCategory || '',
                    // contentLanguages: bookingData.creatorDetails?.contentLanguages, // Frontend doesn't use this
                    deliveryDuration: bookingData.creatorDetails?.deliveryDuration || 'N/A',
                },
                bookerDetails: bookingData.bookerDetails,
                campaign: {
                    name: bookingData.campaign.name,
                    description: bookingData.campaign.description,
                    deadline: bookingData.campaign.deadline?.toDate().toISOString() || null,
                    // demoVideoUrl: bookingData.campaign.demoVideoUrl, // If frontend needs it
                },
                services: bookingData.services,
                subTotalPrice: bookingData.subTotalPrice,
                serviceCharge: bookingData.serviceCharge,
                grandTotalPrice: bookingData.grandTotalPrice,
                transactionId: cashfreeOrder.cf_order_id,
            };

            return NextResponse.json({
                success: true,
                status: newPaymentStatus,
                message: 'Payment successfully verified and booking confirmed!',
                booking: bookingDetailsForFrontend
            });
        } else {
            // For FAILED, PENDING, or other statuses
            return NextResponse.json({
                success: false,
                status: newPaymentStatus,
                message: paymentMessage || `Payment status is ${newPaymentStatus}. Please check and try again.`
            });
        }

    } catch (error: any) {
        console.error("Booking Verification Error:", error);
        return NextResponse.json({ success: false, message: 'Internal server error during payment verification.' }, { status: 500 });
    }
}