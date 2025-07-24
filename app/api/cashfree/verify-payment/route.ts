// app/api/cashfree/verify-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin'; 
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// Helper function to find the creator application document ID for a given user
async function getCreatorApplicationId(userId: string): Promise<string | null> {
    if (!adminDb) return null;
    const creatorAppsRef = adminDb.collection("creatorApplications");
    const q = creatorAppsRef.where("userId", "==", userId).limit(1);
    const querySnapshot = await q.get();
    
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
    }
    return null;
}

export async function POST(req: NextRequest) {
    if (!adminDb) {
        console.error("CRITICAL: Firebase Admin SDK is not initialized in verify-payment route.");
        return NextResponse.json({ success: false, message: 'Server configuration error.' }, { status: 500 });
    }

    try {
        // Expect order_id, which matches the subscribe route's return_url parameter
        const { order_id } = await req.json();
        if (!order_id) {
            return NextResponse.json({ success: false, message: 'Order ID is required.' }, { status: 400 });
        }

        const appId = process.env.CASHFREE_APP_ID;
        const secretKey = process.env.CASHFREE_SECRET_KEY;
        const apiUrl = process.env.CASHFREE_API_URL;

        if (!appId || !secretKey || !apiUrl) {
            return NextResponse.json({ success: false, message: 'Payment gateway not configured.' }, { status: 500 });
        }

        // Use the correct endpoint for fetching an Order status from Cashfree
        const headers = {
            'Content-Type': 'application/json',
            'x-api-version': '2022-09-01', // Match the API version used for order creation in subscribe route
            'x-client-id': appId,
            'x-client-secret': secretKey,
        };
        const response = await fetch(`${apiUrl}/orders/${order_id}`, { headers });
        const cashfreeOrder = await response.json();

        if (!response.ok) {
            console.error("Cashfree API error:", cashfreeOrder);
            return NextResponse.json({ success: false, message: 'Failed to fetch order from Cashfree.' }, { status: response.status });
        }

        // Check the 'order_status' field from Cashfree's response
        if (cashfreeOrder.order_status === 'PAID') {
            const orderDocRef = adminDb.collection("orders").doc(order_id);
            const orderDoc = await orderDocRef.get();

            // Only update if the order exists and has not been marked as PAID yet
            if (orderDoc.exists && orderDoc.data()?.status !== 'PAID') {
                const userId = orderDoc.data()?.userId;
                
                const userDocRef = adminDb.collection("users").doc(userId);
                const creatorAppId = await getCreatorApplicationId(userId);

                const expiryDate = new Date();
                expiryDate.setMonth(expiryDate.getMonth() + 1); // Set subscription to expire in 1 month

                const subscriptionData = {
                    subscriptionStatus: 'active',
                    subscriptionExpiresAt: Timestamp.fromDate(expiryDate),
                    updatedAt: FieldValue.serverTimestamp() // Update timestamp
                };

                const batch = adminDb.batch();
                batch.update(userDocRef, subscriptionData); // Update user's subscription status
                if (creatorAppId) {
                    const creatorDocRef = adminDb.collection("creatorApplications").doc(creatorAppId);
                    batch.update(creatorDocRef, subscriptionData); // Update creator app's status if applicable
                }
                
                batch.update(orderDocRef, {
                    status: 'PAID',
                    cashfreePaymentId: cashfreeOrder.cf_order_id, // Store Cashfree's payment ID
                    paidAt: FieldValue.serverTimestamp(), // Timestamp when payment was confirmed
                });

                await batch.commit(); // Commit all batch updates

                return NextResponse.json({ success: true, status: 'PAID' });
            } else if (orderDoc.exists && orderDoc.data()?.status === 'PAID') {
                // If order already exists and is marked PAID, simply return success
                return NextResponse.json({ success: true, status: 'PAID', message: 'Already verified.' });
            }
        }

        // If Cashfree order status is not PAID, return its status
        return NextResponse.json({ success: false, status: cashfreeOrder.order_status, message: `Payment status: ${cashfreeOrder.order_status}` });

    } catch (error: any) {
        console.error("Verification Error:", error);
        return NextResponse.json({ success: false, message: 'Internal server error during verification.' }, { status: 500 });
    }
}
