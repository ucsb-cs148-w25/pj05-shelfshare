'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { db } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
// import { uploadBytes } from 'firebase/storage';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuth } from '@/app/context/AuthContext'; // Import useAuth

interface Chapter {
  title: string;
  deadline: string; // ISO string format
}

export default function CreateClub() {
  const router = useRouter();
  const { user } = useAuth(); // Get the current user
  const [clubName, setClubName] = useState<string>('');
  const [clubDescription, setClubDescription] = useState<string>('');
  // const [clubImage, setClubImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>("/bookclub.png");
  const [loading, setLoading] = useState<boolean>(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [newChapterTitle, setNewChapterTitle] = useState<string>('');
  const [newChapterDeadline, setNewChapterDeadline] = useState<Date | null>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      // setClubImage(file);
      // setPreviewImage(URL.createObjectURL(file)); // Generate a preview URL
      return;
    }
    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewImage(localPreviewUrl);

    const base64Image = await convertToBase64(file);
    setPreviewImage(base64Image);
    URL.revokeObjectURL(localPreviewUrl);

  };

  const handleAddChapter = () => {
    if (newChapterTitle && newChapterDeadline) {
      setChapters([
        ...chapters,
        {
          title: newChapterTitle,
          deadline: newChapterDeadline.toISOString(),
        },
      ]);
      setNewChapterTitle('');
      setNewChapterDeadline(null);
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
        const imageUrl = '/bookclub.png'; // Default image URL

        // Upload custom image to Firebase Storage if provided
        // if (clubImage) {
        //     console.log("Uploading image:", clubImage.name);
        //     const storageRef = ref(storage, `club-images/${clubImage.name}`);
        //     await uploadBytes(storageRef, clubImage);
        //     console.log("Image uploaded successfully");

        //     imageUrl = await getDownloadURL(storageRef);
        //     console.log("Generated Image URL:", imageUrl);
        // }

        // // Ensure image URL is valid before saving to Firestore
        // if (!imageUrl) {
        //     console.error("Image upload failed, URL is undefined");
        //     return;
        // }

        // Save club data to Firestore
        const clubData = {
            name: clubName,
            description: clubDescription,
            memberCount: 1, // Default member count
            imageUrl: previewImage || imageUrl, // Use uploaded image or default
            chapters: chapters, // Include chapters with deadlines
            creatorId: user?.uid, // Store the creator's UID
        };

        console.log("Saving club to Firestore...");
        const docRef = await addDoc(collection(db, 'clubs'), clubData);
        console.log("Club created with ID:", docRef.id);

        // Redirect to the specific club's page
        router.push(`/clubs/${docRef.id}`);
    } catch (error) {
        console.error("Error creating club:", error);
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
          <div>
            <label className="block text-lg font-bold text-[#3D2F2A]">Add Chapters</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                placeholder="Chapter Title"
                className="w-full px-4 py-2 rounded-lg bg-[#92A48A] text-[#3D2F2A] placeholder:text-[#3D2F2A]/55"
              />
              <DatePicker
                selected={newChapterDeadline}
                onChange={(date: Date | null) => setNewChapterDeadline(date)}
                placeholderText="Deadline"
                className="w-full px-4 py-2 rounded-lg bg-[#92A48A] text-[#3D2F2A] placeholder:text-[#3D2F2A]/55"
                dateFormat="yyyy/MM/dd"
              />
              <button
                type="button"
                onClick={handleAddChapter}
                className="bg-[#3D2F2A] text-[#DFDDCE] px-4 py-2 rounded-lg"
              >
                Add
              </button>
            </div>
            <ul className="mt-2">
              {chapters.map((chapter, index) => (
                <li key={index} className="text-[#3D2F2A]">
                  <strong>{chapter.title}</strong> - Due by{' '}
                  {new Date(chapter.deadline).toLocaleDateString()}
                </li>
              ))}
            </ul>
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