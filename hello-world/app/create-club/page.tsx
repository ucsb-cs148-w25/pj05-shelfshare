'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { db, storage } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/app/context/AuthContext';

export default function CreateClub() {
  const router = useRouter();
  const { user } = useAuth(); // Get the current user
  const [clubName, setClubName] = useState<string>('');
  const [clubDescription, setClubDescription] = useState<string>('');
  const [clubImage, setClubImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setClubImage(file);
      setPreviewImage(URL.createObjectURL(file)); // Generate a preview URL
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
  
    try {
      let imageUrl = '/bookclub.png'; // Default image URL
  
      // Upload custom image to Firebase Storage if provided
      if (clubImage) {
        const storageRef = ref(storage, `club-images/${clubImage.name}`);
        await uploadBytes(storageRef, clubImage);
        imageUrl = await getDownloadURL(storageRef);
      }
  
      // Save club data to Firestore
      const clubData = {
        name: clubName,
        description: clubDescription,
        memberCount: 1,
        imageUrl: imageUrl,
        ownerId: user?.uid, 
      };
  
      const docRef = await addDoc(collection(db, 'clubs'), clubData);
      console.log('Club created with ID:', docRef.id);
  
      // Redirect to the specific club's page
      router.push(`/clubs/${docRef.id}`);
    } catch (error) {
      console.error('Error creating club:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#5A7463] min-h-screen p-8 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-[#DFDDCE] p-6 rounded-lg shadow-lg w-full max-w-md"
      >
        <h2 className="text-2xl font-bold text-[#3D2F2A] mb-4">Create a Book Club</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-lg font-bold text-[#3D2F2A]">Club Name</label>
            <input
              type="text"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[#92A48A] text-[#3D2F2A]"
              required
            />
          </div>
          <div>
            <label className="block text-lg font-bold text-[#3D2F2A]">Description</label>
            <textarea
              value={clubDescription}
              onChange={(e) => setClubDescription(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[#92A48A] text-[#3D2F2A]"
              required
            />
          </div>
          <div>
            <label className="block text-lg font-bold text-[#3D2F2A]">Club Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full px-4 py-2 rounded-lg bg-[#92A48A] text-[#3D2F2A]"
            />
            {previewImage && (
              <div className="mt-4">
                <img
                  src={previewImage}
                  alt="Club Preview"
                  className="w-32 h-32 object-cover rounded-lg"
                />
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg bg-[#3D2F2A] text-[#DFDDCE] font-bold"
          >
            {loading ? 'Creating...' : 'Create Club'}
          </button>
        </div>
      </form>
    </div>
  );
}