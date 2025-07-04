// app/api/razorpay/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
    const text = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Signature missing' }, { status: 400 });
    }

    // 1. Verify the webhook signature for security
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(text);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== signature) {
        console.error('Webhook signature verification failed.');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    try {
        const event = JSON.parse(text);

        // 2. Handle the "subscription.charged" event for recurring payments
        if (event.event === 'subscription.charged') {
            const subscription = event.payload.subscription.entity;
            const userId = subscription.notes.firebase_user_id;

            if (userId) {
                // Find the user's application document via their userId
                const q = query(collection(db, "creatorApplications"), where("userId", "==", userId));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const docId = querySnapshot.docs[0].id;

                    // Calculate the new expiry date (one month from now)
                    const newExpiryDate = new Date();
                    newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);

                    // Update the document with the new status and expiry date
                    await updateDoc(doc(db, "creatorApplications", docId), {
                        subscriptionStatus: 'active',
                        subscriptionExpiresAt: newExpiryDate,
                    });
                }
            }
        }

        // You can handle other events like 'subscription.cancelled' here

        return NextResponse.json({ status: 'ok' });

    } catch (error) {
        console.error('Error processing webhook:', error);
        return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
    }
}