'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation'; // Import the useRouter hook
import { useEffect, useState } from 'react';
import React from "react";
import Image from "next/image";
import { db } from '@/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";

interface Notification {
  id: string;
  type: string;
  senderId: string;
  senderName: string;
  senderProfilePic: string;
  bookId: string;
  bookTitle: string;
  bookCover: string;
  reviewText: string;
  rating: number;
  date: {
    seconds: number;
    nanoseconds: number;
  };
  read: boolean;
}

const FriendActivityPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [displayCount, setDisplayCount] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mine' | 'friends'>('all');
  const { user } = useAuth();
  const router = useRouter(); // Initialize the useRouter hook

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      // Filter to only review notifications
      const reviewNotifications = notificationsData.filter(notif => notif.type === 'review');
      setNotifications(reviewNotifications);
      
      // Mark all as read
      reviewNotifications.forEach(async (notification) => {
        if (!notification.read) {
          await updateDoc(doc(db, "users", user.uid, "notifications", notification.id), {
            read: true
          });
        }
      });
    });

    return () => unsubscribe();
  }, [user]);

  // Define the handleNotificationClick function
  const handleNotificationClick = (bookId: string) => {
    // Navigate to the book's detail page or perform any other action
    router.push(`/books/${bookId}`);
  };

  // Apply filters based on user selection
  const applyFilters = (notificationsList: Notification[]) => {
    let filtered = notificationsList;
    
    // Apply source filter (mine/friends/all)
    if (filterType === 'mine') {
      filtered = filtered.filter(notif => notif.senderId === user?.uid);
    } else if (filterType === 'friends') {
      filtered = filtered.filter(notif => notif.senderId !== user?.uid);
    }
    
    // Apply search query filter
    return filtered.filter(notification =>
      notification.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.reviewText.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredNotifications = applyFilters(notifications);
  const displayedNotifications = filteredNotifications.slice(0, displayCount);

  // Rest of your component remains the same...

  return (
    <div className="bg-custom-green min-h-screen overflow-y-auto flex flex-col items-center p-6">
      <div className="bg-[#92A48A] rounded-lg w-2/3 p-4">
        <h1 className="text-2xl font-bold text-custom-brown mb-6 text-center">Timeline Activity</h1>
        
        {/* Add filter buttons */}
        <div className="flex justify-center mb-4 space-x-2">
          <button 
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg ${filterType === 'all' ? 'bg-custom-brown text-white' : 'bg-custom-tan text-custom-brown'}`}
          >
            All Reviews
          </button>
          <button 
            onClick={() => setFilterType('mine')}
            className={`px-4 py-2 rounded-lg ${filterType === 'mine' ? 'bg-custom-brown text-white' : 'bg-custom-tan text-custom-brown'}`}
          >
            My Reviews
          </button>
          <button 
            onClick={() => setFilterType('friends')}
            className={`px-4 py-2 rounded-lg ${filterType === 'friends' ? 'bg-custom-brown text-white' : 'bg-custom-tan text-custom-brown'}`}
          >
            Friends Reviews
          </button>
        </div>
        
        {/* Search bar */}
        <div className="flex justify-center">
          <input
            type="text"
            placeholder="Search timeline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-4xl p-2 mb-4 border border-custom-brown rounded-lg text-custom-brown"
          />
        </div>
        {displayedNotifications.length > 0 ? (
          <div className="w-full max-w-4xl mx-auto">
            <div className="space-y-4">
              {displayedNotifications.map((notification) => (
                <div
                key={notification.id}
                className={`text-custom-brown bg-custom-tan p-4 rounded-2xl shadow-md flex items-start space-x-4 cursor-pointer hover:bg-opacity-90 transition-all duration-300 ${
                  filterType === 'all'
                    ? user && notification.senderId === user.uid
                      ? 'ml-[150px]' // Shift user's own reviews 150px to the right
                      : 'mr-[150px]' // Shift friends' reviews 150px to the left
                    : user && notification.senderId === user.uid
                    ? 'ml-auto' // Default behavior for "My Reviews" filter
                    : 'mr-auto' // Default behavior for "Friends Reviews" filter
                }`}
                onClick={() => handleNotificationClick(notification.bookId)}
              >
                {/* Notification content remains the same */}
                <Image
                  src={notification.senderProfilePic || "/dark-user-circle.svg"}
                  alt="User Icon"
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold">{notification.senderName}</h3>
                  <p className="text-custom-brown font-medium">
                    {user && notification.senderId === user.uid ? 'You' : notification.senderName} reviewed <span className="italic">{notification.bookTitle}</span> {" "}
                    and rated it {notification.rating} stars
                  </p>
                  <p className="text-custom-brown mt-1">{notification.reviewText}</p>
                  <p className="text-xs text-custom-brown opacity-70 mt-2">
                    {notification.date?.seconds 
                      ? new Date(notification.date.seconds * 1000).toLocaleDateString("en-US", { 
                          month: "short", 
                          day: "numeric", 
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })
                      : "Just now"}
                  </p>
                </div>
                <Image
                  src={notification.bookCover || "/placeholder.png"}
                  alt={notification.bookTitle}
                  width={64}
                  height={80}
                  className="w-16 h-20 object-cover rounded-lg"
                />
              </div>
              ))}
            </div>
            {/* Center the "Show More" and "Show Less" buttons with spacing */}
            {filteredNotifications.length > displayCount && (
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={() => setDisplayCount(prev => prev + 5)}
                  className="w-full max-w-4xl p-2 bg-custom-brown text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  Show More
                </button>
                <button
                  onClick={() => setDisplayCount(5)} // Reset displayCount to the initial value (5)
                  className="w-full max-w-4xl p-2 bg-custom-brown text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  Show Less
                </button>
              </div>
            )}

          </div>
        ) : (
          <div className="text-center text-custom-brown mt-8 p-6 bg-custom-tan rounded-lg">
            <h2 className="text-xl font-medium mb-2">No activity yet</h2>
            <p>When you or your friends review books, the activity will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendActivityPage;