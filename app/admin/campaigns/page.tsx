'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db } from '@/lib/firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where, getDoc, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { Instagram } from 'lucide-react';

// Re-defining types locally
interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

interface CampaignApplicantDoc {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  instagramUsername?: string;
  instagramProfile?: string;
  appliedAt: FirestoreTimestamp;
  status: 'pending' | 'approved' | 'rejected';
}

interface CampaignDoc {
  id: string;
  campaignName: string;
  brandName: string;
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  deadline: FirestoreTimestamp;
  platform: string;
  status: 'pending' | 'approved' | 'rejected';
  totalCreatorBudget?: number;
  userInfo?: {
    displayName?: string;
    email?: string;
    uid: string;
  };
}

interface CampaignWithDetails extends CampaignDoc {
  applicants: CampaignApplicantDoc[];
}

const CAMPAIGNS_PER_PAGE = 10;
const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

const formatDate = (dateInput: FirestoreTimestamp | string | null | undefined): string => {
  if (!dateInput) return 'N/A';
  try {
    const date = typeof dateInput === 'string'
      ? new Date(dateInput)
      : new Date(dateInput.seconds * 1000 + dateInput.nanoseconds / 1000000);
    return isNaN(date.getTime()) ? 'Invalid Date' : format(date, 'MMM d, yyyy, h:mm a');
  } catch (error) {
    console.error("Date formatting error:", error);
    return 'Invalid Date';
  }
};

const formatCurrency = (amount: number | null | undefined): string => {
  return typeof amount === 'number'
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(amount)
    : 'N/A';
};

const mapFirestoreDocToCampaign = (doc: QueryDocumentSnapshot<DocumentData>): CampaignDoc => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data
  } as CampaignDoc;
};

const CampaignsPage = () => {
  const [campaigns, setCampaigns] = useState<CampaignWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingCampaigns, setUpdatingCampaigns] = useState<Record<string, boolean>>({});
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithDetails | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<Record<string, {phone?: string, instagramProfile?: string, instagramUsername?: string}>>({});
  const [creatorDetails, setCreatorDetails] = useState<Record<string, { phone?: string }>>({});
  const [isMobile, setIsMobile] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        closeDialog();
      }
    };
    if (isDialogOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDialogOpen]);

  useEffect(() => {
    let unsubscribeCampaigns: () => void;
    const unsubscribes: (() => void)[] = [];
    setError(null);
    try {
      const campaignsQuery = query(
        collection(db, "campaigns"),
        orderBy("createdAt", "desc")
      );
      unsubscribeCampaigns = onSnapshot(campaignsQuery, async (campaignsSnapshot) => {
        setLoading(true);
        const campaignsData = campaignsSnapshot.docs.map(mapFirestoreDocToCampaign);
        unsubscribes.forEach(unsub => unsub());
        unsubscribes.length = 0;
        for (const campaign of campaignsData) {
          const applicantsQuery = query(
            collection(db, `campaigns/${campaign.id}/applicants`),
            where("status", "==", "pending")
          );
          const unsubscribe = onSnapshot(applicantsQuery, (applicantsSnapshot) => {
            setCampaigns(prev => prev.map(c =>
              c.id === campaign.id
                ? {
                    ...c, applicants: applicantsSnapshot.docs.map(doc => ({
                      id: doc.id,
                      ...doc.data()
                    } as CampaignApplicantDoc))
                  }
                : c
            ));
          }, (error) => {
            console.error(`Applicant listener error for campaign ${campaign.id}:`, error);
          });
          unsubscribes.push(unsubscribe);
        }
        setCampaigns(campaignsData.map(campaign => ({
          ...campaign,
          applicants: []
        })));
        setLoading(false);
      }, (error) => {
        console.error("Campaign listener error:", error);
        setError("Failed to load campaigns. Please refresh the page.");
        setLoading(false);
      });
    } catch (error) {
      console.error("Initialization error:", error);
      setError("Initialization failed. Please check your connection.");
      setLoading(false);
    }
    return () => {
      unsubscribeCampaigns?.();
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);
  
  useEffect(() => {
    const fetchCreatorDetails = async (uids: string[]) => {
      const uidsToFetch = uids.filter(uid => uid && !creatorDetails[uid]);
      if (uidsToFetch.length === 0) return;

      const fetchPromises = uidsToFetch.map(async (uid) => {
        try {
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            return {
              uid,
              phone: userData.phoneNumber || userData.mobileNumber || 'Not Provided',
            };
          }
        } catch (error) {
          console.error(`Failed to fetch creator details for UID ${uid}`, error);
        }
        return null;
      });

      const results = await Promise.all(fetchPromises);
      const newDetails: Record<string, { phone?: string }> = {};
      results.forEach(result => {
        if (result) {
          newDetails[result.uid] = { phone: result.phone };
        }
      });

      if (Object.keys(newDetails).length > 0) {
        setCreatorDetails(prev => ({ ...prev, ...newDetails }));
      }
    };

    const creatorUids = campaigns
      .map(campaign => campaign.userInfo?.uid)
      .filter((uid): uid is string => !!uid);

    if (creatorUids.length > 0) {
      fetchCreatorDetails([...new Set(creatorUids)]);
    }
  }, [campaigns, creatorDetails]);

  const updateCampaignStatus = useCallback(async (campaignId: string, newStatus: CampaignDoc['status']) => {
    if (!db) return;
    setCampaigns(prev => prev.map(campaign =>
      campaign.id === campaignId ? { ...campaign, status: newStatus } : campaign
    ));
    setUpdatingCampaigns(prev => ({ ...prev, [campaignId]: true }));
    try {
      const campaignRef = doc(db, "campaigns", campaignId);
      await updateDoc(campaignRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      toast.success(`Campaign status updated to ${newStatus}`);
    } catch (error) {
      console.error("Update failed:", error);
      toast.error("Update failed. Please try again.");
      const originalCampaign = campaigns.find(c => c.id === campaignId);
      setCampaigns(prev => prev.map(campaign =>
        campaign.id === campaignId
          ? { ...campaign, status: originalCampaign?.status || campaign.status }
          : campaign
      ));
    } finally {
      setUpdatingCampaigns(prev => ({ ...prev, [campaignId]: false }));
    }
  }, [campaigns]);

  const fetchUserDetails = useCallback(async (applicants: CampaignApplicantDoc[]) => {
    try {
      const newUserDetails: Record<string, {phone?: string, instagramProfile?: string, instagramUsername?: string}> = {};
      const usersToFetch = applicants
        .filter(applicant => 
          (!applicant.userPhone && !userDetails[applicant.userId]?.phone) || 
          (!applicant.instagramProfile && !userDetails[applicant.userId]?.instagramProfile) ||
          (!applicant.instagramUsername && !userDetails[applicant.userId]?.instagramUsername)
        )
        .map(applicant => applicant.userId);

      const fetchPromises = usersToFetch.map(async userId => {
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            return {
              userId,
              phone: userData.phoneNumber || userData.mobileNumber || 'No phone provided',
              instagramProfile: userData.instagramProfile || userData.instagram || 'Not provided',
              instagramUsername: userData.instagramUsername || 'Not provided'
            };
          }
        } catch (error) {
          console.error(`Failed to fetch user ${userId}`, error);
        }
        return null;
      });

      const results = await Promise.all(fetchPromises);
      results.forEach(result => {
        if (result) {
          newUserDetails[result.userId] = {
            phone: result.phone,
            instagramProfile: result.instagramProfile,
            instagramUsername: result.instagramUsername
          };
        }
      });
      if (Object.keys(newUserDetails).length > 0) {
        setUserDetails(prev => ({ ...prev, ...newUserDetails }));
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  }, [userDetails]);

  const openCampaignDetails = async (campaign: CampaignWithDetails) => {
    try {
      const campaignRef = doc(db, "campaigns", campaign.id);
      const docSnap = await getDoc(campaignRef);
      let updatedCampaign = campaign;
      if (docSnap.exists()) {
        updatedCampaign = {
          ...mapFirestoreDocToCampaign(docSnap) as CampaignWithDetails,
          applicants: campaign.applicants
        };
      }
      if (updatedCampaign.applicants.length > 0) {
        await fetchUserDetails(updatedCampaign.applicants);
      }
      setSelectedCampaign(updatedCampaign);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error fetching campaign details:", error);
      setSelectedCampaign(campaign);
      setIsDialogOpen(true);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedCampaign(null);
  };

  const filteredCampaigns = useMemo(() => {
    let result = campaigns;
    if (statusFilter !== 'all') {
      result = result.filter(campaign => campaign.status === statusFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(campaign => {
        const matchesCampaign = (campaign.campaignName || '').toLowerCase().includes(term) ||
          (campaign.brandName || '').toLowerCase().includes(term);
        const matchesApplicant = campaign.applicants.some(applicant =>
          (applicant.userName || '').toLowerCase().includes(term) ||
          (applicant.userEmail || '').toLowerCase().includes(term) ||
          (userDetails[applicant.userId]?.phone || '').toLowerCase().includes(term) ||
          (applicant.instagramUsername || userDetails[applicant.userId]?.instagramUsername || '').toLowerCase().includes(term) ||
          (applicant.instagramProfile || userDetails[applicant.userId]?.instagramProfile || '').toLowerCase().includes(term)
        );
        return matchesCampaign || matchesApplicant;
      });
    }
    return result;
  }, [campaigns, searchTerm, statusFilter, userDetails]);

  const totalPages = Math.ceil(filteredCampaigns.length / CAMPAIGNS_PER_PAGE);
  const paginatedCampaigns = useMemo(() => {
    const startIndex = (currentPage - 1) * CAMPAIGNS_PER_PAGE;
    return filteredCampaigns.slice(startIndex, startIndex + CAMPAIGNS_PER_PAGE);
  }, [filteredCampaigns, currentPage]);

  const getStatusColor = (status: string) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  const getApplicantPhone = (applicant: CampaignApplicantDoc) => {
    return applicant.userPhone || userDetails[applicant.userId]?.phone || 'No phone provided';
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 min-h-[300px]">
        <div className="bg-red-100 text-red-800 p-4 rounded-lg max-w-md text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-bold mb-2">Data Loading Error</h3>
          <p className="mb-4">{error}</p>
          <button
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (loading && !campaigns.length) {
    return (
      <div className="flex flex-col items-center justify-center p-4 min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="mt-4 text-gray-600">Loading campaign data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 sm:p-4 pb-20">
      {isDialogOpen && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div
            ref={dialogRef}
            className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fade-in"
          >
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{selectedCampaign.campaignName || 'Untitled Campaign'}</h2>
                  <p className="text-gray-600">by {selectedCampaign.brandName || 'Unknown Brand'}</p>
                </div>
                <button
                  onClick={closeDialog}
                  className="text-gray-500 hover:text-gray-700 text-2xl transition-colors"
                  aria-label="Close dialog"
                >
                  &times;
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-6">
                {/* Left Column: Campaign & Creator Info */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Campaign Details</h3>
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status</span>
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${getStatusColor(selectedCampaign.status)}`}>
                          {selectedCampaign.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Platform</span>
                        <span className="font-medium text-gray-800">{selectedCampaign.platform || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Budget</span>
                        <span className="font-medium text-gray-800">{formatCurrency(selectedCampaign.totalCreatorBudget)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Deadline</span>
                        <span className="font-medium text-gray-800">{formatDate(selectedCampaign.deadline)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created</span>
                        <span className="font-medium text-gray-800">{formatDate(selectedCampaign.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedCampaign.userInfo && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Created By</h3>
                      <div className="mt-2 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name</span>
                          <span className="font-medium text-gray-800">{selectedCampaign.userInfo.displayName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email</span>
                          <span className="font-medium text-gray-800">{selectedCampaign.userInfo.email || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone</span>
                          <span className="font-medium text-gray-800">
                            {creatorDetails[selectedCampaign.userInfo.uid]?.phone || 'Loading...'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">User ID</span>
                          <span className="font-medium text-gray-800 truncate max-w-[200px]">{selectedCampaign.userInfo.uid}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Applicants */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Applicants ({selectedCampaign.applicants.length})</h3>
                  {selectedCampaign.applicants.length > 0 ? (
                    <div className="mt-2 border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                      {selectedCampaign.applicants.map(applicant => (
                        <div key={applicant.id} className="p-3 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold text-gray-900 text-sm truncate max-w-[70%]">
                              {applicant.userName || 'Unknown User'}
                            </h4>
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{formatDate(applicant.appliedAt)}</span>
                          </div>
                          <div className="mt-2 text-sm text-gray-600 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="truncate">{applicant.userEmail || 'No email provided'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span>{getApplicantPhone(applicant)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Instagram className="h-4 w-4 text-gray-400" />
                              <span className="truncate">
                                {applicant.instagramUsername || applicant.instagramProfile ? (
                                  <a 
                                    href={applicant.instagramProfile || `https://instagram.com/${applicant.instagramUsername}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:underline"
                                  >
                                    {applicant.instagramUsername ? `@${applicant.instagramUsername}` : 'Instagram Profile'}
                                  </a>
                                ) : (
                                  'No Instagram Profile'
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 text-center py-8 border-2 border-dashed rounded-lg">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962A3.375 3.375 0 0110.5 9.75v-.75a3.375 3.375 0 013.375-3.375s-1.543-.214-2.31-.816A4.5 4.5 0 005.25 8.25v3.362" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                      <h4 className="mt-2 text-sm font-medium text-gray-900">No applicants yet</h4>
                      <p className="mt-1 text-sm text-gray-500">This campaign has no pending applications.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => selectedCampaign && updateCampaignStatus(selectedCampaign.id, 'rejected')}
                  disabled={!selectedCampaign || selectedCampaign.status === 'rejected' || updatingCampaigns[selectedCampaign.id]}
                  className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${selectedCampaign?.status === 'rejected'
                      ? 'bg-red-200 text-red-800'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                >
                  Reject Campaign
                </button>
                <button
                  onClick={() => selectedCampaign && updateCampaignStatus(selectedCampaign.id, 'approved')}
                  disabled={!selectedCampaign || selectedCampaign.status === 'approved' || updatingCampaigns[selectedCampaign.id]}
                  className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${selectedCampaign?.status === 'approved'
                      ? 'bg-green-200 text-green-800'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                >
                  Approve Campaign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Campaign Management</h1>
          <p className="mt-1 text-gray-600">
            Review campaigns and manage applications in real-time
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 w-full">
          <div className="relative">
            <input
              type="text"
              placeholder="Search campaigns, applicants, Instagram..."
              className="w-full rounded-lg border border-gray-200 py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search campaigns"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {isMobile ? (
        <div className="space-y-4">
          {paginatedCampaigns.length > 0 ? (
            paginatedCampaigns.map((campaign) => (
              <div 
                key={campaign.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer"
                onClick={() => openCampaignDetails(campaign)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate max-w-[200px]">
                      {campaign.campaignName || <span className="text-gray-400 italic">Untitled</span>}
                    </h3>
                    <p className="text-sm text-gray-500 truncate max-w-[200px]">
                      {campaign.brandName || <span className="text-gray-400 italic">No brand</span>}
                    </p>
                  </div>
                  <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${getStatusColor(campaign.status)}`}>
                    {campaign.status}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Budget</p>
                    <p className="font-medium">{formatCurrency(campaign.totalCreatorBudget)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Platform</p>
                    <p className="font-medium">{campaign.platform || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Deadline</p>
                    <p className="font-medium">{formatDate(campaign.deadline)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Applicants</p>
                    <p className="font-medium">{campaign.applicants.length}</p>
                  </div>
                </div>

                <div className="mt-4 flex justify-between" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => updateCampaignStatus(campaign.id, 'approved')}
                    disabled={campaign.status === 'approved' || updatingCampaigns[campaign.id]}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors w-[48%] disabled:opacity-50 disabled:cursor-not-allowed ${
                      campaign.status === 'approved'
                        ? 'bg-green-200 text-green-800'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {updatingCampaigns[campaign.id] && campaign.status !== 'approved' ? (
                      <span className="flex items-center justify-center">
                        <span className="animate-spin rounded-full h-3 w-3 border-b-1 border-current mr-1"></span>
                        ...
                      </span>
                    ) : 'Approve'}
                  </button>

                  <button
                    onClick={() => updateCampaignStatus(campaign.id, 'rejected')}
                    disabled={campaign.status === 'rejected' || updatingCampaigns[campaign.id]}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors w-[48%] disabled:opacity-50 disabled:cursor-not-allowed ${
                      campaign.status === 'rejected'
                        ? 'bg-red-200 text-red-800'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl p-6 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p className="text-lg font-medium text-gray-900">No matching campaigns found</p>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign & Brand</th>
                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicants</th>
                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCampaigns.length > 0 ? (
                paginatedCampaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => openCampaignDetails(campaign)}
                  >
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap min-w-[200px]">
                      <div className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">
                        {campaign.campaignName || <span className="text-gray-400 italic">Untitled</span>}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[180px]">
                        {campaign.brandName || <span className="text-gray-400 italic">No brand</span>}
                      </div>
                    </td>

                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 min-w-[180px]">
                      <div><span className="font-medium">Budget:</span> {formatCurrency(campaign.totalCreatorBudget)}</div>
                      <div><span className="font-medium">Platform:</span> {campaign.platform || 'N/A'}</div>
                      <div><span className="font-medium">Deadline:</span> {formatDate(campaign.deadline)}</div>
                    </td>

                    <td className="px-4 sm:px-6 py-4 min-w-[200px]">
                      {campaign.applicants.length > 0 ? (
                        <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2">
                          {campaign.applicants.map(applicant => (
                            <div key={applicant.id} className="text-sm">
                              <div className="font-medium text-gray-800 truncate max-w-[160px]">{applicant.userName || 'Unknown User'}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[160px]">{applicant.userEmail || 'No Email'}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[160px] flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {userDetails[applicant.userId]?.phone || 'Fetching...'}
                              </div>
                              <div className="text-xs text-gray-500 truncate max-w-[160px] flex items-center">
                                <Instagram className="h-3 w-3 mr-1 text-gray-400" />
                                {applicant.instagramUsername || applicant.instagramProfile ? (
                                  <a 
                                    href={applicant.instagramProfile || `https://instagram.com/${applicant.instagramUsername}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:underline"
                                  >
                                    {applicant.instagramUsername ? `@${applicant.instagramUsername}` : 'Instagram Profile'}
                                  </a>
                                ) : (
                                  'No Instagram'
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic">No applicants</div>
                      )}
                    </td>

                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>

                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => updateCampaignStatus(campaign.id, 'approved')}
                          disabled={campaign.status === 'approved' || updatingCampaigns[campaign.id]}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors w-full text-center disabled:opacity-50 disabled:cursor-not-allowed ${campaign.status === 'approved'
                              ? 'bg-green-200 text-green-800'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          aria-label={`Approve ${campaign.campaignName}`}
                        >
                          {updatingCampaigns[campaign.id] && campaign.status !== 'approved' ? (
                            <span className="flex items-center justify-center">
                              <span className="animate-spin rounded-full h-3 w-3 border-b-1 border-current mr-1"></span>
                              ...
                            </span>
                          ) : 'Approve'}
                        </button>

                        <button
                          onClick={() => updateCampaignStatus(campaign.id, 'rejected')}
                          disabled={campaign.status === 'rejected' || updatingCampaigns[campaign.id]}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors w-full text-center disabled:opacity-50 disabled:cursor-not-allowed ${campaign.status === 'rejected'
                              ? 'bg-red-200 text-red-800'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          aria-label={`Reject ${campaign.campaignName}`}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <p className="text-lg font-medium">No matching campaigns found</p>
                      <p className="mt-1 text-sm max-w-md">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-4 sm:px-6 bg-white rounded-lg border border-gray-200">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{(currentPage - 1) * CAMPAIGNS_PER_PAGE + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(currentPage * CAMPAIGNS_PER_PAGE, filteredCampaigns.length)}
            </span>{' '}
            of <span className="font-medium">{filteredCampaigns.length}</span> campaigns
          </div>

          <nav className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-md text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              Previous
            </button>

            <span className="text-sm text-gray-500 min-w-[100px] text-center">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-md text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default CampaignsPage;