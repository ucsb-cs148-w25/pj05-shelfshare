import { db } from "../../firebase";
import { collection, updateDoc, doc, setDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";

// Send a Friend Request
export const sendFriendRequest = async (userId: string, friendId: string) => {
  const userRequestRef = doc(db, "users", userId, "sentFriendRequests", friendId);  // Sent request
  const friendRequestRef = doc(db, "users", friendId, "friendRequests", userId);    // Received request

  try {
    // Create the request in both collections (sent by user and received by friend)
    await setDoc(userRequestRef, { status: "pending" });
    await setDoc(friendRequestRef, { status: "pending" });
  } catch (error) {
    console.error("Error sending friend request:", error);
    throw new Error("Unable to send friend request.");
  }
};

export const acceptFriendRequest = async (userId: string, requestId: string) => {
  try {
    // Add the requestId to the user's friends list
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      friends: arrayUnion(requestId),  // Add the friend's ID to the user's friends list
    });

    // Add the userId to the friend's friends list
    const friendRef = doc(db, "users", requestId);
    await updateDoc(friendRef, {
      friends: arrayUnion(userId),  // Add the userId to the friend's friends list
    });

    // Remove the request from the friendRequests collection (of both users)
    const requestRef = doc(db, "users", userId, "friendRequests", requestId);
    const sentRequestRef = doc(db, "users", requestId, "sentFriendRequests", userId);  // Track sent requests too
    await deleteDoc(requestRef);
    await deleteDoc(sentRequestRef);  // Delete from sentFriendRequests of the sender

    // Optional: Change the status to accepted (if you prefer)
    await updateDoc(sentRequestRef, { status: "accepted" });
  } catch (error) {
    console.error("Error accepting friend request:", error);
  }
};

export const declineFriendRequest = async (userId: string, requestId: string) => {
  try {
    // Remove the request from the user's friendRequests subcollection
    const requestRef = doc(db, "users", userId, "friendRequests", requestId);
    await deleteDoc(requestRef);  // Delete the request from friendRequests (sender does not get added to friends list)

    // Optionally: You could also delete from the sent requests if you want to track it as declined
    const sentRequestRef = doc(db, "users", requestId, "sentFriendRequests", userId);  
    await deleteDoc(sentRequestRef);
  } catch (error) {
    console.error("Error declining friend request:", error);
  }
};

export const unsendFriendRequest = async (userId: string, friendId: string) => {
  try {
    // Remove the request from the user's sentFriendRequests subcollection
    const userRequestRef = doc(db, "users", userId, "sentFriendRequests", friendId);
    await deleteDoc(userRequestRef);

    // Remove the request from the friend's friendRequests subcollection
    const friendRequestRef = doc(db, "users", friendId, "friendRequests", userId);
    await deleteDoc(friendRequestRef);

    console.log("Friend request unsent successfully!");
  } catch (error) {
    console.error("Error unsending friend request:", error);
  }
};
