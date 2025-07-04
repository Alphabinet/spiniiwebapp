// app/api/razorpay/create-subscription/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: NextRequest) {
    try {
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });

        // Get both userId and planId from the request
        const { userId, planId } = await req.json();

        // Add validation for the planId
        if (!userId || !planId) {
            return NextResponse.json({ error: 'User ID and Plan ID are required' }, { status: 400 });
        }

        const subscriptionOptions = {
            // Use the dynamic planId here
            plan_id: planId, 
            total_count: 120,
            quantity: 1,
            notes: {
                firebase_user_id: userId,
            },
        };

        const subscription = await razorpay.subscriptions.create(subscriptionOptions);

        return NextResponse.json(subscription);

    } catch (error) {
        console.error('Failed to create subscription:', error);
        return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
    }
}