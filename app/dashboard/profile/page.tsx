"use client";

import { useState, useRef, useEffect } from "react";
import { db, storage, auth } from "@/lib/firebaseConfig";
import { 
  collection, addDoc, serverTimestamp, 
  query, where, onSnapshot, updateDoc, doc 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { useAuthState } from "react-firebase-hooks/auth";

export default function CreatorDashboard() {
  const [user] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState("application");
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, "creatorApplications"), 
      where("userId", "==", user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setExistingApplication({ id: doc.id, ...doc.data() });
      } else {
        setExistingApplication(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Creator Dashboard</h1>
        <div className="flex border-b border-gray-200">
          <button
            className={`py-3 px-6 font-medium ${
              activeTab === "application" 
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("application")}
          >
            {existingApplication ? "Update Application" : "New Application"}
          </button>
          <button
            className={`py-3 px-6 font-medium ${
              activeTab === "status" 
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("status")}
          >
            Application Status
          </button>
        </div>
      </div>

      {activeTab === "application" ? (
        <ApplicationForm 
          user={user} 
          existingApplication={existingApplication} 
        />
      ) : (
        <ApplicationStatus 
          application={existingApplication} 
          user={user} 
        />
      )}
    </div>
  );
}

function ApplicationForm({ user, existingApplication }: any) {
  const [formData, setFormData] = useState({
    fullName: existingApplication?.fullName || "",
    mobileNumber: existingApplication?.mobileNumber || "",
    emailAddress: existingApplication?.emailAddress || "",
    cityState: existingApplication?.cityState || "",
    gender: existingApplication?.gender || "",
    instagramUsername: existingApplication?.instagramUsername || "",
    instagramProfileLink: existingApplication?.instagramProfileLink || "",
    totalFollowers: existingApplication?.totalFollowers || "",
    avgReelViews: existingApplication?.avgReelViews || "",
    storyAverageViews: existingApplication?.storyAverageViews || "",
    contentCategory: existingApplication?.contentCategory || "",
    contentLanguages: existingApplication?.contentLanguages || "",
    reelPrice: existingApplication?.reelPrice || "",
    storyPrice: existingApplication?.storyPrice || "",
    reelsStoryPrice: existingApplication?.reelsStoryPrice || "",
    deliveryDuration: existingApplication?.deliveryDuration || "",
  });

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | ArrayBuffer | null>(
    existingApplication?.profilePictureUrl || null
  );
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      if (errors.profilePicture) {
        setErrors(prev => ({ ...prev, profilePicture: "" }));
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required.";
    if (!formData.mobileNumber.trim()) newErrors.mobileNumber = "Mobile Number is required.";
    if (!/^\d{10}$/.test(formData.mobileNumber)) newErrors.mobileNumber = "Please enter a valid 10-digit mobile number.";
    if (!formData.emailAddress.trim()) newErrors.emailAddress = "Email Address is required.";
    if (!/\S+@\S+\.\S+/.test(formData.emailAddress)) newErrors.emailAddress = "Please enter a valid email address.";
    if (!formData.cityState.trim()) newErrors.cityState = "City / State is required.";
    if (!formData.gender) newErrors.gender = "Gender is required.";
    if (!formData.instagramUsername.trim()) newErrors.instagramUsername = "Instagram Username is required.";
    if (!formData.instagramProfileLink.trim()) newErrors.instagramProfileLink = "Instagram Profile Link is required.";
    if (!/^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/.test(formData.instagramProfileLink)) newErrors.instagramProfileLink = "Please enter a valid Instagram profile URL.";
    if (!formData.totalFollowers.trim()) newErrors.totalFollowers = "Total Followers count is required.";
    if (!formData.avgReelViews.trim()) newErrors.avgReelViews = "Average Reel Views is required.";
    if (!formData.storyAverageViews.trim()) newErrors.storyAverageViews = "Story Average Views is required.";
    if (!image && !existingApplication?.profilePictureUrl) newErrors.profilePicture = "Profile Picture is required.";
    if (!formData.contentCategory) newErrors.contentCategory = "Content Category is required.";
    if (!formData.contentLanguages.trim()) newErrors.contentLanguages = "Content Language(s) is required.";
    if (!formData.reelPrice.trim()) newErrors.reelPrice = "Reel Price is required.";
    if (!formData.storyPrice.trim()) newErrors.storyPrice = "Story Price is required.";
    if (!formData.reelsStoryPrice.trim()) newErrors.reelsStoryPrice = "Reels + Story Price is required.";
    if (!formData.deliveryDuration.trim()) newErrors.deliveryDuration = "Delivery Duration is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    setUploading(true);
    setSuccess(false);

    try {
      let imageUrl = existingApplication?.profilePictureUrl || "";
      
      // Only upload new image if one was selected
      if (image) {
        const imageRef = ref(storage, `creator_profiles/${uuidv4()}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }

      const dataToSend = {
        ...formData,
        profilePictureUrl: imageUrl,
        userId: user?.uid,
        status: "pending",
        timestamp: serverTimestamp(),
      };

      if (existingApplication) {
        // Update existing application
        await updateDoc(doc(db, "creatorApplications", existingApplication.id), dataToSend);
      } else {
        // Create new application
        await addDoc(collection(db, "creatorApplications"), dataToSend);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error("Error submitting creator application:", err);
      alert("Error submitting creator application. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const contentCategories = [
    "Fashion", "Tech", "Comedy", "Fitness", "Beauty", "Travel", "Food", "Gaming",
    "Lifestyle", "Education", "DIY", "Art", "Music", "Dance", "Vlogging", "Health & Wellness"
  ];

  const genders = ["Male", "Female", "Other", "Prefer not to say"];

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {existingApplication ? "Update Your Application" : "Creator Application Form"}
          </h1>
          <p className="text-indigo-100">
            {existingApplication 
              ? "Make changes to your application details" 
              : "Join our network of talented creators and collaborate with top brands"}
          </p>
        </div>
        
        <div className="p-6">
          {success && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-green-700 font-medium">
                {existingApplication 
                  ? "Application updated successfully!" 
                  : "Creator application submitted successfully!"}
              </span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information Section */}
            <div className="bg-gray-50 p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="bg-indigo-100 text-indigo-800 rounded-full p-2 mr-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                Personal Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1">
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className={`input ${errors.fullName ? "border-red-500" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"}`}
                      placeholder="e.g., John Doe"
                    />
                    {errors.fullName && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                  <p className="text-xs text-gray-500 mt-1">Enter your full legal name</p>
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      id="mobileNumber"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleChange}
                      className={`input ${errors.mobileNumber ? "border-red-500" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"}`}
                      placeholder="e.g., 9876543210"
                    />
                    {errors.mobileNumber && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.mobileNumber && <p className="text-red-500 text-xs mt-1">{errors.mobileNumber}</p>}
                  <p className="text-xs text-gray-500 mt-1">Provide your active WhatsApp number</p>
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="emailAddress" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="emailAddress"
                      name="emailAddress"
                      value={formData.emailAddress}
                      onChange={handleChange}
                      className={`input ${errors.emailAddress ? "border-red-500" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"}`}
                      placeholder="e.g., your.email@example.com"
                    />
                    {errors.emailAddress && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.emailAddress && <p className="text-red-500 text-xs mt-1">{errors.emailAddress}</p>}
                  <p className="text-xs text-gray-500 mt-1">Enter your email for communication</p>
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="cityState" className="block text-sm font-medium text-gray-700 mb-1">
                    City / State <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="cityState"
                      name="cityState"
                      value={formData.cityState}
                      onChange={handleChange}
                      className={`input ${errors.cityState ? "border-red-500" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"}`}
                      placeholder="e.g., Mumbai, Maharashtra"
                    />
                    {errors.cityState && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.cityState && <p className="text-red-500 text-xs mt-1">{errors.cityState}</p>}
                  <p className="text-xs text-gray-500 mt-1">Where are you currently based?</p>
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={`input ${errors.gender ? "border-red-500" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"}`}
                    >
                      <option value="">Select your gender</option>
                      {genders.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    {errors.gender && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
                </div>
              </div>
            </div>
            
            {/* Instagram Details Section */}
            <div className="bg-gray-50 p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="bg-indigo-100 text-indigo-800 rounded-full p-2 mr-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </span>
                Instagram Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1">
                  <label htmlFor="instagramUsername" className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">@</span>
                    </div>
                    <input
                      type="text"
                      id="instagramUsername"
                      name="instagramUsername"
                      value={formData.instagramUsername}
                      onChange={handleChange}
                      className={`pl-7 input ${errors.instagramUsername ? "border-red-500" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"}`}
                      placeholder="yourusername"
                    />
                    {errors.instagramUsername && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.instagramUsername && <p className="text-red-500 text-xs mt-1">{errors.instagramUsername}</p>}
                  <p className="text-xs text-gray-500 mt-1">Example: @yourusername</p>
                </div>
                
                <div className="md:col-span-2 space-y-1">
                  <label htmlFor="instagramProfileLink" className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram Profile Link <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      id="instagramProfileLink"
                      name="instagramProfileLink"
                      value={formData.instagramProfileLink}
                      onChange={handleChange}
                      className={`input ${errors.instagramProfileLink ? "border-red-500" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"}`}
                      placeholder="e.g., https://instagram.com/yourname"
                    />
                    {errors.instagramProfileLink && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.instagramProfileLink && <p className="text-red-500 text-xs mt-1">{errors.instagramProfileLink}</p>}
                  <p className="text-xs text-gray-500 mt-1">Paste your profile URL</p>
                </div>
              </div>
            </div>
            
            {/* Performance Metrics Section */}
            <div className="bg-gray-50 p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="bg-indigo-100 text-indigo-800 rounded-full p-2 mr-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </span>
                Performance Metrics
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-1">
                  <label htmlFor="totalFollowers" className="block text-sm font-medium text-gray-700 mb-1">
                    Total Followers <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="totalFollowers"
                      name="totalFollowers"
                      value={formData.totalFollowers}
                      onChange={handleChange}
                      className={`input ${errors.totalFollowers ? "border-red-500" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"}`}
                      placeholder="e.g., 50K or 1.2M"
                    />
                    {errors.totalFollowers && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.totalFollowers && <p className="text-red-500 text-xs mt-1">{errors.totalFollowers}</p>}
                  <p className="text-xs text-gray-500 mt-1">Enter your current follower count</p>
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="avgReelViews" className="block text-sm font-medium text-gray-700 mb-1">
                    Average Reel Views <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="avgReelViews"
                      name="avgReelViews"
                      value={formData.avgReelViews}
                      onChange={handleChange}
                      className={`input ${errors.avgReelViews ? "border-red-500" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"}`}
                      placeholder="e.g., 10K or 500K"
                    />
                    {errors.avgReelViews && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.avgReelViews && <p className="text-red-500 text-xs mt-1">{errors.avgReelViews}</p>}
                  <p className="text-xs text-gray-500 mt-1">How many views do your reels get?</p>
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="storyAverageViews" className="block text-sm font-medium text-gray-700 mb-1">
                    Story Average Views <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="storyAverageViews"
                      name="storyAverageViews"
                      value={formData.storyAverageViews}
                      onChange={handleChange}
                      className={`input ${errors.storyAverageViews ? "border-red-500" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"}`}
                      placeholder="e.g., 5K or 20K"
                    />
                    {errors.storyAverageViews && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.storyAverageViews && <p className="text-red-500 text-xs mt-1">{errors.storyAverageViews}</p>}
                  <p className="text-xs text-gray-500 mt-1">Average views for your Instagram stories</p>
                </div>
              </div>
            </div>
            
            {/* Profile Picture Section */}
            <div className="bg-gray-50 p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="bg-indigo-100 text-indigo-800 rounded-full p-2 mr-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                Profile Picture
              </h2>
              
              <div className="md:col-span-2 space-y-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Picture <span className="text-red-500">*</span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div
                    onClick={triggerFileInput}
                    className={`relative border-2 rounded-xl cursor-pointer w-32 h-32 flex items-center justify-center overflow-hidden ${errors.profilePicture ? "border-red-500" : "border-dashed border-indigo-300 hover:border-indigo-500"}`}
                  >
                    {imagePreview ? (
                      <img
                        src={imagePreview as string}
                        alt="Profile Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4 text-indigo-500">
                        <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs">Upload Photo</span>
                      </div>
                    )}
                    {imagePreview && (
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={triggerFileInput}
                      className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md text-sm font-medium hover:bg-indigo-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Choose Profile Image
                    </button>
                    <p className="text-xs text-gray-500 mt-2">JPG, PNG, GIF (Max 5MB)</p>
                    {errors.profilePicture && <p className="text-red-500 text-xs mt-1">{errors.profilePicture}</p>}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Content Details Section */}
            <div className="bg-gray-50 p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="bg-indigo-100 text-indigo-800 rounded-full p-2 mr-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </span>
                Content Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1">
                  <label htmlFor="contentCategory" className="block text-sm font-medium text-gray-700 mb-1">
                    Content Category <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="contentCategory"
                      name="contentCategory"
                      value={formData.contentCategory}
                      onChange={handleChange}
                      className={`input ${errors.contentCategory ? "border-red-500" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"}`}
                    >
                      <option value="">Select a category</option>
                      {contentCategories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    {errors.contentCategory && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.contentCategory && <p className="text-red-500 text-xs mt-1">{errors.contentCategory}</p>}
                  <p className="text-xs text-gray-500 mt-1">e.g. Fashion, Tech, Comedy, etc.</p>
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="contentLanguages" className="block text-sm font-medium text-gray-700 mb-1">
                    Content Language(s) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="contentLanguages"
                      name="contentLanguages"
                      value={formData.contentLanguages}
                      onChange={handleChange}
                      className={`input ${errors.contentLanguages ? "border-red-500" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"}`}
                      placeholder="e.g., English, Hindi, Punjabi"
                    />
                    {errors.contentLanguages && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.contentLanguages && <p className="text-red-500 text-xs mt-1">{errors.contentLanguages}</p>}
                  <p className="text-xs text-gray-500 mt-1">Which language(s) do you use?</p>
                </div>
              </div>
            </div>
            
            {/* Pricing Information Section */}
            <div className="bg-gray-50 p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="bg-indigo-100 text-indigo-800 rounded-full p-2 mr-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                Pricing Information (₹)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-1">
                  <label htmlFor="reelPrice" className="block text-sm font-medium text-gray-700 mb-1">
                    Reel Price <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">₹</span>
                    </div>
                    <input
                      type="number"
                      id="reelPrice"
                      name="reelPrice"
                      value={formData.reelPrice}
                      onChange={handleChange}
                      className={`pl-8 input ${errors.reelPrice ? "border-red-500" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"}`}
                      placeholder="e.g., 5000"
                      min="0"
                    />
                    {errors.reelPrice && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.reelPrice && <p className="text-red-500 text-xs mt-1">{errors.reelPrice}</p>}
                  <p className="text-xs text-gray-500 mt-1">Your charge for 1 Instagram Reel</p>
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="storyPrice" className="block text-sm font-medium text-gray-700 mb-1">
                    Story Price <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">₹</span>
                    </div>
                    <input
                      type="number"
                      id="storyPrice"
                      name="storyPrice"
                      value={formData.storyPrice}
                      onChange={handleChange}
                      className={`pl-8 input ${errors.storyPrice ? "border-red-500" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"}`}
                      placeholder="e.g., 2000"
                      min="0"
                    />
                    {errors.storyPrice && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.storyPrice && <p className="text-red-500 text-xs mt-1">{errors.storyPrice}</p>}
                  <p className="text-xs text-gray-500 mt-1">Your charge for 1 Story</p>
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="reelsStoryPrice" className="block text-sm font-medium text-gray-700 mb-1">
                    Reels + Story Price <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">₹</span>
                    </div>
                    <input
                      type="number"
                      id="reelsStoryPrice"
                      name="reelsStoryPrice"
                      value={formData.reelsStoryPrice}
                      onChange={handleChange}
                      className={`pl-8 input ${errors.reelsStoryPrice ? "border-red-500" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"}`}
                      placeholder="e.g., 6500"
                      min="0"
                    />
                    {errors.reelsStoryPrice && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.reelsStoryPrice && <p className="text-red-500 text-xs mt-1">{errors.reelsStoryPrice}</p>}
                </div>
              </div>
            </div>
            
            {/* Delivery Section */}
            <div className="bg-gray-50 p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="bg-indigo-100 text-indigo-800 rounded-full p-2 mr-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                Delivery
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1">
                  <label htmlFor="deliveryDuration" className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Duration <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="deliveryDuration"
                      name="deliveryDuration"
                      value={formData.deliveryDuration}
                      onChange={handleChange}
                      className={`input ${errors.deliveryDuration ? "border-red-500" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"}`}
                      placeholder="e.g., 3-5 Days"
                    />
                    {errors.deliveryDuration && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.deliveryDuration && <p className="text-red-500 text-xs mt-1">{errors.deliveryDuration}</p>}
                  <p className="text-xs text-gray-500 mt-1">In days, e.g., 3-5 days</p>
                </div>
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={uploading}
                className={`flex-1 py-3 px-4 rounded-md text-white font-medium ${
                  uploading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                } transition duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : existingApplication ? "Update Application" : "Submit Application"}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    fullName: "",
                    mobileNumber: "",
                    emailAddress: "",
                    cityState: "",
                    gender: "",
                    instagramUsername: "",
                    instagramProfileLink: "",
                    totalFollowers: "",
                    avgReelViews: "",
                    storyAverageViews: "",
                    contentCategory: "",
                    contentLanguages: "",
                    reelPrice: "",
                    storyPrice: "",
                    reelsStoryPrice: "",
                    deliveryDuration: "",
                  });
                  setImage(null);
                  setImagePreview(null);
                  setErrors({});
                }}
                className="flex-1 py-3 px-4 rounded-md bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Reset Form
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <style jsx>{`
        .input {
          @apply w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none;
        }
      `}</style>
    </div>
  );
}

function ApplicationStatus({ application, user }: any) {
  if (!application) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="bg-gray-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">No Application Found</h2>
        <p className="text-gray-600 mb-6">
          You haven't submitted an application yet. Please submit your creator application to get started.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors"
        >
          Submit Application
        </button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate();
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Application Status</h1>
        <p className="text-indigo-100">Track your creator application progress</p>
      </div>
      
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-2/3">
            <div className="mb-8">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-800">Application Details</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                  {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                </span>
              </div>
              
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Submitted On</h3>
                    <p className="font-medium">{formatDate(application.timestamp)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Last Updated</h3>
                    <p className="font-medium">
                      {application.updatedAt ? formatDate(application.updatedAt) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Full Name</h3>
                    <p className="font-medium">{application.fullName}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Instagram</h3>
                    <a 
                      href={application.instagramProfileLink} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      @{application.instagramUsername}
                    </a>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Followers</h3>
                    <p className="font-medium">{application.totalFollowers}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Category</h3>
                    <p className="font-medium">{application.contentCategory}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Pricing Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Reel Price</h3>
                  <p className="text-lg font-bold">₹{application.reelPrice}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Story Price</h3>
                  <p className="text-lg font-bold">₹{application.storyPrice}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Reel + Story</h3>
                  <p className="text-lg font-bold">₹{application.reelsStoryPrice}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="md:w-1/3">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Profile Information</h2>
              
              {application.profilePictureUrl ? (
                <div className="mb-4">
                  <img 
                    src={application.profilePictureUrl} 
                    alt="Profile" 
                    className="w-32 h-32 rounded-lg object-cover mx-auto border-2 border-gray-300"
                  />
                </div>
              ) : (
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                  <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Email</h3>
                  <p className="font-medium">{application.emailAddress}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                  <p className="font-medium">{application.mobileNumber}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Location</h3>
                  <p className="font-medium">{application.cityState}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Gender</h3>
                  <p className="font-medium">{application.gender}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Delivery Time</h3>
                  <p className="font-medium">{application.deliveryDuration}</p>
                </div>
              </div>
            </div>
            
            {application.status === "rejected" && application.adminFeedback && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-medium text-red-800 mb-2 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Admin Feedback
                </h3>
                <p className="text-red-700">{application.adminFeedback}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Next Steps</h2>
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
            {application.status === "pending" ? (
              <p className="text-indigo-800">
                Your application is under review. Our team will evaluate your profile and get back to you within 3-5 business days. 
                You'll receive an email notification once a decision has been made.
              </p>
            ) : application.status === "approved" ? (
              <p className="text-green-800">
                Congratulations! Your application has been approved. You can now start collaborating with brands on our platform. 
                Check your email for more details on how to get started.
              </p>
            ) : (
              <p className="text-red-800">
                Your application has been reviewed but not approved at this time. Please see the admin feedback for more details. 
                You may update your application and resubmit for reconsideration.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}