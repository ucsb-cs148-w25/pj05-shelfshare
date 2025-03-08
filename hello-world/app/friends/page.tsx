'use client';

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "../../firebase";
import { collection, query, onSnapshot, DocumentData, doc, getDoc } from "firebase/firestore";
import { 
  sendFriendRequest, 
  acceptFriendRequest, 
  declineFriendRequest, 
  unsendFriendRequest,
  removeFriend
} from "../context/friends";
import { Trash2 } from 'lucide-react';

import Profile_Screen from "./profileScreen";

interface ProfileItem {
  email: string;
  aboutMe: string;
  pgenre: string;
  profilePicUrl: string;
  uid: string;
  username: string;
}

const Friends = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<DocumentData[]>([]);
  const [friendRequests, setFriendRequests] = useState<DocumentData[]>([]);
  const [friends, setFriends] = useState<DocumentData[]>([]);
  const [search, setSearch] = useState("");
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [acceptedRequestIds, setAcceptedRequestIds] = useState<string[]>([]);
  const [declinedRequestIds, setDeclinedRequestIds] = useState<string[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [showFriendProfile, setShowFriendProfile] = useState<Record<string, boolean>>({});
  const [profiles, setProfiles] = useState<Record<string, ProfileItem>>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      localStorage.setItem("lastPage", "/friends");
      router.push("/");
    }
  }, [user, router]);

  // Fetch users and friend requests
  useEffect(() => {
    if (!user) return;

    // Fetch users list
    const usersQuery = query(collection(db, "users"));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch profiles for all users
    const profilesQuery = query(collection(db, "profile"));
    const unsubscribeProfiles = onSnapshot(profilesQuery, (snapshot) => {
      const profilesData = snapshot.docs.reduce((acc, doc) => {
        const profileData = doc.data() as ProfileItem;
        return {
          ...acc,
          [profileData.uid]: profileData,
        };
      }, {});
      setProfiles(profilesData);
    });

    const unsubscribeUsersProfile = onSnapshot(usersQuery, (snapshot) => {
      const friendsDict: Record<string, boolean> = {};
    
      snapshot.docs.forEach((doc) => {
        friendsDict[doc.id] = false; // Default visibility to false
      });
    
      setShowFriendProfile(friendsDict);
    });

    // Fetch friend requests
    const friendRequestsQuery = query(
      collection(db, "users", user.uid, "friendRequests")
    );

    const unsubscribeRequests = onSnapshot(friendRequestsQuery, async (snapshot) => {
      const requests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const updatedRequests = await Promise.all(
        requests.map(async (request) => {
          const userRef = doc(db, "users", request.id);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data();
          return { ...request, name: userData?.name };
        })
      );
      setFriendRequests(updatedRequests);
    });

    // Fetch friends
    const friendsQuery = query(collection(db, "users", user.uid, "friends"));
    
    const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
      const friendsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setFriends(friendsList);
    });

    // Track sent friend requests
    const sentRequestsQuery = query(
      collection(db, "users", user.uid, "sentFriendRequests")
    );

    const unsubscribeSentRequests = onSnapshot(sentRequestsQuery, (snapshot) => {
      setSentRequests(snapshot.docs.map((doc) => doc.id));
    });

    return () => {
      unsubscribeUsersProfile();
      unsubscribeUsers();
      unsubscribeRequests();
      unsubscribeFriends();
      unsubscribeSentRequests();
      unsubscribeProfiles();
    };
  }, [user]);

  // Update search results visibility when search changes
  useEffect(() => {
    setShowSearchResults(search.length > 0);
  }, [search]);

  // Filter users based on search input
  const filteredUsers = users
  .filter((u) => u.id !== user?.uid)
  .filter((u) => {
    const userName = u.name?.toLowerCase() || '';
    const profileUsername = profiles[u.id]?.username?.toLowerCase() || '';
    return userName.includes(search.toLowerCase()) || 
           profileUsername.includes(search.toLowerCase());
  });


  const handleAcceptRequest = async (requestId: string) => {
    if (!user) return;
      await acceptFriendRequest(user.uid, requestId);
      setAcceptedRequestIds(prev => [...prev, requestId]);
      // Remove from friend requests list
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!user) return;
      await declineFriendRequest(user.uid, requestId);
      setDeclinedRequestIds(prev => [...prev, requestId]);
      // Remove from friend requests list
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
  };

  const handleUnsendRequest = async (friendId: string) => {
    if (!user) return;
    const success = await unsendFriendRequest(user.uid, friendId);
    if (success) {
      setSentRequests(prev => prev.filter(id => id !== friendId));
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;
      await removeFriend(user.uid, friendId);
      // Update local state to reflect friend removal
      setFriends(prev => prev.filter(friend => friend.id !== friendId));
      setAcceptedRequestIds(prev => prev.filter(id => id !== friendId));
  };

  const getFriendRequestButton = (request: DocumentData) => {
    if (acceptedRequestIds.includes(request.id)) {
      return (
        <div className="flex gap-2 items-center">
          <span className="text-[#847266]">Friend</span>
          <button
            onClick={() => handleRemoveFriend(request.id)}
            className="bg-[#DFDDCE] text-white px-3 py-1 rounded-lg hover:bg-[#847266] transition text-sm"
          >
            <Trash2 className="w-4 h-4 mr-1" /> {/*Unfriend */}
          </button>
        </div>
      );
    }

    if (!declinedRequestIds.includes(request.id)) {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => handleAcceptRequest(request.id)}
            className="bg-[#5a7463] text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Accept
          </button>
          <button
            onClick={() => handleDeclineRequest(request.id)}
            className="bg-[#847266] text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Decline
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => sendFriendRequest(user!.uid, request.id)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
      >
        Add Friend
      </button>
    );
  };

  const handleFriendProfile = (friendUid: string) => {
    setShowFriendProfile((prev) => ({
      ...prev,
      [friendUid]: !prev[friendUid],
    }));
  };

  const resetAllProfiles = () => {
    setShowFriendProfile((prev) =>
      Object.keys(prev).reduce((acc, key) => {
        acc[key] = false; // Set each profile visibility to false
        return acc;
      }, {} as Record<string, boolean>)
    );
  };
  
  // Component to display user name and username
  const UserDisplay = ({ userId, name }: { userId: string, name: string }) => (
    <div className="flex flex-col">
      <span className="text-gray-800">{name || "Unknown User"}</span>
      {profiles[userId]?.username && (
        <span className="text-xs text-gray-500">@{profiles[userId].username}</span>
      )}
    </div>
  );

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-[#92A48A] shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold mb-6 text-[#DFDDCE]">Friends</h1>

      {/* Search Bar with Toggle Button */}
      <div className="relative mb-6">
        <div className="flex items-center">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => {setSearch(e.target.value);
              resetAllProfiles();}}
            className="w-full p-3 border rounded-lg text-gray-700 focus:outline-none focus:ring-4 focus:ring-[#DFDDCE]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 bg-gray-200 text-gray-600 p-1 rounded-full"
            >
              <span className="sr-only">Clear</span>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {showSearchResults && (
        <section className="mb-6 border-2 border-[#DFDDCE] p-4 rounded-lg bg-white-50">
          <h2 className="text-lg font-semibold text-[#DFDDCE] mb-3">Search Results</h2>
          {filteredUsers.length === 0 ? (
            <p className="text-[#DFDDCE]">No users found.</p>
          ) : (
            <ul className="grid gap-4">
              {filteredUsers.map((u) => (
                <li key={u.id} className="flex justify-between items-center bg-[#DFDDCE] p-3 rounded-lg shadow-sm">
                  <button 
                    onClick={() => handleFriendProfile(u.id)} 
                    className="text-left hover:bg-gray-300 rounded p-1"
                  >
                    <UserDisplay userId={u.id} name={u.name} />
                  </button> 
                  {showFriendProfile[u.id] && (
                    <Profile_Screen friendUid={u.id}/>
                  )}
                  {!showFriendProfile[u.id] && (friends.some(f => f.id === u.id) ? (
                    <div className="flex gap-2 items-center">
                      <span className="text-gray-600">Friend</span>
                      <button
                        onClick={() => handleRemoveFriend(u.id)}
                        className="bg-[#847266] text-white px-3 py-1 rounded-lg hover:bg-red-700 transition text-sm"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                      </button>
                    </div>
                  ) : sentRequests.includes(u.id) ? (
                    <button
                      onClick={() => handleUnsendRequest(u.id)}
                      className="bg-[#847266] text-white px-4 py-2 rounded-lg "
                    >
                      Cancel Request
                    </button>
                  ) : (
                    <button
                      onClick={() => sendFriendRequest(user.uid, u.id)}
                      className="bg-[#847266] text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      Add Friend
                    </button>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Friend Requests */}
      {!showSearchResults && friendRequests.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-[#DFDDCE] mb-3">Friend Requests</h2>
          <ul className="grid gap-4">
            {friendRequests.map((request) => (
              <li key={request.id} className="flex justify-between items-center bg-[#DFDDCE] p-3 rounded-lg">
                <button 
                  onClick={() => handleFriendProfile(request.id)} 
                  className="text-left hover:bg-gray-300 rounded p-1"
                >
                  <UserDisplay userId={request.id} name={request.name} />
                </button>
                {!showFriendProfile[request.id] ? getFriendRequestButton(request) : (
                  <Profile_Screen friendUid={request.id} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Current Friends */}
      {!showSearchResults && friends.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[#DFDDCE] mb-3">My Friends</h2>
          <ul className="grid gap-4">
            {friends.map((friend) => (
              <li key={friend.id} className="flex justify-between items-center bg-[#DFDDCE] p-3 rounded-lg">
                <button 
                  onClick={() => handleFriendProfile(friend.id)}
                  className="text-left hover:bg-gray-300 rounded p-1"
                >
                  <UserDisplay userId={friend.id} name={friend.name} />
                </button>
                {!showFriendProfile[friend.id] && (
                  <div className="flex gap-2 items-center">
                    <span className="text-gray-600">Friend</span>
                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="bg-[#847266] text-white px-3 py-1 rounded-lg hover:bg-red-700 transition text-sm"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> {/*Unfriend */}
                    </button>
                  </div>
                )}
                {showFriendProfile[friend.id] && (
                  <Profile_Screen friendUid={friend.id}/>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default Friends;