// app/booking/payment-success/page.tsx
"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const PaymentSuccessPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [bookingDetails, setBookingDetails] = useState<any | null>(null);

  useEffect(() => {
    const fetchBookingStatus = async () => {
      const txnidFromUrl = searchParams.get('txnid');
      const statusFromUrl = searchParams.get('status'); // 'success' or 'failed' from backend redirect

      if (!txnidFromUrl) {
        setVerificationStatus('failed');
        toast({
          title: "Payment Result",
          description: "Missing transaction ID in URL.",
          variant: "destructive",
        });
        return;
      }

      try {
        const bookingRef = doc(db, "bookings", txnidFromUrl);
        const bookingSnap = await getDoc(bookingRef);

        if (bookingSnap.exists()) {
          const data = bookingSnap.data();
          // The backend verification route should have already updated Firestore to 'success' or 'failed'
          if (data.payment?.status === 'success') {
            setBookingDetails(data);
            setVerificationStatus('success');
            toast({
              title: "Payment Confirmed",
              description: "Your payment was successfully processed.",
              variant: "success",
              className: "bg-green-100 text-green-800"
            });
          } else {
            // If backend hasn't updated to success, it means verification failed or is still pending.
            // Redirect to failure page for consistency.
            setBookingDetails(data); // Still show what data we have
            setVerificationStatus('failed');
            toast({
              title: "Payment Verification Pending/Failed",
              description: data.payment?.message || "Payment processed by PayU, but our system couldn't confirm it. Please contact support.",
              variant: "destructive",
            });
          }
        } else {
          setVerificationStatus('failed');
          toast({
            title: "Booking Not Found",
            description: "Could not find your booking details. Please contact support.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching booking details on success page:", error);
        setVerificationStatus('failed');
        toast({
          title: "Error",
          description: "Failed to load booking details for payment confirmation.",
          variant: "destructive",
        });
      }
    };

    fetchBookingStatus();
  }, [searchParams, toast]);

  const renderContent = () => {
    if (verificationStatus === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center py-6">
          <Loader2 className="h-16 w-16 text-purple-600 animate-spin mb-4" />
          <h4 className="text-2xl font-bold text-purple-700 mb-2">Confirming your booking...</h4>
          <p className="text-gray-600">Please wait while we finalize the details.</p>
        </div>
      );
    } else if (verificationStatus === 'success') {
      return (
        <div className="bg-green-50 rounded-xl p-6 border border-green-200">
          <div className="flex flex-col items-center text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h4 className="text-2xl font-bold text-green-800 mb-2">Booking Confirmed!</h4>
            <p className="text-green-700 text-lg">Your booking is confirmed.</p>
            {bookingDetails && (
              <div className="mt-6 bg-white p-4 rounded-lg border border-green-200 w-full max-w-md">
                <h5 className="font-bold text-gray-800 mb-3">Booking Summary</h5>
                <div className="space-y-2 text-left text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-medium">{bookingDetails.payment?.transactionId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">PayU Payment ID:</span>
                    <span className="font-medium">{bookingDetails.payment?.payuPaymentId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="font-medium">₹{bookingDetails.payment?.amount?.toLocaleString('en-IN') || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Creator:</span>
                    <span className="font-medium">{bookingDetails.creatorName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">Services:</span>
                    <span className="font-medium text-right flex flex-col items-end">
                      {bookingDetails.services?.reels > 0 && `Reels × ${bookingDetails.services.reels}`}
                      {bookingDetails.services?.story > 0 && `Story × ${bookingDetails.services.story}`}
                      {bookingDetails.services?.reelsStory > 0 && `Combo × ${bookingDetails.services.reelsStory}`}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-600 mt-6">
              We&apos;ve sent booking details to your registered email.
            </p>
            <Button onClick={() => router.push('/my-orders')} className="mt-6 bg-blue-500 hover:bg-blue-600">
              View My Orders
            </Button>
          </div>
        </div>
      );
    } else { // verificationStatus === 'failed'
      return (
        <div className="bg-red-50 rounded-xl p-6 border border-red-200">
          <div className="flex flex-col items-center text-center">
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <h4 className="text-2xl font-bold text-red-800 mb-2">Payment Failed</h4>
            <p className="text-red-700">There was an issue processing your payment.</p>
            <p className="text-sm text-gray-600 mt-4">Please try again or contact support.</p>
            <Button onClick={() => router.push(`/booking/${bookingDetails?.creatorId || 'default_creator_id'}`)} className="mt-6 bg-purple-500 hover:bg-purple-600">
              Try Again
            </Button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 p-6 flex items-center justify-center">
      <div className="w-full sm:max-w-2xl bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-6">Payment Result</h1>
        {renderContent()}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;