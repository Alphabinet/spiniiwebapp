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
        // --- FIX: Expect order_id, which matches the subscribe route ---
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

        // --- FIX: Use the correct endpoint for fetching an Order ---
        const headers = {
            'Content-Type': 'application/json',
            'x-api-version': '2022-09-01', // Match the version used for order creation
            'x-client-id': appId,
            'x-client-secret': secretKey,
        };
        const response = await fetch(`${apiUrl}/orders/${order_id}`, { headers });
        const cashfreeOrder = await response.json();

        if (!response.ok) {
            return NextResponse.json({ success: false, message: 'Failed to fetch order from Cashfree.' }, { status: 404 });
        }

        // --- FIX: Check order_status, not link_status ---
        if (cashfreeOrder.order_status === 'PAID') {
            const orderDocRef = adminDb.collection("orders").doc(order_id);
            const orderDoc = await orderDocRef.get();

            if (orderDoc.exists && orderDoc.data()?.status !== 'PAID') {
                const userId = orderDoc.data()?.userId;
                
                const userDocRef = adminDb.collection("users").doc(userId);
                const creatorAppId = await getCreatorApplicationId(userId);

                const expiryDate = new Date();
                expiryDate.setMonth(expiryDate.getMonth() + 1);

                const subscriptionData = {
                    subscriptionStatus: 'active',
                    subscriptionExpiresAt: Timestamp.fromDate(expiryDate),
                    updatedAt: FieldValue.serverTimestamp()
                };

                const batch = adminDb.batch();
                batch.update(userDocRef, subscriptionData);
                if (creatorAppId) {
                    const creatorDocRef = adminDb.collection("creatorApplications").doc(creatorAppId);
                    batch.update(creatorDocRef, subscriptionData);
                }
                
                batch.update(orderDocRef, {
                    status: 'PAID',
                    cashfreePaymentId: cashfreeOrder.cf_order_id, // Store relevant order data
                    paidAt: FieldValue.serverTimestamp(),
                });

                await batch.commit();

                return NextResponse.json({ success: true, status: 'PAID' });
            } else if (orderDoc.exists && orderDoc.data()?.status === 'PAID') {
                 return NextResponse.json({ success: true, status: 'PAID', message: 'Already verified.' });
            }
        }

        return NextResponse.json({ success: false, status: cashfreeOrder.order_status });

    } catch (error: any) {
        console.error("Verification Error:", error);
        return NextResponse.json({ success: false, message: 'Internal server error during verification.' }, { status: 500 });
    }
}
