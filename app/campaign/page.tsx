"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    Loader2,
    Instagram,
    Facebook,
    Youtube,
    Send,
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
    BookUser,
    Hash,
    MapPin,
    Cake,
    Sparkles,
    FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';

// --- FIX: Initialize Firebase directly within the component to resolve path issues ---
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User as FirebaseAuthUser, Auth } from 'firebase/auth';
import { getFirestore, collection, query, orderBy, onSnapshot, doc, setDoc, getDoc, getDocs, deleteDoc, Firestore } from 'firebase/firestore';

// Interface for the data structure used by UI components
interface CampaignUI {
    id: string;
    name: string;
    platform: string;
    status: 'Ongoing' | 'Completed' | 'Cancelled' | 'Pending Review';
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
}

// Interface for the logged-in user's profile data
interface UserProfile {
    name: string;
    email: string;
}

// --- Firebase Initialization Helper ---
let db: Firestore;
let auth: Auth;

try {
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
} catch (e) {
    console.error("Firebase initialization failed:", e);
}


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

    useEffect(() => {
        if (!auth || !db) {
            setCampaignLoadError("Firebase is not configured correctly.");
            setIsFirebaseLoading(false);
            return;
        }

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await Promise.all([
                    fetchUserProfile(currentUser.uid),
                    fetchAppliedCampaigns(currentUser.uid)
                ]);
            }
            setIsFirebaseLoading(false);
        });
        const unsubscribeCampaigns = setupCampaignListener();
        return () => {
            unsubscribeAuth();
            unsubscribeCampaigns();
        };
    }, []);

    const fetchUserProfile = async (userId: string) => {
        try {
            const userDocRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const data = userDoc.data();
                setUserProfile({ name: data.name || "User", email: data.email || "N/A" });
            }
        } catch (error) { toast.error("Could not fetch user profile."); }
    };
    
    const fetchAppliedCampaigns = async (userId: string) => {
        try {
            const q = query(collection(db, `users/${userId}/appliedCampaigns`));
            const querySnapshot = await getDocs(q);
            setAppliedCampaignIds(new Set<string>(querySnapshot.docs.map(doc => doc.id)));
        } catch (error) { console.error('Error fetching applied campaigns:', error); }
    };

    const setupCampaignListener = () => {
        try {
            const q = query(collection(db, "campaigns"), orderBy("createdAt", "desc"));
            return onSnapshot(q, (snapshot) => {
                setAllCampaigns(snapshot.docs.map(doc => mapFirestoreDocToCampaignUI(doc)));
                setCampaignLoadError(null);
            }, (error) => {
                setCampaignLoadError("Failed to load campaigns.");
            });
        } catch (error) {
            setCampaignLoadError("Failed to set up campaign listener.");
            return () => {};
        }
    };

    const mapFirestoreDocToCampaignUI = (doc: any): CampaignUI => {
        const data = doc.data();
        const budgetTotal = data.costs?.totalAmount || data.totalCreatorBudget || 0;
        const numInfluencers = data.numberOfCreators || 0;
        return {
            id: doc.id,
            name: data.campaignName || 'Untitled Campaign',
            platform: data.platform || 'N/A',
            status: data.status === 'pending_review' ? 'Pending Review' : (data.status || 'Ongoing'),
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
        };
    };

    const filteredAndSortedCampaigns = useMemo(() => {
        return allCampaigns.filter(c => 
            c.name.toLowerCase().includes(nameFilter.toLowerCase()) && 
            (platformFilter === 'all' || c.platform === platformFilter)
        ).sort((a, b) => {
            switch (sortOrder) {
                case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'budget-high-low': return b.budgetTotal - a.budgetTotal;
                case 'budget-low-high': return a.budgetTotal - b.budgetTotal;
                default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
        });
    }, [allCampaigns, nameFilter, platformFilter, sortOrder]);

    if (isFirebaseLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-violet-50"><Loader2 className="h-10 w-10 animate-spin text-violet-600" /></div>;
    }

    return (
        <div className="min-h-screen bg-violet-50 text-gray-800 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-2 tracking-tight">Explore Campaigns</h1>
                    <p className="text-lg text-gray-600">Find your next collaboration and bring ideas to life.</p>
                </div>

                {campaignLoadError && <div className="mb-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md"><strong>Error:</strong> {campaignLoadError}</div>}

                <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-sm border border-violet-100">
                    <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><Input type="text" placeholder="Search campaigns..." value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className="pl-10 focus:ring-violet-500"/></div>
                    <Select onValueChange={setPlatformFilter} value={platformFilter}><SelectTrigger className="w-full sm:w-[200px] focus:ring-violet-500"><SelectValue placeholder="Platform" /></SelectTrigger><SelectContent><SelectItem value="all">All Platforms</SelectItem><SelectItem value="Instagram">Instagram</SelectItem><SelectItem value="Youtube">YouTube</SelectItem><SelectItem value="Facebook">Facebook</SelectItem></SelectContent></Select>
                    <Select onValueChange={setSortOrder} value={sortOrder}><SelectTrigger className="w-full sm:w-[200px] focus:ring-violet-500"><SelectValue placeholder="Sort By" /></SelectTrigger><SelectContent><SelectItem value="latest">Latest</SelectItem><SelectItem value="oldest">Oldest</SelectItem><SelectItem value="budget-high-low">Budget (High-Low)</SelectItem><SelectItem value="budget-low-high">Budget (Low-High)</SelectItem></SelectContent></Select>
                </div>

                {filteredAndSortedCampaigns.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAndSortedCampaigns.map((campaign) => (
                            <CampaignCard key={campaign.id} campaign={campaign} user={user} userProfile={userProfile} isAppliedInitially={appliedCampaignIds.has(campaign.id)} onViewDetails={() => setSelectedCampaign(campaign)} onApplicationChange={() => user && fetchAppliedCampaigns(user.uid)}/>
                        ))}
                    </div>
                ) : <div className="bg-white rounded-xl p-8 text-center min-h-[250px] flex flex-col justify-center items-center border border-violet-100"><PartyPopper className="h-12 w-12 text-violet-400 mb-4" /><p className="text-xl font-semibold text-gray-700">No Campaigns Found</p><p className="text-gray-500 mt-2">Try adjusting your filters or check back later.</p></div>}
            </div>
            {selectedCampaign && <CampaignDetailModal campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} />}
        </div>
    );
}

interface CampaignCardProps { campaign: CampaignUI; user: FirebaseAuthUser | null; userProfile: UserProfile | null; isAppliedInitially: boolean; onViewDetails: () => void; onApplicationChange: () => void; }

const CampaignCard: React.FC<CampaignCardProps> = ({ campaign, user, userProfile, isAppliedInitially, onViewDetails, onApplicationChange }) => {
    const [isApplied, setIsApplied] = useState(isAppliedInitially);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => { setIsApplied(isAppliedInitially); }, [isAppliedInitially]);

    const handleApply = async () => {
        if (!user || !userProfile) { toast.error("Please log in to apply."); return; }
        setIsProcessing(true);
        try {
            const applicantData = { userId: user.uid, userName: userProfile.name, userEmail: userProfile.email, appliedAt: new Date().toISOString(), status: 'pending' };
            await setDoc(doc(db, `campaigns/${campaign.id}/applicants`, user.uid), applicantData);
            await setDoc(doc(db, `users/${user.uid}/appliedCampaigns`, campaign.id), { appliedAt: new Date().toISOString() });
            onApplicationChange();
            toast.success("Successfully applied!");
        } catch (error) { toast.error("Failed to apply."); } 
        finally { setIsProcessing(false); }
    };

    const handleUnapply = async () => {
        if (!user) return;
        setIsProcessing(true);
        try {
            await deleteDoc(doc(db, `campaigns/${campaign.id}/applicants`, user.uid));
            await deleteDoc(doc(db, `users/${user.uid}/appliedCampaigns`, campaign.id));
            onApplicationChange();
            toast.info("Application withdrawn.");
        } catch (error) { toast.error("Failed to withdraw application."); } 
        finally { setIsProcessing(false); }
    };

    const getStatusClasses = (status: string) => {
        switch (status) {
            case 'Ongoing': return 'bg-violet-100 text-violet-800 border-violet-200';
            case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
            case 'Pending Review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-purple-200/50 hover:border-purple-300 transition-all flex flex-col">
            <div className="flex-grow">
                <div className="flex justify-between items-start mb-3"><h3 className="text-xl font-bold text-gray-800 truncate pr-4">{campaign.name}</h3><Badge variant="outline" className={`px-3 py-1 text-xs font-semibold ${getStatusClasses(campaign.status)}`}>{campaign.status}</Badge></div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4"><PlatformIcon platform={campaign.platform} /><span className="font-medium">{campaign.platform}</span></div>
                <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
                    <div className="flex items-center gap-2"><Users className="h-4 w-4 text-violet-500" /><span className="font-semibold">{campaign.numInfluencers} Creators</span></div>
                    <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-violet-500" /><span className="font-semibold">₹{campaign.perCreatorBudget.toLocaleString('en-IN')}/creator</span></div>
                    <div className="flex items-center gap-2"><BarChart2 className="h-4 w-4 text-violet-500" /><span className="font-semibold">{campaign.minFollowers.toLocaleString('en-IN')}+ Followers</span></div>
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-violet-500" /><span className="font-semibold">{format(new Date(campaign.deadline), 'MMM dd, yy')}</span></div>
                </div>
            </div>
            <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2">
                 <Button variant="outline" className="w-full" onClick={onViewDetails}>Show Details</Button>
                {!user ? <Button className="w-full bg-gray-300" disabled><LogIn className="mr-2 h-4 w-4"/>Login to Apply</Button>
                : isApplied ? <Button variant="destructive" className="w-full" onClick={handleUnapply} disabled={isProcessing}>{isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XIcon className="mr-2 h-4 w-4" />}Unapply</Button>
                : <Button className="w-full bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-700 hover:to-violet-700" onClick={handleApply} disabled={isProcessing}>{isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4"/>}Apply Now</Button>}
            </div>
        </div>
    );
};

const PlatformIcon: React.FC<{ platform: string }> = ({ platform }) => {
    switch (platform) {
        case 'Instagram': return <Instagram className="h-4 w-4 text-pink-600" />;
        case 'Youtube': return <Youtube className="h-4 w-4 text-red-600" />;
        case 'Facebook': return <Facebook className="h-4 w-4 text-blue-800" />;
        default: return <Send className="h-4 w-4 text-gray-500" />;
    }
};

const CampaignDetailModal: React.FC<{ campaign: CampaignUI; onClose: () => void; }> = ({ campaign, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-violet-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-scale-up" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-violet-50/80 backdrop-blur-lg p-5 border-b border-violet-200 z-10 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{campaign.name}</h2>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1"><PlatformIcon platform={campaign.platform} /><span>{campaign.platform} Campaign</span></div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-violet-200"><XIcon className="h-6 w-6 text-gray-600" /></Button>
                </div>
                <div className="p-6 md:p-8 space-y-8">
                    <div><h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><FileText className="text-violet-500"/>Description</h3><p className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">{campaign.campaignDescription}</p></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><BookUser className="text-violet-500"/>Creator Requirements</h3>
                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between items-center"><span className="text-gray-500 flex items-center gap-2"><BarChart2 size={16}/>Min. Followers</span><Badge variant="secondary" className="font-mono">{campaign.minFollowers.toLocaleString('en-IN')}</Badge></div>
                                <div className="flex justify-between items-center"><span className="text-gray-500 flex items-center gap-2"><Cake size={16}/>Target Age</span><Badge variant="secondary">{campaign.minAge} - {campaign.maxAge} years</Badge></div>
                                <div className="flex justify-between items-center"><span className="text-gray-500 flex items-center gap-2"><Users size={16}/>Target Gender</span><Badge variant="secondary">{campaign.gender}</Badge></div>
                                <div className="flex justify-between items-center"><span className="text-gray-500 flex items-center gap-2"><MapPin size={16}/>Location</span><Badge variant="secondary">{campaign.location}</Badge></div>
                                <div className="flex justify-between items-center"><span className="text-gray-500 flex items-center gap-2"><Hash size={16}/>Category</span><Badge variant="secondary">{campaign.creatorCategory}</Badge></div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Sparkles className="text-violet-500"/>Deliverables & Budget</h3>
                            <div className="space-y-4 text-sm">
                                {campaign.services.reel > 0 && <div className="flex justify-between items-center"><span className="text-gray-500">Reels</span><Badge className="bg-violet-100 text-violet-800">{campaign.services.reel}</Badge></div>}
                                {campaign.services.story > 0 && <div className="flex justify-between items-center"><span className="text-gray-500">Stories</span><Badge className="bg-violet-100 text-violet-800">{campaign.services.story}</Badge></div>}
                                {campaign.services.reelAndStory > 0 && <div className="flex justify-between items-center"><span className="text-gray-500">Reel + Story Packages</span><Badge className="bg-violet-100 text-violet-800">{campaign.services.reelAndStory}</Badge></div>}
                                <div className="border-t border-violet-200 pt-4 flex justify-between items-center"><span className="text-gray-500">Total Creators Needed</span><Badge className="bg-violet-100 text-violet-800">{campaign.numInfluencers}</Badge></div>
                                <div className="border-t border-violet-200 pt-4 flex justify-between items-center text-violet-700"><span className="font-semibold">Total Budget</span><span className="font-extrabold text-xl">₹{campaign.budgetTotal.toLocaleString('en-IN')}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
