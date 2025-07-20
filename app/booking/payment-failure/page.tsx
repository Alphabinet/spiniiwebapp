// app/booking/payment-failure/page.tsx
"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const PaymentFailurePage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'failed'>('loading');
  const [bookingDetails, setBookingDetails] = useState<any | null>(null);

  useEffect(() => {
    const fetchBookingStatus = async () => {
      const txnidFromUrl = searchParams.get('txnid');

      if (!txnidFromUrl) {
        setVerificationStatus('failed');
        toast({
          title: "Payment Failure",
          description: "Missing transaction ID in URL for failed payment.",
          variant: "destructive",
        });
        return;
      }

      try {
        const bookingRef = doc(db, "bookings", txnidFromUrl);
        const bookingSnap = await getDoc(bookingRef);

        if (bookingSnap.exists()) {
          const data = bookingSnap.data();
          setBookingDetails(data);
          // Assuming backend already updated status to 'failed' or 'cancelled'
          if (data.payment?.status === 'failed' || data.payment?.status === 'cancelled') {
            setVerificationStatus('failed');
            toast({
              title: "Payment Failed",
              description: data.payment?.message || "Your payment could not be processed.",
              variant: "destructive",
            });
          } else {
            // This case means PayU redirected to FURL, but our backend status isn't 'failed'.
            // This might indicate a mismatch or delayed update.
            setVerificationStatus('failed');
            toast({
              title: "Payment Status Unclear",
              description: "Payment failed at gateway, but our system needs to update. Please contact support.",
              variant: "destructive",
            });
          }
        } else {
          setVerificationStatus('failed');
          toast({
            title: "Booking Not Found",
            description: "Could not find your booking details for the failed payment. Please contact support.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching booking details on failure page:", error);
        setVerificationStatus('failed');
        toast({
          title: "Error",
          description: "Failed to load booking details for failed payment.",
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
          <Loader2 className="h-16 w-16 text-red-600 animate-spin mb-4" />
          <h4 className="text-2xl font-bold text-red-700 mb-2">Processing Payment Failure...</h4>
          <p className="text-gray-600">Please wait while we log the details.</p>
        </div>
      );
    } else { // verificationStatus === 'failed'
      return (
        <div className="bg-red-50 rounded-xl p-6 border border-red-200">
          <div className="flex flex-col items-center text-center">
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <h4 className="text-2xl font-bold text-red-800 mb-2">
              Payment Failed
            </h4>
            <p className="text-red-700">
              {bookingDetails?.payment?.message || "There was an issue processing your payment."}
            </p>
            {bookingDetails?.payment?.transactionId && (
              <p className="text-sm text-gray-600 mt-4">
                Transaction ID: {bookingDetails.payment.transactionId}
              </p>
            )}
            <p className="text-sm text-gray-600 mt-4">
              Please try again or contact support if the issue persists.
            </p>
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

export default PaymentFailurePage;