'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { db } from "@/firebase";
import { onSnapshot, updateDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { Upload, Pencil, Check, X, Plus } from "lucide-react";

interface ProfileItem {
  email: string;
  aboutMe: string;
  genres?: string[];
  profilePicUrl: string;
  uid: string;
  username: string;
}

const Profile = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isAddingGenre, setIsAddingGenre] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [profilePicture, setProfilePicture] = useState("https://via.placeholder.com/150");
  const [username, setUsername] = useState("username");
  const [editingUsername, setEditingUsername] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [newGenre, setNewGenre] = useState("");
  const [aboutMe, setAboutMe] = useState("Write about yourself!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [changeProfile, setChangeProfile] = useState<File | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const genreInputRef = useRef<HTMLInputElement>(null);

  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const userDocRef = doc(db, "profile", user.uid);
    
    // Check if profile exists, create if it doesn't
    const checkProfile = async () => {
      try {
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
          // Profile doesn't exist yet, create it
          await setDoc(userDocRef, {
            email: user.email || "",
            aboutMe: "Write about yourself!",
            genres: [],
            profilePicUrl: "",
            uid: user.uid,
            username: user.displayName || "username",
          });
          console.log("Created new profile document");
        }
      } catch (err) {
        console.error("Error checking profile:", err);
        setError("Failed to load profile");
      }
    };
    
    checkProfile();

    // Set up listener for profile changes
    const unsubscribe = onSnapshot(userDocRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          console.log("Profile data from Firestore:", data);
          
          setProfilePicture(data.profilePicUrl || "https://via.placeholder.com/150");
          setUsername(data.username || "username");
          setAboutMe(data.aboutMe || "Write about yourself!");
          
          // Handle genres array properly
          if (Array.isArray(data.genres)) {
            setGenres(data.genres);
          } else if (typeof data.genres === 'string') {
            // Handle legacy string format if needed
            const parsedGenres = data.genres
              .split('#')
              .filter(tag => tag.trim() !== '')
              .map(tag => tag.trim());
            setGenres(parsedGenres);
          } else {
            setGenres([]);
          }
        }
      },
      (err) => {
        console.error("Error in profile snapshot listener:", err);
        setError("Failed to sync profile changes");
      }
    );

    return () => unsubscribe();
  }, [user, router]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      setEditingUsername(username);
    }
  }, [isEditingName, username]);

  useEffect(() => {
    if (isAddingGenre && genreInputRef.current) {
      genreInputRef.current.focus();
    }
  }, [isAddingGenre]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file size (limit to 500KB to avoid Firestore document size limits)
    if (file.size > 500 * 1024) {
      setError("Image too large. Please select an image under 500KB.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    // Create a local preview immediately
    const localPreviewUrl = URL.createObjectURL(file);
    setProfilePicture(localPreviewUrl);
    
    try {
      // Convert to base64 and update Firestore directly
      console.log("Converting image to base64...");
      const base64Image = await convertToBase64(file);
      console.log("Image converted successfully");
      
      console.log("Updating Firestore document...");
      const userDocRef = doc(db, "profile", user.uid);
      await updateDoc(userDocRef, {
        profilePicUrl: base64Image,
      });
      console.log("Profile image updated in Firestore");
      
      // Image is already displayed from local preview
    } catch (err) {
      console.error("Error updating profile picture:", err);
      setError(`Failed to upload image: ${err.message}`);
      
      // Revert to previous picture on error
      const userDocRef = doc(db, "profile", user.uid);
      const snapshot = await getDoc(userDocRef);
      if (snapshot.exists()) {
        setProfilePicture(snapshot.data().profilePicUrl || "https://via.placeholder.com/150");
      }
    } finally {
      setLoading(false);
      // Clean up the object URL to avoid memory leaks
      URL.revokeObjectURL(localPreviewUrl);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // No longer needed as handleFileChange now handles the upload automatically

  const updateProfile = async (field: string, value: any) => {
    if (!user) return;
    setLoading(true);
    setError("");
    
    try {
      const userDocRef = doc(db, "profile", user.uid);
      console.log(`Updating ${field} with:`, value);
      
      await updateDoc(userDocRef, {
        [field]: value
      });
      
      console.log(`Successfully updated ${field}`);
    } catch (err) {
      console.error(`Error updating ${field}:`, err);
      setError(`Failed to update ${field}`);
    } finally {
      setLoading(false);
    }
  };

  const addGenre = async () => {
    if (!user || !newGenre.trim()) return;
    setLoading(true);
    setError("");
    
    try {
      const genre = newGenre.trim();
      if (!genres.includes(genre)) {
        // Create a new array with all existing genres plus the new one
        const updatedGenres = [...genres, genre];
        console.log("Adding genre, new genres array:", updatedGenres);
        
        await updateProfile('genres', updatedGenres);
        // Local state is updated through the Firestore listener
      }
      
      setNewGenre("");
      setIsAddingGenre(false);
    } catch (err) {
      console.error("Error adding genre:", err);
      setError("Failed to add genre");
    } finally {
      setLoading(false);
    }
  };

  const removeGenre = async (genre: string) => {
    if (!user) return;
    setLoading(true);
    setError("");
    
    try {
      const updatedGenres = genres.filter(g => g !== genre);
      console.log("Removing genre, new genres array:", updatedGenres);
      
      await updateProfile('genres', updatedGenres);
      // Local state is updated through the Firestore listener
    } catch (err) {
      console.error("Error removing genre:", err);
      setError("Failed to remove genre");
    } finally {
      setLoading(false);
    }
  };

  const saveUsername = async () => {
    if (editingUsername.trim() !== "") {
      await updateProfile('username', editingUsername.trim());
      // Local state is updated through the Firestore listener
    }
    setIsEditingName(false);
  };

  const cancelEditName = () => {
    setEditingUsername(username);
    setIsEditingName(false);
  };

  return (
    <div className="min-h-screen bg-[#5A7463] p-8">
      <div className="max-w-6xl mx-auto">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-8">
          {/* Left Column - Profile Text, Picture & Name */}
          <div className="flex flex-col items-center">
            <h1 className="text-[#DFDDCE] text-4xl font-bold mb-8">Profile</h1>
            
            <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-[#DFDDCE] mb-4 relative">
              <img
                src={profilePicture}
                alt="Profile"
                className="w-full h-full object-cover"
              />
              {loading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            
            {/* Editable Username */}
            <div className="flex items-center gap-2 mb-4">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={editingUsername}
                    onChange={(e) => setEditingUsername(e.target.value)}
                    className="bg-[#DFDDCE] text-[#3D2F2A] px-3 py-2 rounded text-xl text-center"
                    maxLength={30}
                    disabled={loading}
                  />
                  <button
                    onClick={saveUsername}
                    className="ml-2 bg-[#3D2F2A] text-[#DFDDCE] p-2 rounded hover:bg-opacity-80 disabled:opacity-50"
                    aria-label="Save username"
                    disabled={loading}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelEditName}
                    className="ml-1 bg-[#847266] text-[#DFDDCE] p-2 rounded hover:bg-opacity-80 disabled:opacity-50"
                    aria-label="Cancel edit"
                    disabled={loading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold text-[#DFDDCE]">{username}</h2>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-[#DFDDCE] disabled:opacity-50"
                    aria-label="Edit username"
                    disabled={loading}
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="profile-upload"
                accept="image/*"
                disabled={loading}
              />
              <label
                htmlFor="profile-upload"
                className={`cursor-pointer bg-[#DFDDCE] text-[#3D2F2A] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-opacity-90 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Upload className="w-4 h-4" />
                {loading ? 'Uploading...' : 'Choose Photo'}
              </label>
            </div>
            <p className="text-[#DFDDCE] text-xs mt-2">Please select images under 500KB</p>
          </div>

          {/* Right Column - Profile Info */}
          <div className="space-y-6 mt-16">
            {/* About Me Box - Moved to top */}
            <div className="bg-[#DFDDCE] p-6 rounded-lg relative">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold text-[#3D2F2A]">About Me</h3>
                <button
                  onClick={() => {
                    if (isEditingAbout) {
                      updateProfile('aboutMe', aboutMe);
                    }
                    setIsEditingAbout(!isEditingAbout);
                  }}
                  className="bg-[#5A7463] text-[#DFDDCE] px-4 py-1 rounded hover:bg-opacity-90 disabled:opacity-50"
                  disabled={loading}
                >
                  {isEditingAbout ? 'Done' : 'Edit'}
                </button>
              </div>
              {isEditingAbout ? (
                <textarea
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value)}
                  className="w-full bg-white text-[#3D2F2A] p-3 rounded border border-[#3D2F2A] focus:outline-none focus:ring-2 focus:ring-[#5A7463] text-lg min-h-[120px]"
                  disabled={loading}
                />
              ) : (
                <p className="text-[#3D2F2A] text-lg">{aboutMe}</p>
              )}
            </div>

            {/* Preferred Genre Box - Now with interactive tags */}
            <div className="bg-[#DFDDCE] p-6 rounded-lg relative">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold text-[#3D2F2A]">Preferred Genres</h3>
                <button
                  onClick={() => setIsAddingGenre(true)}
                  className="bg-[#5A7463] text-[#DFDDCE] px-4 py-1 rounded hover:bg-opacity-90 flex items-center disabled:opacity-50"
                  disabled={loading || isAddingGenre}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Genre
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {genres.length > 0 ? (
                  genres.map((genre, index) => (
                    <div key={index} className="flex items-center">
                      <span className="bg-[#847266] text-[#DFDDCE] px-3 py-2 rounded-[15px] font-medium">
                        {genre}
                      </span>
                      <button 
                        onClick={() => removeGenre(genre)}
                        className="ml-1 bg-[#3D2F2A] text-[#DFDDCE] rounded-full p-1 hover:bg-opacity-80 disabled:opacity-50"
                        aria-label={`Remove ${genre}`}
                        disabled={loading}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-[#3D2F2A] text-lg italic">Add your favorite genres</p>
                )}
              </div>
              
              {isAddingGenre && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    ref={genreInputRef}
                    type="text"
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    placeholder="Enter genre..."
                    className="flex-grow bg-white text-[#3D2F2A] p-2 rounded border border-[#3D2F2A] focus:outline-none focus:ring-2 focus:ring-[#5A7463]"
                    maxLength={20}
                    disabled={loading}
                  />
                  <button
                    onClick={addGenre}
                    className="bg-[#3D2F2A] text-[#DFDDCE] p-2 rounded hover:bg-opacity-80 disabled:opacity-50"
                    aria-label="Add genre"
                    disabled={loading}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingGenre(false);
                      setNewGenre('');
                    }}
                    className="bg-[#847266] text-[#DFDDCE] p-2 rounded hover:bg-opacity-80 disabled:opacity-50"
                    aria-label="Cancel"
                    disabled={loading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;