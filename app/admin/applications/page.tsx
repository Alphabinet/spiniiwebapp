'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebaseConfig';
import { collection, getDocs, query, orderBy, doc, updateDoc, addDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Image from 'next/image';

// --- Enhanced TypeScript Interfaces ---
interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

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
}

// --- Helper Functions ---
const formatDate = (timestamp: FirestoreTimestamp | null | undefined): string => {
  if (!timestamp || typeof timestamp.seconds !== 'number') return 'N/A';
  try {
    return format(new Date(timestamp.seconds * 1000), 'LLL d, y, h:mm a');
  } catch (error) {
    console.error("Error formatting date:", error);
    return 'Invalid Date';
  }
};

const formatCurrency = (amount: string | number): string => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(isNaN(numericAmount) ? 0 : numericAmount);
};

const formatNumber = (num: string | number): string => {
  const number = typeof num === 'string' ? parseFloat(num) : num;
  return new Intl.NumberFormat('en-US').format(isNaN(number) ? 0 : number);
};

const calculateEngagementRate = (followers: string, avgViews: string): string => {
  const followersNum = parseFloat(followers) || 1;
  const viewsNum = parseFloat(avgViews) || 0;
  return ((viewsNum / followersNum) * 100).toFixed(2) + '%';
};

// --- Main Component ---
const ApplicationsPage = () => {
  const [applications, setApplications] = useState<CreatorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<CreatorApplication | null>(null);
  const [feedback, setFeedback] = useState('');
  const [showFeedbackError, setShowFeedbackError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | CreatorApplication['status']>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [updating, setUpdating] = useState(false);
  const itemsPerPage = 8;

  // Fetch applications from Firestore
  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "creatorApplications"),
          orderBy("timestamp", "desc")
        );
        const querySnapshot = await getDocs(q);
        const appsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as CreatorApplication));
        setApplications(appsData);
      } catch (error) {
        console.error("Error fetching applications:", error);
        toast.error("Failed to load applications");
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  // Update application status
  const updateApplicationStatus = useCallback(async (
    appId: string,
    newStatus: CreatorApplication['status'],
    feedbackText: string
  ) => {
    if (!db) return;

    const applicationToUpdate = applications.find(app => app.id === appId);
    if (!applicationToUpdate) return;

    // Validate feedback for rejection
    if (newStatus === 'rejected' && feedbackText.trim() === '') {
      setShowFeedbackError(true);
      return;
    }

    setUpdating(true);
    try {
      const appRef = doc(db, "creatorApplications", appId);
      await updateDoc(appRef, {
        status: newStatus,
        adminFeedback: feedbackText,
        updatedAt: new Date(),
      });

      // Update local state
      setApplications(prev => prev.map(app =>
        app.id === appId ? { ...app, status: newStatus, adminFeedback: feedbackText } : app
      ));

      // Send notification to creator
      const notificationMessage = newStatus === 'approved'
        ? `Congratulations! Your creator application has been approved. You can now start receiving bookings.`
        : `Your creator application has been reviewed. Status: ${newStatus}. Feedback: ${feedbackText}`;

      const appIdGlobal = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      await addDoc(collection(db, `artifacts/${appIdGlobal}/users/${applicationToUpdate.userId}/notifications`), {
        message: notificationMessage,
        read: false,
        timestamp: new Date(),
        type: 'application_status',
        link: '/creator-dashboard'
      });

      toast.success(`Application ${newStatus} successfully`);
      setSelectedApplication(null);
      setFeedback('');
      setShowFeedbackError(false);
    } catch (error) {
      console.error("Error updating application: ", error);
      toast.error("Failed to update application");
    } finally {
      setUpdating(false);
    }
  }, [applications]);

  // Filter and pagination logic
  const filteredApplications = useMemo(() => {
    let result = applications;

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(app => app.status === statusFilter);
    }

    // Apply search term
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      result = result.filter(app =>
        app.fullName.toLowerCase().includes(lowercasedTerm) ||
        app.emailAddress.toLowerCase().includes(lowercasedTerm) ||
        app.instagramUsername.toLowerCase().includes(lowercasedTerm) ||
        app.contentCategory.toLowerCase().includes(lowercasedTerm) ||
        app.cityState.toLowerCase().includes(lowercasedTerm)
      );
    }

    return result;
  }, [applications, searchTerm, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredApplications.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredApplications, currentPage, itemsPerPage]);

  // Status badge styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'onboarded': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleReviewClick = (app: CreatorApplication) => {
    setSelectedApplication(app);
    setFeedback(app.adminFeedback || '');
    setShowFeedbackError(false);
  };

  // Engagement metrics
  const engagementMetrics = (app: CreatorApplication) => ({
    reelEngagement: calculateEngagementRate(app.totalFollowers, app.avgReelViews),
    storyEngagement: calculateEngagementRate(app.totalFollowers, app.storyAverageViews)
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-10">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
          <p className="text-gray-700 text-lg">Loading creator applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <ToastContainer position="bottom-right" autoClose={3000} />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Creator Applications</h1>
              <p className="mt-2 text-gray-600">
                Review and manage creator applications. Found {filteredApplications.length} of {applications.length} total.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {['all', 'pending', 'approved', 'rejected'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status as 'all' | CreatorApplication['status'])}
                    className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusFilter === status
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    {status === 'all' ? 'All Statuses' : status}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full md:w-auto space-y-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search creators..."
                  className="w-full md:w-72 rounded-xl border border-gray-300 py-3 px-4 pl-11 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg
                  className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="text-sm text-gray-500 flex justify-between">
                <span>Sort by: Newest first</span>
                <span>Page {currentPage} of {totalPages}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Creator</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Platform</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Metrics</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Submitted</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedApplications.length > 0 ? paginatedApplications.map((app) => {
                  const metrics = engagementMetrics(app);
                  return (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <Image
                              src={app.profilePictureUrl || '/default-avatar.png'}
                              alt={app.fullName}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{app.fullName}</div>
                            <div className="text-xs text-gray-500">{app.cityState}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-pink-100 rounded-full p-1 mr-2">
                            <svg
                              className="h-4 w-4 text-pink-600"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                              <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
                            </svg>

                          </div>
                          <div>
                            <a
                              href={app.instagramProfileLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-indigo-600 hover:underline"
                            >
                              @{app.instagramUsername}
                            </a>
                            <div className="text-xs text-gray-500">{formatNumber(app.totalFollowers)} followers</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div>Reels: {formatNumber(app.avgReelViews)}</div>
                          <div>Engagement: {metrics.reelEngagement}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{app.contentCategory}</div>
                        <div className="text-xs text-gray-500">{app.contentLanguages}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(app.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleReviewClick(app)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium px-3 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="text-gray-500 flex flex-col items-center justify-center">
                        <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-lg">No applications found</p>
                        <p className="mt-1 text-sm max-w-md">
                          Try adjusting your search or filter criteria. No creator applications match your current settings.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredApplications.length)}</span> of{' '}
                <span className="font-medium">{filteredApplications.length}</span> results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 text-sm rounded-lg ${currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 text-sm rounded-lg ${currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => !updating && setSelectedApplication(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Creator Application Review</h3>
                  <p className="text-gray-600 mt-1">Detailed information and review tools</p>
                </div>
                <button
                  onClick={() => !updating && setSelectedApplication(null)}
                  disabled={updating}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Creator Profile Section */}
              <div className="flex flex-col md:flex-row gap-6 mb-8">
                <div className="flex-shrink-0">
                  <Image
                    src={selectedApplication.profilePictureUrl || '/default-avatar.png'}
                    alt={selectedApplication.fullName}
                    width={160}
                    height={160}
                    className="rounded-xl object-cover border border-gray-200"
                  />
                </div>
                <div className="flex-grow">
                  <div className="flex flex-wrap justify-between">
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{selectedApplication.fullName}</h4>
                      <div className="flex items-center mt-2">
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(selectedApplication.status)}`}>
                          {selectedApplication.status}
                        </span>
                        <span className="ml-3 text-sm text-gray-600">
                          Applied on {formatDate(selectedApplication.timestamp)}
                        </span>
                      </div>
                    </div>
                    <a
                      href={selectedApplication.instagramProfileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium mt-2 md:mt-0"
                    >
                      <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C15.9 2 19 5.1 19 9c0 5.3-7 13-7 13S5 14.3 5 9c0-3.9 3.1-7 7-7zm0 9c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3z" />
                      </svg>
                      @{selectedApplication.instagramUsername}
                    </a>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Contact</p>
                      <p className="font-medium">{selectedApplication.emailAddress}</p>
                      <p className="font-medium">{selectedApplication.mobileNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{selectedApplication.cityState}</p>
                      <p className="capitalize">{selectedApplication.gender}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm text-blue-800 font-medium">Followers</p>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(selectedApplication.totalFollowers)}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <p className="text-sm text-purple-800 font-medium">Avg. Reel Views</p>
                  <p className="text-2xl font-bold text-purple-900">{formatNumber(selectedApplication.avgReelViews)}</p>
                </div>
                <div className="bg-pink-50 rounded-xl p-4 border border-pink-100">
                  <p className="text-sm text-pink-800 font-medium">Engagement Rate</p>
                  <p className="text-2xl font-bold text-pink-900">
                    {calculateEngagementRate(selectedApplication.totalFollowers, selectedApplication.avgReelViews)}
                  </p>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="mb-8">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Pricing & Delivery</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-500">Reel</p>
                    <p className="text-xl font-bold">{formatCurrency(selectedApplication.reelPrice)}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-500">Story</p>
                    <p className="text-xl font-bold">{formatCurrency(selectedApplication.storyPrice)}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-500">Reel + Story</p>
                    <p className="text-xl font-bold">{formatCurrency(selectedApplication.reelsStoryPrice)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Delivery Timeframe</p>
                  <p className="font-medium">{selectedApplication.deliveryDuration} days</p>
                </div>
              </div>

              {/* Content Details */}
              <div className="mb-8">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Content Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Content Category</p>
                    <p className="font-medium">{selectedApplication.contentCategory}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Languages</p>
                    <p className="font-medium">{selectedApplication.contentLanguages}</p>
                  </div>
                </div>

                {selectedApplication.portfolioLinks && selectedApplication.portfolioLinks.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">Portfolio Links</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedApplication.portfolioLinks.map((link, index) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline text-sm bg-indigo-50 px-3 py-1 rounded-lg"
                        >
                          Portfolio {index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {selectedApplication.previousBrandCollabs && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">Previous Brand Collaborations</p>
                    <p className="font-medium">{selectedApplication.previousBrandCollabs}</p>
                  </div>
                )}
              </div>

              {/* Admin Actions */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Review Actions</h4>

                <div className="mb-4">
                  <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                    Application Feedback
                    <span className="text-red-500">*</span> <span className="text-gray-500 text-sm font-normal">(required for rejection)</span>
                  </label>
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => {
                      setFeedback(e.target.value);
                      if (showFeedbackError) setShowFeedbackError(false);
                    }}
                    className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 text-sm min-h-[100px]"
                    placeholder="Provide constructive feedback for the creator..."
                  />
                  {showFeedbackError && (
                    <p className="mt-2 text-sm text-red-600">Feedback is required when rejecting an application</p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => updateApplicationStatus(selectedApplication.id, 'approved', feedback)}
                    disabled={updating}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center disabled:opacity-70"
                  >
                    {updating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Approving...
                      </>
                    ) : 'Approve Application'}
                  </button>

                  <button
                    onClick={() => updateApplicationStatus(selectedApplication.id, 'rejected', feedback)}
                    disabled={updating}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center disabled:opacity-70"
                  >
                    {updating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Rejecting...
                      </>
                    ) : 'Reject Application'}
                  </button>

                  <button
                    onClick={() => updateApplicationStatus(selectedApplication.id, 'onboarded', feedback)}
                    disabled={updating}
                    className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center disabled:opacity-70"
                  >
                    {updating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Onboarding...
                      </>
                    ) : 'Mark as Onboarded'}
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