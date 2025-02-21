import { db } from "../../firebase";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { writeBatch } from 'firebase/firestore';

export const sendFriendRequest = async (userId: string, friendId: string) => {
    const timestamp = new Date().toISOString();
    
    // Create batch to ensure both operations succeed or fail together
    const batch = writeBatch(db);
    
    // Add to sender's sentFriendRequests
    const senderRef = doc(db, "users", userId, "sentFriendRequests", friendId);
    batch.set(senderRef, {
      status: "pending",
      timestamp,
    });
    
    // Add to recipient's friendRequests
    const recipientRef = doc(db, "users", friendId, "friendRequests", userId);
    batch.set(recipientRef, {
      status: "pending",
      timestamp,
    });
    
    // Commit the batch
    await batch.commit();
    
    console.log("Friend request sent successfully!");
};
// Accept a Friend Request
export const acceptFriendRequest = async (userId: string, friendId: string) => {
    // Add to user's friends collection
    const userFriendRef = doc(db, "users", userId, "friends", friendId);
    const userDoc = await getDoc(doc(db, "users", friendId));
    await setDoc(userFriendRef, {
      name: userDoc.data()?.name || "Unknown User",
      timestamp: new Date().toISOString()
    });

    // Add to friend's friends collection
    const friendUserRef = doc(db, "users", friendId, "friends", userId);
    const friendDoc = await getDoc(doc(db, "users", userId));
    await setDoc(friendUserRef, {
      name: friendDoc.data()?.name || "Unknown User",
      timestamp: new Date().toISOString()
    });

    // Clean up requests
    await deleteDoc(doc(db, "users", userId, "friendRequests", friendId));
    await deleteDoc(doc(db, "users", friendId, "sentFriendRequests", userId));
};

// Decline a Friend Request
export const declineFriendRequest = async (userId: string, friendId: string) => {
    await deleteDoc(doc(db, "users", userId, "friendRequests", friendId));
    await deleteDoc(doc(db, "users", friendId, "sentFriendRequests", userId));
};

// Unsend a Friend Request
export const unsendFriendRequest = async (userId: string, friendId: string) => {
    await deleteDoc(doc(db, "users", userId, "sentFriendRequests", friendId));
    await deleteDoc(doc(db, "users", friendId, "friendRequests", userId));
};

// Remove a Friend
export const removeFriend = async (userId: string, friendId: string) => {
    await deleteDoc(doc(db, "users", userId, "friends", friendId));
    await deleteDoc(doc(db, "users", friendId, "friends", userId));
};