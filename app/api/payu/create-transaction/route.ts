import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { db as adminDb } from '@/lib/firebase/admin'; // Import db instance from admin
import * as admin from 'firebase-admin'; // Import firebase-admin for FieldValue and Timestamp

// PayU configuration from environment variables
const PAYU_KEY = process.env.PAYU_KEY;
const PAYU_SALT = process.env.PAYU_SALT;
const APP_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

// Determine PayU URL for payment initiation
const PAYU_ENV = "test"; // Keep as 'test' for development
const PAYU_URL = PAYU_ENV === "test"
    ? "https://test.payu.in/_payment"
    : "https://secure.payu.in/_payment";

export async function POST(req: NextRequest) {
    try {
        // 1. Validate Environment Variables
        if (!PAYU_KEY || !PAYU_SALT || !APP_BASE_URL) {
            console.error("Server configuration error: Missing PayU or APP_BASE_URL environment variables.");
            return NextResponse.json(
                { error: "Server configuration error. Please contact support." },
                { status: 500 }
            );
        }

        // Ensure Firebase Admin db is available
        if (!adminDb) {
            console.error("Firebase Admin SDK not initialized or database instance is null.");
            return NextResponse.json(
                { error: "Server database connection error. Please contact support." },
                { status: 500 }
            );
        }

        const { amount, productinfo, firstname, email, phone, userId } = await req.json();

        // 2. Validate Incoming Request Data
        if (!amount || !productinfo || !firstname || !email || !phone || !userId) {
            console.error("Missing required fields in request body:", { amount, productinfo, firstname, email, phone, userId });
            return NextResponse.json(
                { error: "Missing required payment details. Please provide amount, productinfo, firstname, email, phone, and userId." },
                { status: 400 } // Bad Request
            );
        }

        // Ensure amount is a string with 2 decimal places
        const formattedAmount = String(parseFloat(amount).toFixed(2));

        // Generate a unique transaction ID
        const txnid = `TXN-${userId}-${Date.now()}`;

        // 3. Construct the Hash String for One-Time Payment (as per PayU's error message)
        // Format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
        // udf1 is userId, and then 9 empty UDFs as confirmed by PayU's previous error message.
        const hashString = `${PAYU_KEY}|${txnid}|${formattedAmount}|${productinfo}|${firstname}|${email}|${userId}||||||||||${PAYU_SALT}`;
        
        console.log("String for PayU hash generation (One-Time Fix):", hashString);
        const hash = crypto.createHash("sha512").update(hashString).digest("hex");
        console.log("Generated PayU hash:", hash);

        const paymentData = {
            key: PAYU_KEY,
            txnid,
            amount: formattedAmount,
            productinfo,
            firstname,
            email,
            phone,
            surl: `${APP_BASE_URL}/api/payu/callback`, // Success URL
            furl: `${APP_BASE_URL}/api/payu/callback`, // Failure URL
            hash,
            udf1: userId, // Custom user defined field 1
            service_provider: 'payu_paisa',
        };

        // 4. Save the pending transaction to your database
        await adminDb.collection("payments").doc(txnid).set({
            ...paymentData,
            userId: userId,
            status: "pending", // Initial status for one-time payment
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Payment record for ${txnid} saved to Firestore as pending.`);

        // 5. Return payment data to the frontend for redirection to PayU
        return NextResponse.json({ ...paymentData, payu_url: PAYU_URL });

    } catch (error: any) {
        console.error("Error creating PayU transaction:", error);
        return NextResponse.json(
            { error: "Failed to create transaction on the server.", details: error.message || "Unknown error" },
            { status: 500 }
        );
    }
}
