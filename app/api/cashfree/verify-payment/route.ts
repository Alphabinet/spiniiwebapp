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
        // --- FIX: Expect link_id, not order_id ---
        const { link_id } = await req.json();
        if (!link_id) {
            return NextResponse.json({ success: false, message: 'Payment Link ID is required.' }, { status: 400 });
        }

        // 1. Get credentials
        const appId = process.env.CASHFREE_APP_ID;
        const secretKey = process.env.CASHFREE_SECRET_KEY;
        const apiUrl = process.env.CASHFREE_API_URL;

        if (!appId || !secretKey || !apiUrl) {
            return NextResponse.json({ success: false, message: 'Payment gateway not configured.' }, { status: 500 });
        }

        // 2. Fetch payment link status from Cashfree's server
        const headers = {
            'Content-Type': 'application/json',
            'x-api-version': '2023-08-01', // Match the version used for link creation
            'x-client-id': appId,
            'x-client-secret': secretKey,
        };
        // --- FIX: Use the correct endpoint for fetching link status ---
        const response = await fetch(`${apiUrl}/links/${link_id}/status`, { headers });
        const cashfreeLink = await response.json();

        if (!response.ok) {
            return NextResponse.json({ success: false, message: 'Failed to fetch payment link from Cashfree.' }, { status: 404 });
        }

        // 3. Verify the payment status from Cashfree's response
        if (cashfreeLink.link_status === 'PAID') {
            const orderDocRef = adminDb.collection("orders").doc(link_id);
            const orderDoc = await orderDocRef.get();

            // Check if the order exists and hasn't already been processed
            if (orderDoc.exists && orderDoc.data()?.status !== 'PAID') {
                const userId = orderDoc.data()?.userId;
                
                // 4. Update Firestore using the ADMIN SDK
                const userDocRef = adminDb.collection("users").doc(userId);
                const creatorAppId = await getCreatorApplicationId(userId);

                const expiryDate = new Date();
                expiryDate.setMonth(expiryDate.getMonth() + 1); // 1-month subscription

                const subscriptionData = {
                    subscriptionStatus: 'active',
                    subscriptionExpiresAt: Timestamp.fromDate(expiryDate),
                    updatedAt: FieldValue.serverTimestamp()
                };

                // Use a batch to update multiple documents atomically
                const batch = adminDb.batch();
                batch.update(userDocRef, subscriptionData);
                if (creatorAppId) {
                    const creatorDocRef = adminDb.collection("creatorApplications").doc(creatorAppId);
                    batch.update(creatorDocRef, subscriptionData);
                }
                
                batch.update(orderDocRef, {
                    status: 'PAID',
                    cashfreePaymentDetails: {
                        cf_link_id: cashfreeLink.cf_link_id,
                        link_status: cashfreeLink.link_status,
                        link_payment_id: cashfreeLink.link_payment_id,
                    },
                    paidAt: FieldValue.serverTimestamp(),
                });

                await batch.commit();

                return NextResponse.json({ success: true, status: 'PAID' });
            } else if (orderDoc.exists && orderDoc.data()?.status === 'PAID') {
                 return NextResponse.json({ success: true, status: 'PAID', message: 'Already verified.' });
            }
        }

        // If status is not PAID, return the current status
        return NextResponse.json({ success: false, status: cashfreeLink.link_status });

    } catch (error: any) {
        console.error("Verification Error:", error);
        return NextResponse.json({ success: false, message: 'Internal server error during verification.' }, { status: 500 });
    }
}
