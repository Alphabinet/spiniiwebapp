// app/dashboard/page.tsx
"use client";

import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebaseConfig";

export default function OverviewPage() {
    const [user] = useAuthState(auth);

    // In a real app, you would fetch overview data here (e.g., total earnings, new messages)
    const stats = [
        { name: 'Campaigns Active', stat: '2' },
        { name: 'Total Earnings', stat: '₹45,231.89' },
        { name: 'Pending Requests', stat: '3' },
        { name: 'Profile Views', stat: '1,204' },
    ];

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((item) => (
                    <div key={item.name} className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                        <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">{item.stat}</dd>
                    </div>
                ))}
            </div>

            <div className="mt-10 bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                <ul className="mt-4 space-y-3">
                    <li className="p-3 bg-indigo-50 rounded-lg flex items-center">
                        <span className="text-sm text-indigo-800">New service request from "BrandX" for a fashion reel.</span>
                    </li>
                    <li className="p-3 bg-green-50 rounded-lg flex items-center">
                        <span className="text-sm text-green-800">Payment of ₹5,000 received for "Campaign Y".</span>
                    </li>
                     <li className="p-3 bg-gray-50 rounded-lg flex items-center">
                        <span className="text-sm text-gray-800">Your profile was approved! You are now listed as a creator.</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}