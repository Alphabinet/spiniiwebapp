// app/api/cashfree/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const subscribeSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  userName: z.string().min(2, "Full name must be at least 2 characters."),
  userEmail: z.string().email("A valid email is required"),
  userPhone: z.string().regex(/^[6-9]\d{9}$/, "A valid 10-digit Indian mobile number is required."),
  plan: z.object({
    name: z.string(),
    amount: z.number().positive(),
  }),
});

export async function POST(req: NextRequest) {
    if (!adminDb) {
        console.error("CRITICAL: Firebase Admin SDK is not initialized.");
        return NextResponse.json({ success: false, message: 'Server configuration error.' }, { status: 500 });
    }

    try {
        const token = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!token) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }
        await adminAuth.verifyIdToken(token);
        
        const body = await req.json();
        const validatedData = subscribeSchema.parse(body);

        const { userId, userName, userEmail, userPhone, plan } = validatedData;

        const appId = process.env.CASHFREE_APP_ID;
        const secretKey = process.env.CASHFREE_SECRET_KEY;
        const apiUrl = process.env.CASHFREE_API_URL;

        if (!appId || !secretKey || !apiUrl) {
            console.error("Cashfree environment variables not set!");
            return NextResponse.json({ success: false, message: 'Payment gateway not configured.' }, { status: 500 });
        }

        const orderId = `order_${uuidv4()}`;
        
        const orderDocRef = adminDb.collection("orders").doc(orderId);
        await orderDocRef.set({
            userId: userId,
            planName: plan.name,
            amount: plan.amount,
            currency: "INR",
            status: 'PENDING',
            createdAt: FieldValue.serverTimestamp(),
        });

        const cashfreeRequest = {
            order_id: orderId,
            order_amount: plan.amount,
            order_currency: "INR",
            customer_details: {
                customer_id: userId,
                customer_name: userName,
                customer_email: userEmail,
                customer_phone: userPhone,
            },
            order_meta: {
                return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription-status?order_id={order_id}`,
            },
        };

        const cfResponse = await fetch(`${apiUrl}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-version': '2022-09-01', // Use the version for Orders API
                'x-client-id': appId,
                'x-client-secret': secretKey,
            },
            body: JSON.stringify(cashfreeRequest),
        });

        const cfData = await cfResponse.json();

        if (cfResponse.ok && cfData.payment_session_id) {
            await orderDocRef.update({
                cashfreeOrderId: cfData.order_id,
                paymentSessionId: cfData.payment_session_id,
            });

            return NextResponse.json({
                success: true,
                message: 'Payment session created.',
                // **CRITICAL CHANGE**: Use the payment_url from the order for redirect
                payment_link: cfData.order_meta.payment_url, 
            });
        } else {
            console.error("Cashfree order creation failed:", cfData);
            await orderDocRef.update({
                status: 'FAILED',
                paymentError: cfData,
            });
            return NextResponse.json({
                success: false,
                message: cfData.message || 'Failed to create payment session.',
            }, { status: cfResponse.status || 500 });
        }
    } catch (error: any) {
        console.error("API error in /api/cashfree/subscribe:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, message: error.errors[0].message }, { status: 400 });
        }
        return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
    }
}
