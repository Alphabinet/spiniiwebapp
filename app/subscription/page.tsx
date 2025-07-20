"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebaseConfig';
import { collection, query, where, onSnapshot, DocumentData, Timestamp, limit } from 'firebase/firestore';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

// --- Type Definitions ---
interface CreatorData extends DocumentData {
    id: string;
    fullName: string;
    emailAddress: string;
    mobileNumber: string;
    subscriptionStatus?: 'active' | 'inactive';
    subscriptionExpiresAt?: Timestamp;
}

interface PayUFormProps {
    key: string;
    txnid: string;
    amount: string;
    productinfo: string;
    firstname: string;
    email: string;
    phone: string;
    surl: string;
    furl: string;
    hash: string;
    udf1: string;
    service_provider: string;
    payuUrl?: string; // Make this optional
    payu_url?: string; // Add the alternative key
    error?: string; // For error messages from the server
}

// --- Payment Status Component ---
function PaymentStatusFeedback({ status, txnid }: { status: 'success' | 'failure', txnid: string | null }) {
    const router = useRouter();
    const clearUrlParams = () => router.replace('/subscription', { scroll: false });

    if (status === 'success') {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-md mx-4">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                        <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mt-6">Payment Successful!</h2>
                    <p className="text-gray-600 mt-3">Your Creator Pro Membership is now active. Your transaction ID is <strong>{txnid || 'N/A'}</strong>. It may take a moment for your status to update.</p>
                    <button onClick={clearUrlParams} className="mt-6 w-full text-center px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all duration-300">Awesome!</button>
                </div>
            </div>
        );
    }

    if (status === 'failure') {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-md mx-4">
                     <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                        <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mt-6">Payment Failed</h2>
                    <p className="text-gray-600 mt-3">The transaction could not be completed. Please check your payment details and try again. Your transaction ID was <strong>{txnid || 'N/A'}</strong>.</p>
                    <button onClick={clearUrlParams} className="mt-6 w-full text-center px-8 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all duration-300">Try Again</button>
                </div>
            </div>
        );
    }
    return null;
}

// --- Main Subscription Page Component ---
export default function SubscriptionPage() {
    const [user, authLoading] = useAuthState(auth);
    const [creatorData, setCreatorData] = useState<CreatorData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    
    const searchParams = useSearchParams();
    const [paymentStatus, setPaymentStatus] = useState<'success' | 'failure' | null>(null);
    const [transactionId, setTransactionId] = useState<string | null>(null);

    useEffect(() => {
        const status = searchParams.get('status');
        const txnid = searchParams.get('txnid');
        if (status === 'success') setPaymentStatus('success');
        else if (status === 'failure') setPaymentStatus('failure');
        if (txnid) setTransactionId(txnid);
    }, [searchParams]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setIsLoading(false);
            return;
        }
        const q = query(collection(db, "creatorApplications"), where("userId", "==", user.uid), limit(1));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data() as CreatorData;
                setCreatorData({ id: snapshot.docs[0].id, ...data });
            } else {
                setCreatorData(null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching creator data:", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user, authLoading]);

    // ** MODIFIED FUNCTION **
    const handlePurchase = async () => {
        if (!user || !creatorData) {
            alert("Could not find user data. Please complete your profile first.");
            return;
        }

        setIsProcessingPayment(true);
        try {
            const response = await fetch('/api/payu/create-transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: '249.00',
                    productinfo: 'Creator Pro Membership - 1 Month',
                    firstname: creatorData.fullName,
                    email: creatorData.emailAddress,
                    phone: creatorData.mobileNumber,
                    userId: user.uid,
                }),
            });
            
            const paymentData: PayUFormProps = await response.json();

            if (!response.ok) {
                throw new Error(paymentData.error || 'Failed to initialize payment.');
            }

            // ** NEW ROBUST LOGIC **
            // Check for both 'payuUrl' (camelCase) and 'payu_url' (snake_case)
            const actionUrl = paymentData.payuUrl || paymentData.payu_url;

            if (!actionUrl) {
                // If neither URL is found, stop and show an error.
                console.error("Server response:", paymentData);
                throw new Error("Payment gateway URL was not found in the server response.");
            }

            const form = document.createElement('form');
            form.method = 'post';
            form.action = actionUrl;

            for (const key in paymentData) {
                // Don't add the URL keys as input fields
                if (key !== 'payuUrl' && key !== 'payu_url') {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = String((paymentData as any)[key]);
                    form.appendChild(input);
                }
            }

            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);

        } catch (error) {
            console.error("Payment initiation failed:", error);
            alert(`Error: Could not start the payment process. ${error instanceof Error ? error.message : ''}`);
            setIsProcessingPayment(false);
        }
    };
    
    const formatDate = (timestamp: Timestamp | undefined) => {
        if (!timestamp) return "N/A";
        return timestamp.toDate().toLocaleDateString("en-IN", { year: 'numeric', month: 'long', day: 'numeric' });
    };

    if (isLoading || authLoading) {
        return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div></div>;
    }
    
    if (!user) {
        return (
            <div className="text-center py-20">
                <h1 className="text-2xl font-bold">Please Log In</h1>
                <p className="text-gray-600 mt-2">You need to be logged in to manage your subscription.</p>
                <Link href="/login" className="mt-4 inline-block bg-purple-600 text-white px-6 py-2 rounded-lg">Log In</Link>
            </div>
        );
    }

    const isSubscribed = creatorData?.subscriptionStatus === 'active' && creatorData?.subscriptionExpiresAt?.toDate() > new Date();

    return (
        <div className="bg-gray-50 min-h-screen">
            {paymentStatus && <PaymentStatusFeedback status={paymentStatus} txnid={transactionId} />}
            <div className="container mx-auto px-4 py-8 sm:py-12">
                 <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 mb-2">Subscription</h1>
                 <p className="text-center text-gray-600 mb-8 sm:mb-12">Manage your Creator Pro Membership.</p>

                <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="bg-zinc-800 p-8 rounded-2xl shadow-2xl flex flex-col text-white">
                         <div className="text-center">
                             <p className="font-semibold text-yellow-400 tracking-widest">PREMIUM MEMBERSHIP</p>
                             <h3 className="text-xl font-bold mt-1">EXCLUSIVE ACCESS</h3>
                         </div>
                         <div className="border border-yellow-400/50 rounded-xl p-6 my-8 text-center bg-zinc-900/50">
                             <p className="text-5xl font-bold">₹249 <span className="text-gray-400 text-2xl">/ month</span></p>
                         </div>
                         <ul className="space-y-4 mb-10 flex-grow">
                             {[ "Premium profile placement", "Unlimited brand collaborations", "Secure payment protection", "Dedicated manager support 24/7", "Priority access to new campaigns" ].map(feature => (
                                 <li key={feature} className="flex items-center gap-3">
                                     <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
                                     <span className="text-white/90">{feature}</span>
                                 </li>
                             ))}
                         </ul>
                    </div>
                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                        {isSubscribed ? (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Your Plan Status</h2>
                                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="font-semibold text-green-800">Subscription: Active 🟢</p>
                                    <p className="text-green-700 text-sm mt-1">Your premium access expires on: <strong>{formatDate(creatorData.subscriptionExpiresAt)}</strong></p>
                                </div>
                                <p className="mt-6 text-gray-600">Thank you for being a premium member. You can now access all Creator Pro features.</p>
                                <Link href="/creator-dashboard" className="block text-center mt-4 text-purple-600 hover:underline">Return to Dashboard</Link>
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Activate Your Membership</h2>
                                {creatorData?.subscriptionStatus === 'inactive' && (
                                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"><p className="font-semibold text-yellow-800">Your subscription is inactive or has expired. Renew now!</p></div>
                                )}
                                <p className="mt-6 text-gray-600">Click the button below to proceed to our secure payment gateway.</p>
                                <button onClick={handlePurchase} disabled={isProcessingPayment || !creatorData} className="mt-6 w-full text-center px-8 py-4 bg-gradient-to-b from-yellow-400 to-amber-500 text-zinc-900 rounded-lg font-bold hover:from-yellow-500 hover:to-amber-600 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-wait">
                                    {isProcessingPayment ? 'Processing...' : (creatorData?.subscriptionStatus === 'inactive' ? 'Renew Subscription' : 'Buy Now - ₹249')}
                                </button>
                                {!creatorData && (
                                    <p className="text-sm text-red-600 mt-3 text-center">Note: You must first <Link href="/creator-dashboard" className="underline">submit a creator application</Link> before you can subscribe.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
