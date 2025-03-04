'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { db } from "@/firebase";
import { doc, onSnapshot, collection, query, Timestamp } from "firebase/firestore";
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';

interface BookItem {
  id: string;
  bookId: string;
  title: string;
  author: string;
  coverUrl: string;
  dateAdded: Timestamp | Date;
}

// Component to handle the loading state
const LoadingState = () => (
  <div className="min-h-screen bg-[#5A7463] p-8 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#DFDDCE]"></div>
  </div>
);

// Main content component separated to use with Suspense
function ProfileContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const friendUid = searchParams.get('id');
  
  const [profilePicture, setProfilePicture] = useState("https://via.placeholder.com/150");
  const [username, setUsername] = useState("username");
  const [genres, setGenres] = useState<string[]>([]);
  const [aboutMe, setAboutMe] = useState("No information available");
  const [favoriteBooks, setFavoriteBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Redirect to login page if user is not authenticated
  // Fetch user profile data
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    if (!friendUid) {
      setError("Friend ID not provided");
      return;
    }

    const userDocRef = doc(db, "profile", friendUid);
    
    // Set up listener for profile changes
    const unsubscribe = onSnapshot(userDocRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          console.log("Friend profile data:", data);
          
          setProfilePicture(data.profilePicUrl || "https://via.placeholder.com/150");
          setUsername(data.username || "username");
          setAboutMe(data.aboutMe || "No information available");
          
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
          
          setLoading(false);
        } else {
          setError("Friend profile not found");
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error in profile snapshot listener:", err);
        setError("Failed to load friend profile");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, router, friendUid]);
  
  // Fetch friend's favorite books
  useEffect(() => {
    if (!user || !friendUid) return;

    const favoritesQuery = query(collection(db, "users", friendUid, "favorites"));
    
    const unsubscribeFavorites = onSnapshot(favoritesQuery, (snapshot) => {
      const favoritesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dateAdded: doc.data().dateAdded instanceof Timestamp ? doc.data().dateAdded : new Date()
      })) as BookItem[];
      
      console.log("Friend favorites data:", favoritesData);
      setFavoriteBooks(favoritesData);
    }, (error) => {
      console.error("Error fetching favorites:", error);
    });

    return () => unsubscribeFavorites();
  }, [user, friendUid]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#5A7463] p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <Link href="/friends">
            <button className="bg-[#DFDDCE] text-[#3D2F2A] px-4 py-2 rounded-lg flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Friends
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#5A7463] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Navigation */}
        <div className="mb-6">
          <Link href="/friends">
            <button className="bg-[#DFDDCE] text-[#3D2F2A] px-4 py-2 rounded-lg flex items-center hover:bg-opacity-90">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Friends
            </button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-8">
          {/* Left Column - Profile Picture & Name */}
          <div className="flex flex-col items-center">
            <h1 className="text-[#DFDDCE] text-3xl font-bold mb-6">{username}&apos;s Profile</h1>
            
            <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-[#DFDDCE] mb-4">
              <Image
                src={profilePicture}
                alt="Profile"
                width={192}
                height={192}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-[#DFDDCE]">{username}</h2>
            </div>
          </div>

          {/* Right Column - Profile Info */}
          <div className="space-y-6 mt-16">
            {/* About Me Box */}
            <div className="bg-[#DFDDCE] p-6 rounded-lg">
              <h3 className="text-2xl font-semibold text-[#3D2F2A] mb-4">About Me</h3>
              <p className="text-[#3D2F2A] text-lg">{aboutMe}</p>
            </div>

            {/* Preferred Genre Box */}
            <div className="bg-[#DFDDCE] p-6 rounded-lg">
              <h3 className="text-2xl font-semibold text-[#3D2F2A] mb-4">Preferred Genres</h3>
              
              <div className="flex flex-wrap gap-2">
                {genres.length > 0 ? (
                  genres.map((genre, index) => (
                    <div key={index} className="bg-[#847266] text-[#DFDDCE] px-4 py-2 rounded-[8px] font-medium">
                      {genre}
                    </div>
                  ))
                ) : (
                  <p className="text-[#3D2F2A] text-lg italic">No genres specified</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Favorites Shelf */}
        <div className="mt-12">
          <h2 className="text-[#DFDDCE] text-2xl font-bold mb-4 flex items-center">
            Favorites ❤️
          </h2>
          <div className="relative bg-[#847266] border-t-8 border-b-8 border-[#3D2F2A] h-44 flex items-center">
            <div className="flex space-x-4 overflow-x-auto px-4 w-full">
              {favoriteBooks.length > 0 ? (
                favoriteBooks.map((book) => (
                  <div
                    key={`favorites-${book.id}`}
                    className="flex-shrink-0 cursor-pointer relative group"
                    onClick={() => router.push(`/books/${book.bookId}`)}
                  >
                    <Image
                      src={book.coverUrl}
                      alt={book.title}
                      width={128}
                      height={144}
                      className="w-32 h-36 rounded-lg object-cover bg-[#3D2F2A]"
                    />
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center w-full h-full text-[#DFDDCE] text-lg italic">
                  No favorite books yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense
const FriendProfile = () => {
  return (
    <Suspense fallback={<LoadingState />}>
      <ProfileContent />
    </Suspense>
  );
};

export default FriendProfile;