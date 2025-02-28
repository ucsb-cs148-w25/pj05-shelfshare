'use client';

import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/firebase';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { useParams } from 'next/navigation';

interface ProfileItem {
  email: string;
  aboutMe: string;
  pgenre: string;
  profilePicUrl: string;
  uid: string;
  username: string;
}

interface ClubData {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  imageUrl: string;
  ownerId: string;
}

interface Review {
  userId: string;
  userName: string;
  id?: string;
  text: string;
  rating: number;
  date: {
    seconds: number;
    nanoseconds: number;
  } | null; // Firestore timestamp type
}

export default function ClubDetails() {
  const { clubId } = useParams<{ clubId: string }>();
  const { user } = useAuth();

  const [club, setClub] = useState<ClubData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState<string>('');
  const [userRating, setUserRating] = useState<number>(0);

  const [profilePicture, setProfilePicture] = useState('upload-pic.png');
  const [username, setUsername] = useState('username');
  const [creator, setCreator] = useState<ClubData | null>(null);

  // Fetch club details from Firestore
  useEffect(() => {
    if (!clubId) return;
  
    const fetchClubDetails = async () => {
      try {
        const clubDocRef = doc(db, 'clubs', clubId);
        const unsubscribe = onSnapshot(clubDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const clubData = docSnapshot.data() as ClubData;
            setClub({ ...clubData, id: docSnapshot.id });
  
            // Fetch the creator's profile
            const creatorId = clubData.ownerId; 
            if (creatorId) {
              const creatorDocRef = doc(db, 'profile', creatorId);
              getDoc(creatorDocRef).then((creatorDoc) => {
                if (creatorDoc.exists()) {
                  const creatorData = creatorDoc.data() as ClubData;
                  setCreator(creatorData);
                }
              });
            }
          } else {
            setError('Club not found.');
          }
          setLoading(false);
        });
  
        return () => unsubscribe();
      } catch (err) {
        console.error('Error fetching club details:', err);
        setError('Failed to fetch club details.');
        setLoading(false);
      }
    };
  
    fetchClubDetails();
  }, [clubId]);

  // Fetch reviews for the club
  useEffect(() => {
    if (!clubId) return;
    if (!user) return;

    const q = query(collection(db, 'clubs', clubId, 'reviews'), orderBy('date', 'desc'));

    const userDocRef = doc(db, 'profile', user.uid);
    const unsubscribe1 = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const profileItem: ProfileItem = {
          email: data.email || 'email@shelfshare.com',
          aboutMe: data.aboutMe || 'Write about yourself!',
          pgenre: data.pgenre || '#fantasy#romance#mystery',
          profilePicUrl: data.profilePicUrl || '',
          uid: data.uid,
          username: data.username || 'username',
        };

        setProfilePicture(profileItem.profilePicUrl);
        setUsername(profileItem.username);
      }
    });

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];
      setReviews(reviewsData);
    });

    return () => {
      unsubscribe();
      unsubscribe1();
    };
  }, [clubId, user]);

  const handleJoinClub = async () => {
    if (!user) {
      alert('You need to be logged in to join the club.');
      return;
    }

    try {
      const clubDocRef = doc(db, 'clubs', clubId);
      const memberRef = doc(db, 'clubs', clubId, 'members', user.uid);

      // Check if the user is already a member
      const memberDoc = await getDoc(memberRef);
      if (memberDoc.exists()) {
        alert('You are already a member of this club.');
        return;
      }

      // Add the user to the members subcollection
      await setDoc(memberRef, {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        joinedAt: serverTimestamp(),
      });

      // Update the member count
      await updateDoc(clubDocRef, {
        memberCount: increment(1),
      });

      alert('You have successfully joined the club!');
    } catch (error) {
      console.error('Error joining club: ', error);
      alert('Failed to join the club.');
    }
  };

  interface StarRatingProps {
    rating: number;
    maxStars?: number;
    isInput?: boolean;
  }

  const StarRating: React.FC<StarRatingProps> = ({ rating, maxStars = 5, isInput = false }) => {
    return (
      <div className="flex space-x-1">
        {[...Array(maxStars)].map((_, index) => (
          <div
            key={index}
            className="relative"
            onClick={() => isInput && setUserRating(index + 1)}
            onMouseMove={(e) => {
              if (isInput) {
                const rect = e.currentTarget.getBoundingClientRect();
                const halfPoint = rect.left + rect.width / 2;
                if (e.clientX < halfPoint) {
                  setUserRating(index + 0.5);
                } else {
                  setUserRating(index + 1);
                }
              }
            }}
          >
            <span
              className={`text-2xl ${isInput ? 'cursor-pointer' : 'cursor-default'} ${
                index + 1 <= rating
                  ? 'text-[#3D2F2A]'
                  : index + 0.5 === rating
                  ? "relative overflow-hidden inline before:content-['★'] before:absolute before:text-[#3D2F2A] before:overflow-hidden before:w-[50%] text-[#DFDDCE]"
                  : 'text-[#DFDDCE]'
              }`}
            >
              ★
            </span>
          </div>
        ))}
      </div>
    );
  };

  const handleSubmitReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      alert('You need to be logged in to submit a review.');
      return;
    }

    if (newReview.trim() && userRating > 0) {
      const reviewData = {
        userId: user.uid || 'Unknown User',
        userName: user.displayName || 'Anonymous',
        text: newReview,
        rating: userRating,
        date: serverTimestamp(),
      };
      try {
        await addDoc(collection(db, 'clubs', clubId, 'reviews'), reviewData);
        setNewReview('');
        setUserRating(0);
      } catch (error) {
        console.error('Error adding review: ', error);
        alert('Failed to submit review.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Error: {error || 'Club not found.'}</p>
      </div>
    );
  }

  return (
    <div className="bg-[#5A7463] min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-4xl bg-[#92A48A] rounded-lg shadow-xl p-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-shrink-0">
            <div className="w-64 h-64 bg-[#3D2F2A] rounded-lg shadow-lg overflow-hidden flex items-center justify-center">
              <Image
                src={club.imageUrl || '/bookclub.png'}
                alt={club.name}
                width={256}
                height={256}
                className="object-cover"
              />
            </div>
          </div>
  
          <div className="flex-grow space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-[#DFDDCE]">{club.name}</h1>
              {/* Display the creator's username */}
              {creator && (
                <p className="text-[#DFDDCE] text-lg mt-2">
                  Created by: {creator.ownerId}
                </p>
              )}
              <p className="text-[#DFDDCE] text-lg mt-2">
                Members: {club.memberCount}
              </p>
              <button
                onClick={handleJoinClub}
                className="bg-[#3D2F2A] text-[#DFDDCE] px-6 py-2 rounded-lg hover:bg-[#847266] transition-colors mt-4"
              >
                Join Club
              </button>
            </div>
  
            <div className="space-y-4">
              <p className="text-[#DFDDCE] leading-relaxed">{club.description}</p>
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-semibold text-[#DFDDCE] mb-4">Leave A Review:</h2>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="mb-4">
                  <p className="text-[#DFDDCE] mb-2">Your Rating:</p>
                  <StarRating rating={userRating} isInput={true} />
                </div>
                <textarea
                  value={newReview}
                  onChange={(e) => setNewReview(e.target.value)}
                  className="w-full h-32 p-4 bg-[#847266] text-[#DFDDCE] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#3D2F2A]"
                  placeholder="Write your review here..."
                />
                <button
                  type="submit"
                  className="bg-[#3D2F2A] text-[#DFDDCE] px-6 py-2 rounded-lg hover:bg-[#847266] transition-colors"
                >
                  Post Review
                </button>
              </form>

              <div className="mt-8 space-y-4">
                <h3 className="text-xl font-semibold text-[#DFDDCE]">Reviews</h3>
                {reviews.map((review) => (
                  <div key={review.id} className="bg-[#847266] p-6 rounded-lg relative">
                    <div className="flex items-start space-x-4">
                      <Image
                        src={profilePicture}
                        alt="Profile"
                        width={24}
                        height={24}
                        className="w-12 h-12 rounded-full flex-shrink-0"
                      />
                      <div className="flex-grow">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-[#DFDDCE]">
                              {username}
                            </span>
                          </div>
                          <span className="text-sm text-[#DFDDCE]">
                            {review.date?.seconds
                              ? new Date(review.date.seconds * 1000).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'Just now'}
                          </span>
                        </div>
                        <div className="mb-2">
                          <StarRating rating={review.rating} />
                        </div>
                        <p className="text-[#DFDDCE]">{review.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}