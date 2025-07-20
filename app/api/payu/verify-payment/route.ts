// app/api/payu/verify-payment/route.ts

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase/admin';

const PAYU_SALT = process.env.PAYU_SALT;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export async function POST(request: Request) {
  if (!PAYU_SALT || !BASE_URL) {
    console.error("CRITICAL ERROR: PAYU_SALT or NEXT_PUBLIC_BASE_URL is not configured in environment variables.");
    return NextResponse.redirect(new URL('/payment-failed?error=server_config', BASE_URL || 'http://localhost:3000'));
  }

  try {
    const formData = await request.formData();
    const payuResponse = Object.fromEntries(formData.entries());

    console.log("Received PayU Response:", payuResponse);

    const hashString = `${PAYU_SALT}|${payuResponse.status}||||||${payuResponse.udf5}|${payuResponse.udf4}|${payuResponse.udf3}|${payuResponse.udf2}|${payuResponse.udf1}|${payuResponse.email}|${payuResponse.firstname}|${payuResponse.productinfo}|${payuResponse.amount}|${payuResponse.txnid}|${payuResponse.key}`;
    const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');

    if (calculatedHash !== payuResponse.hash) {
      console.error("Hash Mismatch! The transaction might be fraudulent.");
      await updateBookingStatus(payuResponse, 'failed', 'Hash mismatch during verification.');
      const redirectUrl = new URL('/payment-failed?error=tampered_response', BASE_URL);
      // Ensure error redirects are also GET requests
      return NextResponse.redirect(redirectUrl.toString(), 303);
    }

    const bookingId = payuResponse.txnid as string;
    if (payuResponse.status === 'success') {
      console.log(`Payment successful for txnid: ${bookingId}. Updating Firestore.`);
      await updateBookingStatus(payuResponse, 'success', 'Payment confirmed successfully.');
    } else {
      console.log(`Payment failed for txnid: ${bookingId}. Status: ${payuResponse.status}.`);
      const errorMessage = payuResponse.error_Message || 'Payment failed at the gateway.';
      await updateBookingStatus(payuResponse, 'failed', errorMessage);
    }

    const creatorId = payuResponse.udf1 as string;
    const redirectUrl = new URL(`/booking/${creatorId}`, BASE_URL);
    redirectUrl.searchParams.set('status', payuResponse.status as string);
    redirectUrl.searchParams.set('txnid', bookingId);
    
    console.log("Redirecting user to:", redirectUrl.toString());

    // --- THIS IS THE FIX ---
    // Use status code 303 to force a GET request for the redirect.
    return NextResponse.redirect(redirectUrl.toString(), 303);

  } catch (error: any) {
    console.error("Error in /api/payu/verify-payment:", error);
    const redirectUrl = new URL('/payment-failed?error=server_error', BASE_URL);
    // Ensure error redirects are also GET requests
    return NextResponse.redirect(redirectUrl.toString(), 303);
  }
}

async function updateBookingStatus(payuResponse: { [k: string]: FormDataEntryValue }, status: 'success' | 'failed', message: string) {
  const bookingId = payuResponse.txnid as string;
  if (!bookingId) {
    console.error("Cannot update booking status: txnid is missing from PayU response.");
    return;
  }

  const bookingRef = db.collection("bookings").doc(bookingId);
  const updatePayload = {
    payment: {
      status: status,
      message: message,
      payuPaymentId: payuResponse.mihpayid || '',
      mode: payuResponse.mode || '',
      bankcode: payuResponse.bankcode || '',
      fullResponse: payuResponse,
    }
  };

  await bookingRef.set(updatePayload, { merge: true });
}