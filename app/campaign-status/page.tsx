"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { format } from 'date-fns';

// --- Type Definition for Campaign Data ---
interface CampaignDetails {
    campaignName: string;
    costs: {
        totalAmount: number;
    };
    paidAt?: Timestamp;
    campaignId?: string; // Added for campaign link
}

// --- UI Components ---

const DetailRow = ({ label, value, noTruncate = false }: { label: string; value: string | number; noTruncate?: boolean }) => (
    <div className="flex justify-between items-center py-3 border-b border-gray-100">
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`font-semibold text-gray-800 text-right ${noTruncate ? '' : 'truncate max-w-[200px]'}`}>{value}</p>
    </div>
);

const LoadingState = () => (
    <div className="flex flex-col items-center justify-center text-center">
        <Loader2 className="h-16 w-16 animate-spin text-purple-600" />
        <h1 className="mt-6 text-2xl font-bold text-gray-800">
            Processing Your Payment
        </h1>
        <p className="mt-2 text-gray-600 max-w-md">
            Please wait while we securely verify your transaction.
        </p>
        <div className="mt-8 w-full max-w-xs">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-purple-600 rounded-full animate-pulse"
                    style={{ width: '70%' }}
                ></div>
            </div>
        </div>
    </div>
);

const SuccessState = ({ order_id, details }: { order_id: string; details: CampaignDetails }) => (
    <div className="flex flex-col items-center text-center">
        <CheckCircle className="h-20 w-20 text-green-500" />
        <h1 className="mt-4 text-3xl font-bold text-gray-800">
            Payment Successful!
        </h1>
        <p className="mt-2 max-w-md text-gray-600">
            Your campaign is now under review and will go live shortly.
        </p>
        <div className="w-full bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-5 mt-8 text-left shadow-sm">
            <h2 className="font-bold text-lg text-gray-800 mb-4 flex items-center">
                <span className="bg-purple-100 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm">✓</span>
                Transaction Summary
            </h2>
            <div className="space-y-2">
                <DetailRow label="Campaign Name" value={details.campaignName} />
                {/* Modified: Pass noTruncate={true} for Order ID */}
                <DetailRow label="Order ID" value={order_id} noTruncate={true} />
                <DetailRow
                    label="Amount Paid"
                    value={`₹${details.costs.totalAmount.toLocaleString('en-IN')}`}
                />
                <DetailRow
                    label="Date of Payment"
                    value={details.paidAt ? format(details.paidAt.toDate(), 'PPPp') : format(new Date(), 'PPPp')}
                />
            </div>
            {details.campaignId && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center">
                    <Link
                        href={`/campaign/${details.campaignId}`}
                        className="text-purple-600 hover:text-purple-800 flex items-center text-sm font-medium"
                        target="_blank"
                    >
                        View Campaign Preview <ExternalLink className="ml-1 h-4 w-4" />
                    </Link>
                </div>
            )}
        </div>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full">
            <Button asChild className="w-full bg-purple-600 hover:bg-purple-700 shadow-md">
                <Link href="/dashboard/campaigns" className="flex items-center">
                    <span>View My Campaigns</span>
                </Link>
            </Button>
            <Button asChild variant="outline" className="w-full border-gray-300 hover:bg-gray-50">
                <Link href="/create-campaign" className="flex items-center">
                    Create Another Campaign
                </Link>
            </Button>
        </div>
        <div className="mt-6 text-xs text-gray-500 flex flex-col items-center">
            <p>Need help? Contact our support team</p>
            <Link href="/contact-support" className="text-purple-600 hover:underline mt-1">
                support@snaapii.com
            </Link>
        </div>
    </div>
);

const FailedState = ({ order_id, message }: { order_id: string | null; message: string }) => (
    <div className="flex flex-col items-center text-center">
        <XCircle className="h-20 w-20 text-red-500" />
        <h1 className="mt-4 text-3xl font-bold text-gray-800">
            Payment Failed
        </h1>
        <p className="mt-2 max-w-md text-red-600 bg-red-50 rounded-lg py-2 px-4">
            {message}
        </p>
        {order_id && (
            // This part already does not have the truncate class, so it should show fully.
            <p className="mt-4 text-sm text-gray-500">
                Your Order ID: <span className="font-mono bg-gray-100 p-1.5 rounded text-gray-800">{order_id}</span>
            </p>
        )}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full">
            <Button asChild className="w-full bg-red-600 hover:bg-red-700 shadow-md">
                <Link href="/create-campaign" className="flex items-center">
                    Try Payment Again
                </Link>
            </Button>
            <Button asChild variant="outline" className="w-full border-gray-300 hover:bg-gray-50">
                <Link href="/contact-support" className="flex items-center">
                    Contact Support
                </Link>
            </Button>
        </div>
        <div className="mt-6">
            <Link
                href="/"
                className="text-gray-600 hover:text-purple-600 flex items-center text-sm"
            >
                <ArrowLeft className="mr-1 h-4 w-4" /> Back to homepage
            </Link>
        </div>
    </div>
);


// --- Main Content Logic ---

function StatusContent() {
    const searchParams = useSearchParams();
    const order_id = searchParams.get('order_id');
    const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
    const [message, setMessage] = useState('Verifying your payment, please wait...');
    const [campaignDetails, setCampaignDetails] = useState<CampaignDetails | null>(null);

    useEffect(() => {
        if (!order_id) {
            setStatus('failed');
            setMessage('No order ID found. Please return and try again.');
            return;
        }

        const verifyAndFetch = async () => {
            try {
                // Step 1: Trigger the server-side verification API.
                const verifyResponse = await fetch('/api/cashfree/verify-campaign-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order_id }),
                });
                const verifyData = await verifyResponse.json();

                // Step 2: Fetch the updated campaign document from Firestore
                const campaignDocRef = doc(db, "campaigns", order_id);
                const campaignDocSnap = await getDoc(campaignDocRef);

                if (!campaignDocSnap.exists()) {
                    throw new Error("Campaign document not found after verification.");
                }

                const details = campaignDocSnap.data() as CampaignDetails;
                setCampaignDetails(details);

                // Step 3: Set the final status
                if (verifyData.success && verifyData.status === 'PAID') {
                    setStatus('success');
                } else {
                    setStatus('failed');
                    setMessage(verifyData.message || 'Payment verification failed. Please try again or contact support.');
                }
            } catch (error) {
                console.error("Verification failed:", error);
                setStatus('failed');
                setMessage('An unexpected error occurred. Please contact support with your order ID.');
            }
        };

        // Adding a small delay to allow for backend processing
        const timer = setTimeout(verifyAndFetch, 2500);
        return () => clearTimeout(timer);
    }, [order_id]);

    const renderContent = () => {
        switch (status) {
            case 'success':
                return campaignDetails ?
                    <SuccessState order_id={order_id!} details={campaignDetails} /> :
                    <LoadingState />;
            case 'failed':
                return <FailedState order_id={order_id} message={message} />;
            case 'processing':
            default:
                return <LoadingState />;
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
            <div className="w-full max-w-lg p-6 sm:p-8 space-y-6 bg-white rounded-2xl shadow-lg border border-gray-100">
                {renderContent()}
            </div>
        </div>
    );
}

// --- Main Page Component with Suspense ---

export default function CampaignStatusPage() {
    const loadingFallback = (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto" />
                <p className="mt-4 text-gray-600">Preparing your payment details...</p>
            </div>
        </div>
    );

    return (
        <Suspense fallback={loadingFallback}>
            <StatusContent />
        </Suspense>
    );
}