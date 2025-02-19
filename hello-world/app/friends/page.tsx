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

// interface UserWithStatus extends DocumentData {
//   id: string;
//   name?: string;
//   friendStatus?: 'friend' | 'pending' | 'none';
// }

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
      unsubscribeUsers();
      unsubscribeRequests();
      unsubscribeFriends();
      unsubscribeSentRequests();
    };
  }, [user]);

  // Filter users based on search input
  const filteredUsers = users
    .filter((u) => u.id !== user?.uid)
    .filter((u) => u.name?.toLowerCase().includes(search.toLowerCase()));

  const handleAcceptRequest = async (requestId: string) => {
    if (!user) return;
    try {
      await acceptFriendRequest(user.uid, requestId);
      setAcceptedRequestIds(prev => [...prev, requestId]);
      // Remove from friend requests list
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!user) return;
    try {
      await declineFriendRequest(user.uid, requestId);
      setDeclinedRequestIds(prev => [...prev, requestId]);
      // Remove from friend requests list
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error("Error declining request:", error);
    }
  };

  const handleUnsendRequest = async (friendId: string) => {
    if (!user) return;
    await unsendFriendRequest(user.uid, friendId);
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;
    try {
      await removeFriend(user.uid, friendId);
      // Update local state to reflect friend removal
      setFriends(prev => prev.filter(friend => friend.id !== friendId));
      setAcceptedRequestIds(prev => prev.filter(id => id !== friendId));
    } catch (error) {
      console.error("Error removing friend:", error);
    }
  };

  const getFriendRequestButton = (request: DocumentData) => {
    if (acceptedRequestIds.includes(request.id)) {
      return (
        <div className="flex gap-2 items-center">
          <span className="text-gray-600">Friend</span>
          <button
            onClick={() => handleRemoveFriend(request.id)}
            className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition text-sm"
          >
            Unfriend
          </button>
        </div>
      );
    }

    if (!declinedRequestIds.includes(request.id)) {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => handleAcceptRequest(request.id)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Accept
          </button>
          <button
            onClick={() => handleDeclineRequest(request.id)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Decline
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => sendFriendRequest(user!.uid, request.id)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
      >
        Add Friend
      </button>
    );
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Friends</h1>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 mb-4 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Friend Requests */}
      {friendRequests.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Friend Requests</h2>
          <ul className="grid gap-4">
            {friendRequests.map((request) => (
              <li key={request.id} className="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
                <span className="text-gray-800">{request.name || "Unknown User"}</span>
                {getFriendRequestButton(request)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Current Friends */}
      {friends.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">My Friends</h2>
          <ul className="grid gap-4">
            {friends.map((friend) => (
              <li key={friend.id} className="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
                <span className="text-gray-800">{friend.name}</span>
                <div className="flex gap-2 items-center">
                  <span className="text-gray-600">Friend</span>
                  <button
                    onClick={() => handleRemoveFriend(friend.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition text-sm"
                  >
                    Unfriend
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Users List */}
      {search && (
        <section>
          {filteredUsers.length === 0 ? (
            <p className="text-gray-500">No users found.</p>
          ) : (
            <ul className="grid gap-4">
              {filteredUsers.map((u) => (
                <li key={u.id} className="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
                  <span className="text-gray-800 ml-4">{u.name || "Unknown User"}</span>
                  {friends.some(f => f.id === u.id) ? (
                    <div className="flex gap-2 items-center">
                      <span className="text-gray-600">Friend</span>
                      <button
                        onClick={() => handleRemoveFriend(u.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition text-sm"
                      >
                        Unfriend
                      </button>
                    </div>
                  ) : sentRequests.includes(u.id) ? (
                    <button
                      onClick={() => handleUnsendRequest(u.id)}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
                    >
                      Cancel Request
                    </button>
                  ) : (
                    <button
                      onClick={() => sendFriendRequest(user.uid, u.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      Add Friend
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

export default Friends;