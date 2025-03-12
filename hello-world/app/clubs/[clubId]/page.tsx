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
  creatorId?: string; 
  members?: string[];
  book?: {
    key: string;
    title: string;
    author: string;
    coverId?: number;
  };
  previousBooks?: {
    key: string;
    title: string;
    author: string;
    coverId?: number;
    completedDate?: string; // Date when the book was completed
  }[];
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

interface FriendData {
  id: string;
  username: string;
  profilePicUrl?: string;
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

  const [friends, setFriends] = useState<FriendData[]>([]); // Store friend data objects
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  const [inviteLoading, setInviteLoading] = useState<boolean>(false);
  const [inviteSuccess, setInviteSuccess] = useState<boolean>(false);

  const [isSearchingNewBook, setIsSearchingNewBook] = useState<boolean>(false);

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

  // Fetch the user's friends list with profile data
  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      try {
        // Get user's friend IDs
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const friendIds = userData.friends || [];
          
          // If club members exist, filter out friends who are already members
          const currentMembers = club?.members || [];
          const nonMemberFriendIds = friendIds.filter(id => !currentMembers.includes(id));
          
          // Fetch friend profile data
          const friendsData: FriendData[] = [];
          
          for (const friendId of nonMemberFriendIds) {
            const profileRef = doc(db, 'profile', friendId);
            const profileDoc = await getDoc(profileRef);
            
            if (profileDoc.exists()) {
              const profileData = profileDoc.data();
              friendsData.push({
                id: friendId,
                username: profileData.username || 'Unknown User',
                profilePicUrl: profileData.profilePicUrl || 'upload-pic.png'
              });
            }
          }
          
          setFriends(friendsData);
        }
      } catch (err) {
        console.error('Error fetching friends list:', err);
      }
    };

    fetchFriends();
  }, [user, club?.members]);

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

  // Assuming you have a function to handle book selection
  const handleBookSelection = async (book: any) => {
    if (!clubId || !user || club?.creatorId !== user.uid) return;

    try {
      const clubDocRef = doc(db, 'clubs', clubId);
      await updateDoc(clubDocRef, {
        book: {
          key: book.key,
          title: book.title,
          author: book.author_name?.join(', ') || 'Unknown author',
          coverId: book.cover_i
        }
      });
      setIsSearchingNewBook(false); // Reset searching state
      alert('New book selected successfully!');
    } catch (error) {
      console.error('Error selecting new book:', error);
      alert('Failed to select new book.');
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

  // Function to invite a friend to the club
  const handleInviteFriend = async () => {
    if (!selectedFriend || !clubId || !user || !club) {
      return;
    }

    setInviteLoading(true);
    setInviteSuccess(false);

    try {
      // Create a notification in the friend's notifications collection
      const friendNotificationsRef = collection(db, 'users', selectedFriend, 'notifications');
      await addDoc(friendNotificationsRef, {
        type: 'club_invitation',
        clubId: clubId,
        clubName: club.name,
        senderId: user.uid,
        senderName: username || user.displayName || 'A friend',
        status: 'pending',
        createdAt: serverTimestamp(),
        read: false
      });

      setInviteSuccess(true);
      setSelectedFriend('');
      
      // Wait 3 seconds and reset success message
      setTimeout(() => {
        setInviteSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error inviting friend to club:', error);
      alert('Failed to send invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  // Function to accept invitation and add member to club
  /* 
  const handleAddMemberToClub = async (memberId: string) => {
    if (!clubId || !club) return;

    try {
      // Update club document to add the member
      const clubDocRef = doc(db, 'clubs', clubId);
      
      // Create a new members array if it doesn't exist
      const updatedMembers = club.members ? [...club.members, memberId] : [memberId];
      
      await updateDoc(clubDocRef, {
        members: updatedMembers,
        memberCount: (club.memberCount || 0) + 1
      });
      
      // Could add logic here to track that the invitation was accepted
    } catch (error) {
      console.error('Error adding member to club:', error);
      alert('Failed to add member to club.');
    }
  };
  */

  // Function to navigate to book page
  const handleBookClick = (bookKey: string) => {
    const bookId = bookKey.split('/').pop();
    router.push(`/books/${bookId}`);
  };

  // Function to move current book to previous books
  const handleMarkBookAsRead = async () => {
    if (!clubId || !user || club?.creatorId !== user.uid || !club?.book) return;
  
    try {
      const clubDocRef = doc(db, 'clubs', clubId);
      const currentBook = club.book;
      const currentDate = new Date().toISOString();
      
      // Add current book to previous books with completed date
      const previousBook = {
        ...currentBook,
        completedDate: currentDate
      };
      
      // Create new previousBooks array if it doesn't exist
      const previousBooks = club.previousBooks || [];
      
      await updateDoc(clubDocRef, {
        previousBooks: [...previousBooks, previousBook],
        book: null // Clear current book
      });
      
      setIsSearchingNewBook(true); // Set searching state to true
      alert('Book marked as read and moved to previous books!');
    } catch (error) {
      console.error('Error marking book as read:', error);
      alert('Failed to mark book as read.');
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
            
            {/* Book Display Section */}
            {club.book ? (
              <div className="mt-6 p-4 bg-[#847266] rounded-lg shadow-lg">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-[#DFDDCE] mb-3">
                    Current Book
                  </h2>
                  {club.creatorId === user?.uid && (
                    <button
                      onClick={handleMarkBookAsRead}
                      className="text-sm bg-[#3D2F2A] text-[#DFDDCE] px-2 py-1 rounded hover:bg-[#5A7463] transition-colors"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
                <div 
                  className="flex items-center cursor-pointer hover:bg-[#3D2F2A]/30 p-2 rounded-lg transition-colors"
                  onClick={() => handleBookClick(club.book!.key)}
                >
                  {club.book.coverId ? (
                    <img
                      src={`https://covers.openlibrary.org/b/id/${club.book.coverId}-M.jpg`}
                      alt={club.book.title}
                      className="w-16 h-20 object-cover rounded shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-20 bg-[#3D2F2A] flex items-center justify-center text-[#DFDDCE] rounded shadow-md">
                      No Cover
                    </div>
                  )}
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-[#DFDDCE] hover:underline">
                      {club.book.title}
                    </h3>
                    <p className="text-[#DFDDCE]/80">
                      {club.book.author || 'Unknown author'}
                    </p>
                    <span className="text-sm text-[#DFDDCE]/60 mt-1 block">
                      Click to view book details
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-4 bg-[#847266] rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-[#DFDDCE] mb-3">
                  Current Book
                </h2>
                <p className="text-[#DFDDCE]">No book selected for this club yet</p>
                <button
                  onClick={() => router.push('/books')}
                  className="mt-2 bg-[#3D2F2A] text-[#DFDDCE] px-4 py-2 rounded-lg hover:bg-[#5A7463] transition-colors"
                >
                  Search for a New Book
                </button>
              </div>
            )}

            {isSearchingNewBook && (
              <div className="mt-6 p-4 bg-[#847266] rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-[#DFDDCE] mb-3">
                  Search for a New Book
                </h2>
                <p className="text-[#DFDDCE]">You've finished reading the current book. Start searching for a new one!</p>
                <button
                  onClick={() => router.push('/books')}
                  className="mt-2 bg-[#3D2F2A] text-[#DFDDCE] px-4 py-2 rounded-lg hover:bg-[#5A7463] transition-colors"
                >
                  Search for a New Book
                </button>
              </div>
            )}
            
            {/* Previously Read Books Section */}
            {club.previousBooks && club.previousBooks.length > 0 && (
              <div className="mt-6 p-4 bg-[#847266] rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-[#DFDDCE] mb-3">
                  Previously Read Books
                </h2>
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {club.previousBooks.map((book, index) => (
                    <div 
                      key={index}
                      className="flex items-center cursor-pointer hover:bg-[#3D2F2A]/30 p-2 rounded-lg transition-colors"
                      onClick={() => handleBookClick(book.key)}
                    >
                      {book.coverId ? (
                        <img
                          src={`https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`}
                          alt={book.title}
                          className="w-12 h-16 object-cover rounded shadow-md"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-[#3D2F2A] flex items-center justify-center text-[#DFDDCE] rounded shadow-md text-xs">
                          No Cover
                        </div>
                      )}
                      <div className="ml-3">
                        <h3 className="text-md font-semibold text-[#DFDDCE] hover:underline">
                          {book.title}
                        </h3>
                        <p className="text-sm text-[#DFDDCE]/80">
                          {book.author || 'Unknown author'}
                        </p>
                        {book.completedDate && (
                          <span className="text-xs text-[#DFDDCE]/60">
                            Completed: {new Date(book.completedDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

            {/* Invite Friend to Club Section */}
            {club.creatorId === user?.uid && (
              <div className="p-4 bg-[#DFDDCE]/20 rounded-lg">
                <h2 className="text-2xl font-semibold text-[#3D2F2A] mb-4">Invite Friend to Club</h2>
                
                {friends.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      <label htmlFor="friend-select" className="block text-[#3D2F2A] font-medium">
                        Select a friend to invite:
                      </label>
                      <select
                        id="friend-select"
                        value={selectedFriend}
                        onChange={(e) => setSelectedFriend(e.target.value)}
                        className="w-full p-3 bg-[#847266] text-[#DFDDCE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D2F2A]"
                      >
                        <option value="">Choose a friend</option>
                        {friends.map((friend) => (
                          <option key={friend.id} value={friend.id}>
                            {friend.username}
                          </option>
                        ))}
                      </select>
                      
                      {inviteSuccess && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mt-4">
                          Invitation sent successfully!
                        </div>
                      )}
                      
                      <button
                        onClick={handleInviteFriend}
                        disabled={!selectedFriend || inviteLoading}
                        className={`w-full bg-[#3D2F2A] text-[#DFDDCE] px-6 py-3 rounded-lg mt-2 hover:bg-[#847266] transition-colors ${
                          !selectedFriend || inviteLoading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {inviteLoading ? 'Sending...' : 'Send Invitation'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bg-[#847266] p-4 rounded-lg text-[#DFDDCE]">
                    <p>You don't have any friends to invite, or all your friends are already members.</p>
                    <button
                      onClick={() => router.push('/friends')}
                      className="mt-3 bg-[#3D2F2A] text-[#DFDDCE] px-4 py-2 rounded-lg hover:bg-[#5A7463] transition-colors"
                    >
                      Go to Friends Page
                    </button>
                  </div>
                )}
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
                {discussionMessages.length > 0 ? (
                  discussionMessages.map((message) => (
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
                  ))
                ) : (
                  <p className="text-[#3D2F2A] italic">No messages yet. Be the first to start the discussion!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}