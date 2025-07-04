'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseConfig';
import { collection, getDocs, updateDoc, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
// Import Firebase Storage modules
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
// Import Recharts components for data visualization
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


// Define interfaces for data structures
interface Booking {
  id: string;
  userId: string;
  userEmail: string;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  creatorProfile: string;
  services: {
    reels: number;
    story: number;
    reelsStory: number;
  };
  campaign: {
    name: string;
    description: string;
    deadline: {
      seconds: number;
      nanoseconds: number;
    } | null;
    demoVideoUrl: string;
    demoVideoName: string;
  };
  bookerDetails: {
    fullName: string;
    email: string;
    phoneNumber: string;
  };
  payment: {
    status: string;
    transactionId: string;
    amount: number;
    currency: string;
  };
  totalPrice: number;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

interface CreatorApplication {
  id: string;
  userId: string; // Crucial for sending notifications
  fullName: string;
  emailAddress: string;
  mobileNumber: string;
  cityState: string;
  gender: string;
  instagramUsername: string;
  instagramProfileLink: string;
  totalFollowers: string;
  avgReelViews: string;
  storyAverageViews: string;
  profilePictureUrl: string;
  contentCategory: string;
  contentLanguages: string;
  reelPrice: string;
  storyPrice: string;
  reelsStoryPrice: string;
  deliveryDuration: string;
  timestamp: {
    seconds: number;
    nanoseconds: number;
  };
  status: 'pending' | 'approved' | 'rejected';
  adminFeedback?: string;
}

// NEW INTERFACE for Trusted Client
interface TrustedClient {
  id: string;
  name: string;
  logoUrl: string;
}

// NEW INTERFACE for Campaign
interface Campaign {
  id: string;
  name: string;
  description: string;
  deadline: { seconds: number; nanoseconds: number };
  demoVideoUrl: string;
  demoVideoName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: { seconds: number; nanoseconds: number };
  createdBy: {
    userId: string;
    fullName: string;
    email: string;
  };
}

// NEW INTERFACE for Campaign Applicant
interface CampaignApplicant {
  id: string; // Document ID from the sub-collection
  creatorId: string; // The creator's user ID
  fullName: string;
  instagramUsername: string;
  profilePictureUrl: string;
  appliedAt: { seconds: number; nanoseconds: number };
}


const AdminDashboard = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [creatorApplications, setCreatorApplications] = useState<CreatorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<CreatorApplication | null>(null);
  const [stats, setStats] = useState({
    totalBookings: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    totalCampaigns: 0,
    pendingCampaigns: 0,
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'applications' | 'clients' | 'campaign'>('dashboard');
  const [feedback, setFeedback] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFeedbackError, setShowFeedbackError] = useState(false);

  const [trustedClients, setTrustedClients] = useState<TrustedClient[]>([]);
  const [newClientName, setNewClientName] = useState('');
  const [newClientLogoUrl, setNewClientLogoUrl] = useState('');
  const [clientFormError, setClientFormError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // NEW STATES for Campaign Management
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignApplicants, setCampaignApplicants] = useState<CampaignApplicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);


  useEffect(() => {
    const fetchData = async () => {
      if (!db) {
        console.error("Firestore DB not initialized.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch bookings
        const bookingsQuerySnapshot = await getDocs(collection(db, "bookings"));
        const bookingsData: Booking[] = [];
        let totalRevenue = 0;
        const bookingStatusCounts = {
          pending: 0,
          confirmed: 0,
          completed: 0,
          cancelled: 0
        };

        bookingsQuerySnapshot.forEach((document) => {
          const booking = { id: document.id, ...document.data() } as Booking;
          bookingsData.push(booking);
          bookingStatusCounts[booking.status] += 1;
          if (booking.status === 'completed') {
            totalRevenue += booking.totalPrice;
          }
        });
        setBookings(bookingsData);

        // Fetch creator applications
        const appsQuerySnapshot = await getDocs(collection(db, "creatorApplications"));
        const appsData: CreatorApplication[] = [];
        const appStatusCounts = {
          pending: 0,
          approved: 0,
          rejected: 0
        };

        appsQuerySnapshot.forEach((document) => {
          const app = { id: document.id, ...document.data() } as CreatorApplication;
          appsData.push(app);
          appStatusCounts[app.status] += 1;
        });
        setCreatorApplications(appsData);

        // Fetch trusted clients
        const clientsQuerySnapshot = await getDocs(collection(db, "trustedClients"));
        const clientsData: TrustedClient[] = [];
        clientsQuerySnapshot.forEach((document) => {
          clientsData.push({ id: document.id, ...document.data() } as TrustedClient);
        });
        setTrustedClients(clientsData);

        // Fetch campaigns with robust data mapping
        const campaignsQuerySnapshot = await getDocs(collection(db, "campaigns"));
        const campaignsData: Campaign[] = [];
        let pendingCampaignsCount = 0;

        campaignsQuerySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            // This mapping is now more defensive to handle variations in Firestore field names.
            const campaign: Campaign = {
                id: docSnapshot.id,
                name: data.name || data.campaignName,
                description: data.description || data.campaignDescription,
                deadline: data.deadline,
                demoVideoUrl: data.demoVideoUrl,
                demoVideoName: data.demoVideoName,
                status: data.status,
                createdAt: data.createdAt,
                createdBy: data.createdBy || data.creatorInfo,
            } as Campaign; // Cast to campaign to ensure type safety downstream

            campaignsData.push(campaign);
            if (campaign.status === 'pending') {
                pendingCampaignsCount++;
            }
        });
        setCampaigns(campaignsData);


        // Update dashboard statistics
        setStats(prev => ({
          ...prev,
          totalBookings: bookingsData.length,
          pending: bookingStatusCounts.pending,
          confirmed: bookingStatusCounts.confirmed,
          completed: bookingStatusCounts.completed,
          cancelled: bookingStatusCounts.cancelled,
          totalRevenue,
          totalApplications: appsData.length,
          pendingApplications: appStatusCounts.pending,
          approvedApplications: appStatusCounts.approved,
          rejectedApplications: appStatusCounts.rejected,
          totalCampaigns: campaignsData.length,
          pendingCampaigns: pendingCampaignsCount,
        }));

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data: ", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // NEW: useEffect to fetch applicants when a campaign is selected
  useEffect(() => {
    if (selectedCampaign) {
      const fetchCampaignApplicants = async (campaignId: string) => {
        if (!db) return;
        setLoadingApplicants(true);
        try {
          const applicantsSnapshot = await getDocs(collection(db, `campaigns/${campaignId}/applicants`));
          const applicantsData: CampaignApplicant[] = applicantsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as CampaignApplicant));
          setCampaignApplicants(applicantsData);
        } catch (error) {
          console.error("Error fetching campaign applicants:", error);
          setCampaignApplicants([]);
        } finally {
          setLoadingApplicants(false);
        }
      };
      
      fetchCampaignApplicants(selectedCampaign.id);
    }
  }, [selectedCampaign]);

  const filteredBookings = bookings.filter(booking =>
    (booking.bookerDetails?.fullName?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
    (booking.bookerDetails?.email?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
    (booking.creatorName?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
    (booking.payment?.transactionId?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
  );

  const filteredApplications = creatorApplications.filter(app =>
    (app.fullName?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
    (app.emailAddress?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
    (app.instagramUsername?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
    (app.contentCategory?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
  );

  const filteredTrustedClients = trustedClients.filter(client =>
    (client.name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
  );
  
  const filteredCampaigns = campaigns.filter(campaign =>
    (campaign.name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
    (campaign.createdBy?.fullName?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
  );


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (!file.type.startsWith('image/')) {
        setUploadError("Please select an image file (JPG, PNG, GIF, etc.).");
        setSelectedFile(null);
        setImagePreviewUrl(null);
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);
      setNewClientLogoUrl('');
    } else {
      setSelectedFile(null);
      setImagePreviewUrl(null);
      setUploadError(null);
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    setUploadingFile(true);
    setUploadProgress(0);
    setUploadError(null);

    const storage = getStorage();
    const storageRef = ref(storage, `client_logos/${Date.now()}_${selectedFile.name}`);
    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    return new Promise((resolve) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          setUploadError(`Upload failed: ${error.message}`);
          setUploadingFile(false);
          resolve(null);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadingFile(false);
            setUploadProgress(100);
            resolve(downloadURL);
          } catch (error) {
            setUploadError(`Failed to get download URL: ${error instanceof Error ? error.message : String(error)}`);
            setUploadingFile(false);
            resolve(null);
          }
        }
      );
    });
  };

  const updateBookingStatus = async (bookingId: string, newStatus: Booking['status']) => {
    if (!db) return;
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, {
        status: newStatus
      });

      const updatedBookings = bookings.map(booking =>
        booking.id === bookingId ? { ...booking, status: newStatus } : booking
      );
      setBookings(updatedBookings);

      const newTotalRevenue = updatedBookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.totalPrice, 0);
      const newBookingStatusCounts = {
        pending: updatedBookings.filter(b => b.status === 'pending').length,
        confirmed: updatedBookings.filter(b => b.status === 'confirmed').length,
        completed: updatedBookings.filter(b => b.status === 'completed').length,
        cancelled: updatedBookings.filter(b => b.status === 'cancelled').length
      };

      setStats(prev => ({
        ...prev,
        totalRevenue: newTotalRevenue,
        ...newBookingStatusCounts
      }));
    } catch (error) {
      console.error("Error updating booking status: ", error);
    }
  };

  const updateApplicationStatus = async (appId: string, newStatus: CreatorApplication['status'], feedback = '') => {
    if (!db) return;
    try {
      const appRef = doc(db, "creatorApplications", appId);
      const applicationToUpdate = creatorApplications.find(app => app.id === appId);

      if (!applicationToUpdate) return;

      if (newStatus === 'rejected' && feedback.trim() === '') {
        setShowFeedbackError(true);
        return;
      }

      await updateDoc(appRef, {
        status: newStatus,
        ...(feedback && { adminFeedback: feedback }),
        updatedAt: new Date(),
      });
      
      const updatedApplications = creatorApplications.map(app =>
        app.id === appId ? { ...app, status: newStatus, ...(feedback && { adminFeedback: feedback }) } : app
      );
      setCreatorApplications(updatedApplications);

      const newAppStatusCounts = {
        pendingApplications: updatedApplications.filter(a => a.status === 'pending').length,
        approvedApplications: updatedApplications.filter(a => a.status === 'approved').length,
        rejectedApplications: updatedApplications.filter(a => a.status === 'rejected').length,
      };

      setStats(prev => ({
        ...prev,
        ...newAppStatusCounts
      }));

      if (newStatus === 'approved') {
        const appIdGlobal = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        await addDoc(collection(db, `artifacts/${appIdGlobal}/users/${applicationToUpdate.userId}/notifications`), {
          message: `Congratulations! Your creator application has been approved. You can now start receiving bookings.`,
          read: false,
          timestamp: new Date(),
          type: 'application_status',
          link: '/creator-dashboard'
        });
      }

      setSelectedApplication(null);
      setFeedback('');
      setShowFeedbackError(false);
    } catch (error) {
      console.error("Error updating application status: ", error);
    }
  };
  
    const updateCampaignStatus = async (campaignId: string, newStatus: Campaign['status']) => {
    if (!db) return;
    try {
      const campaignRef = doc(db, "campaigns", campaignId);
      await updateDoc(campaignRef, {
        status: newStatus,
        updatedAt: new Date(),
      });

      const updatedCampaigns = campaigns.map(campaign =>
        campaign.id === campaignId ? { ...campaign, status: newStatus } : campaign
      );
      setCampaigns(updatedCampaigns);
      
      if (selectedCampaign && selectedCampaign.id === campaignId) {
        setSelectedCampaign({ ...selectedCampaign, status: newStatus });
      }

      const newPendingCampaigns = updatedCampaigns.filter(c => c.status === 'pending').length;

      setStats(prev => ({
        ...prev,
        pendingCampaigns: newPendingCampaigns,
      }));

    } catch (error) {
      console.error("Error updating campaign status: ", error);
    }
  };

  const addTrustedClient = async () => {
    if (!db) return;

    let logoToStore = newClientLogoUrl.trim();

    if (selectedFile) {
      setClientFormError(null);
      logoToStore = await uploadFile();
      if (!logoToStore) {
        setClientFormError(uploadError || "Failed to upload logo file.");
        return;
      }
    } else if (!logoToStore) {
      setClientFormError("Please provide a client name and either upload a logo file or enter a Logo URL.");
      return;
    }

    if (!newClientName.trim()) {
      setClientFormError("Client Name cannot be empty.");
      return;
    }

    if (!selectedFile && logoToStore) {
      try {
        new URL(logoToStore);
      } catch (_) {
        setClientFormError("Invalid Logo URL format. Please provide a valid URL.");
        return;
      }
    }

    setClientFormError(null);

    try {
      const docRef = await addDoc(collection(db, "trustedClients"), {
        name: newClientName,
        logoUrl: logoToStore,
        createdAt: new Date(),
      });
      const newClient: TrustedClient = {
        id: docRef.id,
        name: newClientName,
        logoUrl: logoToStore,
      };
      setTrustedClients(prev => [...prev, newClient]);
      setNewClientName('');
      setNewClientLogoUrl('');
      setSelectedFile(null);
      setImagePreviewUrl(null);
      setUploadProgress(0);
      setUploadError(null);
    } catch (error) {
      console.error("Error adding trusted client:", error);
      setClientFormError("Failed to add client. Please try again.");
    }
  };

  const deleteTrustedClient = async (clientId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "trustedClients", clientId));
      setTrustedClients(prev => prev.filter(client => client.id !== clientId));
    } catch (error) {
      console.error("Error deleting trusted client:", error);
      setClientFormError("Failed to delete client. Please try again.");
    }
  };


  // FIX: Changed the date format string from 'DDDD' to 'dd' to fix the RangeError.
  const formatDate = (timestamp: { seconds: number; nanoseconds: number } | null | undefined) => {
    if (!timestamp || typeof timestamp.seconds !== 'number') {
      return 'N/A';
    }
    try {
      // Corrected format string: 'LLL d, y, h:mm a' is a robust format.
      return format(new Date(timestamp.seconds * 1000), 'LLL d, y, h:mm a');
    } catch (error) {
      console.error("Error formatting date:", error, "with timestamp:", timestamp);
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const bookingStatusData = [
    { name: 'Pending', value: stats.pending, color: '#fbbf24' },
    { name: 'Confirmed', value: stats.confirmed, color: '#3b82f6' },
    { name: 'Completed', value: stats.completed, color: '#22c55e' },
    { name: 'Cancelled', value: stats.cancelled, color: '#ef4444' },
  ];

  const applicationStatusData = [
    { name: 'Pending', value: stats.pendingApplications, color: '#fbbf24' },
    { name: 'Approved', value: stats.approvedApplications, color: '#22c55e' },
    { name: 'Rejected', value: stats.rejectedApplications, color: '#ef4444' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Admin Dashboard</h1>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded-lg border border-gray-200 py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex flex-wrap border-b border-gray-200">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-3 px-4 sm:px-6 font-medium text-sm sm:text-base rounded-t-lg transition-all duration-200 ease-in-out
              ${activeTab === 'dashboard'
                ? 'bg-white border-t border-l border-r border-gray-200 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`py-3 px-4 sm:px-6 font-medium text-sm sm:text-base rounded-t-lg transition-all duration-200 ease-in-out flex items-center
              ${activeTab === 'bookings'
                ? 'bg-white border-t border-l border-r border-gray-200 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Bookings
            {stats.pending > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {stats.pending}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`py-3 px-4 sm:px-6 font-medium text-sm sm:text-base rounded-t-lg transition-all duration-200 ease-in-out flex items-center
              ${activeTab === 'applications'
                ? 'bg-white border-t border-l border-r border-gray-200 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Applications
            {stats.pendingApplications > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {stats.pendingApplications}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`py-3 px-4 sm:px-6 font-medium text-sm sm:text-base rounded-t-lg transition-all duration-200 ease-in-out
              ${activeTab === 'clients'
                ? 'bg-white border-t border-l border-r border-gray-200 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Clients
          </button>
          <button
            onClick={() => setActiveTab('campaign')}
            className={`py-3 px-4 sm:px-6 font-medium text-sm sm:text-base rounded-t-lg transition-all duration-200 ease-in-out flex items-center
              ${activeTab === 'campaign'
                ? 'bg-white border-t border-l border-r border-gray-200 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Campaigns
            {stats.pendingCampaigns > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {stats.pendingCampaigns}
              </span>
            )}
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex items-center">
                <div className="rounded-lg bg-indigo-50 p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex items-center">
                <div className="rounded-lg bg-green-50 p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex items-center">
                <div className="rounded-lg bg-blue-50 p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex items-center">
                <div className="rounded-lg bg-purple-50 p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Applications</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalApplications}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex items-center">
                <div className="rounded-lg bg-yellow-50 p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Apps</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingApplications}</p>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex items-center">
                <div className="rounded-lg bg-red-50 p-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.433 13.649l.612-1.749m.893-2.548l.54-1.542M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Campaigns</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingCampaigns}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Booking Status Distribution</h2>
                {stats.totalBookings > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={bookingStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {bookingStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [`${value} bookings`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-10">No booking data available to display chart.</p>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Creator Application Status</h2>
                {stats.totalApplications > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={applicationStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#82ca9d"
                        dataKey="value"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {applicationStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [`${value} applications`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-10">No application data available to display chart.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {[...bookings, ...creatorApplications]
                  .sort((a, b) =>
                    (b.createdAt?.seconds || b.timestamp?.seconds || 0) -
                    (a.createdAt?.seconds || a.timestamp?.seconds || 0)
                  )
                  .slice(0, 5)
                  .map(item => (
                    <div key={item.id} className="flex items-start pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className="bg-indigo-100 rounded-full p-2 mt-1 flex-shrink-0">
                        {('services' in item) ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {('services' in item)
                            ? `New booking from ${item.bookerDetails.fullName}`
                            : `New application from ${item.fullName}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(('services' in item) ? item.createdAt : item.timestamp)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ml-2 flex-shrink-0
                        ${('services' in item)
                          ? item.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : item.status === 'confirmed'
                              ? 'bg-blue-100 text-blue-800'
                              : item.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                          :
                          item.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : item.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">All Bookings</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booker
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Creator
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500 text-sm">
                        No bookings found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{booking.bookerDetails.fullName}</div>
                          <div className="text-xs text-gray-500">{booking.bookerDetails.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={booking.creatorProfile}
                                alt={booking.creatorName}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${booking.creatorName}&background=random&color=fff&size=128`;
                                }}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{booking.creatorName}</div>
                              <div className="text-xs text-gray-500">@{booking.creatorUsername}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(booking.totalPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(booking.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`
                            px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : ''}
                            ${booking.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                            ${booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                          `}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <select
                            value={booking.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateBookingStatus(booking.id, e.target.value as Booking['status']);
                            }}
                            className={`
                              rounded-md border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1
                              ${booking.status === 'pending' ? 'bg-yellow-50' : ''}
                              ${booking.status === 'confirmed' ? 'bg-blue-50' : ''}
                              ${booking.status === 'completed' ? 'bg-green-50' : ''}
                              ${booking.status === 'cancelled' ? 'bg-red-50' : ''}
                            `}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Creator Applications</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Instagram
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Followers
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500 text-sm">
                        No applications found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map((app) => (
                      <tr
                        key={app.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedApplication(app)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={app.profilePictureUrl}
                                alt={app.fullName}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${app.fullName}&background=random&color=fff&size=128`;
                                }}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{app.fullName}</div>
                              <div className="text-xs text-gray-500">{app.emailAddress}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">@{app.instagramUsername}</div>
                          <a
                            href={app.instagramProfileLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Profile
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {app.totalFollowers}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {app.contentCategory}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(app.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`
                              px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                              ${app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                              ${app.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                              ${app.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                            `}
                          >
                            {app.status ? app.status.charAt(0).toUpperCase() + app.status.slice(1) : 'Status N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApplication(app);
                              setFeedback(app.adminFeedback || '');
                              setShowFeedbackError(false);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Manage Trusted Clients</h2>

            <div className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="text-md font-medium text-gray-800 mb-3">Add New Client Logo</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="client-name" className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <input
                    type="text"
                    id="client-name"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="e.g., Brandify Inc."
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="logo-upload" className="block text-sm font-medium text-gray-700 mb-1">Upload Logo (JPG, PNG)</label>
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/jpeg, image/png, image/gif"
                    onChange={handleFileChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-indigo-50 file:text-indigo-700
                      hover:file:bg-indigo-100"
                  />
                  {!selectedFile && (
                    <>
                      <p className="text-center text-gray-400 my-2">OR</p>
                      <label htmlFor="logo-url-manual" className="block text-sm font-medium text-gray-700 mb-1">Enter Logo URL</label>
                      <input
                        type="url"
                        id="logo-url-manual"
                        value={newClientLogoUrl}
                        onChange={(e) => setNewClientLogoUrl(e.target.value)}
                        placeholder="e.g., https://example.com/logo.png"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 text-sm"
                      />
                    </>
                  )}
                  {imagePreviewUrl && (
                    <div className="mt-4 flex flex-col items-center">
                      <p className="text-sm text-gray-600 mb-2">Image Preview:</p>
                      <img src={imagePreviewUrl} alt="Logo Preview" className="max-w-[150px] max-h-[100px] object-contain border border-gray-200 rounded-md p-1" />
                    </div>
                  )}

                  {uploadingFile && (
                    <div className="mt-3 w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                      <span className="text-xs text-indigo-700 ml-2">{Math.round(uploadProgress)}%</span>
                    </div>
                  )}
                </div>
              </div>
              {clientFormError && (
                <div className="mt-3 p-2 bg-red-100 text-red-700 text-sm rounded-md border border-red-200">
                  {clientFormError}
                </div>
              )}
              {uploadError && (
                <div className="mt-3 p-2 bg-red-100 text-red-700 text-sm rounded-md border border-red-200">
                  {uploadError}
                </div>
              )}
              <button
                onClick={addTrustedClient}
                className={`mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium
                  ${uploadingFile ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={uploadingFile}
              >
                {uploadingFile ? 'Uploading...' : 'Add Client'}
              </button>
            </div>

            <h3 className="text-md font-semibold text-gray-800 mb-3">Existing Clients ({trustedClients.length})</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Logo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Logo URL
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTrustedClients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500 text-sm">
                        No trusted clients added yet or found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredTrustedClients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {client.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <img
                            src={client.logoUrl}
                            alt={`${client.name} logo`}
                            className="h-10 w-auto object-contain max-w-[100px] rounded-md border border-gray-100"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder-logo.png";
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-blue-600 hover:underline cursor-pointer max-w-xs truncate">
                          <a href={client.logoUrl} target="_blank" rel="noopener noreferrer" className="block">
                            {client.logoUrl}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => deleteTrustedClient(client.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'campaign' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">All Campaigns</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created By
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deadline
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500 text-sm">
                        No campaigns found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredCampaigns.map((campaign) => (
                      <tr
                        key={campaign.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedCampaign(campaign)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{campaign.name || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{campaign.createdBy?.fullName || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{campaign.createdBy?.email || ''}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(campaign.deadline)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(campaign.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`
                            px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${campaign.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${campaign.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                            ${campaign.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                          `}>
                            {campaign.status ? campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1) : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCampaign(campaign);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto transform scale-95 md:scale-100 transition-transform duration-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Booking Details</h3>
                  <p className="text-sm text-gray-500 mt-1">ID: {selectedBooking.id}</p>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Booker Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Full Name</p>
                      <p className="font-medium">{selectedBooking.bookerDetails.fullName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium">{selectedBooking.bookerDetails.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium">{selectedBooking.bookerDetails.phoneNumber}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Creator Information</h4>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 mr-4">
                      <img
                        className="h-12 w-12 rounded-full object-cover"
                        src={selectedBooking.creatorProfile}
                        alt={selectedBooking.creatorName}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${selectedBooking.creatorName}&background=random&color=fff&size=128`;
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{selectedBooking.creatorName}</p>
                      <p className="text-gray-600 text-xs">@{selectedBooking.creatorUsername}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Services Booked</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedBooking.services.reels > 0 && (
                    <div className="bg-red-50 p-3 rounded-lg text-sm">
                      <p className="font-medium">Reels</p>
                      <p className="text-red-700 font-semibold">Qty: {selectedBooking.services.reels}</p>
                    </div>
                  )}

                  {selectedBooking.services.story > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg text-sm">
                      <p className="font-medium">Story</p>
                      <p className="text-blue-700 font-semibold">Qty: {selectedBooking.services.story}</p>
                    </div>
                  )}

                  {selectedBooking.services.reelsStory > 0 && (
                    <div className="bg-purple-50 p-3 rounded-lg text-sm">
                      <p className="font-medium">Reels + Story</p>
                      <p className="text-purple-700 font-semibold">Qty: {selectedBooking.services.reelsStory}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                  <p className="font-medium text-sm">Total Amount</p>
                  <p className="font-bold text-lg text-gray-900">{formatCurrency(selectedBooking.totalPrice)}</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Campaign Details</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Campaign Name</p>
                    <p className="font-medium">{selectedBooking.campaign.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="font-medium">{selectedBooking.campaign.description}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Deadline</p>
                    <p className="font-medium">
                      {selectedBooking.campaign.deadline ?
                        formatDate(selectedBooking.campaign.deadline) :
                        'Not specified'}
                    </p>
                  </div>
                  {selectedBooking.campaign.demoVideoUrl && (
                    <div>
                      <p className="text-xs text-gray-500">Reference Video</p>
                      <a
                        href={selectedBooking.campaign.demoVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline text-sm"
                      >
                        {selectedBooking.campaign.demoVideoName || 'View Video'}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Payment Details</h4>
                <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Transaction ID</p>
                    <p className="font-medium">{selectedBooking.payment.transactionId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="font-medium">{formatCurrency(selectedBooking.payment.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="font-medium">{selectedBooking.payment.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Currency</p>
                    <p className="font-medium">{selectedBooking.payment.currency}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-6">
                <div>
                  <label htmlFor="booking-status-select" className="block text-sm font-medium text-gray-900 mb-2">Update Status</label>
                  <select
                    id="booking-status-select"
                    value={selectedBooking.status}
                    onChange={(e) => {
                      updateBookingStatus(selectedBooking.id, e.target.value as Booking['status']);
                      setSelectedBooking({
                        ...selectedBooking,
                        status: e.target.value as Booking['status']
                      });
                    }}
                    className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="mt-4 sm:mt-0 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto transform scale-95 md:scale-100 transition-transform duration-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Creator Application</h3>
                  <p className="text-sm text-gray-500 mt-1">{selectedApplication.fullName}</p>
                </div>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Personal Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Full Name</p>
                      <p className="font-medium">{selectedApplication.fullName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium">{selectedApplication.emailAddress}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium">{selectedApplication.mobileNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="font-medium">{selectedApplication.cityState}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Gender</p>
                      <p className="font-medium">{selectedApplication.gender}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Instagram Details</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Username</p>
                      <p className="font-medium">@{selectedApplication.instagramUsername}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Profile Link</p>
                      <a
                        href={selectedApplication.instagramProfileLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline text-sm"
                      >
                        View Profile
                      </a>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Followers</p>
                      <p className="font-medium">{selectedApplication.totalFollowers}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Avg. Reel Views</p>
                      <p className="font-medium">{selectedApplication.avgReelViews}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Avg. Story Views</p>
                      <p className="font-medium">{selectedApplication.storyAverageViews}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Content Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Category</p>
                      <p className="font-medium">{selectedApplication.contentCategory}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Languages</p>
                      <p className="font-medium">{selectedApplication.contentLanguages}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Pricing Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Reel Price</p>
                      <p className="font-medium">₹{selectedApplication.reelPrice}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Story Price</p>
                      <p className="font-medium">₹{selectedApplication.storyPrice}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Reel + Story Price</p>
                      <p className="font-medium">₹{selectedApplication.reelsStoryPrice}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Profile Picture</h4>
                <div className="flex justify-center">
                  <img
                    src={selectedApplication.profilePictureUrl}
                    alt="Profile"
                    className="h-32 w-32 md:h-48 md:w-48 rounded-lg object-cover border-2 border-gray-200 shadow-sm"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${selectedApplication.fullName}&background=random&color=fff&size=128`;
                    }}
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Application Status</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="mb-4">
                    <span
                      className={`
                        px-3 py-1 rounded-full text-sm font-medium
                        ${selectedApplication.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${selectedApplication.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                        ${selectedApplication.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                      `}
                    >
                      {selectedApplication.status
                        ? selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)
                        : 'Status N/A'}
                    </span>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Update Status
                    </label>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                      <button
                        onClick={() => updateApplicationStatus(selectedApplication.id, 'approved')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium w-full sm:w-auto"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateApplicationStatus(selectedApplication.id, 'rejected', feedback)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium w-full sm:w-auto"
                      >
                        Reject
                      </button>
                    </div>
                    {showFeedbackError && (
                      <div className="mt-2 p-2 bg-red-100 text-red-700 text-sm rounded-md border border-red-200">
                        Please provide feedback before rejecting.
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="feedback-textarea" className="block text-sm font-medium text-gray-700 mb-2">
                      Feedback (Required for rejection)
                    </label>
                    <textarea
                      id="feedback-textarea"
                      value={feedback}
                      onChange={(e) => {
                        setFeedback(e.target.value);
                        if (showFeedbackError && e.target.value.trim() !== '') {
                          setShowFeedbackError(false);
                        }
                      }}
                      className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 text-sm"
                      placeholder="Provide feedback for the creator..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform scale-95 md:scale-100 transition-transform duration-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Campaign Details</h3>
                  <p className="text-sm text-gray-500 mt-1">ID: {selectedCampaign.id}</p>
                </div>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Campaign Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Campaign Name</p>
                      <p className="font-medium">{selectedCampaign.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Description</p>
                      <p className="font-medium text-gray-700">{selectedCampaign.description || 'N/A'}</p>
                    </div>
                     <div>
                      <p className="text-xs text-gray-500">Deadline</p>
                      <p className="font-medium">{formatDate(selectedCampaign.deadline)}</p>
                    </div>
                    {selectedCampaign.demoVideoUrl && (
                      <div>
                        <p className="text-xs text-gray-500">Reference Video</p>
                        <a href={selectedCampaign.demoVideoUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline text-sm">
                          {selectedCampaign.demoVideoName || 'View Video'}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Created By</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Full Name</p>
                      <p className="font-medium">{selectedCampaign.createdBy?.fullName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium">{selectedCampaign.createdBy?.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Applicants ({campaignApplicants.length})</h4>
                <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                  {loadingApplicants ? (
                     <div className="text-center text-gray-500">Loading applicants...</div>
                  ) : campaignApplicants.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {campaignApplicants.map(applicant => (
                        <li key={applicant.id} className="py-3 flex items-center">
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={applicant.profilePictureUrl}
                            alt={applicant.fullName}
                            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${applicant.fullName}&background=random&color=fff&size=128`; }}
                          />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{applicant.fullName}</p>
                            <p className="text-xs text-gray-500">@{applicant.instagramUsername}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-sm text-gray-500 py-4">No creators have applied to this campaign yet.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider">Campaign Status</h4>
                 <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="mb-4 flex items-center gap-4">
                     <p className="text-sm font-medium text-gray-700">Current Status:</p>
                    <span
                      className={`
                        px-3 py-1 rounded-full text-sm font-medium
                        ${selectedCampaign.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${selectedCampaign.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                        ${selectedCampaign.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                      `}
                    >
                      {selectedCampaign.status.charAt(0).toUpperCase() + selectedCampaign.status.slice(1)}
                    </span>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Update Status
                    </label>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                      <button
                        onClick={() => updateCampaignStatus(selectedCampaign.id, 'approved')}
                        disabled={selectedCampaign.status === 'approved'}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateCampaignStatus(selectedCampaign.id, 'rejected')}
                         disabled={selectedCampaign.status === 'rejected'}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default AdminDashboard;
