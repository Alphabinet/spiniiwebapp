'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebaseConfig';
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  startAfter,
  limit,
  getCountFromServer,
  DocumentData,
  QueryDocumentSnapshot,
  getDoc
} from 'firebase/firestore';
import { format } from 'date-fns';
import { FiSearch, FiX, FiChevronLeft, FiChevronRight, FiMenu } from 'react-icons/fi';
import Image from 'next/image';

// --- Type Definitions ---
interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

interface CreatorContact {
  email?: string;
  phone?: string;
  instagramProfileLink?: string;
}

interface Booking {
  id: string;
  creatorId: string;
  bookerDetails: {
    fullName: string;
    email: string;
    phoneNumber: string;
  };
  creatorName: string;
  creatorUsername: string;
  creatorProfile?: string;
  createdAt: FirestoreTimestamp;
  services: {
    reels: number;
    story: number;
    reelsStory: number;
  };
  campaign: {
    name: string;
    description: string;
    deadline?: FirestoreTimestamp;
    demoVideoUrl?: string;
    demoVideoName?: string;
  };
  payment: {
    amount: number;
    currency: string;
    status: string;
    transactionId: string;
  };
  status: 'pending' | 'accepted' | 'completed' | 'rejected';
  creatorContact?: CreatorContact;
}

// --- Helper Functions ---
const formatDate = (timestamp: FirestoreTimestamp | null | undefined): string => {
  if (!timestamp || typeof timestamp.seconds !== 'number') return 'N/A';
  try {
    return format(new Date(timestamp.seconds * 1000), 'PPp');
  } catch (error) {
    console.error("Error formatting date:", error);
    return 'Invalid Date';
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' }
];

// --- New Sort Options ---
const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'creator_asc', label: 'Creator (A-Z)' },
  { value: 'creator_desc', label: 'Creator (Z-A)' },
];

// --- Main Component ---
const BookingsPage = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('latest'); // New state for sort order
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pageSize = 10;

  const fetchBookings = useCallback(async (page = 1, lastDoc: QueryDocumentSnapshot<DocumentData> | null = null, currentSortOrder: string) => {
    setLoading(true);
    setError(null);
    try {
      // Get total count (consider if this needs to be conditional based on filters/sorts)
      if (page === 1 && (sortOrder === 'latest' || sortOrder === 'oldest')) { // Only fetch total count initially or for date sorts
        const countQuery = query(collection(db, "bookings"));
        const snapshot = await getCountFromServer(countQuery);
        const totalCount = snapshot.data().count;
        setTotalBookings(totalCount);
        setTotalPages(Math.ceil(totalCount / pageSize));
      }

      // Determine Firestore orderBy based on currentSortOrder
      let queryOrderBy: any[] = [];
      if (currentSortOrder === 'latest') {
        queryOrderBy = [orderBy("createdAt", "desc")];
      } else if (currentSortOrder === 'oldest') {
        queryOrderBy = [orderBy("createdAt", "asc")];
      } else {
        // For A-Z and Z-A, we'll fetch all and then sort in memory.
        // Firestore doesn't allow ordering by different fields in the same query
        // unless you have an index, and for pagination with a changing order, it's complex.
        // For 'creator_asc' and 'creator_desc', we'll rely on in-memory sorting.
        // We'll still order by createdAt for stable pagination.
        queryOrderBy = [orderBy("createdAt", "desc")]; // Default to latest for base fetch
      }

      // Construct query
      const bookingsQuery = query(
        collection(db, "bookings"),
        ...queryOrderBy,
        ...(lastDoc && page > 1 ? [startAfter(lastDoc)] : []),
        limit(pageSize)
      );

      const querySnapshot = await getDocs(bookingsQuery);
      const bookingsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Booking));

      // Enrich bookings with creator contact info and Instagram profile
      const enrichedBookings = await Promise.all(
        bookingsData.map(async (booking) => {
          if (booking.creatorId) {
            try {
              const creatorAppRef = doc(db, "creatorApplications", booking.creatorId);
              const creatorAppSnap = await getDoc(creatorAppRef);

              if (creatorAppSnap.exists()) {
                const creatorData = creatorAppSnap.data();
                const userId = creatorData.userId;

                if (!userId) {
                  return {
                    ...booking,
                    creatorContact: {
                      email: creatorData.emailAddress || 'N/A',
                      phone: creatorData.mobileNumber || 'N/A',
                      instagramProfileLink: 'N/A'
                    }
                  };
                }

                const userDocRef = doc(db, "users", userId);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                  const userData = userDocSnap.data();
                  const creatorAppId = userData.creatorApplicationId;

                  if (!creatorAppId) {
                    return {
                      ...booking,
                      creatorContact: {
                        email: creatorData.emailAddress || 'N/A',
                        phone: creatorData.mobileNumber || 'N/A',
                        instagramProfileLink: 'N/A'
                      }
                    };
                  }

                  const creatorAppRef2 = doc(db, "creatorApplications", creatorAppId);
                  const creatorAppSnap2 = await getDoc(creatorAppRef2);

                  if (creatorAppSnap2.exists()) {
                    const creatorAppData = creatorAppSnap2.data();
                    return {
                      ...booking,
                      creatorContact: {
                        email: creatorData.emailAddress || 'N/A',
                        phone: creatorData.mobileNumber || 'N/A',
                        instagramProfileLink: creatorAppData.instagramProfileLink || 'N/A'
                      }
                    };
                  }
                }
              }
            } catch (e) {
              console.error(`Failed to fetch creator details for ID: ${booking.creatorId}`, e);
            }
          }
          return {
            ...booking,
            creatorContact: {
              email: 'Not Found',
              phone: 'Not Found',
              instagramProfileLink: 'Not Found'
            }
          };
        })
      );

      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1] ?? null);
      setBookings(enrichedBookings);

    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to load bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [pageSize, sortOrder]); // Add sortOrder to dependencies

  useEffect(() => {
    fetchBookings(1, null, sortOrder);
  }, [fetchBookings, sortOrder]); // Add sortOrder here as well

  const updateBookingStatus = async (bookingId: string, newStatus: Booking['status']) => {
    setUpdatingBookingId(bookingId);
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, { status: newStatus });

      const updatedBookings = bookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b);
      setBookings(updatedBookings);

      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const filteredAndSortedBookings = useMemo(() => {
    let currentBookings = [...bookings]; // Create a mutable copy

    // Apply search filter
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      currentBookings = currentBookings.filter(booking =>
        booking.bookerDetails.fullName.toLowerCase().includes(lowercasedTerm) ||
        booking.bookerDetails.email.toLowerCase().includes(lowercasedTerm) ||
        booking.creatorName.toLowerCase().includes(lowercasedTerm) ||
        (booking.payment.transactionId && booking.payment.transactionId.toLowerCase().includes(lowercasedTerm))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      currentBookings = currentBookings.filter(booking => booking.status === statusFilter);
    }

    // Apply in-memory sort for creator name
    if (sortOrder === 'creator_asc') {
      currentBookings.sort((a, b) => a.creatorName.localeCompare(b.creatorName));
    } else if (sortOrder === 'creator_desc') {
      currentBookings.sort((a, b) => b.creatorName.localeCompare(a.creatorName));
    }
    // For 'latest' and 'oldest', Firestore's orderBy takes precedence for the initial fetch,
    // and for subsequent pages, the `createdAt` sort is maintained implicitly by the `startAfter` cursor.
    // If you want to strictly re-sort all currently loaded data based on latest/oldest after client-side
    // filtering, you can add that here. However, for efficient pagination, Firestore ordering is key.
    // We'll rely on the `fetchBookings` to get the correct order from Firestore for date sorts.

    return currentBookings;
  }, [bookings, searchTerm, statusFilter, sortOrder]); // Add sortOrder to dependencies

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      // When changing pages, re-fetch with the current sort order
      fetchBookings(newPage, newPage > currentPage ? lastVisible : null, sortOrder);
    }
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOrder(e.target.value);
    setCurrentPage(1); // Reset to first page on sort change
    setLastVisible(null); // Reset lastVisible when sort order changes
    // Refetch bookings based on the new sort order
    fetchBookings(1, null, e.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortOrder('latest'); // Reset sort order as well
    setShowFilters(false);
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
                <button
                  onClick={() => fetchBookings(currentPage, lastVisible, sortOrder)}
                  className="ml-2 font-medium underline text-red-700 hover:text-red-600"
                >
                  Retry
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="mt-4 text-gray-600">Loading bookings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-4">
      <div className="space-y-4">
        <header className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bookings Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Showing {filteredAndSortedBookings.length} of {totalBookings} bookings
                {statusFilter !== 'all' && ` (filtered by ${statusFilter})`}
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden bg-gray-100 p-2 rounded-lg"
              aria-label="Toggle filters"
            >
              <FiMenu className="h-5 w-5 text-gray-700" />
            </button>
          </div>

          {showFilters && (
            <div className="md:hidden bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search bookings..."
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <FiX className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm mb-3"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Mobile Sort Dropdown */}
              <select
                value={sortOrder}
                onChange={handleSortChange}
                className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="hidden md:flex gap-3">
            <div className="relative w-full max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search bookings..."
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label="Clear search"
                >
                  <FiX className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full max-w-[180px] py-2 px-3 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Desktop Sort Dropdown */}
            <select
              value={sortOrder}
              onChange={handleSortChange}
              className="block w-full max-w-[180px] py-2 px-3 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booker</th>
                <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Creator</th>
                <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xs:table-cell">Date</th>
                <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedBookings.length > 0 ? filteredAndSortedBookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedBooking(booking);
                    setIsModalOpen(true);
                  }}
                >
                  <td className="px-3 py-3 sm:px-4 sm:py-4">
                    <div className="flex items-center">
                      <div className="ml-1">
                        <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[100px] sm:max-w-[160px]">
                          {booking.bookerDetails.fullName}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-[100px] sm:max-w-[160px]">
                          {booking.bookerDetails.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 sm:px-4 sm:py-4 hidden sm:table-cell">
                    <div className="flex items-center">
                      <div className="ml-1">
                        <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[100px]">
                          {booking.creatorName}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-[100px]">
                          @{booking.creatorUsername}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                    {formatCurrency(booking.payment.amount)}
                  </td>
                  <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden xs:table-cell">
                    {formatDate(booking.createdAt)}
                  </td>
                  <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-[10px] xs:text-xs font-medium rounded-full capitalize ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-sm font-medium">
                    {updatingBookingId === booking.id ? (
                      <div className="w-20 h-6 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-indigo-500"></div>
                      </div>
                    ) : (
                      <select
                        value={booking.status}
                        onChange={(e) => updateBookingStatus(booking.id, e.target.value as Booking['status'])}
                        className="rounded-md border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 bg-white text-gray-900"
                        onClick={e => e.stopPropagation()}
                      >
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">No bookings found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {(searchTerm || statusFilter !== 'all' || sortOrder !== 'latest') ? (
                          <>
                            No bookings match your search, filter, or sort criteria.{" "}
                            <button
                              onClick={handleClearSearch}
                              className="font-medium text-indigo-600 hover:text-indigo-500"
                            >
                              Clear filters and sort
                            </button>
                          </>
                        ) : "There are no bookings in the system yet."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, totalBookings)}
                  </span>{' '}
                  of <span className="font-medium">{totalBookings}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber = i + 1;
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === pageNumber
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}

                  {totalPages > 5 && (
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      ...
                    </span>
                  )}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <FiChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedBooking && isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => {
            setSelectedBooking(null);
            setIsModalOpen(false);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-[95vw] sm:max-w-2xl md:max-w-4xl max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white z-10 p-4 border-b flex justify-between items-center">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Booking Details</h3>
              <button
                onClick={() => {
                  setSelectedBooking(null);
                  setIsModalOpen(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full"
                aria-label="Close"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-500">ID: {selectedBooking.id}</p>
                <div className="mt-1">
                  <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${getStatusColor(selectedBooking.status)}`}>
                    {selectedBooking.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wider">Booker Information</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Full Name</p>
                      <p className="font-medium text-gray-900">{selectedBooking.bookerDetails.fullName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">{selectedBooking.bookerDetails.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900">{selectedBooking.bookerDetails.phoneNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Booking Date</p>
                      <p className="font-medium text-gray-900">{formatDate(selectedBooking.createdAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wider">Creator Information</h4>
                  <div className="flex items-center mb-3">
                    <Image
                      className="h-12 w-12 rounded-full object-cover mr-4"
                      src={selectedBooking.creatorProfile || `https://ui-avatars.com/api/?name=${selectedBooking.creatorName}&background=random&color=fff&size=128`}
                      alt={selectedBooking.creatorName}
                      width={48}
                      height={48}
                      unoptimized
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{selectedBooking.creatorName}</p>
                      <p className="text-gray-600">@{selectedBooking.creatorUsername}</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm border-t border-gray-200 pt-3 mt-3">
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">
                        {selectedBooking.creatorContact?.email || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Contact Number</p>
                      <p className="font-medium text-gray-900">
                        {selectedBooking.creatorContact?.phone || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Instagram Profile</p>
                      <a
                        href={selectedBooking.creatorContact?.instagramProfileLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {selectedBooking.creatorContact?.instagramProfileLink || 'N/A'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wider">Services Booked</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedBooking.services.reels > 0 && (
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="font-medium text-sm">Reels</p>
                      <p className="text-red-700 font-semibold">Qty: {selectedBooking.services.reels}</p>
                    </div>
                  )}
                  {selectedBooking.services.story > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="font-medium text-sm">Story</p>
                      <p className="text-blue-700 font-semibold">Qty: {selectedBooking.services.story}</p>
                    </div>
                  )}
                  {selectedBooking.services.reelsStory > 0 && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="font-medium text-sm">Reels + Story</p>
                      <p className="text-purple-700 font-semibold">Qty: {selectedBooking.services.reelsStory}</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 bg-gray-100 p-4 rounded-lg flex justify-between items-center">
                  <p className="font-semibold text-sm">Total Amount</p>
                  <p className="font-bold text-lg text-gray-900">{formatCurrency(selectedBooking.payment.amount)}</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wider">Campaign Details</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Campaign Name</p>
                    <p className="font-medium text-gray-900">{selectedBooking.campaign.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="text-gray-700">{selectedBooking.campaign.description}</p>
                  </div>
                  {selectedBooking.campaign.deadline && (
                    <div>
                      <p className="text-xs text-gray-500">Deadline</p>
                      <p className="font-medium text-gray-900">{formatDate(selectedBooking.campaign.deadline)}</p>
                    </div>
                  )}
                  {selectedBooking.campaign.demoVideoUrl && (
                    <div>
                      <p className="text-xs text-gray-500">Reference Video</p>
                      <a
                        href={selectedBooking.campaign.demoVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center font-medium text-indigo-600 hover:underline text-sm"
                      >
                        {selectedBooking.campaign.demoVideoName || 'View Video'}
                        <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wider">Payment Details</h4>
                <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedBooking.payment.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Transaction ID</p>
                    <p className="font-medium text-gray-900">{selectedBooking.payment.transactionId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="font-medium text-gray-900">{formatCurrency(selectedBooking.payment.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Currency</p>
                    <p className="font-medium text-gray-900">{selectedBooking.payment.currency}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setSelectedBooking(null);
                    setIsModalOpen(false);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
                <button
                  onClick={() => selectedBooking && updateBookingStatus(selectedBooking.id, 'completed')}
                  disabled={updatingBookingId === selectedBooking.id || selectedBooking.status === 'completed'}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-75"
                >
                  {updatingBookingId === selectedBooking.id ? 'Marking...' : 'Mark as Completed'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsPage;