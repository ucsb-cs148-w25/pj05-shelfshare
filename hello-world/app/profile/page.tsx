'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { db } from "@/firebase";
import { onSnapshot, updateDoc, doc } from "firebase/firestore";
import { collection, deleteDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import { Upload, Pencil } from "lucide-react";
import dotenv from "dotenv";

dotenv.config();


interface ProfileItem {
  email: string;
  aboutMe: string;
  pgenre: string;
  profilePicUrl: string;
  uid: string;
  username: string;
}




const Profile = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingGenre, setIsEditingGenre] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [profilePicture, setProfilePicture] = useState("upload-pic.png");
  const [username, setUsername] = useState("username");
  const [changeProfile, setChangeProfile] = useState<File | null>(null);
  const [preferredGenre, setPreferredGenre] = useState("#fantasy#romance#mystery");
  const [aboutMe, setAboutMe] = useState("Write about yourself!");

  const [deleteAccount, setDeleteAccount] = useState(false);

  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const userDocRef = doc(db, "profile", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const profileItem: ProfileItem = {
          email: data.email || "email@shelfshare.com",
          aboutMe: data.aboutMe || "Write about yourself!",
          pgenre: data.pgenre || "#fantasy#romance#mystery",
          profilePicUrl: data.profilePicUrl || "",
          uid: data.uid,
          username: data.username || "username",
        };

        setProfilePicture(profileItem.profilePicUrl);
        setPreferredGenre(profileItem.pgenre);
        setUsername(profileItem.username);
        setAboutMe(profileItem.aboutMe);
      }
    });

    return () => unsubscribe();
  }, [user, router]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setChangeProfile(file);
  };

  const uploadToCloudinary = async (file: File) => {
    if (!user) return;
    const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUD_NAME;
    const UPLOAD_PRESET = "shelfshare";
    

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();
    return data.secure_url;
  };

  const updateProfilePicture = async () => {
    if (!user || !changeProfile) return;
    const pic = await uploadToCloudinary(changeProfile);
    if (!pic) return;

    setProfilePicture(pic);
    const userDocRef = doc(db, "profile", user.uid);
    await updateDoc(userDocRef, {
      profilePicUrl: pic,
    });
  };

  const updateProfile = async (field: string, value: string) => {
    if (!user) return;
    const userDocRef = doc(db, "profile", user.uid);
    await updateDoc(userDocRef, {
      [field]: value
    });
  };

// ✅ Delete all subcollections first, then delete the user document
const deleteUserAndSubcollections = async (uid) => {
  const userRef = doc(db, "users", uid);

  try {
    // Step 1: List all subcollections
    const subcollections = await getDocs(collection(db, `users/${uid}`));

    // Step 2: Delete all documents inside each subcollection
    for (const subcollection of subcollections.docs) {
      await deleteCollection(`users/${uid}/${subcollection.id}`, 10);
    }

    // Step 3: Delete the user document itself
    await deleteDoc(userRef);
    console.log(`User document (${uid}) and all subcollections deleted successfully.`);
  } catch (error) {
    console.error("Error deleting user and subcollections:", error);
  }
};

// ✅ Batch Delete Helper Function
const deleteCollection = async (collectionPath, batchSize) => {
  const collectionRef = collection(db, collectionPath);
  const q = query(collectionRef, orderBy("__name__"), limit(batchSize));

  return new Promise((resolve, reject) => {
    deleteQueryBatch(q, resolve).catch(reject);
  });
};

// ✅ Recursively delete in batches
const deleteQueryBatch = async (query, resolve) => {
  const snapshot = await getDocs(query);
  const batchSize = snapshot.size;

  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));

  await batch.commit();

  // 🔥 Fix: Use setTimeout instead of process.nextTick()
  setTimeout(() => deleteQueryBatch(query, resolve), 0);
};

// ✅ Delete user and subcollections in the correct order
const deleteUser = async (uid: string) => {
  await deleteUserAndSubcollections(uid); // Delete subcollections first
  await deleteDoc(doc(db, "profile", uid)); // Then delete user document
  console.log(`User ${uid} and all subcollections deleted.`);
};

  

  if (deleteAccount) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          <div className="max-w-6xl mx-auto">
            <button onClick={() => setDeleteAccount(false)}> x </button>
          </div>
          <button onClick={() => deleteUser(user.uid)}>Delete </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#5A7463] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-8">
          {/* Left Column - Profile Text, Picture & Name */}
          <div className="flex flex-col items-center">
            <h1 className="text-[#DFDDCE] text-4xl font-bold mb-8">Profile</h1>
            
            <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-[#DFDDCE] mb-4">
              <img
                src={profilePicture}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Editable Username */}
            <div className="flex items-center gap-2 mb-4">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-[#DFDDCE] text-[#3D2F2A] px-3 py-2 rounded text-xl text-center"
                  />
                  <button
                    onClick={() => {
                      updateProfile('username', username);
                      setIsEditingName(false);
                    }}
                    className="text-[#DFDDCE]"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold text-[#DFDDCE]">{username}</h2>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-[#DFDDCE]"
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
              />
              <label
                htmlFor="profile-upload"
                className="cursor-pointer bg-[#DFDDCE] text-[#3D2F2A] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-opacity-90"
              >
                <Upload className="w-4 h-4" />
                Choose File
              </label>
              <button
                onClick={updateProfilePicture}
                className="bg-[#3D2F2A] text-[#DFDDCE] px-4 py-2 rounded-lg hover:bg-opacity-90"
              >
                Update
              </button>
            </div>
          </div>

          {/* Right Column - Profile Info */}
          <div className="space-y-6 mt-16">
            {/* Preferred Genre Box */}
            <div className="bg-[#DFDDCE] p-6 rounded-lg relative">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold text-[#3D2F2A]">Preferred Genre</h3>
                <button
                  onClick={() => {
                    if (isEditingGenre) {
                      updateProfile('pgenre', preferredGenre);
                    }
                    setIsEditingGenre(!isEditingGenre);
                  }}
                  className="bg-[#5A7463] text-[#DFDDCE] px-4 py-1 rounded hover:bg-opacity-90"
                >
                  {isEditingGenre ? 'Done' : 'Edit'}
                </button>
              </div>
              {isEditingGenre ? (
                <input
                  type="text"
                  value={preferredGenre}
                  onChange={(e) => setPreferredGenre(e.target.value)}
                  className="w-full bg-white text-[#3D2F2A] p-3 rounded border border-[#3D2F2A] focus:outline-none focus:ring-2 focus:ring-[#5A7463] text-lg"
                />
              ) : (
                <p className="text-[#3D2F2A] text-lg">{preferredGenre}</p>
              )}
            </div>

            {/* About Me Box */}
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
                  className="bg-[#5A7463] text-[#DFDDCE] px-4 py-1 rounded hover:bg-opacity-90"
                >
                  {isEditingAbout ? 'Done' : 'Edit'}
                </button>
              </div>
              {isEditingAbout ? (
                <textarea
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value)}
                  className="w-full bg-white text-[#3D2F2A] p-3 rounded border border-[#3D2F2A] focus:outline-none focus:ring-2 focus:ring-[#5A7463] text-lg min-h-[120px]"
                />
              ) : (
                <p className="text-[#3D2F2A] text-lg">{aboutMe}</p>
              )}
            </div>

             {/* Advance account setting, delete account*/}
             <div className="px-4 py-2 bg-[#5A7463] text-[#DFDDCE] flex justify-end">
                <button className="px-4 py-1 bg-[#3D2F2A] text-[#DFDDCE] rounded"
                        onClick={() => setDeleteAccount(true)}>Delete Account</button>
              </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
