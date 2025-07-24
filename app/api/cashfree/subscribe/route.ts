// app/api/cashfree/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod'; // Import Zod for validation

// Define a strict schema for the incoming request body.
// This ensures all required fields are present and correctly formatted.
const subscribeSchema = z.object({
    userId: z.string().min(1, "User ID cannot be empty."),
    userName: z.string().min(2, "A full name is required."),
    userEmail: z.string().email("A valid email address is required."),
    // This regex validates a standard 10-digit Indian mobile number.
    userPhone: z.string().regex(/^[6-9]\d{9}$/, "A valid 10-digit mobile number is required."),
    plan: z.object({
        name: z.string().min(1, "Plan name is required."),
        amount: z.number().positive("Plan amount must be a positive number."),
    }),
});


export async function POST(req: NextRequest) {
    try {
        const token = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!token) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        // 1. Verify user's identity from token
        try {
            await adminAuth.verifyIdToken(token);
        } catch (error) {
            console.error("Firebase ID Token verification failed:", error);
            return NextResponse.json({ success: false, message: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        // 2. Parse and VALIDATE the request body using the Zod schema
        const body = await req.json();
        const validation = subscribeSchema.safeParse(body);

        if (!validation.success) {
            // If validation fails, return a specific error message from Zod.
            return NextResponse.json({
                success: false,
                message: validation.error.errors[0].message, // e.g., "A valid 10-digit mobile number is required."
            }, { status: 400 });
        }

        // Use the validated data from this point forward
        const { userEmail, userName, userPhone, plan, userId } = validation.data;

        // 3. Get Cashfree credentials from environment variables
        const appId = process.env.CASHFREE_APP_ID;
        const secretKey = process.env.CASHFREE_SECRET_KEY;
        const apiUrl = process.env.CASHFREE_API_URL;

        if (!appId || !secretKey || !apiUrl) {
            console.error("Cashfree environment variables not set!");
            return NextResponse.json({ success: false, message: 'Payment gateway not configured.' }, { status: 500 });
        }

        // 4. Prepare order details
        const orderId = `order_${Date.now()}_${userId.substring(0, 8)}`;
        const orderAmount = plan.amount;
        const orderCurrency = "INR";

        // 5. Create a PENDING order document in Firestore first.
        const orderDocRef = adminDb.collection("orders").doc(orderId);
        await orderDocRef.set({
            userId: userId,
            planName: plan.name,
            amount: orderAmount,
            currency: orderCurrency,
            status: 'PENDING',
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
            console.error("Cashfree order creation failed:", cfData);
            await orderDocRef.update({
                status: 'FAILED',
                paymentError: cfData,
            });

            return NextResponse.json({
                success: false,
                message: cfData.message || 'Failed to create payment session with Cashfree.',
            }, { status: cfResponse.status || 500 });
        }

    } catch (error: any) {
        console.error("API error in /api/cashfree/subscribe:", error);
        return NextResponse.json({ success: false, message: 'Internal server error.', error: error.message }, { status: 500 });
    }
}