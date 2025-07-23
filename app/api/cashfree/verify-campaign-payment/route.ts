import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    // Check if Firebase Admin is initialized
    if (!adminDb) {
        console.error("Firebase Admin SDK is not initialized.");
        return NextResponse.json({ success: false, message: 'Internal Server Error: Firebase Admin not initialized.' }, { status: 500 });
    }

    try {
        // 1. Get the order_id from the request body
        const { order_id } = await req.json();
        if (!order_id) {
            return NextResponse.json({ success: false, message: 'Order ID is required.' }, { status: 400 });
        }

        // 2. Get Cashfree credentials from environment variables
        const appId = process.env.CASHFREE_APP_ID;
        const secretKey = process.env.CASHFREE_SECRET_KEY;
        // --- FIX: Removed the dangerous fallback to the sandbox URL ---
        const apiUrl = process.env.CASHFREE_API_URL;

        if (!appId || !secretKey || !apiUrl) {
            console.error("Cashfree API credentials are not set in environment variables.");
            return NextResponse.json({ success: false, message: 'Payment gateway is not configured.' }, { status: 500 });
        }

        // 3. Prepare headers for the Cashfree API call
        const headers = {
            'accept': 'application/json',
            'x-api-version': '2022-09-01',
            'x-client-id': appId,
            'x-client-secret': secretKey,
        };
        
        // 4. Fetch the order status from Cashfree's server
        const response = await fetch(`${apiUrl}/orders/${order_id}`, { method: 'GET', headers });
        const cashfreeOrder = await response.json();

        if (!response.ok) {
            console.error("Failed to fetch order from Cashfree:", cashfreeOrder);
            return NextResponse.json({ success: false, message: 'Failed to fetch order details from payment gateway.' }, { status: response.status });
        }

        // 5. If payment was successful, update the database
        if (cashfreeOrder.order_status === 'PAID') {
            const campaignDocRef = adminDb.collection("campaigns").doc(order_id);
            const campaignDoc = await campaignDocRef.get();

            // IMPORTANT: Check if the document exists and hasn't already been marked as PAID.
            if (campaignDoc.exists && campaignDoc.data()?.payment.status !== 'PAID') {
                await campaignDocRef.update({
                    'payment.status': 'PAID',
                    'payment.details': cashfreeOrder,
                    'status': 'pending_review',
                    'paidAt': FieldValue.serverTimestamp(),
                });
            }
            // Return a success response to the frontend
            return NextResponse.json({ success: true, status: 'PAID' });
        }

        // 6. If payment was not successful, return the current status from Cashfree
        return NextResponse.json({ success: false, status: cashfreeOrder.order_status, message: `Payment status is: ${cashfreeOrder.order_status}` });

    } catch (error: any) {
        console.error("Campaign Verification API Error:", error);
        return NextResponse.json({ success: false, message: 'An internal server error occurred during payment verification.' }, { status: 500 });
    }
}
