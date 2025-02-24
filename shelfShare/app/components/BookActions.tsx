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

    checkFavoriteStatus();
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

  const addToShelf = async (shelfType: 'currently-reading' | 'want-to-read' | 'finished') => {
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

      await addDoc(shelvesRef, {
        bookId,
        title,
        author,
        coverUrl,
        shelfType,
        dateAdded: new Date()
      });

      setIsDropdownOpen(false);
      alert(`Added to ${shelfType}`);
    } catch (error) {
      console.error("Error adding to shelf:", error);
      alert("Failed to add to shelf.");
    }
  };

  if (showDeleteOnly) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent triggering the parent's onClick
          deleteFromShelf();
        }}
        className="absolute top-2 right-2 p-2 rounded-full bg-[#3D2F2A] text-[#DFDDCE] hover:bg-[#847266] transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Remove from shelf"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={toggleFavorite}
        className="bg-[#3D2F2A] text-[#DFDDCE] p-3 rounded-full hover:bg-[#847266] transition-colors flex items-center justify-center"
        aria-label="Toggle favorite"
      >
        <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
      </button>

      <div className="relative inline-block flex-grow">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full bg-[#3D2F2A] text-[#DFDDCE] py-3 px-6 rounded-full font-bold hover:bg-[#847266] transition-colors flex items-center justify-center gap-2"
        >
          Add To Shelf
          <span className="material-icons-outlined text-sm">
            {isDropdownOpen ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {isDropdownOpen && (
          <div className="absolute w-full mt-2 bg-[#DFDDCE] rounded-lg shadow-xl z-10">
            <button
              onClick={() => addToShelf('currently-reading')}
              className="w-full px-4 py-2 text-left text-[#3D2F2A] hover:bg-[#92A48A] first:rounded-t-lg transition-colors"
            >
              Currently Reading
            </button>
            <button
              onClick={() => addToShelf('want-to-read')}
              className="w-full px-4 py-2 text-left text-[#3D2F2A] hover:bg-[#92A48A] transition-colors"
            >
              Want to Read
            </button>
            <button
              onClick={() => addToShelf('finished')}
              className="w-full px-4 py-2 text-left text-[#3D2F2A] hover:bg-[#92A48A] last:rounded-b-lg transition-colors"
            >
              Finished Reading
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookActions;