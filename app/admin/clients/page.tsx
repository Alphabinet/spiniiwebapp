'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseConfig';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import Image from 'next/image';

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

const ClientsPage = () => {
  const [trustedClients, setTrustedClients] = useState<TrustedClient[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newClientName, setNewClientName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingClientLogo, setUploadingClientLogo] = useState(false);
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [clientImagePreviewUrl, setClientImagePreviewUrl] = useState<string | null>(null);

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
        const trustedClientsSnapshot = await getDocs(collection(db, "trustedClients"));
        const trustedClientsData = trustedClientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as TrustedClient));
        setTrustedClients(trustedClientsData);

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

  const handleBannerFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setBannerFormError("Please select a valid image file (PNG, JPG, etc.) for the banner.");
        setSelectedBannerFile(null);
        setBannerImagePreviewUrl(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new (window as any).Image();
        img.onload = () => {
          const { width, height } = img;
          if ((width === 1920 && height === 730) || (width === 1200 && height === 456)) {
            setSelectedBannerFile(file);
            setBannerFormError(null);
            setBannerImagePreviewUrl(URL.createObjectURL(file));
          } else {
            setBannerFormError("Invalid banner dimensions. Allowed sizes are 1920x730px or 1200x456px.");
            setSelectedBannerFile(null);
            setBannerImagePreviewUrl(null);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
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
      <div className="flex flex-col items-center justify-center p-4 min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="mt-3 text-gray-600 text-sm">Loading Clients and Banners...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p className="text-sm">Error: {error}</p>
        <p className="mt-1 text-sm">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="mt-1 text-xs sm:text-sm text-gray-600">Manage trusted brands and homepage banners</p>
      </header>

      {/* Section 1: Trusted Clients */}
      <section className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Trusted Client Logos</h2>
        
        {/* Add Client Form */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-md font-medium text-gray-800 mb-3">Add New Logo</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Client Name
              </label>
              <input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="e.g., Brandify Inc."
                className="w-full rounded border border-gray-300 p-2 text-xs sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Upload Logo (PNG, JPG)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleClientFileChange}
                className="w-full text-xs sm:text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700"
              />
            </div>
            
            {clientImagePreviewUrl && (
              <div className="mt-1 flex justify-center">
                <Image
                  src={clientImagePreviewUrl}
                  alt="Logo Preview"
                  width={120}
                  height={80}
                  className="max-h-20 object-contain border rounded p-1"
                />
              </div>
            )}
            
            {clientFormError && (
              <p className="text-xs text-red-600">{clientFormError}</p>
            )}
            
            <button
              onClick={handleAddTrustedClient}
              disabled={uploadingClientLogo}
              className="w-full px-3 py-2 bg-indigo-600 text-white rounded text-xs sm:text-sm font-medium disabled:bg-indigo-400"
            >
              {uploadingClientLogo ? 'Uploading...' : 'Add Client Logo'}
            </button>
          </div>
        </div>

        {/* Existing Clients */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-md font-medium text-gray-800 mb-3">
            Existing Logos ({trustedClients.length})
          </h3>
          
          {trustedClients.length === 0 ? (
            <p className="text-center text-xs sm:text-sm text-gray-500 py-4">
              No trusted client logos added yet
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {trustedClients.map((client) => (
                <div key={client.id} className="bg-white p-3 rounded-lg border border-gray-200 flex flex-col items-center">
                  <div className="mb-2 flex justify-center">
                    <Image
                      src={client.logoUrl}
                      alt={`${client.name} logo`}
                      width={80}
                      height={50}
                      className="h-12 object-contain"
                    />
                  </div>
                  <p className="text-xs text-gray-800 font-medium text-center mb-2 truncate w-full">
                    {client.name}
                  </p>
                  <button
                    onClick={() => handleDeleteTrustedClient(client.id, client.logoUrl)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Homepage Banners */}
      <section className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Homepage Banners</h2>
        
        {/* Add Banner Form */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-md font-medium text-gray-800 mb-3">Add New Banner</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                value={newBannerTitle}
                onChange={(e) => setNewBannerTitle(e.target.value)}
                placeholder="e.g., Discover Top Talent"
                className="w-full rounded border border-gray-300 p-2 text-xs sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Subtitle
              </label>
              <textarea
                value={newBannerSubtitle}
                onChange={(e) => setNewBannerSubtitle(e.target.value)}
                placeholder="e.g., Collaborate with the best creators."
                rows={2}
                className="w-full rounded border border-gray-300 p-2 text-xs sm:text-sm"
              ></textarea>
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Upload Banner Image (Allowed sizes: 1920x730px or 1200x456px)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerFileChange}
                className="w-full text-xs sm:text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700"
              />
            </div>
            
            {bannerImagePreviewUrl && (
              <div className="mt-1 flex justify-center">
                <Image
                  src={bannerImagePreviewUrl}
                  alt="Banner Preview"
                  width={150}
                  height={100}
                  className="max-h-24 object-contain border rounded p-1"
                />
              </div>
            )}
            
            {bannerFormError && (
              <p className="text-xs text-red-600">{bannerFormError}</p>
            )}
            
            <button
              onClick={handleAddBanner}
              disabled={uploadingBanner}
              className="w-full px-3 py-2 bg-indigo-600 text-white rounded text-xs sm:text-sm font-medium disabled:bg-indigo-400"
            >
              {uploadingBanner ? 'Uploading...' : 'Add Homepage Banner'}
            </button>
          </div>
        </div>

        {/* Existing Banners */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-md font-medium text-gray-800 mb-3">
            Existing Banners ({banners.length})
          </h3>
          
          {banners.length === 0 ? (
            <p className="text-center text-xs sm:text-sm text-gray-500 py-4">
              No banners added yet
            </p>
          ) : (
            <div className="space-y-4">
              {banners.map((banner) => (
                <div key={banner.id} className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-shrink-0">
                      <Image
                        src={banner.image}
                        alt={banner.title}
                        width={120}
                        height={80}
                        className="h-20 w-full object-cover rounded-md"
                      />
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-sm font-medium text-gray-800">{banner.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{banner.subtitle}</p>
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => handleDeleteBanner(banner.id, banner.image)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ClientsPage;