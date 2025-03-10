import React, { useState, useEffect, useRef } from 'react';
import { db } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from '@/app/context/AuthContext';
import Image from 'next/image';
import { ChevronDown, ChevronUp } from 'lucide-react';

type ShelfActivityType = 'favorite' | 'currently-reading' | 'want-to-read' | 'finished' | 'stopped-reading';

interface FriendActivity {
  friendId: string;
  friendName: string;
  profilePicUrl: string;
  activityType: ShelfActivityType;
  date: Date;
}

interface FriendActivityProps {
  bookId: string;
}

const FriendActivity: React.FC<FriendActivityProps> = ({ bookId }) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<FriendActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const activitiesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFriendActivity = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get user's friends
        const friendsQuery = query(collection(db, "users", user.uid, "friends"));
        const friendsSnapshot = await getDocs(friendsQuery);
        const friendIds = friendsSnapshot.docs.map(doc => doc.id);

        if (friendIds.length === 0) {
          setLoading(false);
          return;
        }

        const allActivities: FriendActivity[] = [];

        // For each friend, check various collections
        for (const friendId of friendIds) {
          // Get friend's profile for name and picture
          const profileDoc = await getDocs(query(
            collection(db, "profile"),
            where("uid", "==", friendId)
          ));
          
          const profileData = profileDoc.docs[0]?.data();
          const friendName = profileData?.username || "Unknown User";
          const profilePicUrl = profileData?.profilePicUrl || "/upload-pic.png";

          // Check favorites
          const favoritesQuery = query(
            collection(db, "users", friendId, "favorites"),
            where("bookId", "==", bookId)
          );
          const favoritesSnapshot = await getDocs(favoritesQuery);
          
          if (!favoritesSnapshot.empty) {
            const favoriteData = favoritesSnapshot.docs[0].data();
            allActivities.push({
              friendId,
              friendName,
              profilePicUrl,
              activityType: 'favorite',
              date: favoriteData.dateAdded?.toDate() || new Date(),
            });
          }

          // Check regular shelves (currently-reading, want-to-read, finished, stopped-reading)
          const shelvesQuery = query(
            collection(db, "users", friendId, "shelves"),
            where("bookId", "==", bookId)
          );
          const shelvesSnapshot = await getDocs(shelvesQuery);
          
          if (!shelvesSnapshot.empty) {
            const shelfData = shelvesSnapshot.docs[0].data();
            // Only include default shelf types, explicitly filtering out custom shelves
            const validShelfTypes = ['favorite', 'currently-reading', 'want-to-read', 'finished', 'stopped-reading'] as const;
            type ValidShelfType = typeof validShelfTypes[number];
            
            if (validShelfTypes.includes(shelfData.shelfType as ValidShelfType)) {
              allActivities.push({
                friendId,
                friendName,
                profilePicUrl,
                activityType: shelfData.shelfType as 'favorite' | 'currently-reading' | 'want-to-read' | 'finished' | 'stopped-reading',
                date: shelfData.dateAdded?.toDate() || new Date(),
              });
            }
          }
        }

        // Sort activities by date (most recent first)
        allActivities.sort((a, b) => b.date.getTime() - a.date.getTime());
        setActivities(allActivities);
      } catch (error) {
        console.error("Error fetching friend activity:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriendActivity();
  }, [user, bookId]);

  useEffect(() => {
    // Add custom scrollbar styles for webkit browsers
    if (activitiesContainerRef.current) {
      const style = document.createElement('style');
      style.textContent = `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #847266;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #3D2F2A;
          border-radius: 3px;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  if (loading) {
    return <div className="mt-6 text-[#DFDDCE]">Loading friend activity...</div>;
  }

  if (activities.length === 0) {
    return null; // Don't show anything if there's no friend activity
  }

  const getActivityText = (activity: FriendActivity) => {
    switch (activity.activityType) {
      case 'favorite':
        return <span>favorited this book</span>;
      case 'currently-reading':
        return <span>is currently reading this book</span>;
      case 'want-to-read':
        return <span>wants to read this book</span>;
      case 'finished':
        return <span>has read this book</span>;
      case 'stopped-reading':
        return <span>dropped this book</span>;
      default:
        return <span>has this book</span>;
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Only display up to 5 activities
  const displayedActivities = activities.slice(0, 5);
  const hasMoreActivities = activities.length > 5;

  return (
    <div className="mt-8 bg-[#847266] rounded-lg">
      <div 
        className="flex justify-between items-center p-4 cursor-pointer"
        onClick={toggleExpanded}
      >
        <h3 className="text-xl font-semibold text-[#DFDDCE]">Friend Activity</h3>
        <div className="flex items-center justify-center text-[#DFDDCE]">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {isExpanded && displayedActivities.length > 0 && (
        <div 
          ref={activitiesContainerRef}
          className="p-4 pt-0 space-y-4 max-h-80 overflow-y-auto custom-scrollbar"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#3D2F2A #847266'
          }}
        >
          {displayedActivities.map((activity, index) => (
            <div key={`${activity.friendId}-${activity.activityType}-${index}`} className="flex items-start space-x-3">
              <Image 
                src={activity.profilePicUrl}
                alt={activity.friendName}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <p className="font-medium text-[#DFDDCE]">
                  {activity.friendName}
                </p>
                <p className="text-[#DFDDCE]">
                  {getActivityText(activity)}
                </p>
                <p className="text-sm text-[#DFDDCE] opacity-75">
                  {activity.date.toLocaleDateString("en-US", { 
                    month: "short", 
                    day: "numeric", 
                    year: "numeric" 
                  })}
                </p>
              </div>
            </div>
          ))}
          
          {hasMoreActivities && (
            <p className="text-sm text-[#DFDDCE] italic text-center pt-2 border-t border-[#3D2F2A]/30">
              {activities.length - 5} more {activities.length - 5 === 1 ? 'activity' : 'activities'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default FriendActivity;