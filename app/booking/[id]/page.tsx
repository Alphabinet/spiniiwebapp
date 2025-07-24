"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from "next/navigation";
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { auth, db, storage } from "@/lib/firebaseConfig";
import { format } from 'date-fns';
import { CalendarIcon, CheckCircle, Loader2, XCircle, Info, ArrowLeft, ShoppingCart, Mail, Phone, MapPin } from "lucide-react";
import { User } from 'firebase/auth';
import Image from 'next/image';
import Script from 'next/script';

// --- Type Definitions ---
interface CashfreeOptions {
    mode: "sandbox" | "production";
}

interface CashfreeCheckoutPayload {
    paymentSessionId: string;
    redirectTarget: "_self" | "_blank";
}

interface Cashfree {
    checkout(payload: CashfreeCheckoutPayload): void;
}

declare global {
    interface Window {
        Cashfree: (options: CashfreeOptions) => Cashfree;
    }
}

interface Creator {
    id: string;
    fullName: string;
    profilePictureUrl: string;
    instagramUsername: string;
    instagramProfileLink: string;
    totalFollowers: string;
    avgReelViews: string;
    storyAverageViews: string;
    cityState: string;
    gender: string;
    contentCategory: string;
    contentLanguages: string;
    reelPrice: string;
    storyPrice: string;
    reelsStoryPrice: string;
    deliveryDuration: string;
    emailAddress: string;
    mobileNumber: string;
}

interface BookingData {
    step: number;
    services: { reels: number; story: number; reelsStory: number };
    campaign: {
        name: string;
        description: string;
        deadline: Date | null;
        demoVideo: File | null;
        demoVideoUrl?: string;
    };
    bookerDetails: {
        fullName: string;
        email: string;
        phoneNumber: string;
    };
    payment: { status: 'idle' | 'processing' | 'success' | 'failed'; message?: string; transactionId?: string };
}

// Main page component
const BookingPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { toast } = useToast();

    const SERVICE_CHARGE = 99;

    const [creator, setCreator] = useState<Creator | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isSDKReady, setIsSDKReady] = useState(false);
    const [bookingData, setBookingData] = useState<BookingData>({
        step: 1,
        services: { reels: 0, story: 0, reelsStory: 0 },
        campaign: { name: '', description: '', deadline: null, demoVideo: null },
        bookerDetails: { fullName: '', email: '', phoneNumber: '' },
        payment: { status: 'idle' }
    });

    const { step, services, campaign, bookerDetails, payment } = bookingData;
    const [showCalendar, setShowCalendar] = useState(false);

    const steps = useMemo(() => [
        { number: 1, label: "Services" },
        { number: 2, label: "Campaign" },
        { number: 3, label: "Your Details" },
        { number: 4, label: "Confirm" },
        { number: 5, label: "Confirmation" },
    ], []);

    const fetchCreator = useCallback(async () => {
        if (!id) {
            setError("Creator ID is missing.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const docRef = doc(db, "creatorApplications", id);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                setError("This creator was not found.");
                return;
            }
            setCreator({ id: docSnap.id, ...docSnap.data() } as Creator);
        } catch (err) {
            console.error("Error fetching creator:", err);
            setError("Failed to load creator details. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchCreator();
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, [fetchCreator]);

    const getPrice = useCallback((priceString: string) => {
        return parseInt(priceString?.replace(/,/g, '') || '0') || 0;
    }, []);

    const subTotalPrice = useMemo(() => {
        if (!creator) return 0;
        const reelsPrice = getPrice(creator.reelPrice) * services.reels;
        const storyPrice = getPrice(creator.storyPrice) * services.story;
        const comboPrice = getPrice(creator.reelsStoryPrice) * services.reelsStory;
        return reelsPrice + storyPrice + comboPrice;
    }, [services, creator, getPrice]);

    const grandTotalPrice = useMemo(() => {
        return subTotalPrice + SERVICE_CHARGE;
    }, [subTotalPrice]);

    const handleServiceChange = (serviceType: 'reels' | 'story' | 'reelsStory', value: string) => {
        const count = parseInt(value);
        setBookingData(prev => ({
            ...prev,
            services: {
                ...prev.services,
                [serviceType]: isNaN(count) ? 0 : Math.max(0, count)
            }
        }));
    };

    const handleCampaignChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setBookingData(prev => ({
            ...prev,
            campaign: { ...prev.campaign, [name]: value }
        }));
    };

    const handleBookerDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setBookingData(prev => ({
            ...prev,
            bookerDetails: { ...prev.bookerDetails, [name]: value }
        }));
    };

    const handleDeadlineChange = (date: Date | undefined) => {
        setBookingData(prev => ({
            ...prev,
            campaign: {
                ...prev.campaign,
                deadline: date || null,
            }
        }));
        setShowCalendar(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files ? e.target.files[0] : null;
        setBookingData(prev => ({
            ...prev,
            campaign: { ...prev.campaign, demoVideo: file }
        }));
    };

    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isValidPhone = (phone: string) => /^\d{10,}$/.test(phone.replace(/\D/g, ''));

    const handleNextStep = () => {
        let isValid = true;
        let errorMessage = "";
        switch (step) {
            case 1:
                if (subTotalPrice <= 0) {
                    isValid = false;
                    errorMessage = "Please select at least one service to proceed.";
                }
                break;
            case 2:
                if (!campaign.name || !campaign.description || campaign.deadline === null) {
                    isValid = false;
                    errorMessage = "Please fill in all campaign details (Name, Description, Deadline).";
                } else if (campaign.deadline && campaign.deadline < new Date()) {
                    isValid = false;
                    errorMessage = "Deadline must be a future date.";
                }
                break;
            case 3:
                if (!bookerDetails.fullName || !bookerDetails.email || !bookerDetails.phoneNumber) {
                    isValid = false;
                    errorMessage = "Please fill in all your details (Full Name, Email, Phone Number).";
                } else if (!isValidEmail(bookerDetails.email)) {
                    isValid = false;
                    errorMessage = "Please enter a valid email address.";
                } else if (!isValidPhone(bookerDetails.phoneNumber)) {
                    isValid = false;
                    errorMessage = "Please enter a valid phone number (at least 10 digits).";
                }
                break;
            case 4:
                if (payment.status === 'processing') {
                    isValid = false;
                    errorMessage = "Payment is still processing. Please wait.";
                } else if (payment.status === 'failed') {
                    isValid = false;
                    errorMessage = "Payment failed. Please try again.";
                } else if (payment.status === 'idle' && grandTotalPrice > 0) {
                    isValid = false;
                    errorMessage = "Please complete the payment to proceed.";
                }
                break;
            default: break;
        }

        if (!isValid) {
            toast({ title: "Validation Error", description: errorMessage, variant: "destructive" });
            return;
        }
        setBookingData(prev => ({ ...prev, step: prev.step + 1 }));
    };

    const handlePrevStep = () => {
        setBookingData(prev => ({ ...prev, step: prev.step - 1 }));
    };

    const handleSubmitBooking = async () => {
        if (!currentUser) {
            toast({ title: "Authentication Required", description: "Please sign in to complete your booking", variant: "destructive" });
            return;
        }
        if (!isSDKReady) {
            toast({ title: "Payment Gateway Loading", description: "Please wait a moment for the payment gateway to be ready.", variant: "destructive" });
            return;
        }
        if (!creator) return;

        setBookingData(prev => ({ ...prev, payment: { status: 'processing', message: 'Initiating payment...' } }));

        let demoVideoUrl = '';
        if (bookingData.campaign.demoVideo) {
            try {
                const storageRef = ref(storage, `bookings/${currentUser.uid}/${Date.now()}_${bookingData.campaign.demoVideo.name}`);
                await uploadBytes(storageRef, bookingData.campaign.demoVideo);
                demoVideoUrl = await getDownloadURL(storageRef);
            } catch (error) {
                toast({ title: "Upload Error", description: "Failed to upload demo video. Please try again.", variant: "destructive" });
                setBookingData(prev => ({ ...prev, payment: { status: 'idle' } }));
                return;
            }
        }

        const bookingPayloadForAPI = {
            creatorId: creator.id,
            creatorName: creator.fullName,
            creatorDetails: {
                fullName: creator.fullName,
                profilePictureUrl: creator.profilePictureUrl,
                instagramUsername: creator.instagramUsername,
                instagramProfileLink: creator.instagramProfileLink,
                totalFollowers: creator.totalFollowers,
                avgReelViews: creator.avgReelViews,
                storyAverageViews: creator.storyAverageViews,
                cityState: creator.cityState,
                gender: creator.gender,
                contentCategory: creator.contentCategory,
                contentLanguages: creator.contentLanguages,
                deliveryDuration: creator.deliveryDuration,
                emailAddress: creator.emailAddress,
                mobileNumber: creator.mobileNumber,
            },
            bookerDetails: bookingData.bookerDetails,
            services: bookingData.services,
            campaign: {
                ...bookingData.campaign,
                demoVideoUrl,
                deadline: bookingData.campaign.deadline ? bookingData.campaign.deadline.toISOString() : null,
            },
            subTotalPrice,
            serviceCharge: SERVICE_CHARGE,
            grandTotalPrice,
        };

        try {
            const token = await currentUser.getIdToken();
            const response = await fetch('/api/cashfree/create-booking-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ bookingPayload: bookingPayloadForAPI }),
            });

            const data = await response.json();

            if (data.success && data.payment_session_id) {
                const cashfreeMode = process.env.NEXT_PUBLIC_CASHFREE_MODE as "sandbox" | "production";

                if (!cashfreeMode) {
                    toast({ title: "Configuration Error", description: "Payment gateway mode is not configured.", variant: "destructive" });
                    setBookingData(prev => ({ ...prev, payment: { status: 'failed', message: 'Client configuration error.' } }));
                    return;
                }

                const cashfree = (window as any).Cashfree({ mode: cashfreeMode });
                cashfree.checkout({
                    paymentSessionId: data.payment_session_id,
                    redirectTarget: "_self",
                });

                setBookingData(prev => ({
                    ...prev,
                    payment: {
                        status: 'processing',
                        message: 'Redirecting to payment gateway...',
                    }
                }));

            } else {
                toast({ title: "Payment Error", description: data.message || "Could not initiate payment.", variant: "destructive" });
                setBookingData(prev => ({ ...prev, payment: { status: 'failed', message: data.message } }));
            }
        } catch (error) {
            console.error("Booking processing error:", error);
            toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
            setBookingData(prev => ({ ...prev, payment: { status: 'failed', message: 'An unexpected error occurred.' } }));
            setBookingData(prev => ({ ...prev, step: 5 }));
        }
    };

    const ServiceCard = ({ type, label, description, price }: { type: 'reels' | 'story' | 'reelsStory'; label: string; description: string; price: string; }) => (
        <div className={cn(
            "bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border-2 shadow-sm flex flex-col md:flex-row items-center justify-between transition-all",
            services[type] > 0
                ? "border-purple-400 shadow-purple-100"
                : "border-gray-200 hover:border-purple-300"
        )}>
            <div className="text-center md:text-left mb-4 md:mb-0 flex-grow">
                <Label htmlFor={type} className="text-xl font-semibold mb-1 block">{label}</Label>
                <p className="text-gray-600 text-sm mb-2">{description}</p>
                <p className="text-purple-500 text-2xl font-extrabold">₹{parseInt(price).toLocaleString('en-IN')}</p>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleServiceChange(type, String(services[type] - 1))}
                    disabled={services[type] === 0}
                    className="border-gray-300 hover:bg-gray-100 h-10 w-10"
                >
                    -
                </Button>
                <Input
                    id={type}
                    type="number"
                    min="0"
                    value={services[type]}
                    onChange={(e) => handleServiceChange(type, e.target.value)}
                    className="w-20 text-center text-lg font-medium h-10"
                />
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleServiceChange(type, String(services[type] + 1))}
                    className="border-gray-300 hover:bg-gray-100 h-10 w-10"
                >
                    +
                </Button>
            </div>
        </div>
    );

    const renderStepContent = () => {
        if (!creator) return null;
        switch (step) {
            case 1:
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-gray-800 text-center">
                            Select Services
                            <span className="block text-sm font-normal text-gray-500 mt-1">
                                Choose the services you want to book
                            </span>
                        </h3>
                        <div className="space-y-4">
                            <ServiceCard
                                type="reels"
                                label="Reels Post"
                                description="Short-form video content for engaging your audience"
                                price={creator.reelPrice}
                            />
                            <ServiceCard
                                type="story"
                                label="Story Post"
                                description="24-hour disappearing content for quick updates"
                                price={creator.storyPrice}
                            />
                            <ServiceCard
                                type="reelsStory"
                                label="Reels + Story Combo"
                                description="Bundle for maximum exposure and engagement"
                                price={creator.reelsStoryPrice}
                            />
                        </div>
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-200 mt-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-semibold text-purple-700">Order Summary</h4>
                                    <p className="text-sm text-gray-600">
                                        {services.reels + services.story + services.reelsStory} service(s) selected
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">Subtotal</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        ₹{subTotalPrice.toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-gray-800 text-center">
                            Campaign Details
                            <span className="block text-sm font-normal text-gray-500 mt-1">
                                Tell us about your campaign
                            </span>
                        </h3>
                        <div>
                            <Label htmlFor="campaignName" className="mb-2 block text-gray-700 flex items-center">
                                Campaign Name <span className="text-purple-500 ml-1">*</span>
                            </Label>
                            <Input
                                id="campaignName"
                                name="name"
                                value={campaign.name}
                                onChange={handleCampaignChange}
                                placeholder="e.g., Summer Collection Launch"
                                className="border-gray-300 focus:border-purple-400 focus:ring-purple-400"
                            />
                        </div>
                        <div>
                            <Label htmlFor="campaignDescription" className="mb-2 block text-gray-700 flex items-center">
                                Campaign Description <span className="text-purple-500 ml-1">*</span>
                                <Info className="ml-2 h-4 w-4 text-gray-500" />
                            </Label>
                            <Textarea
                                id="campaignDescription"
                                name="description"
                                value={campaign.description}
                                onChange={handleCampaignChange}
                                placeholder="Describe your campaign objectives and requirements..."
                                rows={5}
                                className="border-gray-300 focus:border-purple-400 focus:ring-purple-400"
                            />
                        </div>
                        <div>
                            <Label htmlFor="campaignDeadline" className="mb-2 block text-gray-700 flex items-center">
                                Deadline <span className="text-purple-500 ml-1">*</span>
                            </Label>
                            <Button
                                variant="outline"
                                onClick={() => setShowCalendar(!showCalendar)}
                                className={cn(
                                    "w-full justify-start text-left font-normal border-gray-300 hover:bg-gray-100",
                                    !campaign.deadline && "text-gray-400"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-gray-600" />
                                {campaign.deadline ? format(campaign.deadline, "PPP") : "Select a date"}
                            </Button>
                            {showCalendar && (
                                <div className="mt-4 flex justify-center">
                                    <Calendar
                                        mode="single"
                                        selected={campaign.deadline || undefined}
                                        onSelect={handleDeadlineChange}
                                        initialFocus
                                        disabled={(date) => date < new Date()}
                                        className="rounded-md border shadow-md bg-white"
                                    />
                                </div>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="demoVideo" className="mb-2 block text-gray-700">
                                Upload Demo Video (Optional)
                            </Label>
                            <Input
                                id="demoVideo"
                                type="file"
                                accept="video/*"
                                onChange={handleFileChange}
                                className="border-gray-300 focus:border-purple-400 focus:ring-purple-400"
                            />
                            {campaign.demoVideo && (
                                <p className="text-sm text-green-600 mt-2 flex items-center">
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Selected: {campaign.demoVideo.name}
                                </p>
                            )}
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-gray-800 text-center">
                            Your Details
                            <span className="block text-sm font-normal text-gray-500 mt-1">
                                Where we&apos;ll send booking confirmation
                            </span>
                        </h3>
                        <div>
                            <Label htmlFor="bookerFullName" className="mb-2 block text-gray-700 flex items-center">
                                Full Name <span className="text-purple-500 ml-1">*</span>
                            </Label>
                            <Input
                                id="bookerFullName"
                                name="fullName"
                                value={bookerDetails.fullName}
                                onChange={handleBookerDetailsChange}
                                placeholder="Your full name"
                                className="border-gray-300 focus:border-purple-400 focus:ring-purple-400"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="bookerEmail" className="mb-2 block text-gray-700 flex items-center">
                                    Email Address <span className="text-purple-500 ml-1">*</span>
                                </Label>
                                <Input
                                    id="bookerEmail"
                                    name="email"
                                    type="email"
                                    value={bookerDetails.email}
                                    onChange={handleBookerDetailsChange}
                                    placeholder="your.email@example.com"
                                    className="border-gray-300 focus:border-purple-400 focus:ring-purple-400"
                                />
                            </div>
                            <div>
                                <Label htmlFor="bookerPhoneNumber" className="mb-2 block text-gray-700 flex items-center">
                                    Phone Number <span className="text-purple-500 ml-1">*</span>
                                </Label>
                                <Input
                                    id="bookerPhoneNumber"
                                    name="phoneNumber"
                                    type="tel"
                                    value={bookerDetails.phoneNumber}
                                    onChange={handleBookerDetailsChange}
                                    placeholder="+91 9876543210"
                                    className="border-gray-300 focus:border-purple-400 focus:ring-purple-400"
                                />
                            </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 mt-2">
                            <div className="flex">
                                <Info className="h-5 w-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-purple-700">
                                    We&apos;ll send booking confirmation and payment details to this email and phone number.
                                    Double-check for accuracy.
                                </p>
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-8">
                        <h3 className="text-2xl font-bold text-gray-800 text-center">
                            Confirm Booking
                            <span className="block text-sm font-normal text-gray-500 mt-1">
                                Review your order details before confirming
                            </span>
                        </h3>
                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                            <h4 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                                Creator Info
                            </h4>
                            <div className="flex items-center space-x-4 mb-4">
                                {creator.profilePictureUrl && (
                                    <Image
                                        src={creator.profilePictureUrl}
                                        alt={creator.fullName}
                                        width={64}
                                        height={64}
                                        className="w-16 h-16 rounded-full object-cover border-2 border-purple-300 shadow-md flex-shrink-0"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.onerror = null;
                                            target.src = `https://placehold.co/64x64/EEE2FE/6B21A8?text=${creator.fullName.charAt(0)}`;
                                        }}
                                    />
                                )}
                                <div>
                                    <p className="text-xl font-bold text-gray-900">{creator.fullName}</p>
                                    <p className="text-sm text-gray-600">@{creator.instagramUsername}</p>
                                    <a
                                        href={creator.instagramProfileLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-500 hover:underline text-xs"
                                    >
                                        View Instagram Profile
                                    </a>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-700">
                                <div><span className="font-medium text-gray-600">Category:</span> {creator.contentCategory}</div>
                                <div><span className="font-medium text-gray-600">Location:</span> {creator.cityState}</div>
                                <div><span className="font-medium text-gray-600">Followers:</span> {parseInt(creator.totalFollowers).toLocaleString()}</div>
                                <div><span className="font-medium text-gray-600">Avg. Reel Views:</span> {parseInt(creator.avgReelViews).toLocaleString()}</div>
                                <div><span className="font-medium text-gray-600">Avg. Story Views:</span> {parseInt(creator.storyAverageViews).toLocaleString()}</div>
                                <div><span className="font-medium text-gray-600">Delivery:</span> {creator.deliveryDuration} days</div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                            <h4 className="text-lg font-bold text-purple-700 mb-4 pb-2 border-b border-purple-100">
                                Service & Payment Summary
                            </h4>
                            <div className="space-y-3">
                                {services.reels > 0 && (
                                    <div className="flex justify-between">
                                        <span>Reels × {services.reels}</span>
                                        <span className="font-medium">₹{(getPrice(creator.reelPrice) * services.reels).toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                                {services.story > 0 && (
                                    <div className="flex justify-between">
                                        <span>Story × {services.story}</span>
                                        <span className="font-medium">₹{(getPrice(creator.storyPrice) * services.story).toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                                {services.reelsStory > 0 && (
                                    <div className="flex justify-between">
                                        <span>Reels + Story × {services.reelsStory}</span>
                                        <span className="font-medium">₹{(getPrice(creator.reelsStoryPrice) * services.reelsStory).toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                                <div className="pt-4 mt-4 border-t border-purple-100">
                                    <div className="flex justify-between text-base font-semibold">
                                        <span>Subtotal</span>
                                        <span>₹{subTotalPrice.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-base mt-1">
                                        <span>Service Charge</span>
                                        <span>₹{SERVICE_CHARGE.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                                <div className="pt-3 mt-3 border-t-2 border-purple-300">
                                    <div className="flex justify-between font-bold text-xl text-gray-900">
                                        <span>Grand Total</span>
                                        <span>₹{grandTotalPrice.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                                <h4 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                                    Campaign Details
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-gray-500">Name</p>
                                        <p className="font-medium">{campaign.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Description</p>
                                        <p className="font-medium line-clamp-2">{campaign.description || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Deadline</p>
                                        <p className="font-medium">
                                            {campaign.deadline ? format(campaign.deadline, "PPP") : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Reference Video</p>
                                        <p className="font-medium">
                                            {campaign.demoVideo?.name || 'None'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                                <h4 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                                    Your Details
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-gray-500">Full Name</p>
                                        <p className="font-medium">{bookerDetails.fullName || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Email</p>
                                        <p className="font-medium">{bookerDetails.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Phone</p>
                                        <p className="font-medium">{bookerDetails.phoneNumber || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 5:
                return (
                    <div className="space-y-8">
                        <h3 className="text-2xl font-bold text-gray-800 text-center">
                            Booking Status
                            <span className="block text-sm font-normal text-gray-500 mt-1">
                                Your booking outcome and next steps
                            </span>
                        </h3>
                        {payment.status === 'processing' && (
                            <div className="flex flex-col items-center justify-center py-6">
                                <Loader2 className="h-12 w-12 text-purple-600 animate-spin mb-4" />
                                <p className="text-lg font-medium text-purple-700">
                                    {payment.message || 'Processing your booking...'}
                                </p>
                                <p className="text-gray-600 mt-2">
                                    Please wait while we confirm your payment
                                </p>
                            </div>
                        )}
                        {payment.status === 'success' && (
                            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                                <div className="flex flex-col items-center text-center">
                                    <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                                    <h4 className="text-2xl font-bold text-green-800 mb-2">
                                        Booking Confirmed!
                                    </h4>
                                    <p className="text-green-700 text-lg">
                                        Your booking with {creator.fullName} is confirmed
                                    </p>
                                    <div className="mt-6 bg-white p-4 rounded-lg border border-green-200 w-full max-w-md">
                                        <h5 className="font-bold text-gray-800 mb-3">Booking Summary</h5>
                                        <div className="space-y-2 text-left">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Transaction ID:</span>
                                                <span className="font-medium">{payment.transactionId || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Amount Paid:</span>
                                                <span className="font-medium">₹{grandTotalPrice.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Creator:</span>
                                                <span className="font-medium">{creator.fullName}</span>
                                            </div>
                                            <div className="flex justify-between items-start">
                                                <span className="text-gray-600">Services:</span>
                                                <span className="font-medium text-right flex flex-col items-end">
                                                    {services.reels > 0 && `Reels × ${services.reels}`}
                                                    {services.story > 0 && `Story × ${services.story}`}
                                                    {services.reelsStory > 0 && `Combo × ${services.reelsStory}`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-6">
                                        We&apos;ve sent booking details to {bookerDetails.email}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-2">
                                        You can view your bookings in the &quot;My Orders&quot; section
                                    </p>
                                    <div className="mt-8 bg-purple-50 p-4 rounded-lg border border-purple-200">
                                        <h5 className="font-bold text-purple-800 mb-3">Need assistance? Contact us!</h5>
                                        <div className="flex flex-col items-start text-left space-y-2 text-sm text-purple-700">
                                            <p className="flex items-center">
                                                <Mail className="h-4 w-4 mr-2 text-purple-600" />
                                                <a href="mailto:business@snaapii.com" className="hover:underline">business@snaapii.com</a>
                                            </p>
                                            <p className="flex items-center">
                                                <Phone className="h-4 w-4 mr-2 text-purple-600" />
                                                <a href="tel:+917084989378" className="hover:underline">+91 70849 89378</a>
                                            </p>
                                            <p className="flex items-center">
                                                <MapPin className="h-4 w-4 mr-2 text-purple-600" />
                                                <span>222303 Sultanpur Uttar Pradesh</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {payment.status === 'failed' && (
                            <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                                <div className="flex flex-col items-center text-center">
                                    <XCircle className="h-16 w-16 text-red-500 mb-4" />
                                    <h4 className="text-xl font-bold text-red-800 mb-2">
                                        Booking Failed
                                    </h4>
                                    <p className="text-red-700">
                                        {payment.message || 'There was an issue processing your booking'}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-4">
                                        Please try again or contact support
                                    </p>
                                    {payment.transactionId && (
                                        <p className="text-sm text-gray-600 mt-2">
                                            Transaction ID: {payment.transactionId}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
                <div className="w-full max-w-2xl bg-white p-8 rounded-3xl shadow-xl space-y-6">
                    <Skeleton className="h-12 w-3/4 mb-6 bg-gray-200" />
                    <Skeleton className="h-4 w-1/2 mb-2 bg-gray-200" />
                    <Skeleton className="h-2 w-full bg-gray-200 rounded-full" />
                    <Skeleton className="h-24 w-full bg-gray-200 rounded-xl" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Skeleton className="h-40 w-full bg-gray-200 rounded-xl" />
                        <Skeleton className="h-40 w-full bg-gray-200 rounded-xl" />
                    </div>
                    <Skeleton className="h-12 w-full bg-gray-200 rounded-lg" />
                </div>
            </div>
        );
    }

    if (error || !creator) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
                <div className="text-center max-w-md p-10 bg-white rounded-3xl shadow-2xl border border-purple-300">
                    <XCircle className="h-20 w-20 text-purple-500 mx-auto mb-6" />
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Error</h2>
                    <p className="text-gray-600 mb-8 text-lg">{error || "Creator profile could not be loaded."}</p>
                    <Button onClick={() => router.back()} className="w-full bg-purple-600 hover:bg-purple-700">
                        <ArrowLeft className="mr-2" /> Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 font-sans text-gray-800 p-6 flex items-center justify-center">
            {/* --- FIX: Changed script loading strategy to 'beforeInteractive' for faster loading --- */}
            <Script
                src="https://sdk.cashfree.com/js/v3/cashfree.js"
                onLoad={() => {
                    console.log("Cashfree SDK Loaded!"); 
                    setIsSDKReady(true);
                }}
                strategy="afterInteractive" 
            />
        
            <div className="w-full sm:max-w-2xl bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                        Book {creator.fullName}
                    </h1>
                    <Button variant="ghost" onClick={() => router.push(`/creator/${creator.id}`)} className="text-gray-600 hover:text-gray-900">
                        <ArrowLeft className="mr-2 h-5 w-5" /> Back to Profile
                    </Button>
                </div>
                <div className="mt-6">
                    <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                            Step {step} of {steps.length}
                        </span>
                        <span className="text-sm font-medium text-purple-600">
                            {Math.round((step / steps.length) * 100)}% Complete
                        </span>
                    </div>
                    <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="absolute left-0 top-0 h-full bg-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${(step / steps.length) * 100}%` }}
                        ></div>
                    </div>
                </div>
                <div className="py-6 overflow-y-auto max-h-[70vh] pr-2">
                    {renderStepContent()}
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 pt-6 border-t border-gray-100">
                    {step > 1 && step < steps.length && payment.status === 'idle' && (
                        <Button
                            variant="outline"
                            onClick={handlePrevStep}
                            className="w-full sm:w-auto mt-3 sm:mt-0 px-6 py-2 rounded-lg border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        >
                            Back
                        </Button>
                    )}
                    {step < steps.length - 1 && payment.status === 'idle' && (
                        <Button
                            onClick={handleNextStep}
                            className="w-full sm:w-auto px-6 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                        >
                            Next
                        </Button>
                    )}
                    {step === 4 && payment.status === 'idle' && (
                        <Button
                            onClick={handleSubmitBooking}
                            disabled={!isSDKReady || payment.status === 'processing'}
                            className="w-full sm:w-auto px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                            {payment.status === 'processing' ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {payment.message || 'Processing...'}
                                </>
                            ) : (
                                <>
                                    <ShoppingCart className="mr-2 h-5 w-5" /> Confirm & Pay
                                </>
                            )}
                        </Button>
                    )}
                    {step === 5 && payment.status === 'success' && (
                        <Button
                            onClick={() => router.push(`/creator/${creator?.id}`)}
                            className="w-full sm:w-auto px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                        >
                            Done
                        </Button>
                    )}
                    {step === 5 && payment.status === 'failed' && (
                        <Button
                            onClick={() => setBookingData(prev => ({ ...prev, payment: { status: 'idle' }, step: 4 }))}
                            className="w-full sm:w-auto px-6 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                        >
                            Try Again
                        </Button>
                    )}
                    {step === 5 && payment.status === 'processing' && (
                        <div className="flex items-center justify-center w-full sm:w-auto px-6 py-2 text-gray-700">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing Payment...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookingPage;
