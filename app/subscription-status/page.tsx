"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

function StatusContent() {
    const searchParams = useSearchParams();
    // **FIX**: Read 'order_id' from the URL to match the backend
    const order_id = searchParams.get('order_id');
    const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
    const [message, setMessage] = useState('Verifying your payment, please wait...');

    useEffect(() => {
        // **FIX**: Check for order_id
        if (!order_id) {
            setStatus('failed');
            setMessage('No Order ID found. Invalid request.');
            return;
        }

        const verifyPayment = async () => {
            try {
                const response = await fetch('/api/cashfree/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // **FIX**: Send order_id in the body
                    body: JSON.stringify({ order_id }),
                });

                const data = await response.json();

                if (data.success && data.status === 'PAID') {
                    setStatus('success');
                    setMessage('Your subscription is now active!');
                } else {
                    setStatus('failed');
                    setMessage(data.message || `Payment status: ${data.status || 'Failed'}. Please contact support.`);
                }
            } catch (error) {
                setStatus('failed');
                setMessage('An error occurred while verifying your payment.');
            }
        };

        // Delay verification slightly to allow for backend processing
        const timer = setTimeout(verifyPayment, 3000);
        return () => clearTimeout(timer);

    }, [order_id]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl text-center">
                {status === 'processing' && (
                    <>
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mx-auto"></div>
                        <h1 className="text-2xl font-bold text-gray-800">Processing Payment</h1>
                    </>
                )}
                {status === 'success' && (
                       <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
                           <CheckCircleIcon className="h-12 w-12 text-green-600" />
                       </div>
                )}
                {status === 'failed' && (
                    <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
                        <XCircleIcon className="h-12 w-12 text-red-600" />
                    </div>
                )}
                <p className="text-gray-600 text-lg">{message}</p>
                 {status !== 'processing' && (
                     <Link href="/creator-dashboard" className="inline-block mt-6 px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700">
                         Go to Dashboard
                     </Link>
                 )}
            </div>
        </div>
    );
}

export default function SubscriptionStatusPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
            <StatusContent />
        </Suspense>
    );
}
