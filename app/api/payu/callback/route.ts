/**
 * API Route: /api/payu/callback
 *
 * This is the final, corrected version of the PayU callback handler.
 * It correctly verifies the response hash from PayU, updates the database,
 * and securely redirects the user.
 *
 * File: app/api/payu/callback/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { db as adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';

// --- PayU Configuration ---
// These MUST match the values in your create-transaction route and .env.local file
const PAYU_KEY = process.env.PAYU_KEY;
const PAYU_SALT = process.env.PAYU_SALT_V1;
const APP_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export async function POST(req: NextRequest) {
    try {
        console.log("\n--- PAYU CALLBACK INITIATED ---");

        if (!PAYU_KEY || !PAYU_SALT || !APP_BASE_URL) {
            console.error("[CALLBACK ERROR] Server configuration error: Missing environment variables.");
            // Cannot redirect without APP_BASE_URL, so return a generic error
            return new Response("Server configuration error.", { status: 500 });
        }

        const formData = await req.formData();
        const payuResponse = Object.fromEntries(formData.entries());

        console.log("[CALLBACK INFO] Received data from PayU:", payuResponse);

        const {
            status,
            txnid,
            hash: receivedHash,
            firstname,
            amount,
            productinfo,
            email,
            udf1, udf2, udf3, udf4, udf5 // Capture all UDFs from response
        } = payuResponse;

        // --- 1. Verify the PayU Hash (CRITICAL SECURITY STEP) ---
        // The response hash format is different and very specific.
        // Format: SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key

        const hashStringParams = [
            PAYU_SALT,
            status,
            "", "", "", "", "", // 5 empty placeholders
            udf5 || "",
            udf4 || "",
            udf3 || "",
            udf2 || "",
            udf1 || "",
            email,
            firstname,
            productinfo,
            amount,
            txnid,
            PAYU_KEY
        ];

        const hashString = hashStringParams.join('|');
        const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');

        console.log(`[CALLBACK DEBUG] String for hash verification: ${hashString}`);
        console.log(`[CALLBACK DEBUG] Received Hash from PayU:   ${receivedHash}`);
        console.log(`[CALLBACK DEBUG] Calculated Hash on Server: ${calculatedHash}`);

        if (receivedHash !== calculatedHash) {
            console.error(`[CALLBACK CRITICAL] HASH MISMATCH for txnid: ${txnid}. Transaction will be marked as failed.`);
            
            // Update the transaction as failed/tampered for security
            await adminDb.collection("payments").doc(txnid as string).update({
                status: "failed",
                statusMessage: "Security hash mismatch. Transaction is invalid.",
                gatewayResponse: payuResponse,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Redirect user to a failure page
            return NextResponse.redirect(`${APP_BASE_URL}/subscription?status=failure&txnid=${txnid}`, 302);
        }
        
        console.log(`[CALLBACK SUCCESS] Hash verified for txnid: ${txnid}.`);

        // --- 2. Hash is Verified. Update Database Based on Status ---
        const paymentRef = adminDb.collection("payments").doc(txnid as string);
        const redirectUrl = `${APP_BASE_URL}/subscription?txnid=${txnid}`;

        if (status === 'success') {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            await adminDb.runTransaction(async (transaction) => {
                // Update the payment record
                transaction.update(paymentRef, {
                    status: "success",
                    statusMessage: "Payment completed successfully.",
                    gatewayResponse: payuResponse,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Update the user's subscription in creatorApplications
                const creatorQuery = adminDb.collection("creatorApplications").where("userId", "==", udf1);
                const creatorSnapshot = await transaction.get(creatorQuery);
                
                if (!creatorSnapshot.empty) {
                    const creatorDocRef = creatorSnapshot.docs[0].ref;
                    transaction.update(creatorDocRef, {
                        subscriptionStatus: 'active',
                        subscriptionExpiresAt: admin.firestore.Timestamp.fromDate(thirtyDaysFromNow)
                    });
                    console.log(`[CALLBACK SUCCESS] Updated subscription for userId: ${udf1}`);
                } else {
                    console.warn(`[CALLBACK WARNING] Could not find creator application for userId: ${udf1} to update subscription.`);
                }
            });

            console.log(`[CALLBACK SUCCESS] Redirecting to success page.`);
            return NextResponse.redirect(`${redirectUrl}&status=success`, 302);

        } else {
            // Payment failed or was cancelled
            await paymentRef.update({
                status: "failed",
                statusMessage: payuResponse.error_Message || "Payment failed or was cancelled by user.",
                gatewayResponse: payuResponse,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`[CALLBACK INFO] Payment failed for txnid: ${txnid}. Redirecting to failure page.`);
            return NextResponse.redirect(`${redirectUrl}&status=failure`, 302);
        }

    } catch (error: any) {
        console.error("[CALLBACK CRITICAL] A fatal error occurred in the callback handler:", error);
        const txnid = new URL(req.url).searchParams.get('txnid') || 'unknown';
        return NextResponse.redirect(`${APP_BASE_URL}/subscription?status=failure&txnid=${txnid}&error=server`, 302);
    }
}
