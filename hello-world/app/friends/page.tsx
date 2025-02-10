'use client';

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "../../firebase";
import { collection, query, onSnapshot, DocumentData, doc, deleteDoc, getDoc } from "firebase/firestore";
import { sendFriendRequest, acceptFriendRequest, declineFriendRequest, unsendFriendRequest } from "../context/friends";

const Friends = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<DocumentData[]>([]);
  const [friendRequests, setFriendRequests] = useState<DocumentData[]>([]);
  const [friends, setFriends] = useState<DocumentData[]>([]); // Track friends
  const [search, setSearch] = useState("");
  const [sentRequests, setSentRequests] = useState<string[]>([]); // Track sent requests

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

    // Fetch friend requests with user data (incoming requests)
    const friendRequestsQuery = query(
      collection(db, "users", user.uid, "friendRequests")
    );

    const unsubscribeRequests = onSnapshot(friendRequestsQuery, async (snapshot) => {
      const requests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Fetch corresponding user data for each friend request
      const updatedRequests = await Promise.all(
        requests.map(async (request) => {
          const userRef = doc(db, "users", request.id);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data();
          return { ...request, name: userData?.name }; // Add the user's name to the request data
        })
      );

      setFriendRequests(updatedRequests);
    });

    // Fetch friends list (incoming friends)
    const friendsQuery = query(
      collection(db, "users", user.uid, "friends")
    );
    
    const unsendFriendRequest = async (recipientId: string) => {
        if (!user) return;
        try {
          await deleteDoc(doc(db, "users", user.uid, "sentFriendRequests", recipientId));
          await deleteDoc(doc(db, "users", recipientId, "friendRequests", user.uid));
        } catch (error) {
          console.error("Error unsending friend request:", error);
        }
      };

    const unsubscribeFriends = onSnapshot(friendsQuery, async (snapshot) => {
      const friendDocs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Fetch corresponding user data for each friend
      const updatedFriends = await Promise.all(
        friendDocs.map(async (friend) => {
          const userRef = doc(db, "users", friend.id);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data();
          return { ...friend, name: userData?.name }; // Add the user's name to the friend data
        })
      );

      setFriends(updatedFriends);
    });

    // Track sent friend requests (requests sent by the user)
    const sentFriendRequestsQuery = query(
      collection(db, "users", user.uid, "sentFriendRequests") // Ensure this is the correct path for sent requests
    );

    const unsubscribeSentRequests = onSnapshot(sentFriendRequestsQuery, (snapshot) => {
      const sent = snapshot.docs.map((doc) => doc.id);
      setSentRequests(sent);
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
    .filter((u) => u.id !== user?.uid) // Exclude logged-in user
    .filter((u) => u.name?.toLowerCase().includes(search.toLowerCase())); // Search filter

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Friends</h1>

      {/* SEARCH BAR */}
      <input
        type="text"
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 mb-4 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* FRIEND REQUESTS */}
      {friendRequests.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Friend Requests</h2>
          <ul className="grid gap-4">
            {friendRequests.map((request) => (
              <li key={request.id} className="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
                <span className="text-gray-800">{request.name || "Unknown User"}</span>
                <div className="flex gap-2">
                  {sentRequests.includes(request.id) ? (
                    <p className="text-gray-500">Request Sent</p>
                  ) : (
                    <>
                      <button
                        onClick={() => acceptFriendRequest(user.uid, request.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => declineFriendRequest(user.uid, request.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => unsendFriendRequest(user.uid, request.id)} 
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
                      >
                        Unsend Request
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* USERS LIST */}
      {search && (
        <section>
          {filteredUsers.length === 0 ? (
            <p className="text-gray-500">No users found.</p>
          ) : (
            <ul className="grid gap-4">
              {filteredUsers.map((u) => (
                <li key={u.id} className="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
                  <span className="text-gray-800 ml-4">{u.name || "Unknown User"}</span>
                  <button
                    onClick={() => sendFriendRequest(user.uid, u.id)}
                    disabled={sentRequests.includes(u.id)} // Disable if request sent
                    className={`px-4 py-2 rounded-lg transition ${sentRequests.includes(u.id) ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  >
                    {sentRequests.includes(u.id) ? "Pending" : "Add Friend"}
                  </button>
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
