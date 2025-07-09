'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebaseConfig';
import { collection, getDocs, query, orderBy, doc, updateDoc, addDoc } from 'firebase/firestore';
import { format } from 'date-fns'; // Corrected import: ensure no '=' here
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Image from 'next/image';

interface CreatorApplication {
  id: string;
  userId: string;
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
  timestamp: FirestoreTimestamp;
  status: 'pending' | 'approved' | 'rejected' | 'onboarded';
  adminFeedback?: string;
  portfolioLinks?: string[];
  previousBrandCollabs?: string;
  audienceDemographics?: {
    ageRange: string;
    malePercentage: number;
    femalePercentage: number;
    topCities: string[];
  };
  subscriptionStatus?: 'active' | 'inactive' | 'trial';
  subscriptionExpiresAt?: FirestoreTimestamp;
}

interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

const ApplicationsPage = () => {
  const [applications, setApplications] = useState<CreatorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState<CreatorApplication | null>(null);
  const [feedback, setFeedback] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CreatorApplication['status']>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const formatDate = useCallback((timestamp: FirestoreTimestamp | null | undefined): string => {
    if (!timestamp?.seconds) return 'N/A';
    try {
      return format(timestamp.seconds * 1000, 'MMM d, y, h:mm a');
    } catch {
      return 'Invalid Date';
    }
  }, []);

  const formatCurrency = useCallback((amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(isNaN(num) ? 0 : num);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(
          collection(db, "creatorApplications"),
          orderBy("timestamp", "desc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as CreatorApplication));
        setApplications(data);
      } catch (error) {
        toast.error("Failed to load applications");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const updateStatus = useCallback(async (
    appId: string,
    status: CreatorApplication['status'],
    feedbackText: string
  ) => {
    if (status === 'rejected' && !feedbackText.trim()) {
      toast.error("Feedback required for rejection");
      return;
    }

    try {
      await updateDoc(doc(db, "creatorApplications", appId), {
        status,
        adminFeedback: feedbackText,
        updatedAt: new Date(),
      });

      setApplications(prev => prev.map(app =>
        app.id === appId ? { ...app, status, adminFeedback: feedbackText } : app
      ));

      await addDoc(collection(db, `users/${selectedApp?.userId}/notifications`), {
        message: status === 'approved'
          ? "Your application has been approved!"
          : `Application ${status}. Feedback: ${feedbackText}`,
        read: false,
        timestamp: new Date(),
        type: 'application_status'
      });

      toast.success(`Application ${status}`);
      setSelectedApp(null);
    } catch (error) {
      toast.error("Update failed");
    }
  }, [selectedApp]);

  const { filteredApps, totalPages, paginatedApps } = useMemo(() => {
    let filtered = applications;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(app =>
        app.fullName.toLowerCase().includes(term) ||
        app.emailAddress.toLowerCase().includes(term) ||
        app.instagramUsername.toLowerCase().includes(term)
      );
    }

    const total = Math.ceil(filtered.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);

    return { filteredApps: filtered, totalPages: total, paginatedApps: paginated };
  }, [applications, searchTerm, statusFilter, currentPage]);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
    onboarded: 'bg-purple-100 text-purple-800'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-center text-gray-700">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-indigo-600 mx-auto mb-6" />
          <p className="text-xl font-semibold">Loading creator applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <ToastContainer position="bottom-right" autoClose={3000} />

      {/* Header Section */}
      <div className="bg-white rounded-2xl shadow-lg p-5 mb-8 border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Creator Applications</h1>
            <p className="text-gray-700 text-lg">
              {filteredApps.length} of {applications.length} applications
            </p>

            <div className="flex flex-wrap gap-3 mt-4">
              {['all', 'pending', 'approved', 'rejected', 'onboarded'].map(status => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status as any);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                    ${statusFilter === status
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full md:w-80 relative">
            <input
              type="text"
              placeholder="Search by name, email, or Instagram..."
              className="w-full rounded-full border border-gray-300 pl-12 pr-5 py-3 text-base text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300 shadow-sm"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Applications Table (Desktop) */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden hidden md:block border border-gray-200 mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Creator</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Platform</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Metrics</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-800 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {paginatedApps.length > 0 ? paginatedApps.map(app => (
              <tr key={app.id} className="hover:bg-gray-50 transition-colors duration-200">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Image
                      src={app.profilePictureUrl || '/default-avatar.png'}
                      alt={app.fullName}
                      width={48}
                      height={48}
                      className="rounded-full object-cover border-2 border-gray-300 shadow-sm"
                    />
                    <div className="ml-4">
                      <div className="font-semibold text-gray-900">{app.fullName}</div>
                      <div className="text-sm text-gray-600">{app.emailAddress}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  <a
                    href={app.instagramProfileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline flex items-center text-sm"
                  >
                    @{app.instagramUsername}
                  </a>
                  <div className="text-sm text-gray-500">{app.totalFollowers} followers</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <div>Reels: <span className="font-medium">{app.avgReelViews}</span></div>
                  <div>Stories: <span className="font-medium">{app.storyAverageViews}</span></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[app.status]}`}>
                    {app.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => setSelectedApp(app)}
                    className="text-indigo-600 hover:text-indigo-800 transition-colors duration-200"
                  >
                    Review
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-lg">
                  No applications found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-6 mt-6 mb-8">
        {paginatedApps.length > 0 ? paginatedApps.map(app => (
          <div key={app.id} className="bg-white rounded-xl shadow-lg p-5 border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <Image
                  src={app.profilePictureUrl || '/default-avatar.png'}
                  alt={app.fullName}
                  width={64}
                  height={64}
                  className="rounded-full object-cover border-2 border-gray-300 shadow-sm"
                />
                <div className="ml-4">
                  <div className="font-bold text-lg text-gray-900">{app.fullName}</div>
                  <div className="text-sm text-gray-600">@{app.instagramUsername}</div>
                </div>
              </div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[app.status]}`}>
                {app.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
              <div><span className="font-semibold">Followers:</span> {app.totalFollowers}</div>
              <div><span className="font-semibold">Reel Views:</span> {app.avgReelViews}</div>
              <div className="col-span-2"><span className="font-semibold">Story Views:</span> {app.storyAverageViews}</div>
            </div>

            <button
              onClick={() => setSelectedApp(app)}
              className="w-full mt-4 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200 shadow-md"
            >
              Review Application
            </button>
          </div>
        )) : (
          <div className="text-center py-10 text-gray-500 text-lg bg-white rounded-xl shadow-lg border border-gray-200">
            No applications found matching your criteria.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 px-4 py-4 mt-8 bg-white rounded-2xl shadow-lg">
          <div className="text-sm text-gray-700 mb-3 sm:mb-0">
            Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
          </div>
          <div className="flex space-x-3">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Previous
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Application Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 sm:p-6 animate-fade-in">
          <div
            className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-auto shadow-2xl transform scale-95 md:scale-100 transition-transform duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-700 to-indigo-600 text-white p-5 rounded-t-2xl flex justify-between items-center shadow-md">
              <h3 className="text-2xl font-bold">Review Creator Application</h3>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-white hover:text-purple-100 text-2xl p-1 rounded-full hover:bg-purple-800 transition-colors duration-200"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-8 space-y-6">

              {/* Personal Info and Status Header - Adjusted for mobile */}
              <div className="flex flex-col-reverse md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-purple-100 mb-6">
                {/* Status and Application Date - Top Right on Mobile, Right on Desktop */}
                <div className="flex flex-col items-end w-full md:w-auto mb-4 md:mb-0 order-first md:order-none"> {/* Added order-first for mobile */}
                  <span className={`px-3 py-1.5 text-sm font-semibold rounded-full shadow-sm ${statusColors[selectedApp.status]}`}>
                    {selectedApp.status.toUpperCase()}
                  </span>
                  <span className="mt-2 text-xs text-purple-600">
                    Applied On: <span className="font-medium">{formatDate(selectedApp.timestamp)}</span>
                  </span>
                </div>

                {/* Profile Picture, Name, Instagram, Gender - Left on Desktop, Stacked on Mobile (below status) */}
                <div className="flex items-center gap-5 w-full md:w-auto">
                  <Image
                    src={selectedApp.profilePictureUrl || '/default-avatar.png'}
                    alt={selectedApp.fullName}
                    width={100}
                    height={100}
                    className="rounded-full object-cover border-4 border-purple-400 shadow-md flex-shrink-0"
                  />
                  <div className="flex-grow text-right">
                    <h4 className="text-2xl font-bold text-purple-900 mb-0.5">{selectedApp.fullName}</h4>
                    <p className="text-sm text-purple-600 mb-0.5">Gender: <span className="font-medium">{selectedApp.gender || 'N/A'}</span></p>
                    <a
                      href={selectedApp.instagramProfileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-700 hover:text-purple-900 hover:underline text-base font-medium inline-flex items-center"
                    >
                      @{selectedApp.instagramUsername}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <p className="text-sm text-purple-500 mt-1">{selectedApp.cityState}</p>
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="bg-purple-50 rounded-lg p-5 shadow-inner border border-purple-100 mb-6">
                <h4 className="font-bold text-lg text-purple-800 mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  <div>
                    <p className="text-sm text-purple-500 mb-0.5">Email Address</p>
                    <p className="font-medium text-purple-900 text-base">{selectedApp.emailAddress}</p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-500 mb-0.5">Mobile Number</p>
                    <p className="font-medium text-purple-900 text-base">{selectedApp.mobileNumber}</p>
                  </div>
                </div>
              </div>

              {/* Content & Service Details */}
              <div className="bg-purple-50 rounded-lg p-5 shadow-inner border border-purple-100 mb-6">
                <h4 className="font-bold text-lg text-purple-800 mb-3">Content & Service Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
                  <div>
                    <p className="text-sm text-purple-500 mb-0.5">Content Category</p>
                    <p className="font-medium text-purple-900 text-base">{selectedApp.contentCategory || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-500 mb-0.5">Content Languages</p>
                    <p className="font-medium text-purple-900 text-base">{selectedApp.contentLanguages || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-500 mb-0.5">Delivery Duration</p>
                    <p className="font-medium text-purple-900 text-base">{selectedApp.deliveryDuration || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Subscription Details */}
              <div className="bg-purple-50 rounded-lg p-5 shadow-inner border border-purple-100 mb-6">
                <h4 className="font-bold text-lg text-purple-800 mb-3">Subscription Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  <div>
                    <p className="text-sm text-purple-500 mb-0.5">Subscription Status</p>
                    <p className={`font-medium text-base capitalize ${selectedApp.subscriptionStatus === 'active' ? 'text-emerald-700' : selectedApp.subscriptionStatus === 'inactive' ? 'text-rose-700' : 'text-purple-800'}`}>
                      {selectedApp.subscriptionStatus || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-500 mb-0.5">Expires At</p>
                    <p className="font-medium text-purple-900 text-base">
                      {formatDate(selectedApp.subscriptionExpiresAt) || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="bg-purple-50 rounded-lg p-5 shadow-inner border border-purple-100 mb-6">
                <h4 className="font-bold text-lg text-purple-800 mb-3">Engagement Metrics</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
                    <p className="text-sm text-purple-500 mb-1">Total Followers</p>
                    <p className="font-bold text-xl text-purple-900">{selectedApp.totalFollowers}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
                    <p className="text-sm text-purple-500 mb-1">Avg. Reel Views</p>
                    <p className="font-bold text-xl text-purple-900">{selectedApp.avgReelViews}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
                    <p className="text-sm text-purple-500 mb-1">Avg. Story Views</p>
                    <p className="font-bold text-xl text-purple-900">{selectedApp.storyAverageViews}</p>
                  </div>
                </div>
              </div>

              {/* Pricing Details */}
              <div className="bg-purple-50 rounded-lg p-5 shadow-inner border border-purple-100 mb-6">
                <h4 className="font-bold text-lg text-purple-800 mb-3">Quoted Prices</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
                    <p className="text-sm text-purple-500 mb-1">Reel Price</p>
                    <p className="font-bold text-xl text-purple-900">{formatCurrency(selectedApp.reelPrice)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
                    <p className="text-sm text-purple-500 mb-1">Story Price</p>
                    <p className="font-bold text-xl text-purple-900">{formatCurrency(selectedApp.storyPrice)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
                    <p className="text-sm text-purple-500 mb-1">Reel + Story Combo</p>
                    <p className="font-bold text-xl text-purple-900">{formatCurrency(selectedApp.reelsStoryPrice)}</p>
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              <div className="bg-purple-50 rounded-lg p-5 shadow-inner border border-purple-100">
                <h4 className="font-bold text-lg text-purple-800 mb-3">Admin Actions</h4>
                <div className="mb-5">
                  <label htmlFor="admin-feedback" className="block text-base font-medium text-purple-800 mb-2">
                    Feedback
                    {selectedApp.status === 'rejected' && (
                      <span className="text-rose-500 ml-1 text-sm">*Required for rejection</span>
                    )}
                  </label>
                  <textarea
                    id="admin-feedback"
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    className="w-full border border-purple-300 rounded-lg p-3 text-purple-800 placeholder-purple-400 focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 min-h-[100px] resize-y"
                    placeholder="Enter feedback for the creator..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => updateStatus(selectedApp.id, 'approved', feedback)}
                    className="bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors duration-200 shadow-md"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(selectedApp.id, 'rejected', feedback)}
                    className="bg-rose-600 text-white py-2.5 rounded-lg font-semibold hover:bg-rose-700 transition-colors duration-200 shadow-md"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => updateStatus(selectedApp.id, 'onboarded', feedback)}
                    className="bg-purple-600 text-white py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors duration-200 shadow-md"
                  >
                    Onboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationsPage;