import { db } from "../../firebase";
import { collection, updateDoc, doc, setDoc, deleteDoc, getDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { writeBatch } from 'firebase/firestore';

export const sendFriendRequest = async (userId: string, friendId: string) => {
  try {
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
  } catch (error) {
    console.error("Error sending friend request:", error);
    if (error instanceof Error) {
      throw new Error(`Unable to send friend request: ${error.message}`);
    } else {
      throw new Error("Unable to send friend request");
    }
  }
};
// Accept a Friend Request
export const acceptFriendRequest = async (userId: string, friendId: string) => {
  try {
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
  } catch (error) {
    console.error("Error accepting friend request:", error);
    throw new Error("Unable to accept friend request.");
  }
};

// Decline a Friend Request
export const declineFriendRequest = async (userId: string, friendId: string) => {
  try {
    await deleteDoc(doc(db, "users", userId, "friendRequests", friendId));
    await deleteDoc(doc(db, "users", friendId, "sentFriendRequests", userId));
  } catch (error) {
    console.error("Error declining friend request:", error);
    throw new Error("Unable to decline friend request.");
  }
};

// Unsend a Friend Request
export const unsendFriendRequest = async (userId: string, friendId: string) => {
  try {
    await deleteDoc(doc(db, "users", userId, "sentFriendRequests", friendId));
    await deleteDoc(doc(db, "users", friendId, "friendRequests", userId));
  } catch (error) {
    console.error("Error unsending friend request:", error);
    throw new Error("Unable to unsend friend request.");
  }
};

// Remove a Friend
export const removeFriend = async (userId: string, friendId: string) => {
  try {
    await deleteDoc(doc(db, "users", userId, "friends", friendId));
    await deleteDoc(doc(db, "users", friendId, "friends", userId));
  } catch (error) {
    console.error("Error removing friend:", error);
    throw new Error("Unable to remove friend.");
  }
};