'use client';

import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/firebase';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  onSnapshot,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  getDoc,
} from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';

interface ClubData {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  imageUrl: string;
  chapters?: { title: string; deadline: string }[];
  creatorId?: string; // Add creatorId to ClubData
  members?: string[]; // Add members array to ClubData
}

interface DiscussionMessage {
  userId: string;
  userName: string;
  id?: string;
  text: string;
  date: {
    seconds: number;
    nanoseconds: number;
  } | null;
}

export default function ClubDetails() {
  const { clubId } = useParams<{ clubId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [club, setClub] = useState<ClubData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [discussionMessages, setDiscussionMessages] = useState<DiscussionMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');

  const [profilePicture, setProfilePicture] = useState('upload-pic.png');
  const [username, setUsername] = useState('username');

  const [friends, setFriends] = useState<string[]>([]); // State to store the user's friends list
  const [selectedFriend, setSelectedFriend] = useState<string>(''); // State to store the selected friend to add

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

  // Fetch discussion messages for the club
  useEffect(() => {
    if (!clubId) return;
    if (!user) return;

    const q = query(collection(db, 'clubs', clubId, 'discussions'), orderBy('date', 'desc'));

    const userDocRef = doc(db, 'profile', user.uid);
    const unsubscribe1 = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setProfilePicture(data.profilePicUrl || 'upload-pic.png');
        setUsername(data.username || 'username');
      }
    });

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DiscussionMessage[];
      setDiscussionMessages(messagesData);
    });

    return () => {
      unsubscribe();
      unsubscribe1();
    };
  }, [clubId, user]);

  // Fetch the user's friends list
  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setFriends(userData.friends || []);
        }
      } catch (err) {
        console.error('Error fetching friends list:', err);
      }
    };

    fetchFriends();
  }, [user]);

  // Function to post a new discussion message
  const handleSubmitMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user || !clubId) {
      alert('You need to be logged in to post a message.');
      return;
    }

    if (newMessage.trim()) {
      try {
        await addDoc(collection(db, 'clubs', clubId, 'discussions'), {
          userId: user.uid,
          userName: user.displayName || 'Anonymous',
          text: newMessage,
          date: serverTimestamp(),
        });
        setNewMessage(''); // Clear the input field
      } catch (error) {
        console.error('Error posting message:', error);
        alert('Failed to post message.');
      }
    }
  };

  // Function to delete the club
  const handleDeleteClub = async () => {
    if (!clubId || !user || club?.creatorId !== user.uid) return;

    try {
      await deleteDoc(doc(db, 'clubs', clubId));
      router.push('/clubs'); // Redirect to the book club page
    } catch (error) {
      console.error('Error deleting club:', error);
      alert('Failed to delete club.');
    }
  };

  // Function to add a friend to the club
  const handleAddFriendToClub = async () => {
    if (!selectedFriend || !clubId || !user) return;

    try {
      const clubDocRef = doc(db, 'clubs', clubId);
      await updateDoc(clubDocRef, {
        members: arrayUnion(selectedFriend),
      });
      alert('Friend added to the club successfully!');
    } catch (error) {
      console.error('Error adding friend to club:', error);
      alert('Failed to add friend to club.');
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
              <h1 className="text-4xl font-bold text-[#3D2F2A]">{club.name}</h1>
              <p className="text-[#3D2F2A] text-lg mt-2">
                Members: {club.memberCount}
              </p>
              {club.creatorId === user?.uid && (
                <button
                  onClick={handleDeleteClub}
                  className="bg-[#CD5C5C] text-white px-4 py-2 rounded-lg mt-2"
                >
                  Delete Club
                </button>
              )}
            </div>

            {/* Add Friend to Club Section */}
            {club.creatorId === user?.uid && (
              <div>
                <h2 className="text-2xl font-semibold text-[#3D2F2A] mb-4">Add Friend to Club</h2>
                <select
                  value={selectedFriend}
                  onChange={(e) => setSelectedFriend(e.target.value)}
                  className="w-full p-2 bg-[#847266] text-[#DFDDCE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D2F2A]"
                >
                  <option value="">Select a friend</option>
                  {friends.map((friendId) => (
                    <option key={friendId} value={friendId}>
                      {friendId}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddFriendToClub}
                  className="bg-[#3D2F2A] text-[#DFDDCE] px-6 py-2 rounded-lg mt-2 hover:bg-[#847266] transition-colors"
                >
                  Add Friend to Club
                </button>
              </div>
            )}

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-[#3D2F2A] mb-4">Description</h2>
              <p className="text-[#3D2F2A] leading-relaxed">{club.description}</p>
            </div>

            {/* Display Chapters */}
            {club.chapters && club.chapters.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-[#3D2F2A] mb-4">Chapters</h2>
                <ul className="space-y-2">
                  {club.chapters.map((chapter, index) => (
                    <li key={index} className="text-[#3D2F2A]">
                      <strong>{chapter.title}</strong> - Due by{' '}
                      {new Date(chapter.deadline).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Discussion Forum */}
            <div className="mt-8">
              <h2 className="text-2xl font-semibold text-[#3D2F2A] mb-4">Discussion Forum</h2>
              <form onSubmit={handleSubmitMessage} className="space-y-4">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full h-32 p-4 bg-[#847266] text-[#DFDDCE] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#3D2F2A]"
                  placeholder="Write your message here..."
                />
                <button
                  type="submit"
                  className="bg-[#3D2F2A] text-[#DFDDCE] px-6 py-2 rounded-lg hover:bg-[#847266] transition-colors"
                >
                  Post Message
                </button>
              </form>

              <div className="mt-8 space-y-4">
                <h3 className="text-xl font-semibold text-[#3D2F2A]">Discussion</h3>
                {discussionMessages.map((message) => (
                  <div key={message.id} className="bg-[#847266] p-6 rounded-lg relative">
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
                            {message.date?.seconds
                              ? new Date(message.date.seconds * 1000).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'Just now'}
                          </span>
                        </div>
                        <p className="text-[#DFDDCE]">{message.text}</p>
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