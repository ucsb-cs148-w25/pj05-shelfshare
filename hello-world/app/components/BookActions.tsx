import React, { useState, useEffect } from 'react';
import { Heart, Trash2 } from 'lucide-react';
import { db } from "@/firebase";
import { collection, addDoc, deleteDoc, query, where, getDocs } from "firebase/firestore";
import { useAuth } from '@/app/context/AuthContext';

interface BookActionsProps {
  bookId: string;
  title: string;
  author: string;
  coverUrl: string;
  onDelete?: () => void; // Optional callback for delete operation
  showDeleteOnly?: boolean; // Optional prop to show only delete button
}

const BookActions: React.FC<BookActionsProps> = ({ 
  bookId,
  title,
  author,
  coverUrl,
  onDelete,
  showDeleteOnly = false
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [customShelves, setCustomShelves] = useState<{id: string, name: string}[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!user) return;
      
      const q = query(
        collection(db, "users", user.uid, "favorites"),
        where("bookId", "==", bookId)
      );
      
      const querySnapshot = await getDocs(q);
      setIsFavorite(!querySnapshot.empty);
    };

    const fetchCustomShelves = async () => {
      if (!user) return;
      
      const customShelvesQuery = query(collection(db, "users", user.uid, "customShelves"));
      const querySnapshot = await getDocs(customShelvesQuery);
      
      const shelves = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      
      setCustomShelves(shelves);
    };

    checkFavoriteStatus();
    fetchCustomShelves();
  }, [user, bookId]);

  const toggleFavorite = async () => {
    if (!user) {
      alert("You need to be logged in to favorite books.");
      return;
    }

    try {
      const favoritesRef = collection(db, "users", user.uid, "favorites");
      const q = query(favoritesRef, where("bookId", "==", bookId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        await addDoc(favoritesRef, {
          bookId,
          title,
          author,
          coverUrl,
          dateAdded: new Date()
        });
        setIsFavorite(true);
      } else {
        const docToDelete = querySnapshot.docs[0];
        await deleteDoc(docToDelete.ref);
        setIsFavorite(false);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      alert("Failed to update favorites.");
    }
  };

  const deleteFromShelf = async () => {
    if (!user) {
      alert("You need to be logged in to remove books.");
      return;
    }

    try {
      const shelvesRef = collection(db, "users", user.uid, "shelves");
      const q = query(shelvesRef, where("bookId", "==", bookId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        await deleteDoc(querySnapshot.docs[0].ref);
        if (onDelete) onDelete(); // Call the callback if provided
      }
    } catch (error) {
      console.error("Error removing from shelf:", error);
      alert("Failed to remove from shelf.");
    }
  };

  const addToShelf = async (shelfType: 'currently-reading' | 'want-to-read' | 'finished' | 'stopped-reading') => {
    if (!user) {
      alert("You need to be logged in to add books to your shelf.");
      return;
    }

    try {
      const shelvesRef = collection(db, "users", user.uid, "shelves");
      const q = query(shelvesRef, where("bookId", "==", bookId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        await deleteDoc(querySnapshot.docs[0].ref);
      }

      // Add the book to the new shelf
      await addDoc(shelvesRef, {
        bookId,
        title,
        author,
        coverUrl,
        shelfType,
        dateAdded: new Date(),
        dateFinished: shelfType === 'finished' ? new Date() : null, // Store the finish date if applicable
      });

      setIsDropdownOpen(false);
      alert(`Added to ${shelfType}`);
    } catch (error) {
      console.error("Error adding to shelf:", error);
      alert("Failed to add to shelf.");
    }
  };

  const addToCustomShelf = async (shelfId: string, shelfName: string) => {
    if (!user) {
      alert("You need to be logged in to add books to your shelf.");
      return;
    }

    try {
      // Add to custom shelf collection
      // Check if book already exists in this custom shelf
      const existingBookQuery = query(
        collection(db, "users", user.uid, "customShelfBooks"),
        where("bookId", "==", bookId),
        where("shelfId", "==", shelfId)
      );
      
      const existingBookSnapshot = await getDocs(existingBookQuery);
      
      // Only add if book doesn't already exist in this custom shelf
      if (existingBookSnapshot.empty) {
        await addDoc(collection(db, "users", user.uid, "customShelfBooks"), {
          bookId,
          title,
          author,
          coverUrl,
          shelfId,
          dateAdded: new Date()
        });
      }

      setIsDropdownOpen(false);
      alert(`Added to ${shelfName}`);