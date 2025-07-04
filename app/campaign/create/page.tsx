// file: app/campaign/create/page.tsx

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    Loader2,
    ArrowRight,
    ArrowLeft,
    Lock,
    Users,
    DollarSign,
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

// --- Constants for Pricing ---
const BUDGET_INCREMENTS = [100, 200, 500, 1000, 2000];
// --- CHANGE: New service fee structure based on creator count ---
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
    averageViews: number | '';
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
    { name: 'Services & Budget', icon: Users, fields: ['minimumFollowers', 'numberOfCreators', 'totalCreatorBudget'] },
    { name: 'Target Audience', icon: BarChart2, fields: ['minAge', 'maxAge', 'gender', 'location'] },
    { name: 'Content & Deadline', icon: Calendar, fields: ['categories', 'campaignDescription', 'deadline'] },
    { name: 'Owner Details', icon: User, fields: ['ownerFullName', 'contactNumber', 'ownerEmailAddress', 'ownerCity', 'ownerDistrict', 'ownerState', 'ownerCountry'] },
    { name: 'Summary & Payment', icon: CreditCard, fields: [] },
    { name: 'Confirmation', icon: CheckCircle, fields: [] },
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

    useEffect(() => { setIsClient(true); }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if(currentUser) {
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
        if (!followers) return 0;

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
    };

    const handleSelectChange = (name: keyof Omit<CampaignFormData, 'services'>, value: string) => {
        setFormData({ ...formData, [name]: value as any });
    };

    const handleCategoryChange = (category: string) => {
        setFormData((prev) => ({
            ...prev,
            categories: prev.categories.includes(category)
                ? prev.categories.filter((c) => c !== category)
                : [...prev.categories, category],
        }));
    };
    
    const handleCountChange = (field: 'reel' | 'story' | 'reelAndStory' | 'numberOfCreators', change: 1 | -1) => {
        setFormData(prev => {
            if (field === 'numberOfCreators') {
                return { ...prev, numberOfCreators: Math.max(1, prev.numberOfCreators + change) };
            }
            const currentCount = prev.services[field];
            const newCount = Math.max(0, currentCount + change);
            return { ...prev, services: { ...prev.services, [field]: newCount } };
        });
    };

    const handleBudgetIncrement = (amount: number) => {
        setFormData(prev => ({
            ...prev,
            totalCreatorBudget: (Number(prev.totalCreatorBudget) || 0) + amount
        }));
    };

    const validateStep = () => {
        const currentFields = steps[currentStep].fields;
        for (const field of currentFields) {
            const value = formData[field as keyof CampaignFormData];
            if (Array.isArray(value) ? value.length === 0 : !value && value !== 0) {
                 toast.error(`Please fill in all required fields for ${steps[currentStep].name}.`);
                 return false;
            }
        }
        
        switch (currentStep) {
            case 1:
                const totalServices = Object.values(formData.services).reduce((sum, count) => sum + count, 0);
                if (totalServices === 0) {
                    toast.error('Please select at least one service.');
                    return false;
                }
                break;
            case 2:
                if (Number(formData.minAge) > Number(formData.maxAge)) {
                    toast.error('Minimum age cannot be greater than maximum age.');
                    return false;
                }
                if (Number(formData.minAge) < 13) {
                    toast.error('Minimum age must be at least 13.');
                    return false;
                }
                break;
            case 3:
                if (new Date(formData.deadline) < new Date()) {
                    toast.error('Deadline cannot be in the past.');
                    return false;
                }
                break;
            case 4:
                const phoneRegex = /^\+?\d{10,15}$/; 
                if (!phoneRegex.test(formData.contactNumber)) {
                    toast.error('Please enter a valid Contact Number (10-15 digits).');
                    return false;
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(formData.ownerEmailAddress)) {
                    toast.error('Please enter a valid Email Address.');
                    return false;
                }
                break;
        }
        return true;
    };

    const nextStep = () => { if (validateStep()) setCurrentStep(currentStep + 1); };
    const prevStep = () => setCurrentStep(currentStep - 1);

    // --- CHANGE: New cost calculation logic ---
    const getServiceFee = (creators: number): number => {
        if (creators <= 0) return 0;
        // Find the highest tier that is less than or equal to the number of creators
        const applicableTier = SERVICE_FEE_TIERS
            .slice()
            .reverse()
            .find(tier => creators >= tier.creators);
        
        // If no tier is met (e.g., creators < 5), use the lowest tier's fee.
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
                amount: Math.round(totalAmount * 100),
                currency: 'INR',
                name: 'Snaapii Campaign',
                description: `Payment for ${formData.campaignName}`,
                handler: async (response: any) => {
                    try {
                        const campaignData = {
                            ...formData,
                            // --- CHANGE: Updated costs object ---
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
                theme: { color: '#2563EB' },
            };
            // @ts-ignore
            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', (response: any) => {
                toast.error(`Payment failed: ${response.error.description}`);
                setPaymentStatus('failed');
                setCurrentStep(currentStep + 1);
            });
            rzp1.open();
        } catch (error) {
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
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 1: Campaign Details</h2>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="campaignName" className="font-semibold text-gray-700">Campaign Name</Label>
                                <Input id="campaignName" name="campaignName" value={formData.campaignName} onChange={handleInputChange} placeholder="e.g., Summer Collection Launch" className="mt-1"/>
                            </div>
                            <div>
                                <Label className="font-semibold text-gray-700">Platform</Label>
                                <RadioGroup value={formData.platform} onValueChange={(v) => handleSelectChange('platform', v as any)} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                    {(['Instagram', 'Youtube', 'Facebook'] as const).map(p => {
                                        const Icon = { Instagram, Youtube, Facebook }[p];
                                        return (
                                            <Label key={p} className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-all ${formData.platform === p ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-300 hover:border-blue-400'}`}>
                                                <RadioGroupItem value={p} className="sr-only" />
                                                <Icon className={`h-6 w-6 ${p === 'Instagram' ? 'text-pink-600' : p === 'Youtube' ? 'text-red-600' : 'text-blue-800'}`} />
                                                <span className="font-medium">{p}</span>
                                            </Label>
                                        )
                                    })}
                                </RadioGroup>
                            </div>
                        </div>
                    </>
                );
            case 1:
                return (
                    <>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 2: Services & Budget</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Left Column */}
                            <div className="space-y-6">
                                <div>
                                    <Label htmlFor="minimumFollowers" className="font-semibold text-gray-700">Minimum Followers</Label>
                                    <Input id="minimumFollowers" name="minimumFollowers" type="number" min="1000" value={formData.minimumFollowers} onChange={handleInputChange} placeholder="e.g., 10000" className="mt-1"/>
                                </div>
                                <div className="space-y-3">
                                    <Label className="font-semibold text-gray-700">Select Services</Label>
                                    <div className="p-4 border rounded-lg space-y-4 bg-gray-50">
                                        {(['reel', 'story', 'reelAndStory'] as const).map(serviceKey => (
                                            <div key={serviceKey} className="flex items-center justify-between">
                                                <p className="font-medium text-gray-800">{ { reel: 'Reels', story: 'Story', reelAndStory: 'Reels + Story' }[serviceKey] }</p>
                                                <div className="flex items-center gap-3">
                                                    <Button size="icon" variant="outline" className="rounded-full h-8 w-8" onClick={() => handleCountChange(serviceKey, -1)}><Minus className="h-4 w-4" /></Button>
                                                    <span className="font-bold text-lg w-8 text-center">{formData.services[serviceKey]}</span>
                                                    <Button size="icon" variant="outline" className="rounded-full h-8 w-8" onClick={() => handleCountChange(serviceKey, 1)}><Plus className="h-4 w-4" /></Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {/* Right Column */}
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <Label className="font-semibold text-gray-700">Number of Creators</Label>
                                    <div className="flex items-center gap-3 p-4 border rounded-lg bg-gray-50 justify-center">
                                        <Button size="icon" variant="outline" className="rounded-full h-8 w-8" onClick={() => handleCountChange('numberOfCreators', -1)}><Minus className="h-4 w-4" /></Button>
                                        <span className="font-bold text-2xl w-12 text-center">{formData.numberOfCreators}</span>
                                        <Button size="icon" variant="outline" className="rounded-full h-8 w-8" onClick={() => handleCountChange('numberOfCreators', 1)}><Plus className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                                <div className="p-4 border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg text-center">
                                    <p className="text-sm font-semibold text-blue-800">Estimated Minimum Budget</p>
                                    <p className="text-3xl font-extrabold text-blue-900 mt-1">₹{estimatedMinimumBudget.toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                    <Label htmlFor="totalCreatorBudget" className="font-semibold text-gray-700">Total Creator Budget (₹)</Label>
                                    <Input id="totalCreatorBudget" name="totalCreatorBudget" type="text" value={`₹ ${Number(formData.totalCreatorBudget).toLocaleString('en-IN')}`} readOnly className="mt-1 text-lg font-bold bg-white"/>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {BUDGET_INCREMENTS.map(inc => (
                                            <Button key={inc} variant="outline" size="sm" onClick={() => handleBudgetIncrement(inc)}>
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
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 3: Target Audience</h2>
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <Label htmlFor="minAge" className="font-semibold text-gray-700">Minimum Age</Label>
                                    <Input id="minAge" name="minAge" type="number" min="13" value={formData.minAge} onChange={handleInputChange} placeholder="e.g., 18" className="mt-1"/>
                                </div>
                                <div className="flex-1">
                                    <Label htmlFor="maxAge" className="font-semibold text-gray-700">Maximum Age</Label>
                                    <Input id="maxAge" name="maxAge" type="number" min="13" value={formData.maxAge} onChange={handleInputChange} placeholder="e.g., 35" className="mt-1"/>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="gender" className="font-semibold text-gray-700">Gender</Label>
                                <Select onValueChange={(value) => handleSelectChange('gender', value)} value={formData.gender}>
                                    <SelectTrigger className="w-full mt-1"><SelectValue placeholder="Select target gender" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Any">Any</SelectItem>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="location" className="font-semibold text-gray-700">Location (City, State)</Label>
                                <Input id="location" name="location" value={formData.location} onChange={handleInputChange} placeholder="e.g., Mumbai, Maharashtra" className="mt-1"/>
                            </div>
                        </div>
                    </>
                );
            case 3:
                const categories = ['Fashion', 'Beauty', 'Food', 'Travel', 'Gaming', 'Technology', 'Fitness', 'Lifestyle', 'Education', 'Finance'];
                return (
                    <>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 4: Content & Deadline</h2>
                        <div className="space-y-4">
                            <div>
                                <Label className="font-semibold text-gray-700">Categories</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {categories.map((category) => (
                                        <Button key={category} onClick={() => handleCategoryChange(category)} variant={formData.categories.includes(category) ? 'default' : 'outline'} className="rounded-full">
                                            {category}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="campaignDescription" className="font-semibold text-gray-700">Campaign Description</Label>
                                <Textarea id="campaignDescription" name="campaignDescription" value={formData.campaignDescription} onChange={handleInputChange} placeholder="Describe your campaign goals and requirements..." className="mt-1 min-h-[120px]"/>
                            </div>
                            <div>
                                <Label htmlFor="deadline" className="font-semibold text-gray-700">Deadline</Label>
                                <Input id="deadline" name="deadline" type="date" value={formData.deadline} onChange={handleInputChange} className="mt-1"/>
                            </div>
                            <div>
                                <Label htmlFor="demoVideoUrl" className="font-semibold text-gray-700">Demo Video URL (Optional)</Label>
                                <Input id="demoVideoUrl" name="demoVideoUrl" value={formData.demoVideoUrl} onChange={handleInputChange} placeholder="Link to a demo video (e.g., YouTube)" className="mt-1"/>
                            </div>
                        </div>
                    </>
                );
            case 4:
                return (
                    <>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 5: Campaign Owner Details</h2>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="ownerFullName" className="font-semibold text-gray-700">Official Full Name</Label>
                                <Input id="ownerFullName" name="ownerFullName" value={formData.ownerFullName} onChange={handleInputChange} placeholder="Your full name" className="mt-1"/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="contactNumber" className="font-semibold text-gray-700">Contact Number</Label>
                                    <Input id="contactNumber" name="contactNumber" type="tel" value={formData.contactNumber} onChange={handleInputChange} placeholder="+91 9876543210" className="mt-1"/>
                                </div>
                                <div>
                                    <Label htmlFor="whatsappContactNumber" className="font-semibold text-gray-700">WhatsApp Number (Optional)</Label>
                                    <Input id="whatsappContactNumber" name="whatsappContactNumber" type="tel" value={formData.whatsappContactNumber} onChange={handleInputChange} placeholder="If different from contact no." className="mt-1"/>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="ownerEmailAddress" className="font-semibold text-gray-700">Email Address</Label>
                                <Input id="ownerEmailAddress" name="ownerEmailAddress" type="email" value={formData.ownerEmailAddress} onChange={handleInputChange} placeholder="your.email@example.com" className="mt-1"/>
                            </div>
                            <div>
                                <Label htmlFor="brandName" className="font-semibold text-gray-700">Brand Name (Optional)</Label>
                                <Input id="brandName" name="brandName" value={formData.brandName} onChange={handleInputChange} placeholder="e.g., My Awesome Brand" className="mt-1"/>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <Label htmlFor="ownerCity" className="font-semibold text-gray-700">City</Label>
                                    <Input id="ownerCity" name="ownerCity" value={formData.ownerCity} onChange={handleInputChange} placeholder="e.g., Bangalore" className="mt-1"/>
                                </div>
                                <div>
                                    <Label htmlFor="ownerDistrict" className="font-semibold text-gray-700">District</Label>
                                    <Input id="ownerDistrict" name="ownerDistrict" value={formData.ownerDistrict} onChange={handleInputChange} placeholder="e.g., Bangalore Urban" className="mt-1"/>
                                </div>
                                <div>
                                    <Label htmlFor="ownerState" className="font-semibold text-gray-700">State</Label>
                                    <Input id="ownerState" name="ownerState" value={formData.ownerState} onChange={handleInputChange} placeholder="e.g., Karnataka" className="mt-1"/>
                                </div>
                                <div>
                                    <Label htmlFor="ownerCountry" className="font-semibold text-gray-700">Country</Label>
                                    <Input id="ownerCountry" name="ownerCountry" value={formData.ownerCountry} onChange={handleInputChange} placeholder="e.g., India" className="mt-1"/>
                                </div>
                            </div>
                        </div>
                    </>
                );
            case 5:
                 return (
                    <>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Final Step: Review & Pay</h2>
                        <p className="text-center text-gray-500 mb-8">Confirm your campaign details and proceed to payment.</p>
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                            <div className="lg:col-span-3 space-y-6">
                                <div className="bg-white p-5 rounded-xl border">
                                    <h3 className="font-bold text-lg mb-3 flex items-center"><FileText className="mr-2 h-5 w-5 text-blue-600"/>Campaign Summary</h3>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <p className="text-gray-500">Name</p><p className="font-medium text-gray-800">{formData.campaignName}</p>
                                        <p className="text-gray-500">Platform</p><p className="font-medium text-gray-800">{formData.platform}</p>
                                        <p className="text-gray-500">Deadline</p><p className="font-medium text-gray-800">{formData.deadline ? format(new Date(formData.deadline), 'PPP') : 'N/A'}</p>
                                        <p className="text-gray-500 col-span-2">Categories</p><p className="font-medium text-gray-800 col-span-2">{formData.categories.join(', ')}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-xl border">
                                    <h3 className="font-bold text-lg mb-3 flex items-center"><Users className="mr-2 h-5 w-5 text-blue-600"/>Services & Targeting</h3>
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
                            <div className="lg:col-span-2">
                                <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl space-y-4 sticky top-8">
                                    <h3 className="font-bold text-lg text-center text-gray-800">Cost Breakdown</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <p className="text-gray-600">Total Creator Budget</p>
                                            <p className="font-medium text-gray-800">₹{creatorsCost.toLocaleString('en-IN')}</p>
                                        </div>
                                        {/* --- CHANGE: Updated Service Fee display --- */}
                                        <div className="flex justify-between">
                                            <p className="text-gray-600">Platform Fee</p>
                                            <p className="font-medium text-gray-800">₹{serviceFee.toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                    <div className="border-t border-dashed border-gray-300 my-4"></div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-lg font-bold text-gray-900">Total Payable</p>
                                        <p className="text-2xl font-extrabold text-blue-700">₹{Math.round(totalAmount).toLocaleString('en-IN')}</p>
                                    </div>
                                    <Button onClick={handlePayment} disabled={isSubmitting || !user} className="w-full bg-blue-600 hover:bg-blue-700 text-base py-3 mt-4">
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
                    <div className="text-center py-10">
                        {paymentStatus === 'success' ? (
                            <>
                                <CheckCircle className="h-20 w-20 text-green-500 mx-auto animate-pulse" />
                                <h3 className="text-3xl font-bold text-green-600 mt-4">Payment Successful!</h3>
                                <p className="text-gray-600 mt-2">Your campaign is under review. We'll notify you upon approval.</p>
                                <Button onClick={() => window.location.reload()} className="mt-6">Create Another Campaign</Button>
                            </>
                        ) : (
                            <>
                                <X className="h-20 w-20 text-red-500 mx-auto" />
                                <h3 className="text-3xl font-bold text-red-600 mt-4">Payment Failed</h3>
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
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
        );
    }
    
    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto p-4 sm:p-8 max-w-6xl">
                <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-lg border border-gray-200">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-gray-800 mb-2">
                        Launch Your Next Campaign
                    </h1>
                     <p className="text-center text-gray-500 mb-10">Follow the steps below to get your campaign live.</p>

                    <div className="flex justify-between items-start mb-10 relative">
                        <div className="absolute top-5 left-0 w-full h-1 bg-gray-200 transform -translate-y-1/2">
                            <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}></div>
                        </div>
                        {steps.map((step, index) => (
                            <div key={index} className="relative z-10 flex flex-col items-center flex-1">
                                <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-white transition-all duration-300 border-4 ${index <= currentStep ? 'bg-blue-600 border-white' : 'bg-gray-300 border-gray-50'}`}>
                                    {index < currentStep ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                                </div>
                                <span className={`mt-2 text-xs sm:text-sm text-center font-semibold ${index <= currentStep ? 'text-blue-600' : 'text-gray-500'}`}>
                                    {step.name}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="min-h-[450px]">
                        {renderStep()}
                    </div>

                    {currentStep < steps.length - 2 && (
                         <div className="flex justify-between mt-10 pt-6 border-t">
                            <Button onClick={prevStep} variant="outline" className="px-6 py-3 text-base" disabled={currentStep === 0}>
                                <ArrowLeft className="mr-2 h-5 w-5" /> Back
                            </Button>
                            <Button onClick={nextStep} className="px-6 py-3 text-base bg-blue-600 hover:bg-blue-700">
                                Next <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    )}
                     {currentStep === steps.length - 2 && ( // Only show on Summary step
                        <div className="flex justify-between mt-10 pt-6 border-t">
                            <Button onClick={prevStep} variant="outline" className="px-6 py-3 text-base">
                                <ArrowLeft className="mr-2 h-5 w-5" /> Back to Edit
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CampaignCreationPage;
