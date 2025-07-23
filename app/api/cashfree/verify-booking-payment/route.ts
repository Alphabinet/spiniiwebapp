import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ success: false, message: 'Firebase Admin not initialized.' }, { status: 500 });
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
        const response = await fetch(`${apiUrl}/orders/${order_id}`, { headers });
        const cashfreeOrder = await response.json();

        if (!response.ok) {
            return NextResponse.json({ success: false, message: cashfreeOrder.message || 'Failed to fetch order from Cashfree.' }, { status: response.status });
        }

        if (cashfreeOrder.order_status === 'PAID') {
            // --- Step 1: Fetch the Booking Document ---
            const bookingDocRef = adminDb.collection("bookings").doc(order_id);
            const bookingDoc = await bookingDocRef.get();

            if (!bookingDoc.exists) {
                return NextResponse.json({ success: false, message: 'Booking not found in our system.' }, { status: 404 });
            }

            const bookingData = bookingDoc.data()!;

            // --- Step 2: Update Firestore if needed (Idempotency) ---
            // This check ensures we only update if the status is not already 'PAID'
            if (bookingData.payment.status !== 'PAID') {
                await bookingDocRef.update({
                    'payment.status': 'PAID',
                    'payment.transactionId': cashfreeOrder.cf_order_id,
                    'payment.paidAt': FieldValue.serverTimestamp(),
                    'status': 'pending_approval'
                });
            }

            // --- FIX: Prepare a fully detailed response object ---
            const bookingDetailsForFrontend = {
                // Pass all the data needed for the rich confirmation screen
                creatorDetails: { // Ensure this object is populated from bookingData
                    fullName: bookingData.creatorDetails?.fullName || bookingData.creatorName,
                    profilePictureUrl: bookingData.creatorDetails?.profilePictureUrl || 'https://via.placeholder.com/64', // Fallback
                    instagramUsername: bookingData.creatorDetails?.instagramUsername,
                    instagramProfileLink: bookingData.creatorDetails?.instagramProfileLink,
                    totalFollowers: bookingData.creatorDetails?.totalFollowers,
                    avgReelViews: bookingData.creatorDetails?.avgReelViews,
                    storyAverageViews: bookingData.creatorDetails?.storyAverageViews,
                    cityState: bookingData.creatorDetails?.cityState,
                    gender: bookingData.creatorDetails?.gender,
                    contentCategory: bookingData.creatorDetails?.contentCategory,
                    contentLanguages: bookingData.creatorDetails?.contentLanguages,
                    deliveryDuration: bookingData.creatorDetails?.deliveryDuration,
                },
                bookerDetails: bookingData.bookerDetails,
                campaign: {
                    ...bookingData.campaign,
                    // Convert Firestore Timestamp back to ISO string for frontend
                    deadline: bookingData.campaign.deadline?.toDate().toISOString() || null,
                },
                services: bookingData.services,
                subTotalPrice: bookingData.subTotalPrice,
                serviceCharge: bookingData.serviceCharge,
                grandTotalPrice: bookingData.grandTotalPrice,
                transactionId: cashfreeOrder.cf_order_id,
            };

            return NextResponse.json({
                success: true,
                status: 'PAID',
                booking: bookingDetailsForFrontend
            });
        }

        // Handle other Cashfree order statuses (FAILED, PENDING, etc.)
        // You might want to update the booking status in Firestore for these cases too
        const bookingDocRef = adminDb.collection("bookings").doc(order_id);
        const bookingDoc = await bookingDocRef.get();
        if (bookingDoc.exists) {
            const currentBookingData = bookingDoc.data()!;
            if (currentBookingData.payment.status !== cashfreeOrder.order_status) {
                await bookingDocRef.update({
                    'payment.status': cashfreeOrder.order_status,
                    'payment.message': cashfreeOrder.order_status === 'FAILED' ? cashfreeOrder.order_failure_reason : `Order is ${cashfreeOrder.order_status}`,
                    'status': cashfreeOrder.order_status.toLowerCase(), // Update main status field
                });
            }
        }


        return NextResponse.json({
            success: false,
            status: cashfreeOrder.order_status,
            message: `Payment status is ${cashfreeOrder.order_status}.`
        });

    } catch (error: any) {
        console.error("Booking Verification Error:", error);
        return NextResponse.json({ success: false, message: 'Internal server error during verification.' }, { status: 500 });
    }
}