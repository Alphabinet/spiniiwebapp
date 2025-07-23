import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    if (!adminDb || !adminAuth) {
        return NextResponse.json({ success: false, message: 'Firebase Admin not initialized.' }, { status: 500 });
    }

    try {
        // 1. Verify user's identity from token
        const authorization = req.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }
        const token = authorization.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;

        // 2. Get credentials
        const appId = process.env.CASHFREE_APP_ID;
        const secretKey = process.env.CASHFREE_SECRET_KEY;
        const apiUrl = process.env.CASHFREE_API_URL;

        if (!appId || !secretKey || !apiUrl) {
            return NextResponse.json({ success: false, message: 'Payment gateway not configured.' }, { status: 500 });
        }

        // 3. Get booking data from request
        const { bookingPayload } = await req.json();
        const order_id = `BOOK_${uuidv4()}`;

        // --- FIX: Convert deadline string to Firestore Timestamp ---
        const campaignWithTimestamp = {
            ...bookingPayload.campaign,
            // Convert ISO string back to a Date, then to a Firestore Timestamp
            deadline: bookingPayload.campaign.deadline
                ? Timestamp.fromDate(new Date(bookingPayload.campaign.deadline))
                : null,
        };

        // 4. Prepare payload for Cashfree
        const cashfreePayload = {
            customer_details: {
                customer_id: userId,
                customer_email: bookingPayload.bookerDetails.email,
                customer_phone: bookingPayload.bookerDetails.phoneNumber,
                customer_name: bookingPayload.bookerDetails.fullName,
            },
            order_meta: {
                return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking-status?order_id={order_id}`,
            },
            order_id: order_id,
            order_amount: bookingPayload.grandTotalPrice,
            order_currency: 'INR',
            order_note: `Booking for creator: ${bookingPayload.creatorName}`,
        };

        // 5. Create a PENDING booking document in Firestore
        const bookingDocRef = adminDb.collection("bookings").doc(order_id);
        // The spread operator will now automatically include the 'creatorDetails' object
        await bookingDocRef.set({
            ...bookingPayload, // This now includes 'creatorDetails'
            campaign: campaignWithTimestamp, // Use the corrected campaign object
            orderId: order_id,
            userId: userId,
            payment: {
                status: 'PENDING',
                // --- FIX: Store the amount in the payment object ---
                amount: bookingPayload.grandTotalPrice,
                currency: 'INR'
            },
            // --- FIX: Explicitly save pricing details at the top level ---
            subTotalPrice: bookingPayload.subTotalPrice,
            serviceCharge: bookingPayload.serviceCharge,
            grandTotalPrice: bookingPayload.grandTotalPrice,
            status: 'pending_payment', // More descriptive initial status
            createdAt: FieldValue.serverTimestamp(),
        });

        // 6. Call Cashfree to create the order
        const headers = {
            'Content-Type': 'application/json',
            'x-api-version': '2022-09-01',
            'x-client-id': appId,
            'x-client-secret': secretKey,
        };
        const response = await fetch(`${apiUrl}/orders`, {
            method: 'POST', headers, body: JSON.stringify(cashfreePayload),
        });
        const responseData = await response.json();

        // 7. Handle response
        if (response.ok && responseData.payment_session_id) {
            return NextResponse.json({ success: true, ...responseData });
        } else {
            // If Cashfree fails, update the booking to reflect the failure
            await bookingDocRef.update({
                'payment.status': 'FAILED',
                'payment.error': responseData,
                'status': 'failed',
            });
            return NextResponse.json({ success: false, ...responseData }, { status: response.status });
        }
    } catch (error: any) {
        console.error("Create Booking Order API Error:", error);
        return NextResponse.json({ success: false, message: 'An internal server error occurred.' }, { status: 500 });
    }
}