"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    Loader2,
    ArrowRight,
    ArrowLeft,
    Lock,
    Users,
    Calendar,
    BarChart2,
    FileText,
    CheckCircle,
    User,
    Instagram,
    Facebook,
    Youtube,
    Check,
    X,
    CreditCard,
    Plus,
    Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format } from 'date-fns';
import { db, auth } from '@/lib/firebaseConfig';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { addDoc, collection } from 'firebase/firestore';
import { toast } from 'sonner';
import { cn } from "@/lib/utils"; // Import cn for conditional classnames


// --- Constants for Pricing ---
const BUDGET_INCREMENTS = [100, 200, 500, 1000, 2000];
const SERVICE_FEE_TIERS = [
    { creators: 5, fee: 1599 },
    { creators: 10, fee: 4999 },
    { creators: 20, fee: 15999 },
    { creators: 30, fee: 41999 },
    { creators: 40, fee: 79999 },
    { creators: 50, fee: 99999 },
    { creators: 100, fee: 219999 },
    { creators: 200, fee: 399999 },
];


// --- Interfaces ---
interface CampaignFormData {
    campaignName: string;
    platform: 'Instagram' | 'Youtube' | 'Facebook' | '';
    services: {
        reel: number;
        story: number;
        reelAndStory: number;
    };
    numberOfCreators: number;
    totalCreatorBudget: number | '';
    minimumFollowers: number | '';
    averageViews: number | ''; // This field is not used in the form, but kept in interface
    minAge: number | '';
    maxAge: number | '';
    gender: 'Male' | 'Female' | 'Any' | '';
    location: string;
    categories: string[];
    campaignDescription: string;
    deadline: string;
    demoVideoUrl?: string;
    ownerFullName: string;
    contactNumber: string;
    whatsappContactNumber: string;
    ownerEmailAddress: string;
    brandName: string;
    ownerCity: string;
    ownerDistrict: string;
    ownerState: string;
    ownerCountry: string;
}

interface RateCardEntry {
    tier: number;
    label: string;
    reelPrice: number;
    storyPrice: number;
    comboPrice: number;
}

// --- Type Definitions for Razorpay ---
interface RazorpaySuccessResponse {
    razorpay_payment_id: string;
}

interface RazorpayErrorResponse {
    error: {
        description: string;
    };
}

// --- Data ---
const INSTAGRAM_RATE_CARD: RateCardEntry[] = [
    { tier: 1000, label: '1K', reelPrice: 500, storyPrice: 300, comboPrice: 700 },
    { tier: 2000, label: '2K', reelPrice: 800, storyPrice: 500, comboPrice: 1200 },
    { tier: 5000, label: '5K', reelPrice: 1500, storyPrice: 1000, comboPrice: 2300 },
    { tier: 10000, label: '10K', reelPrice: 3000, storyPrice: 1500, comboPrice: 4200 },
    { tier: 20000, label: '20K', reelPrice: 4000, storyPrice: 2500, comboPrice: 6000 },
    { tier: 30000, label: '30K', reelPrice: 6000, storyPrice: 4000, comboPrice: 9000 },
    { tier: 50000, label: '50K', reelPrice: 8000, storyPrice: 5000, comboPrice: 12000 },
    { tier: 70000, label: '70K', reelPrice: 15000, storyPrice: 6000, comboPrice: 19000 },
    { tier: 100000, label: '100K', reelPrice: 20000, storyPrice: 10000, comboPrice: 28000 },
    { tier: 200000, label: '200K', reelPrice: 25000, storyPrice: 10000, comboPrice: 33000 },
    { tier: 300000, label: '300K', reelPrice: 30000, storyPrice: 12000, comboPrice: 40000 },
    { tier: 400000, label: '400K', reelPrice: 40000, storyPrice: 15000, comboPrice: 52000 },
    { tier: 500000, label: '500K', reelPrice: 60000, storyPrice: 18000, comboPrice: 75000 },
    { tier: 750000, label: '750K', reelPrice: 70000, storyPrice: 20000, comboPrice: 85000 },
    { tier: 1000000, label: '1M', reelPrice: 75000, storyPrice: 25000, comboPrice: 95000 },
    { tier: 2000000, label: '2M', reelPrice: 80000, storyPrice: 30000, comboPrice: 105000 },
];

const steps = [
    { name: 'Campaign Details', icon: FileText, fields: ['campaignName', 'platform'] },
    { name: 'Services & Budget', icon: Users, fields: ['minimumFollowers', 'numberOfCreators', 'services'] }, // Added 'services' for validation
    { name: 'Target Audience', icon: BarChart2, fields: ['minAge', 'maxAge', 'gender', 'location'] },
    { name: 'Content & Deadline', icon: Calendar, fields: ['categories', 'campaignDescription', 'deadline'] },
    { name: 'Owner Details', icon: User, fields: ['ownerFullName', 'contactNumber', 'ownerEmailAddress', 'ownerCity', 'ownerDistrict', 'ownerState', 'ownerCountry'] },
    { name: 'Summary & Payment', icon: CreditCard, fields: [] },
    { name: 'Confirmation', icon: CheckCircle, fields: [] },
];

// --- New and Expanded Categories Array ---
const ALL_CATEGORIES = [
    'Fashion', 'Beauty', 'Lifestyle', 'Fitness', 'Travel', 'Food', 'Technology',
    'Gaming', 'Comedy', 'Motivation', 'Music', 'Dance', 'Photography', 'Art',
    'DIY (Do It Yourself)', 'Education', 'Finance', 'Health & Wellness', 'Parenting',
    'Pets', 'Cars & Automobiles', "Men's Grooming", 'Home Decor', 'Spirituality',
    'Acting', 'Reviews & Unboxing', 'Astrology', 'Modeling', 'Vlogger',
    'Books & Reading', 'Makeup', 'Nails & Nail Art', 'Skincare',
    'Saree & Ethnic Wear', 'Luxury Lifestyle', 'Entertainment'
];

const CampaignCreationPage = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<CampaignFormData>({
        campaignName: '', platform: '',
        services: { reel: 0, story: 0, reelAndStory: 0 },
        numberOfCreators: 1,
        totalCreatorBudget: '', minimumFollowers: '', averageViews: '',
        minAge: '', maxAge: '', gender: '', location: '', categories: [],
        campaignDescription: '', deadline: '', demoVideoUrl: '',
        ownerFullName: '', contactNumber: '', whatsappContactNumber: '',
        ownerEmailAddress: '', brandName: '', ownerCity: '',
        ownerDistrict: '', ownerState: '', ownerCountry: '',
    });
    const [user, setUser] = useState<FirebaseAuthUser | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isClient, setIsClient] = useState(false);
    // State to hold validation errors
    const [errors, setErrors] = useState<Partial<Record<keyof CampaignFormData | 'services', string>>>({});

    useEffect(() => { setIsClient(true); }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                setFormData(prev => ({
                    ...prev,
                    ownerFullName: prev.ownerFullName || currentUser.displayName || '',
                    ownerEmailAddress: prev.ownerEmailAddress || currentUser.email || '',
                }));
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    const getMinimumBudgetForService = (followers: number, serviceType: keyof CampaignFormData['services']): number => {
        if (!followers || followers <= 0) return 0;
        let selectedTier = INSTAGRAM_RATE_CARD.slice().reverse().find(entry => followers >= entry.tier);
        if (!selectedTier) selectedTier = INSTAGRAM_RATE_CARD[0];

        const priceMap = {
            reel: selectedTier.reelPrice,
            story: selectedTier.storyPrice,
            reelAndStory: selectedTier.comboPrice,
        };
        return priceMap[serviceType] || 0;
    };

    const estimatedMinimumBudget = useMemo(() => {
        const followers = Number(formData.minimumFollowers);
        if (!followers || isNaN(followers)) return 0; // Handle NaN for initial empty string

        const reelCost = formData.services.reel * getMinimumBudgetForService(followers, 'reel');
        const storyCost = formData.services.story * getMinimumBudgetForService(followers, 'story');
        const comboCost = formData.services.reelAndStory * getMinimumBudgetForService(followers, 'reelAndStory');

        return (reelCost + storyCost + comboCost) * formData.numberOfCreators;
    }, [formData.minimumFollowers, formData.services, formData.numberOfCreators]);

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            totalCreatorBudget: estimatedMinimumBudget
        }));
    }, [estimatedMinimumBudget]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isNumeric = type === 'number';
        setFormData({ ...formData, [name]: isNumeric ? (value === '' ? '' : Number(value)) : value });
        // Clear error for the current field when user starts typing
        setErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const handleSelectChange = (name: keyof Omit<CampaignFormData, 'services'>, value: string) => {
        setFormData({ ...formData, [name]: value as any }); // Type assertion for flexibility
        // Clear error for the current field
        setErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const handleCategoryChange = (category: string) => {
        setFormData((prev) => {
            const newCategories = prev.categories.includes(category)
                ? prev.categories.filter((c) => c !== category)
                : [...prev.categories, category];
            // Clear error for categories if at least one is selected
            if (newCategories.length > 0) {
                setErrors(prevErrors => ({ ...prevErrors, categories: undefined }));
            }
            return { ...prev, categories: newCategories };
        });
    };

    const handleCountChange = (field: 'reel' | 'story' | 'reelAndStory' | 'numberOfCreators', change: 1 | -1) => {
        setFormData(prev => {
            let newFormData = { ...prev };
            if (field === 'numberOfCreators') {
                newFormData = { ...prev, numberOfCreators: Math.max(1, prev.numberOfCreators + change) };
            } else {
                const currentCount = prev.services[field];
                const newCount = Math.max(0, currentCount + change);
                newFormData = { ...prev, services: { ...prev.services, [field]: newCount } };
            }
            // Clear 'services' error if any service count becomes greater than 0
            const totalServices = Object.values(newFormData.services).reduce((sum, count) => sum + count, 0);
            if (totalServices > 0) {
                setErrors(prevErrors => ({ ...prevErrors, services: undefined }));
            }
            return newFormData;
        });
    };

    const handleBudgetIncrement = (amount: number) => {
        setFormData(prev => ({
            ...prev,
            totalCreatorBudget: (Number(prev.totalCreatorBudget) || 0) + amount
        }));
    };

    const validateStep = (): boolean => {
        const currentFields = steps[currentStep].fields;
        let newErrors: Partial<Record<keyof CampaignFormData | 'services', string>> = {};
        let isValid = true;

        for (const field of currentFields) {
            const value = formData[field as keyof CampaignFormData];

            if (field === 'services') { // Special handling for services object
                const totalServices = Object.values(formData.services).reduce((sum, count) => sum + count, 0);
                if (totalServices === 0) {
                    newErrors.services = 'Please select at least one service.';
                    isValid = false;
                }
            } else if (field === 'categories') { // Special handling for categories array
                if (Array.isArray(value) && value.length === 0) {
                    newErrors.categories = 'Please select at least one category.';
                    isValid = false;
                }
            } else if (!value && value !== 0) { // General check for empty values (excluding 0 for numbers)
                newErrors[field as keyof CampaignFormData] = 'This field is required.';
                isValid = false;
            }
        }

        // Step-specific validations
        switch (currentStep) {
            case 1: // Services & Budget
                if (Number(formData.minimumFollowers) < 1000) {
                    newErrors.minimumFollowers = 'Minimum followers must be at least 1,000.';
                    isValid = false;
                }
                break;
            case 2: // Target Audience
                if (Number(formData.minAge) > Number(formData.maxAge)) {
                    newErrors.minAge = 'Min age cannot be greater than max age.';
                    newErrors.maxAge = 'Max age cannot be less than min age.';
                    isValid = false;
                }
                if (Number(formData.minAge) < 13) {
                    newErrors.minAge = 'Minimum age must be at least 13.';
                    isValid = false;
                }
                break;
            case 3: // Content & Deadline
                if (formData.deadline && new Date(formData.deadline) < new Date()) {
                    newErrors.deadline = 'Deadline cannot be in the past.';
                    isValid = false;
                }
                break;
            case 4: // Owner Details
                const phoneRegex = /^\+?\d{10,15}$/;
                if (formData.contactNumber && !phoneRegex.test(formData.contactNumber)) {
                    newErrors.contactNumber = 'Please enter a valid Contact Number (10-15 digits).';
                    isValid = false;
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (formData.ownerEmailAddress && !emailRegex.test(formData.ownerEmailAddress)) {
                    newErrors.ownerEmailAddress = 'Please enter a valid Email Address.';
                    isValid = false;
                }
                break;
        }

        setErrors(newErrors); // Update the error state
        if (!isValid) {
            toast.error('Please correct the highlighted errors before proceeding.');
        }
        return isValid;
    };

    const nextStep = () => {
        if (validateStep()) {
            setCurrentStep(currentStep + 1);
            setErrors({}); // Clear errors when moving to the next step
        }
    };
    const prevStep = () => {
        setCurrentStep(currentStep - 1);
        setErrors({}); // Clear errors when moving back
    };

    const getServiceFee = (creators: number): number => {
        if (creators <= 0) return 0;
        const applicableTier = SERVICE_FEE_TIERS
            .slice()
            .reverse()
            .find(tier => creators >= tier.creators);

        return applicableTier ? applicableTier.fee : (SERVICE_FEE_TIERS[0]?.fee || 0);
    };

    const { creatorsCost, serviceFee, totalAmount } = useMemo(() => {
        const creatorsCost = Number(formData.totalCreatorBudget) || 0;
        const serviceFee = getServiceFee(formData.numberOfCreators);
        const totalAmount = creatorsCost + serviceFee;
        return { creatorsCost, serviceFee, totalAmount };
    }, [formData.totalCreatorBudget, formData.numberOfCreators]);

    const handlePayment = async () => {
        if (!user) {
            toast.error('Authentication error. Please refresh and log in to proceed.');
            return;
        }
        if (totalAmount <= 0) {
            toast.error('Total amount must be greater than zero.');
            return;
        }

        setIsSubmitting(true);
        try {
            const loadRazorpayScript = () => new Promise<void>((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.onload = () => resolve();
                document.body.appendChild(script);
            });
            await loadRazorpayScript();

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: Math.round(totalAmount * 100), // Razorpay expects amount in paisa
                currency: 'INR',
                name: 'Snaapii Campaign',
                description: `Payment for ${formData.campaignName}`,
                handler: async (response: RazorpaySuccessResponse) => {
                    try {
                        const campaignData = {
                            ...formData,
                            costs: { creatorsCost, serviceFee, totalAmount },
                            userInfo: { uid: user.uid, displayName: user.displayName, email: user.email },
                            razorpayPaymentId: response.razorpay_payment_id,
                            status: 'pending_review',
                            createdAt: new Date().toISOString(),
                        };

                        await addDoc(collection(db, "campaigns"), campaignData);

                        setPaymentStatus('success');
                        setCurrentStep(currentStep + 1);
                        toast.success('Payment successful and campaign created!');
                    } catch (firestoreError) {
                        console.error('Error saving campaign to Firestore:', firestoreError);
                        toast.error('Payment successful, but failed to save campaign data.');
                        setPaymentStatus('failed');
                        setCurrentStep(currentStep + 1);
                    }
                },
                prefill: { name: formData.ownerFullName, email: formData.ownerEmailAddress, contact: formData.contactNumber },
                theme: { color: '#8B5CF6' }, // Purple shade for Razorpay theme
            };
            // @ts-expect-error Razorpay is loaded dynamically
            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', (response: RazorpayErrorResponse) => {
                toast.error(`Payment failed: ${response.error.description}`);
                setPaymentStatus('failed');
                setCurrentStep(currentStep + 1);
            });
            rzp1.open();
        } catch (err) {
            console.error('An error occurred during payment setup.', err);
            toast.error('An error occurred during payment setup.');
            setPaymentStatus('failed');
            setCurrentStep(currentStep + 1);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return (
                    <>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Step 1: Campaign Details</h2>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="campaignName" className="font-semibold text-gray-700">Campaign Name</Label>
                                <Input
                                    id="campaignName"
                                    name="campaignName"
                                    value={formData.campaignName}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Summer Collection Launch"
                                    className={cn("mt-1", errors.campaignName && 'border-red-500')}
                                />
                                {errors.campaignName && <p className="text-red-500 text-sm mt-1">{errors.campaignName}</p>}
                            </div>
                            <div>
                                <Label className="font-semibold text-gray-700">Platform</Label>
                                <RadioGroup
                                    value={formData.platform}
                                    onValueChange={(v) => handleSelectChange('platform', v)}
                                    className={cn(`grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2`, errors.platform && 'border border-red-500 p-2 rounded-lg')}
                                >
                                    {(['Instagram', 'Youtube', 'Facebook'] as const).map(p => {
                                        const Icon = { Instagram, Youtube, Facebook }[p];
                                        return (
                                            <Label key={p} className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-all ${formData.platform === p ? 'border-purple-600 bg-purple-50 shadow-md' : 'border-gray-300 hover:border-purple-400'}`}>
                                                <RadioGroupItem value={p} className="sr-only" />
                                                <Icon className={`h-6 w-6 ${p === 'Instagram' ? 'text-pink-600' : p === 'Youtube' ? 'text-red-600' : 'text-blue-800'}`} />
                                                <span className="font-medium">{p}</span>
                                            </Label>
                                        )
                                    })}
                                </RadioGroup>
                                {errors.platform && <p className="text-red-500 text-sm mt-1">{errors.platform}</p>}
                            </div>
                        </div>
                    </>
                );
            case 1:
                return (
                    <>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Step 2: Services & Budget</h2>
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Left Column */}
                            <div className="space-y-6 w-full">
                                <div>
                                    <Label htmlFor="minimumFollowers" className="font-semibold text-gray-700">Minimum Followers</Label>
                                    <Input
                                        id="minimumFollowers"
                                        name="minimumFollowers"
                                        type="number"
                                        min="1000"
                                        value={formData.minimumFollowers}
                                        onChange={handleInputChange}
                                        placeholder="e.g., 10000"
                                        className={cn("mt-1", errors.minimumFollowers && 'border-red-500')}
                                    />
                                    {errors.minimumFollowers && <p className="text-red-500 text-sm mt-1">{errors.minimumFollowers}</p>}
                                </div>
                                <div className="space-y-3">
                                    <Label className="font-semibold text-gray-700">Select Services</Label>
                                    <div className={cn(`p-4 border rounded-lg space-y-4 bg-gray-50`, errors.services && 'border-red-500')}>
                                        {(['reel', 'story', 'reelAndStory'] as const).map(serviceKey => (
                                            <div key={serviceKey} className="flex items-center justify-between">
                                                <p className="font-medium text-gray-800">{{ reel: 'Reels', story: 'Story', reelAndStory: 'Reels + Story' }[serviceKey]}</p>
                                                <div className="flex items-center gap-3">
                                                    <Button size="icon" variant="outline" className="rounded-full h-8 w-8" onClick={() => handleCountChange(serviceKey, -1)}><Minus className="h-4 w-4" /></Button>
                                                    <span className="font-bold text-lg w-8 text-center">{formData.services[serviceKey]}</span>
                                                    <Button size="icon" variant="outline" className="rounded-full h-8 w-8" onClick={() => handleCountChange(serviceKey, 1)}><Plus className="h-4 w-4" /></Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {errors.services && <p className="text-red-500 text-sm mt-1">{errors.services}</p>}
                                </div>
                            </div>
                            {/* Right Column */}
                            <div className="space-y-6 w-full">
                                <div className="space-y-3">
                                    <Label className="font-semibold text-gray-700">Number of Creators</Label>
                                    <div className="flex items-center gap-3 p-4 border rounded-lg bg-gray-50 justify-center">
                                        <Button size="icon" variant="outline" className="rounded-full h-8 w-8" onClick={() => handleCountChange('numberOfCreators', -1)}><Minus className="h-4 w-4" /></Button>
                                        <span className="font-bold text-2xl w-12 text-center">{formData.numberOfCreators}</span>
                                        <Button size="icon" variant="outline" className="rounded-full h-8 w-8" onClick={() => handleCountChange('numberOfCreators', 1)}><Plus className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                                <div className="p-4 border-2 border-dashed border-purple-300 bg-purple-50 rounded-lg text-center">
                                    <p className="text-sm font-semibold text-purple-800">Estimated Minimum Budget</p>
                                    <p className="text-2xl sm:text-3xl font-extrabold text-purple-900 mt-1">₹{estimatedMinimumBudget.toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                    <Label htmlFor="totalCreatorBudget" className="font-semibold text-gray-700">Total Creator Budget (₹)</Label>
                                    <Input
                                        id="totalCreatorBudget"
                                        name="totalCreatorBudget"
                                        type="text"
                                        value={`₹ ${Number(formData.totalCreatorBudget).toLocaleString('en-IN')}`}
                                        readOnly
                                        className="mt-1 text-lg font-bold bg-white"
                                    />
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {BUDGET_INCREMENTS.map(inc => (
                                            <Button key={inc} variant="outline" size="sm" onClick={() => handleBudgetIncrement(inc)} className="text-xs">
                                                + ₹{inc.toLocaleString('en-IN')}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                );
            case 2:
                return (
                    <>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Step 3: Target Audience</h2>
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="w-full sm:w-1/2">
                                    <Label htmlFor="minAge" className="font-semibold text-gray-700">Minimum Age</Label>
                                    <Input
                                        id="minAge"
                                        name="minAge"
                                        type="number"
                                        min="13"
                                        value={formData.minAge}
                                        onChange={handleInputChange}
                                        placeholder="e.g., 18"
                                        className={cn("mt-1", errors.minAge && 'border-red-500')}
                                    />
                                    {errors.minAge && <p className="text-red-500 text-sm mt-1">{errors.minAge}</p>}
                                </div>
                                <div className="w-full sm:w-1/2">
                                    <Label htmlFor="maxAge" className="font-semibold text-gray-700">Maximum Age</Label>
                                    <Input
                                        id="maxAge"
                                        name="maxAge"
                                        type="number"
                                        min="13"
                                        value={formData.maxAge}
                                        onChange={handleInputChange}
                                        placeholder="e.g., 35"
                                        className={cn("mt-1", errors.maxAge && 'border-red-500')}
                                    />
                                    {errors.maxAge && <p className="text-red-500 text-sm mt-1">{errors.maxAge}</p>}
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="gender" className="font-semibold text-gray-700">Gender</Label>
                                <Select onValueChange={(value) => handleSelectChange('gender', value)} value={formData.gender}>
                                    <SelectTrigger className={cn("w-full mt-1", errors.gender && 'border-red-500')}><SelectValue placeholder="Select target gender" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Any">Any</SelectItem>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
                            </div>
                            <div>
                                <Label htmlFor="location" className="font-semibold text-gray-700">Location (City, State)</Label>
                                <Input
                                    id="location"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Mumbai, Maharashtra"
                                    className={cn("mt-1", errors.location && 'border-red-500')}
                                />
                                {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
                            </div>
                        </div>
                    </>
                );
            case 3:
                return (
                    <>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Step 4: Content & Deadline</h2>
                        <div className="space-y-4">
                            <div>
                                <Label className="font-semibold text-gray-700">Categories</Label>
                                <div className={cn(`flex flex-wrap gap-2 mt-2`, errors.categories && 'border border-red-500 p-2 rounded-lg')}>
                                    {ALL_CATEGORIES.map((category) => ( // Use ALL_CATEGORIES here
                                        <Button
                                            key={category}
                                            onClick={() => handleCategoryChange(category)}
                                            variant={formData.categories.includes(category) ? 'default' : 'outline'}
                                            className={cn("rounded-full text-xs sm:text-sm py-1 px-3",
                                                formData.categories.includes(category) ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-gray-300 hover:bg-gray-100'
                                            )}
                                        >
                                            {category}
                                        </Button>
                                    ))}
                                </div>
                                {errors.categories && <p className="text-red-500 text-sm mt-1">{errors.categories}</p>}
                            </div>
                            <div>
                                <Label htmlFor="campaignDescription" className="font-semibold text-gray-700">Campaign Description</Label>
                                <Textarea
                                    id="campaignDescription"
                                    name="campaignDescription"
                                    value={formData.campaignDescription}
                                    onChange={handleInputChange}
                                    placeholder="Describe your campaign goals and requirements..."
                                    className={cn("mt-1 min-h-[120px]", errors.campaignDescription && 'border-red-500')}
                                />
                                {errors.campaignDescription && <p className="text-red-500 text-sm mt-1">{errors.campaignDescription}</p>}
                            </div>
                            <div>
                                <Label htmlFor="deadline" className="font-semibold text-gray-700">Deadline</Label>
                                <Input
                                    id="deadline"
                                    name="deadline"
                                    type="date"
                                    value={formData.deadline}
                                    onChange={handleInputChange}
                                    className={cn("mt-1", errors.deadline && 'border-red-500')}
                                />
                                {errors.deadline && <p className="text-red-500 text-sm mt-1">{errors.deadline}</p>}
                            </div>
                            <div>
                                <Label htmlFor="demoVideoUrl" className="font-semibold text-gray-700">Demo Video URL (Optional)</Label>
                                <Input
                                    id="demoVideoUrl"
                                    name="demoVideoUrl"
                                    value={formData.demoVideoUrl}
                                    onChange={handleInputChange}
                                    placeholder="Link to a demo video (e.g., YouTube)"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </>
                );
            case 4:
                return (
                    <>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Step 5: Campaign Owner Details</h2>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="ownerFullName" className="font-semibold text-gray-700">Official Full Name</Label>
                                <Input
                                    id="ownerFullName"
                                    name="ownerFullName"
                                    value={formData.ownerFullName}
                                    onChange={handleInputChange}
                                    placeholder="Your full name"
                                    className={cn("mt-1", errors.ownerFullName && 'border-red-500')}
                                />
                                {errors.ownerFullName && <p className="text-red-500 text-sm mt-1">{errors.ownerFullName}</p>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="contactNumber" className="font-semibold text-gray-700">Contact Number</Label>
                                    <Input
                                        id="contactNumber"
                                        name="contactNumber"
                                        type="tel"
                                        value={formData.contactNumber}
                                        onChange={handleInputChange}
                                        placeholder="+91 9876543210"
                                        className={cn("mt-1", errors.contactNumber && 'border-red-500')}
                                    />
                                    {errors.contactNumber && <p className="text-red-500 text-sm mt-1">{errors.contactNumber}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="whatsappContactNumber" className="font-semibold text-gray-700">WhatsApp Number (Optional)</Label>
                                    <Input
                                        id="whatsappContactNumber"
                                        name="whatsappContactNumber"
                                        type="tel"
                                        value={formData.whatsappContactNumber}
                                        onChange={handleInputChange}
                                        placeholder="If different from contact no."
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="ownerEmailAddress" className="font-semibold text-gray-700">Email Address</Label>
                                <Input
                                    id="ownerEmailAddress"
                                    name="ownerEmailAddress"
                                    type="email"
                                    value={formData.ownerEmailAddress}
                                    onChange={handleInputChange}
                                    placeholder="your.email@example.com"
                                    className={cn("mt-1", errors.ownerEmailAddress && 'border-red-500')}
                                />
                                {errors.ownerEmailAddress && <p className="text-red-500 text-sm mt-1">{errors.ownerEmailAddress}</p>}
                            </div>
                            <div>
                                <Label htmlFor="brandName" className="font-semibold text-gray-700">Brand Name (Optional)</Label>
                                <Input
                                    id="brandName"
                                    name="brandName"
                                    value={formData.brandName}
                                    onChange={handleInputChange}
                                    placeholder="e.g., My Awesome Brand"
                                    className="mt-1"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <Label htmlFor="ownerCity" className="font-semibold text-gray-700">City</Label>
                                    <Input
                                        id="ownerCity"
                                        name="ownerCity"
                                        value={formData.ownerCity}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Bangalore"
                                        className={cn("mt-1", errors.ownerCity && 'border-red-500')}
                                    />
                                    {errors.ownerCity && <p className="text-red-500 text-sm mt-1">{errors.ownerCity}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="ownerDistrict" className="font-semibold text-gray-700">District</Label>
                                    <Input
                                        id="ownerDistrict"
                                        name="ownerDistrict"
                                        value={formData.ownerDistrict}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Bangalore Urban"
                                        className={cn("mt-1", errors.ownerDistrict && 'border-red-500')}
                                    />
                                    {errors.ownerDistrict && <p className="text-red-500 text-sm mt-1">{errors.ownerDistrict}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="ownerState" className="font-semibold text-gray-700">State</Label>
                                    <Input
                                        id="ownerState"
                                        name="ownerState"
                                        value={formData.ownerState}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Karnataka"
                                        className={cn("mt-1", errors.ownerState && 'border-red-500')}
                                    />
                                    {errors.ownerState && <p className="text-red-500 text-sm mt-1">{errors.ownerState}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="ownerCountry" className="font-semibold text-gray-700">Country</Label>
                                    <Input
                                        id="ownerCountry"
                                        name="ownerCountry"
                                        value={formData.ownerCountry}
                                        onChange={handleInputChange}
                                        placeholder="e.g., India"
                                        className={cn("mt-1", errors.ownerCountry && 'border-red-500')}
                                    />
                                    {errors.ownerCountry && <p className="text-red-500 text-sm mt-1">{errors.ownerCountry}</p>}
                                </div>
                            </div>
                        </div>
                    </>
                );
            case 5:
                return (
                    <>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 text-center">Final Step: Review & Pay</h2>
                        <p className="text-center text-gray-500 mb-6">Confirm your campaign details and proceed to payment.</p>
                        <div className="flex flex-col lg:flex-row gap-6">
                            <div className="lg:w-3/5 space-y-6">
                                <div className="bg-white p-4 sm:p-5 rounded-xl border">
                                    <h3 className="font-bold text-lg mb-3 flex items-center"><FileText className="mr-2 h-5 w-5 text-purple-600" />Campaign Summary</h3>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <p className="text-gray-500">Name</p><p className="font-medium text-gray-800">{formData.campaignName}</p>
                                        <p className="text-gray-500">Platform</p><p className="font-medium text-gray-800">{formData.platform}</p>
                                        <p className="text-gray-500">Deadline</p><p className="font-medium text-gray-800">{formData.deadline ? format(new Date(formData.deadline), 'PPP') : 'N/A'}</p>
                                        <p className="text-gray-500 col-span-2">Categories</p><p className="font-medium text-gray-800 col-span-2">{formData.categories.join(', ') || 'None'}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-4 sm:p-5 rounded-xl border">
                                    <h3 className="font-bold text-lg mb-3 flex items-center"><Users className="mr-2 h-5 w-5 text-purple-600" />Services & Targeting</h3>
                                    <div className="space-y-2 text-sm">
                                        {formData.services.reel > 0 && <p><span className="font-medium text-gray-800">{formData.services.reel} x</span> Instagram Reels</p>}
                                        {formData.services.story > 0 && <p><span className="font-medium text-gray-800">{formData.services.story} x</span> Instagram Stories</p>}
                                        {formData.services.reelAndStory > 0 && <p><span className="font-medium text-gray-800">{formData.services.reelAndStory} x</span> Reels + Story Packages</p>}
                                    </div>
                                    <div className="border-t my-3"></div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <p className="text-gray-500">Total Creators</p><p className="font-medium text-gray-800">{formData.numberOfCreators}</p>
                                        <p className="text-gray-500">Min Followers</p><p className="font-medium text-gray-800">{Number(formData.minimumFollowers).toLocaleString('en-IN')}</p>
                                        <p className="text-gray-500">Target Age</p><p className="font-medium text-gray-800">{formData.minAge}-{formData.maxAge} years</p>
                                        <p className="text-gray-500">Gender</p><p className="font-medium text-gray-800">{formData.gender}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="lg:w-2/5 lg:sticky lg:top-8">
                                <div className="bg-purple-50 border border-purple-200 p-4 sm:p-6 rounded-xl space-y-4">
                                    <h3 className="font-bold text-lg text-center text-gray-800">Cost Breakdown</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <p className="text-gray-600">Total Creator Budget</p>
                                            <p className="font-medium text-gray-800">₹{creatorsCost.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="flex justify-between">
                                            <p className="text-gray-600">Platform Fee</p>
                                            <p className="font-medium text-gray-800">₹{serviceFee.toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                    <div className="border-t border-dashed border-gray-300 my-4"></div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-lg font-bold text-gray-900">Total Payable</p>
                                        <p className="text-xl sm:text-2xl font-extrabold text-purple-700">₹{Math.round(totalAmount).toLocaleString('en-IN')}</p>
                                    </div>
                                    <Button onClick={handlePayment} disabled={isSubmitting || !user} className="w-full bg-purple-600 hover:bg-purple-700 text-base py-3 mt-4">
                                        {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Lock className="mr-2 h-5 w-5" />}
                                        Pay Securely
                                    </Button>
                                    {!user && <p className="text-xs text-red-500 text-center mt-2">Please log in to complete payment.</p>}
                                </div>
                            </div>
                        </div>
                    </>
                );
            case 6:
                return (
                    <div className="text-center py-8 sm:py-10">
                        {paymentStatus === 'success' ? (
                            <>
                                <CheckCircle className="h-16 w-16 sm:h-20 sm:w-20 text-green-500 mx-auto animate-pulse" />
                                <h3 className="text-2xl sm:text-3xl font-bold text-green-600 mt-4">Payment Successful!</h3>
                                <p className="text-gray-600 mt-2">Your campaign is under review. We&apos;ll notify you upon approval.</p>
                                <Button onClick={() => window.location.reload()} className="mt-6 bg-purple-600 hover:bg-purple-700">Create Another Campaign</Button>
                            </>
                        ) : (
                            <>
                                <X className="h-16 w-16 sm:h-20 sm:w-20 text-red-500 mx-auto" />
                                <h3 className="text-2xl sm:text-3xl font-bold text-red-600 mt-4">Payment Failed</h3>
                                <p className="text-gray-600 mt-2">There was an issue with your payment. Please try again.</p>
                                <Button onClick={() => setCurrentStep(5)} className="mt-6" variant="destructive">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Try Again
                                </Button>
                            </>
                        )}
                    </div>
                );
            default: return null;
        }
    };

    if (!isClient || !isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto px-2 sm:px-4 py-4 max-w-6xl">
                {/* Added pb-20 to ensure content is not hidden behind a potential bottom navbar */}
                <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 pb-20">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-center text-gray-800 mb-2">
                        Launch Your Next Campaign
                    </h1>
                    <p className="text-center text-gray-500 mb-6 sm:mb-8">Follow the steps below to get your campaign's live.</p>

                    <div className="flex justify-between items-start mb-6 sm:mb-8 relative">
                        <div className="absolute top-5 left-0 w-full h-1 bg-gray-200 transform -translate-y-1/2">
                            <div className="h-full bg-purple-600 transition-all duration-500" style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}></div>
                        </div>
                        {steps.map((step, index) => (
                            <div key={index} className="relative z-10 flex flex-col items-center flex-1">
                                <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full font-bold text-white transition-all duration-300 border-4 ${index <= currentStep ? 'bg-purple-600 border-white' : 'bg-gray-300 border-gray-50'}`}>
                                    {index < currentStep ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : <step.icon className="h-4 w-4 sm:h-5 sm:w-5" />}
                                </div>
                                <span className={`mt-2 text-xs text-center font-semibold hidden xs:block ${index <= currentStep ? 'text-purple-600' : 'text-gray-500'}`}>
                                    {step.name}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="min-h-[400px] sm:min-h-[450px]">
                        {renderStep()}
                    </div>

                    {currentStep < steps.length - 1 && ( // Show navigation if not on the last (Confirmation) step
                        <div className="flex justify-between mt-6 pt-4 border-t">
                            <Button onClick={prevStep} variant="outline" className="px-3 sm:px-4 py-2 text-sm sm:text-base" disabled={currentStep === 0}>
                                <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" /> Back
                            </Button>
                            {currentStep < steps.length - 2 ? ( // Regular Next button
                                <Button onClick={nextStep} className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 hover:bg-green-700">
                                    Next <ArrowRight className="ml-1 sm:ml-2 h-4 w-4" />
                                </Button>
                            ) : ( // Review & Pay button on the step before Confirmation
                                <Button onClick={nextStep} className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-purple-600 hover:bg-purple-700">
                                    Review & Pay <ArrowRight className="ml-1 sm:ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CampaignCreationPage;