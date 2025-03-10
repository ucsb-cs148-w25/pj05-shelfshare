// src/components/FriendRequests.tsx
'use client';
import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot, query } from "firebase/firestore";

interface FriendRequest {
  id: string;
  name?: string; 
  avatar?: string; 
}

const FriendRequests = ({ userId }: { userId: string }) => {
  //const [requests, setRequests] = useState<any[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);

  useEffect(() => {
    // Set up listener for incoming friend requests
    const q = query(
      collection(db, "users", userId, "friendRequests")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe(); 
  }, [userId]);

  return (
    <div>
      {requests.length > 0 ? (
        requests.map((request) => (
          <div key={request.id}>
            <p>{request.id} wants to be friends</p>
          </div>
        ))
      ) : (
        <p>No friend requests.</p>
      )}
    </div>
  );
};

export default FriendRequests;