"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Loader2,
    Instagram,
    Facebook,
    Youtube,
    Users,
    DollarSign,
    Calendar,
    BarChart2,
    User,
    Search,
    X as XIcon,
    CheckCircle,
    LogIn,
    PartyPopper,
    Hash,
    MapPin,
    Cake,
    Sparkles,
    FileText,
    PlusCircle,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    XCircle,
    Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, getDoc, getDocs, deleteDoc, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { db, auth } from '@/lib/firebaseConfig';

// --- Interfaces ---
interface CampaignUI {
    id: string;
    name: string;
    platform: string;
    status: 'Ongoing' | 'Completed' | 'Cancelled' | 'Approved';
    budgetTotal: number;
    numInfluencers: number;
    perCreatorBudget: number;
    minFollowers: number;
    deadline: string;
    creatorCategory: string;
    location: string;
    creatorName: string;
    creatorEmail: string;
    createdAt: string;
    campaignDescription: string;
    minAge: number;
    maxAge: number;
    gender: string;
    services: { reel: number; story: number; reelAndStory: number; };
    brandLogo?: string;
    deliverables?: string[];
    requirements?: string[];
}

interface UserProfile {
    name: string;
    email: string;
    profileImage?: string;
    accountType: 'creator' | 'user';
}

// --- Skeleton Loader ---
const CampaignSkeleton = () => (
    <div className="p-6 bg-white border rounded-lg shadow-sm">
        <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="flex items-center mb-4">
                <div className="h-5 w-5 bg-gray-200 rounded-full mr-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
            <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 pt-4 mt-4 border-t">
                <div className="h-10 bg-gray-200 rounded w-1/2"></div>
                <div className="h-10 bg-gray-200 rounded w-1/2"></div>
            </div>
        </div>
    </div>
);

export default function CampaignPage() {
    const [user, setUser] = useState<FirebaseAuthUser | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);
    const [allCampaigns, setAllCampaigns] = useState<CampaignUI[]>([]);
    const [campaignLoadError, setCampaignLoadError] = useState<string | null>(null);
    const [nameFilter, setNameFilter] = useState('');
    const [platformFilter, setPlatformFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('latest');
    const [appliedCampaignIds, setAppliedCampaignIds] = useState<Set<string>>(new Set());
    const [selectedCampaign, setSelectedCampaign] = useState<CampaignUI | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isApplyingInModal, setIsApplyingInModal] = useState(false);
    const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

    const mapFirestoreDocToCampaignUI = (doc: QueryDocumentSnapshot<DocumentData>): CampaignUI => {
        const data = doc.data();
        const budgetTotal = data.costs?.totalAmount || data.totalCreatorBudget || 0;
        const numInfluencers = data.numberOfCreators || 0;
        return {
            id: doc.id,
            name: data.campaignName || 'Untitled Campaign',
            platform: data.platform || 'N/A',
            status: data.status || 'Ongoing',
            budgetTotal,
            numInfluencers,
            perCreatorBudget: (budgetTotal && numInfluencers) ? (budgetTotal / numInfluencers) : 0,
            minFollowers: data.minimumFollowers || 0,
            deadline: data.deadline || new Date().toISOString(),
            creatorCategory: data.categories?.[0] || 'General',
            location: data.location || 'Remote',
            creatorName: data.userInfo?.displayName || 'Brand',
            creatorEmail: data.userInfo?.email || 'N/A',
            createdAt: data.createdAt || new Date().toISOString(),
            campaignDescription: data.campaignDescription || 'No description provided.',
            minAge: data.minAge || 18,
            maxAge: data.maxAge || 65,
            gender: data.gender || 'Any',
            services: data.services || { reel: 0, story: 0, reelAndStory: 0 },
            brandLogo: data.brandLogo || null,
            deliverables: data.deliverables || [],
            requirements: data.requirements || []
        };
    };

    const setupCampaignListener = useCallback(() => {
        const q = query(
            collection(db, "campaigns"),
            where("status", "==", "approved"),
            orderBy("createdAt", "desc")
        );
        return onSnapshot(q, (snapshot) => {
            const campaigns = snapshot.docs.map(doc => mapFirestoreDocToCampaignUI(doc));
            setAllCampaigns(campaigns);
            setCampaignLoadError(null);
            setIsLoading(false);
        }, (error) => {
            console.error("Campaign listener error:", error);
            setCampaignLoadError("Failed to load approved campaigns.");
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        const fetchUserProfile = async (userId: string) => {
            const userDocRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const data = userDoc.data();
                setUserProfile({
                    name: data.name || "User",
                    email: data.email || "N/A",
                    profileImage: data.profileImage || null,
                    accountType: data.accountType === 'creator' ? 'creator' : 'user'
                });
            } else {
                setUserProfile({
                    name: "User",
                    email: auth.currentUser?.email || "N/A",
                    profileImage: null,
                    accountType: 'user'
                });
                console.warn("User document not found in Firestore.");
            }
        };

        const fetchAppliedCampaigns = async (userId: string) => {
            const q = query(collection(db, `users/${userId}/appliedCampaigns`));
            const querySnapshot = await getDocs(q);
            setAppliedCampaignIds(new Set(querySnapshot.docs.map(doc => doc.id)));
        };

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await fetchUserProfile(currentUser.uid);
                await fetchAppliedCampaigns(currentUser.uid);
            } else {
                setUserProfile(null);
            }
            setIsFirebaseLoading(false);
        });

        const unsubscribeCampaigns = setupCampaignListener();

        return () => {
            unsubscribeAuth();
            unsubscribeCampaigns();
        };
    }, [setupCampaignListener]);

    const filteredAndSortedCampaigns = useMemo(() => {
        return allCampaigns.filter(c =>
            c.name.toLowerCase().includes(nameFilter.toLowerCase()) &&
            (platformFilter === 'all' || c.platform === platformFilter)
        ).sort((a, b) => {
            switch (sortOrder) {
                case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'budget-high-low': return b.budgetTotal - a.budgetTotal;
                case 'budget-low-high': return a.budgetTotal - b.budgetTotal;
                case 'popularity': return b.numInfluencers - a.numInfluencers;
                default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
        });
    }, [allCampaigns, nameFilter, platformFilter, sortOrder]);

    const handleApplicationChange = useCallback(() => {
        if (user) {
            const fetchAppliedCampaigns = async (userId: string) => {
                const q = query(collection(db, `users/${userId}/appliedCampaigns`));
                const querySnapshot = await getDocs(q);
                setAppliedCampaignIds(new Set(querySnapshot.docs.map(doc => doc.id)));
            };
            fetchAppliedCampaigns(user.uid);
        }
    }, [user]);

    const handleModalApply = async (campaignId: string) => {
        if (!user || !userProfile) { toast.error("Please log in to apply."); return; }
        if (userProfile.accountType !== 'creator') { toast.error("Only creators can apply for campaigns."); return; }
        setIsApplyingInModal(true);
        try {
            const applicantData = { userId: user.uid, userName: userProfile.name, userEmail: userProfile.email, appliedAt: new Date().toISOString(), status: 'pending', profileImage: userProfile.profileImage || null };
            await setDoc(doc(db, `campaigns/${campaignId}/applicants`, user.uid), applicantData);
            await setDoc(doc(db, `users/${user.uid}/appliedCampaigns`, campaignId), { appliedAt: new Date().toISOString() });
            handleApplicationChange();
            toast.success("Application submitted successfully!");
        } catch (error) { console.error("Modal apply error:", error); toast.error("Application failed. Please try again."); } finally { setIsApplyingInModal(false); }
    };

    const handleModalUnapply = async (campaignId: string) => {
        if (!user) return;
        setIsApplyingInModal(true);
        try {
            await deleteDoc(doc(db, `campaigns/${campaignId}/applicants`, user.uid));
            await deleteDoc(doc(db, `users/${user.uid}/appliedCampaigns`, campaignId));
            handleApplicationChange();
            toast.info("Application withdrawn.");
        } catch (error) { console.error("Modal unapply error:", error); toast.error("Failed to withdraw. Please try again."); } finally { setIsApplyingInModal(false); }
    };

    const toggleCampaignExpansion = useCallback((campaignId: string) => {
        setExpandedCampaignId(prevId => prevId === campaignId ? null : campaignId);
    }, []);

    if (isFirebaseLoading) {
        return <div className="flex flex-col items-center justify-center min-h-screen gap-4"><Loader2 className="w-12 h-12 text-violet-500 animate-spin" /><p className="text-lg text-gray-600">Initializing application...</p></div>;
    }

    return (
        <div className="min-h-screen p-4 bg-gradient-to-b from-violet-50 to-white sm:p-6 lg:p-8">
            <div className="max-w-screen-xl mx-auto">
                <div className="flex flex-col items-center justify-between gap-4 mb-8 md:flex-row">
                    <div className="text-center md:text-left"><h1 className="text-4xl font-bold text-gray-900 md:text-5xl">Discover Campaigns</h1><p className="mt-2 text-lg text-gray-600">Connect with brands that match your audience</p></div>
                    <div className="flex gap-3">
                        {user ? (<Link href="/campaign/create" passHref legacyBehavior><Button className="flex items-center gap-2 text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700" asChild><a><PlusCircle className="w-5 h-5" />Create Campaign</a></Button></Link>) : (<Button className="flex items-center gap-2 text-white bg-gradient-to-r from-violet-600 to-indigo-600" onClick={() => toast.info("Please log in to create a campaign.")}><PlusCircle className="w-5 h-5" />Create Campaign</Button>)}
                    </div>
                </div>

                {campaignLoadError && <div className="p-4 mb-6 text-red-700 bg-red-100 rounded-lg">{campaignLoadError}</div>}

                <div className="flex flex-col gap-4 p-4 mb-6 bg-white rounded-xl shadow-md sm:flex-row">
                    <div className="relative flex-1"><Input type="text" placeholder="Search campaigns..." value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className="pl-10" /><Search className="absolute w-5 h-5 text-gray-400 left-3 top-2.5" /></div>
                    <Select onValueChange={setPlatformFilter} value={platformFilter}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Platform" /></SelectTrigger><SelectContent><SelectItem value="all">All Platforms</SelectItem><SelectItem value="Instagram">Instagram</SelectItem><SelectItem value="Youtube">YouTube</SelectItem><SelectItem value="Facebook">Facebook</SelectItem></SelectContent></Select>
                    <Select onValueChange={setSortOrder} value={sortOrder}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Sort by" /></SelectTrigger><SelectContent><SelectItem value="latest">Latest</SelectItem><SelectItem value="oldest">Oldest</SelectItem><SelectItem value="budget-high-low">Budget: High to Low</SelectItem><SelectItem value="budget-low-high">Budget: Low to High</SelectItem><SelectItem value="popularity">Most Popular</SelectItem></SelectContent></Select>
                </div>

                {isLoading ? (<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{[...Array(6)].map((_, i) => <CampaignSkeleton key={i} />)}</div>) : filteredAndSortedCampaigns.length > 0 ? (<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{filteredAndSortedCampaigns.map((campaign) => (<CampaignCard key={campaign.id} campaign={campaign} user={user} userProfile={userProfile} isAppliedInitially={appliedCampaignIds.has(campaign.id)} onViewDetails={() => setSelectedCampaign(campaign)} onApplicationChange={handleApplicationChange} isExpanded={expandedCampaignId === campaign.id} onToggleExpand={() => toggleCampaignExpansion(campaign.id)} />))}</div>) : (<div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-xl shadow-sm"><PartyPopper className="w-16 h-16 mx-auto text-violet-500" /><h3 className="mt-4 text-xl font-semibold">No Approved Campaigns Found</h3><p className="text-gray-500">Check back later for new opportunities!</p><Button onClick={() => { setNameFilter(''); setPlatformFilter('all'); setSortOrder('latest'); }} className="mt-4">Reset Filters</Button></div>)}
            </div>

            {selectedCampaign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70" onClick={() => setSelectedCampaign(null)}>
                    <div className="relative w-full max-w-3xl max-h-[90vh] p-6 overflow-y-auto bg-white rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between pb-4 border-b">
                            <div><div className="flex items-center">{selectedCampaign.brandLogo ? <Image src={selectedCampaign.brandLogo} alt="Brand logo" width={48} height={48} className="mr-4 rounded-full" /> : <div className="flex items-center justify-center w-12 h-12 mr-4 bg-gray-100 rounded-full"><User className="w-6 h-6 text-gray-500" /></div>}<div><h2 className="text-2xl font-bold">{selectedCampaign.name}</h2><div className="flex items-center mt-1"><PlatformIcon platform={selectedCampaign.platform} /><span className="ml-2 text-gray-500">{selectedCampaign.platform} Campaign</span></div></div></div></div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedCampaign(null)} className="text-gray-500"><XIcon className="w-6 h-6" /></Button>
                        </div>
                        <div className="grid gap-6 mt-6 md:grid-cols-2">
                            <div><h3 className="flex items-center text-lg font-semibold"><FileText className="w-5 h-5 mr-2 text-violet-500" />Description</h3><p className="mt-3 text-gray-600">{selectedCampaign.campaignDescription}</p></div>
                            <div><h3 className="flex items-center text-lg font-semibold"><Sparkles className="w-5 h-5 mr-2 text-violet-500" />Requirements</h3><ul className="mt-3 space-y-2 text-gray-600"><li className="flex items-start"><BarChart2 className="flex-shrink-0 w-5 h-5 mr-2 mt-0.5 text-violet-500" />Min. Followers: {selectedCampaign.minFollowers.toLocaleString()}</li><li className="flex items-start"><Cake className="flex-shrink-0 w-5 h-5 mr-2 mt-0.5 text-violet-500" />Age: {selectedCampaign.minAge}-{selectedCampaign.maxAge} years</li><li className="flex items-start"><Users className="flex-shrink-0 w-5 h-5 mr-2 mt-0.5 text-violet-500" />Gender: {selectedCampaign.gender}</li><li className="flex items-start"><MapPin className="flex-shrink-0 w-5 h-5 mr-2 mt-0.5 text-violet-500" />Location: {selectedCampaign.location}</li><li className="flex items-start"><Hash className="flex-shrink-0 w-5 h-5 mr-2 mt-0.5 text-violet-500" />Category: {selectedCampaign.creatorCategory}</li></ul></div>
                        </div>
                        <div className="p-4 mt-6 bg-violet-50 rounded-xl">
                            <h3 className="flex items-center text-lg font-semibold"><DollarSign className="w-5 h-5 mr-2 text-violet-500" />Budget & Deliverables</h3>
                            <div className="grid grid-cols-2 gap-4 mt-3"><div className="p-3 bg-white rounded-lg"><p className="text-sm text-gray-500">Total Creators</p><p className="text-xl font-bold">{selectedCampaign.numInfluencers}</p></div><div className="p-3 bg-white rounded-lg"><p className="text-sm text-gray-500">Per Creator</p><p className="text-xl font-bold text-violet-600">₹{selectedCampaign.perCreatorBudget.toLocaleString()}</p></div><div className="p-3 bg-white rounded-lg"><p className="text-sm text-gray-500">Total Budget</p><p className="text-xl font-bold">₹{selectedCampaign.budgetTotal.toLocaleString()}</p></div><div className="p-3 bg-white rounded-lg"><p className="text-sm text-gray-500">Deadline</p><p className="text-lg font-bold">{format(new Date(selectedCampaign.deadline), 'MMM dd, yy')}</p></div></div>
                            <div className="mt-4"><h4 className="font-medium text-gray-700">Deliverables:</h4><ul className="mt-2 space-y-1">{selectedCampaign.services.reel > 0 && <li className="flex items-center"><span className="mr-2">•</span> Reels: {selectedCampaign.services.reel}</li>}{selectedCampaign.services.story > 0 && <li className="flex items-center"><span className="mr-2">•</span> Stories: {selectedCampaign.services.story}</li>}{selectedCampaign.services.reelAndStory > 0 && <li className="flex items-center"><span className="mr-2">•</span> Reel + Story: {selectedCampaign.services.reelAndStory}</li>}</ul></div>
                        </div>
                        <div className="mt-6">
                            {!user ? (<Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={() => toast.info("Please log in to apply.")}><LogIn className="w-4 h-4 mr-2" />Login to Apply</Button>) : userProfile?.accountType !== 'creator' ? (<Button className="w-full" disabled><XCircle className="w-4 h-4 mr-2" />Creators Only</Button>) : appliedCampaignIds.has(selectedCampaign.id) ? (<Button variant="destructive" className="w-full" onClick={() => handleModalUnapply(selectedCampaign.id)} disabled={isApplyingInModal}>{isApplyingInModal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XIcon className="w-4 h-4 mr-2" />}Withdraw</Button>) : (<Button className="w-full text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700" onClick={() => handleModalApply(selectedCampaign.id)} disabled={isApplyingInModal}>{isApplyingInModal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}Apply for Campaign</Button>)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- CampaignCard Component ---
interface CampaignCardProps { campaign: CampaignUI; user: FirebaseAuthUser | null; userProfile: UserProfile | null; isAppliedInitially: boolean; onViewDetails: () => void; onApplicationChange: () => void; isExpanded: boolean; onToggleExpand: () => void; }

const CampaignCard: React.FC<CampaignCardProps> = ({ campaign, user, userProfile, isAppliedInitially, onViewDetails, onApplicationChange, isExpanded, onToggleExpand }) => {
    const [isApplied, setIsApplied] = useState(isAppliedInitially);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => { setIsApplied(isAppliedInitially); }, [isAppliedInitially]);

    const handleApply = async () => {
        if (!user || !userProfile) { toast.error("Please log in to apply for this campaign."); return; }
        if (userProfile.accountType !== 'creator') { toast.error("Only creators can apply for campaigns."); return; }
        setIsProcessing(true);
        try {
            const applicantData = { userId: user.uid, userName: userProfile.name, userEmail: userProfile.email, appliedAt: new Date().toISOString(), status: 'pending', profileImage: userProfile.profileImage || null };
            await setDoc(doc(db, `campaigns/${campaign.id}/applicants`, user.uid), applicantData);
            await setDoc(doc(db, `users/${user.uid}/appliedCampaigns`, campaign.id), { appliedAt: new Date().toISOString() });
            setIsApplied(true); onApplicationChange(); toast.success("Application submitted successfully!");
        } catch (error) { console.error("Apply error:", error); toast.error("Application failed. Please try again."); } finally { setIsProcessing(false); }
    };

    const handleUnapply = async () => {
        if (!user) return;
        setIsProcessing(true);
        try {
            await deleteDoc(doc(db, `campaigns/${campaign.id}/applicants`, user.uid));
            await deleteDoc(doc(db, `users/${user.uid}/appliedCampaigns`, campaign.id));
            setIsApplied(false); onApplicationChange(); toast.info("Application withdrawn.");
        } catch (error) { console.error("Unapply error:", error); toast.error("Failed to withdraw. Please try again."); } finally { setIsProcessing(false); }
    };

    const getStatusClasses = (status: string) => {
        switch (status) {
            case 'Approved':
            case 'Ongoing':
                return 'bg-blue-100 text-blue-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPlatformColor = (platform: string) => {
        switch (platform) {
            case 'Instagram': return 'bg-pink-500/10 text-pink-700';
            case 'Youtube': return 'bg-red-500/10 text-red-700';
            case 'Facebook': return 'bg-blue-500/10 text-blue-700';
            default: return 'bg-violet-500/10 text-violet-700';
        }
    };

    const daysLeft = Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return (
        <div className="flex flex-col p-6 overflow-hidden transition bg-white border rounded-xl shadow-sm hover:shadow-lg group">
            <div className="flex-grow">
                <div className="flex items-start justify-between mb-3">
                    <div><div className="flex items-center gap-2">{campaign.brandLogo ? <Image src={campaign.brandLogo} alt="Brand logo" width={32} height={32} className="rounded-full" /> : <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full"><User className="w-5 h-5 text-gray-500" /></div>}<h3 className="pr-4 text-lg font-bold">{campaign.name}</h3></div><div className="flex items-center mt-1"><Badge className={`${getPlatformColor(campaign.platform)} rounded-full`}><PlatformIcon platform={campaign.platform} /><span className="ml-1">{campaign.platform}</span></Badge><Badge className={`ml-2 ${getStatusClasses(campaign.status)} rounded-full`}>Ongoing</Badge></div></div>
                    <Button variant="ghost" size="icon" onClick={onToggleExpand} className="text-gray-400">{isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</Button>
                </div>
                <div className="space-y-3 text-sm mt-4"><div className="flex items-center justify-between"><span className="flex items-center text-gray-500"><Users className="w-4 h-4 mr-2 text-violet-500" />Creators</span><span className="font-semibold text-gray-800">{campaign.numInfluencers}</span></div><div className="flex items-center justify-between"><span className="flex items-center text-gray-500"><DollarSign className="w-4 h-4 mr-2 text-violet-500" />Per Creator</span><span className="font-semibold text-gray-800">₹{campaign.perCreatorBudget.toLocaleString('en-IN')}</span></div><div className="flex items-center justify-between"><span className="flex items-center text-gray-500"><BarChart2 className="w-4 h-4 mr-2 text-violet-500" />Followers</span><span className="font-semibold text-gray-800">{campaign.minFollowers.toLocaleString('en-IN')}+</span></div><div className="flex items-center justify-between"><span className="flex items-center text-gray-500"><Calendar className="w-4 h-4 mr-2 text-violet-500" />Deadline</span><div className="text-right"><span className="font-semibold text-gray-800">{format(new Date(campaign.deadline), 'MMM dd, yy')}</span><span className={`block text-xs ${daysLeft <= 3 ? 'text-red-500' : 'text-gray-500'}`}>{daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}</span></div></div></div>
                {isExpanded && (<div className="pt-4 mt-4 space-y-3 border-t"><div className="flex items-start"><MapPin className="flex-shrink-0 w-4 h-4 mt-0.5 mr-2 text-violet-500" /><p className="text-sm text-gray-600">{campaign.location}</p></div><div className="flex items-start"><Hash className="flex-shrink-0 w-4 h-4 mt-0.5 mr-2 text-violet-500" /><p className="text-sm text-gray-600">{campaign.creatorCategory}</p></div><div className="flex items-center"><Cake className="flex-shrink-0 w-4 h-4 mr-2 text-violet-500" /><p className="text-sm text-gray-600">{campaign.minAge}-{campaign.maxAge} years</p></div></div>)}
            </div>
            <div className="flex gap-2 pt-4 mt-auto border-t">
                <Button variant="outline" className="w-full" onClick={onViewDetails}><ExternalLink className="w-4 h-4 mr-2" /> Details</Button>
                {!user ? (<Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={() => toast.info("Please log in to apply.")}>{isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}Login to Apply</Button>) : userProfile?.accountType !== 'creator' ? (<Button className="w-full" disabled><XCircle className="w-4 h-4 mr-2" />Creators Only</Button>) : isApplied ? (<Button variant="destructive" className="w-full" onClick={handleUnapply} disabled={isProcessing}>{isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XIcon className="w-4 h-4 mr-2" />}Withdraw</Button>) : (<Button className="w-full text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700" onClick={handleApply} disabled={isProcessing}>{isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}Apply</Button>)}
            </div>
        </div>
    );
};

// --- PlatformIcon Component ---
const PlatformIcon: React.FC<{ platform: string }> = ({ platform }) => {
    switch (platform) {
        case 'Instagram': return <Instagram className="w-4 h-4" />;
        case 'Youtube': return <Youtube className="w-4 h-4" />;
        case 'Facebook': return <Facebook className="w-4 h-4" />;
        default: return <Send className="w-4 h-4" />;
    }
};
