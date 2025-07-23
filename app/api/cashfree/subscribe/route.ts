// app/api/cashfree/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    try {
        const token = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!token) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        // 1. Verify user's identity from token
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (error) {
            console.error("Firebase ID Token verification failed:", error);
            return NextResponse.json({ success: false, message: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        // 2. Get required data from request body
        const { userEmail, userName, userPhone, plan, userId } = await req.json();

        if (!userEmail || !userName || !userPhone || !plan || !userId) {
            return NextResponse.json({ success: false, message: 'Missing required fields.' }, { status: 400 });
        }

        // 3. Get Cashfree credentials from environment variables
        const appId = process.env.CASHFREE_APP_ID;
        const secretKey = process.env.CASHFREE_SECRET_KEY;
        const apiUrl = process.env.CASHFREE_API_URL; // No fallback to sandbox

        if (!appId || !secretKey || !apiUrl) {
            console.error("Cashfree environment variables not set!");
            return NextResponse.json({ success: false, message: 'Payment gateway not configured.' }, { status: 500 });
        }

        // 4. Prepare order details
        const orderId = `order_${Date.now()}_${userId.substring(0, 8)}`;
        const orderAmount = plan.amount;
        const orderCurrency = "INR";

        // 5. **Best Practice:** Create a PENDING order document in Firestore first.
        // This ensures you have a record of the attempt, even if the Cashfree API call fails.
        const orderDocRef = adminDb.collection("orders").doc(orderId);
        await orderDocRef.set({
            userId: userId,
            planName: plan.name,
            amount: orderAmount,
            currency: orderCurrency,
            status: 'PENDING', // Initial status
            createdAt: FieldValue.serverTimestamp(),
        });

        // 6. Prepare payload for Cashfree
        const cashfreeRequest = {
            order_id: orderId,
            order_amount: orderAmount,
            order_currency: orderCurrency,
            customer_details: {
                customer_id: userId,
                customer_name: userName,
                customer_email: userEmail,
                customer_phone: userPhone,
            },
            order_meta: {
                return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription-status?order_id={order_id}`,
                notify_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/cashfree/webhook`,
            },
            payment_methods: ["cc", "dc", "upi", "netbanking"]
        };

        // 7. Call Cashfree to create the order
        const cfResponse = await fetch(`${apiUrl}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-version': '2022-09-01',
                'x-client-id': appId,
                'x-client-secret': secretKey,
            },
            body: JSON.stringify(cashfreeRequest),
        });

        const cfData = await cfResponse.json();

        // 8. Handle response
        if (cfResponse.ok && cfData.payment_session_id) {
            // If successful, update the order document with Cashfree's details
            await orderDocRef.update({
                cashfreeOrderId: cfData.cf_order_id,
                paymentSessionId: cfData.payment_session_id,
            });

            return NextResponse.json({
                success: true,
                message: 'Payment session created.',
                payment_session_id: cfData.payment_session_id,
                order_id: orderId,
            });
        } else {
            // If Cashfree fails, update the order to reflect the failure
            console.error("Cashfree order creation failed:", cfData);
            await orderDocRef.update({
                status: 'FAILED',
                paymentError: cfData,
            });

            return NextResponse.json({
                success: false,
                message: cfData.message || 'Failed to create payment session with Cashfree.',
                code: cfData.code || 'cashfree_order_creation_failed'
            }, { status: cfResponse.status || 500 });
        }

    } catch (error: any) {
        console.error("API error in /api/cashfree/subscribe:", error);
        return NextResponse.json({ success: false, message: 'Internal server error.', error: error.message }, { status: 500 });
    }
}
