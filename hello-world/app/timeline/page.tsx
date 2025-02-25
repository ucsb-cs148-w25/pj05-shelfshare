'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
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

interface Review {
  id: number;
  name: string;
  text: string;
  bookImage: string;
}


const ReviewsPage: React.FC = () => {
  const staticReviews: any[] | (() => Review[]) = [
    
    
  ];

  const [reviews, setReviews] = useState<Review[]>(staticReviews);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newPost, setNewPost] = useState<string>("");
  const { user } = useAuth();
  const router = useRouter();

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
      
      // Filter to only show review notifications
      const reviewNotifications = notificationsData.filter(notif => notif.type === 'review');
      setNotifications(reviewNotifications);
      
      // Mark notifications as read
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

  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  const handleSubmitPost = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPost.trim()) {
      // Here you could implement posting functionality
      setNewPost("");
    }
  };

  // Navigate to book page when clicking on a notification
  const handleNotificationClick = (bookId: string) => {
    router.push(`/books/${bookId}`);
  };

  if (!user) {
    return null; // Avoid rendering anything while redirecting
  }

  return (
    <div className="bg-custom-green min-h-screen overflow-y-auto flex flex-col items-center p-6">
      {/* Friend Review Notifications */}
      {notifications.length > 0 && (
        <div className="w-full max-w-2xl mb-6">
          <h2 className="text-xl font-semibold text-custom-brown mb-3">Friend Activity</h2>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="text-custom-brown bg-custom-tan p-4 rounded-2xl shadow-md flex items-start space-x-4 cursor-pointer hover:bg-opacity-90 transition-colors"
                onClick={() => handleNotificationClick(notification.bookId)}
              >
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
                    Reviewed <span className="italic">{notification.bookTitle}</span> {" "}
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
        </div>
      )}

      

      
    </div>
  );
};

export default ReviewsPage;