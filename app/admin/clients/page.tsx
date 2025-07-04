'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseConfig';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import Image from 'next/image'; // Import the Next.js Image component

// --- TypeScript Interfaces ---
interface TrustedClient {
  id: string;
  name: string;
  logoUrl: string;
}

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
}

// --- Main Clients Page Component ---
const ClientsPage = () => {
  const [trustedClients, setTrustedClients] = useState<TrustedClient[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trusted Client state
  const [newClientName, setNewClientName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingClientLogo, setUploadingClientLogo] = useState(false);
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [clientImagePreviewUrl, setClientImagePreviewUrl] = useState<string | null>(null);

  // Banner state
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerSubtitle, setNewBannerSubtitle] = useState('');
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerFormError, setBannerFormError] = useState<string | null>(null);
  const [bannerImagePreviewUrl, setBannerImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch trusted clients
        const trustedClientsSnapshot = await getDocs(collection(db, "trustedClients"));
        const trustedClientsData = trustedClientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as TrustedClient));
        setTrustedClients(trustedClientsData);

        // Fetch banners
        const bannersSnapshot = await getDocs(collection(db, "banners"));
        const bannersData = bannersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Banner));
        setBanners(bannersData);

      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch data. Please check console for details.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // --- Trusted Client Logo Management ---
  const handleClientFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setClientFormError("Please select a valid image file (PNG, JPG, etc.) for the client logo.");
        setSelectedFile(null);
        setClientImagePreviewUrl(null);
        return;
      }
      setSelectedFile(file);
      setClientFormError(null);
      setClientImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      setClientImagePreviewUrl(null);
    }
  };

  const handleAddTrustedClient = async () => {
    if (!newClientName.trim()) {
      setClientFormError("Client Name is required.");
      return;
    }
    if (!selectedFile) {
      setClientFormError("A logo image is required.");
      return;
    }

    setUploadingClientLogo(true);
    setClientFormError(null);

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `trusted_client_logos/${Date.now()}_${selectedFile.name}`);
      const uploadTask = await uploadBytesResumable(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(uploadTask.ref);

      const docRef = await addDoc(collection(db, "trustedClients"), {
        name: newClientName,
        logoUrl: downloadURL,
        createdAt: new Date(),
      });

      setTrustedClients(prev => [...prev, {
        id: docRef.id,
        name: newClientName,
        logoUrl: downloadURL
      }]);

      // Reset form
      setNewClientName('');
      setSelectedFile(null);
      setClientImagePreviewUrl(null);

    } catch (error) {
      console.error("Error adding trusted client:", error);
      setClientFormError("Failed to add client. Please try again.");
    } finally {
      setUploadingClientLogo(false);
    }
  };

  const handleDeleteTrustedClient = async (clientId: string, logoUrl: string) => {
    if (!window.confirm("Are you sure you want to delete this trusted client logo? This action cannot be undone.")) return;
    try {
      const storage = getStorage();
      const imageRef = ref(storage, logoUrl);

      await deleteObject(imageRef).catch((err) => {
        if (err.code !== 'storage/object-not-found') {
          console.warn("Could not delete image from storage:", err);
        }
      });

      await deleteDoc(doc(db, "trustedClients", clientId));
      setTrustedClients(prev => prev.filter(client => client.id !== clientId));
    } catch (error) {
      console.error("Error deleting trusted client:", error);
      alert("Failed to delete client. Please check console for details.");
    }
  };

  // --- Banner Management ---
  const handleBannerFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setBannerFormError("Please select a valid image file (PNG, JPG, etc.) for the banner.");
        setSelectedBannerFile(null);
        setBannerImagePreviewUrl(null);
        return;
      }
      setSelectedBannerFile(file);
      setBannerFormError(null);
      setBannerImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedBannerFile(null);
      setBannerImagePreviewUrl(null);
    }
  };

  const handleAddBanner = async () => {
    if (!newBannerTitle.trim() || !newBannerSubtitle.trim()) {
      setBannerFormError("Banner Title and Subtitle are required.");
      return;
    }
    if (!selectedBannerFile) {
      setBannerFormError("A banner image is required.");
      return;
    }

    setUploadingBanner(true);
    setBannerFormError(null);

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `homepage_banners/${Date.now()}_${selectedBannerFile.name}`);
      const uploadTask = await uploadBytesResumable(storageRef, selectedBannerFile);
      const downloadURL = await getDownloadURL(uploadTask.ref);

      const docRef = await addDoc(collection(db, "banners"), {
        title: newBannerTitle,
        subtitle: newBannerSubtitle,
        image: downloadURL,
        createdAt: new Date(),
      });

      setBanners(prev => [...prev, {
        id: docRef.id,
        title: newBannerTitle,
        subtitle: newBannerSubtitle,
        image: downloadURL
      }]);

      // Reset form
      setNewBannerTitle('');
      setNewBannerSubtitle('');
      setSelectedBannerFile(null);
      setBannerImagePreviewUrl(null);

    } catch (error) {
      console.error("Error adding banner:", error);
      setBannerFormError("Failed to add banner. Please try again.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleDeleteBanner = async (bannerId: string, imageUrl: string) => {
    if (!window.confirm("Are you sure you want to delete this banner? This will remove it from the homepage. This action cannot be undone.")) return;
    try {
      const storage = getStorage();
      const imageRef = ref(storage, imageUrl);

      await deleteObject(imageRef).catch((err) => {
        if (err.code !== 'storage/object-not-found') {
          console.warn("Could not delete image from storage:", err);
        }
      });

      await deleteDoc(doc(db, "banners", bannerId));
      setBanners(prev => prev.filter(banner => banner.id !== bannerId));
    } catch (error) {
      console.error("Error deleting banner:", error);
      alert("Failed to delete banner. Please check console for details.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="ml-4 text-gray-600">Loading Clients and Banners...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-10 text-red-600">
        <p>Error: {error}</p>
        <p>Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-md">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="mt-1 text-gray-600">Manage trusted brands and homepage banners.</p>
        </div>
      </header>

      {/* Section 1: Manage Trusted Client Logos */}
      <section className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Manage Trusted Client Logos</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Client Form */}
          <div className="lg:col-span-1 bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Add New Logo</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="client-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  id="client-name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g., Brandify Inc."
                  className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="logo-upload" className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Logo (PNG, JPG)
                </label>
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleClientFileChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              {clientImagePreviewUrl && (
                <div className="mt-2">
                  <Image
                    src={clientImagePreviewUrl}
                    alt="Logo Preview"
                    width={150}
                    height={96}
                    className="max-h-24 mx-auto object-contain border rounded-md p-1"
                  />
                </div>
              )}
              {clientFormError && (
                <p className="text-xs text-red-600 mt-2">{clientFormError}</p>
              )}
              <button
                onClick={handleAddTrustedClient}
                disabled={uploadingClientLogo}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium disabled:bg-indigo-400 disabled:cursor-not-allowed"
              >
                {uploadingClientLogo ? 'Uploading...' : 'Add Client Logo'}
              </button>
            </div>
          </div>

          {/* Existing Clients Table */}
          <div className="lg:col-span-2 bg-gray-50 p-6 rounded-xl border border-gray-200 overflow-x-auto">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Existing Logos ({trustedClients.length})
            </h3>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Logo
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trustedClients.length > 0 ? (
                  trustedClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Image
                          src={client.logoUrl}
                          alt={`${client.name} logo`}
                          width={80}
                          height={40}
                          className="h-10 w-auto object-contain"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {client.name}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteTrustedClient(client.id, client.logoUrl)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-500">
                      No trusted client logos added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 2: Manage Homepage Banners */}
      <section className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Manage Homepage Banners</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Banner Form */}
          <div className="lg:col-span-1 bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Add New Banner</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="banner-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  id="banner-title"
                  value={newBannerTitle}
                  onChange={(e) => setNewBannerTitle(e.target.value)}
                  placeholder="e.g., Discover Top Talent"
                  className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="banner-subtitle" className="block text-sm font-medium text-gray-700 mb-1">
                  Subtitle
                </label>
                <textarea
                  id="banner-subtitle"
                  value={newBannerSubtitle}
                  onChange={(e) => setNewBannerSubtitle(e.target.value)}
                  placeholder="e.g., Collaborate with the best creators."
                  rows={2}
                  className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 text-sm"
                ></textarea>
              </div>
              <div>
                <label htmlFor="banner-image-upload" className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Banner Image (PNG, JPG)
                </label>
                <input
                  type="file"
                  id="banner-image-upload"
                  accept="image/*"
                  onChange={handleBannerFileChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              {bannerImagePreviewUrl && (
                <div className="mt-2">
                  <Image
                    src={bannerImagePreviewUrl}
                    alt="Banner Preview"
                    width={150}
                    height={96}
                    className="max-h-24 mx-auto object-contain border rounded-md p-1"
                  />
                </div>
              )}
              {bannerFormError && (
                <p className="text-xs text-red-600 mt-2">{bannerFormError}</p>
              )}
              <button
                onClick={handleAddBanner}
                disabled={uploadingBanner}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium disabled:bg-indigo-400 disabled:cursor-not-allowed"
              >
                {uploadingBanner ? 'Uploading...' : 'Add Homepage Banner'}
              </button>
            </div>
          </div>

          {/* Existing Banners Table */}
          <div className="lg:col-span-2 bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Existing Banners ({banners.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Image
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subtitle
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {banners.length > 0 ? (
                    banners.map((banner) => (
                      <tr key={banner.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Image
                            src={banner.image}
                            alt={banner.title}
                            width={128}
                            height={64}
                            className="h-16 w-auto object-cover rounded-md"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                          {banner.title}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {banner.subtitle}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteBanner(banner.id, banner.image)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                        No banners added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ClientsPage;