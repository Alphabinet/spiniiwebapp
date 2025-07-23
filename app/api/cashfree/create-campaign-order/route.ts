import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { adminDb, adminAuth } from '@/lib/firebase/admin'; // Ensure you have this admin setup
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    if (!adminDb || !adminAuth) {
        console.error("Firebase Admin not initialized.");
        return NextResponse.json({ success: false, message: 'Internal Server Error: Firebase Admin not initialized.' }, { status: 500 });
    }

    try {
        // 1. Verify user's identity from the token
        const authorization = req.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, message: 'Unauthorized: No token provided.' }, { status: 401 });
        }
        const token = authorization.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;

        // 2. Get Cashfree credentials from environment variables
        const appId = process.env.CASHFREE_APP_ID;
        const secretKey = process.env.CASHFREE_SECRET_KEY;
        const apiUrl = process.env.CASHFREE_API_URL;
        if (!appId || !secretKey) {
            console.error("Cashfree credentials are not configured in .env.local");
            return NextResponse.json({ success: false, message: 'Payment gateway not configured.' }, { status: 500 });
        }

        // 3. Get campaign data from the request body
        const { campaignData, costs } = await req.json();
        const { totalAmount } = costs;
        const order_id = `CAMP_${uuidv4()}`;

        // 4. Create a PENDING campaign document in Firestore first
        // This is crucial for tracking and reconciliation.
        const campaignDocRef = adminDb.collection("campaigns").doc(order_id);
        await campaignDocRef.set({
            ...campaignData,
            orderId: order_id,
            userId: userId,
            costs: costs,
            payment: {
                status: 'PENDING',
                amount: totalAmount,
                currency: 'INR'
            },
            status: 'pending_payment', // Overall campaign status
            createdAt: FieldValue.serverTimestamp(),
        });

        // 5. Prepare the payload for Cashfree
        const cashfreePayload = {
            customer_details: {
                customer_id: userId,
                customer_email: campaignData.ownerEmailAddress,
                customer_phone: campaignData.contactNumber,
                customer_name: campaignData.ownerFullName,
            },
            order_meta: {
                // IMPORTANT: Create a dedicated status page for the user to land on after payment
                return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/campaign-status?order_id={order_id}`,
            },
            order_id: order_id,
            order_amount: totalAmount,
            order_currency: 'INR',
            order_note: `Campaign: ${campaignData.campaignName}`,
        };

        // 6. Call Cashfree to create the order
        const headers = {
            'Content-Type': 'application/json',
            'x-api-version': '2022-09-01', // Use a recent, valid API version
            'x-client-id': appId,
            'x-client-secret': secretKey,
        };

        const response = await fetch(`${apiUrl}/orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify(cashfreePayload),
        });

        const responseData = await response.json();

        // 7. Handle the response from Cashfree
        if (response.ok && responseData.payment_session_id) {
            // Success: Return the session ID to the frontend
            return NextResponse.json({ success: true, ...responseData });
        } else {
            // Failure: Update the Firestore document and return an error
            console.error("Cashfree API Error:", responseData);
            await campaignDocRef.update({
                'payment.status': 'FAILED',
                'payment.error': responseData,
                'status': 'failed',
            });
            return NextResponse.json({ success: false, ...responseData }, { status: response.status });
        }
    } catch (error: any) {
        console.error("Create Campaign Order API Error:", error);
        // Handle specific errors like token verification failure
        if (error.code === 'auth/id-token-expired') {
            return NextResponse.json({ success: false, message: 'Authentication token expired. Please log in again.' }, { status: 401 });
        }
        return NextResponse.json({ success: false, message: 'An internal server error occurred.' }, { status: 500 });
    }
}
