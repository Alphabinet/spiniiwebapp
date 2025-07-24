// app/api/cashfree/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Define the expected shape of the incoming request body with Zod
const subscribeSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  userName: z.string().min(2, "Full name is required and must be at least 2 characters."),
  userEmail: z.string().email("A valid email is required"),
  // Using a regex for Indian mobile numbers
  userPhone: z.string().regex(/^[6-9]\d{9}$/, "A valid 10-digit Indian mobile number is required."),
  plan: z.object({
    name: z.string(),
    amount: z.number().positive("Amount must be positive"),
  }),
});

export async function POST(req: NextRequest) {
    try {
        const token = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!token) {
            return NextResponse.json({ success: false, message: 'Unauthorized: No token provided.' }, { status: 401 });
        }

        // 1. Verify user's identity from token
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (error) {
            console.error("Firebase ID Token verification failed:", error);
            return NextResponse.json({ success: false, message: 'Unauthorized: Invalid token.' }, { status: 401 });
        }
        
        const body = await req.json();
        
        // 2. Validate the request body using Zod
        const validationResult = subscribeSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({ success: false, message: validationResult.error.errors[0].message }, { status: 400 });
        }

        const { userEmail, userName, userPhone, plan, userId } = validationResult.data;
        
        // 3. Get Cashfree credentials from environment variables
        const appId = process.env.CASHFREE_APP_ID;
        const secretKey = process.env.CASHFREE_SECRET_KEY;
        const apiUrl = process.env.CASHFREE_API_URL;

        if (!appId || !secretKey || !apiUrl) {
            console.error("Cashfree environment variables not set!");
            return NextResponse.json({ success: false, message: 'Payment gateway not configured.' }, { status: 500 });
        }

        // 4. Prepare link details
        const linkId = `link_${uuidv4()}`;
        
        // 5. Create a PENDING order document in Firestore first.
        const orderDocRef = adminDb.collection("orders").doc(linkId);
        await orderDocRef.set({
            userId: userId,
            planName: plan.name,
            amount: plan.amount,
            currency: "INR",
            status: 'PENDING',
            createdAt: FieldValue.serverTimestamp(),
        });

        // 6. Prepare payload for Cashfree Payment Link API
        const cashfreeRequest = {
            link_id: linkId,
            link_amount: plan.amount,
            link_currency: "INR",
            link_purpose: `Subscription for ${plan.name}`,
            customer_details: {
                customer_phone: userPhone,
                customer_email: userEmail,
                customer_name: userName,
            },
            link_notify: {
                send_sms: true,
                send_email: true,
            },
            link_meta: {
                return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription-status?link_id={link_id}`,
                notify_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/cashfree/webhook`,
            },
        };

        // 7. Call Cashfree to create the payment link
        const cfResponse = await fetch(`${apiUrl}/links`, { // <-- IMPORTANT: Using /links endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-version': '2023-08-01', // Use the latest recommended version for links
                'x-client-id': appId,
                'x-client-secret': secretKey,
            },
            body: JSON.stringify(cashfreeRequest),
        });

        const cfData = await cfResponse.json();

        // 8. Handle response from Cashfree
        if (cfResponse.ok && cfData.link_url) {
            await orderDocRef.update({
                cashfreeLinkId: cfData.link_id,
                paymentLink: cfData.link_url,
            });

            return NextResponse.json({
                success: true,
                message: 'Payment link created.',
                payment_link: cfData.link_url, // <-- Send this back to the frontend
            });
        } else {
            console.error("Cashfree link creation failed:", cfData);
            await orderDocRef.update({
                status: 'FAILED',
                paymentError: cfData,
            });

            return NextResponse.json({
                success: false,
                message: cfData.message || 'Failed to create payment link with Cashfree.',
            }, { status: cfResponse.status || 500 });
        }

    } catch (error: any) {
        console.error("API error in /api/cashfree/subscribe:", error);
        return NextResponse.json({ success: false, message: 'Internal server error.', error: error.message }, { status: 500 });
    }
}
