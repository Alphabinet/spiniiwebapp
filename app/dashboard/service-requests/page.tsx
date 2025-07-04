// app/dashboard/service-requests/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseConfig';

// Mock data for demonstration until the booking system is live.
const mockRequests = [
    { id: 'req1', clientName: 'UrbanStyle Co.', service: '1 Reel', status: 'pending', amount: 8000, date: new Date() },
    { id: 'req2', clientName: 'TechGadgets', service: '1 Reel + 2 Stories', status: 'approved', amount: 12500, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    { id: 'req3', clientName: 'FitLife Foods', service: '1 Story', status: 'completed', amount: 3000, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    { id: 'req4', clientName: 'TravelVibes', service: '1 Reel', status: 'rejected', amount: 6000, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
];

const getStatusClasses = (status: string) => {
    switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'approved': return 'bg-blue-100 text-blue-800';
        case 'completed': return 'bg-green-100 text-green-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

export default function ServiceRequestsPage() {
    const [user] = useAuthState(auth);
    const [requests, setRequests] = useState<any[]>(mockRequests); // Using mock data for now
    const [loading, setLoading] = useState(false);

    // useEffect(() => {
    //     if (!user) return;
    //     setLoading(true);
    //     const requestsQuery = query(
    //         collection(db, 'serviceRequests'),
    //         where('creatorId', '==', user.uid)
    //     );
    //
    //     const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
    //         const fetchedRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    //         setRequests(fetchedRequests);
    //         setLoading(false);
    //     });
    //
    //     return () => unsubscribe();
    // }, [user]);

    if (loading) {
        return <p>Loading requests...</p>;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Service Requests</h2>
            {requests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">You have no service requests at the moment.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {requests.map((req) => (
                                <tr key={req.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{req.clientName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.service}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{req.amount.toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.date.toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClasses(req.status)}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {req.status === 'pending' && (
                                            <>
                                                <a href="#" className="text-green-600 hover:text-green-900 mr-4">Accept</a>
                                                <a href="#" className="text-red-600 hover:text-red-900">Decline</a>
                                            </>
                                        )}
                                        {req.status !== 'pending' && (
                                            <a href="#" className="text-indigo-600 hover:text-indigo-900">View</a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}