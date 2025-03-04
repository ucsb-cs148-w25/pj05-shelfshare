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

const BookActions = ({ 
  bookId,
  title,
  author,
  coverUrl,
  onDelete,
  showDeleteOnly = false
}: BookActionsProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [customShelves, setCustomShelves] = useState<{id: string, name: string}[]>([]);
  const { user } = useAuth();
  const [genres, setGenres] = useState<string[]>([]);


  // Fetch book genres from Open Library when component mounts
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch(`https://openlibrary.org/works/${bookId}.json`);
        const data = await response.json();
        
        // Extract genres from subjects (first 3 subjects)
        const subjects = data.subjects || [];
        const extractedGenres = subjects
          .filter((s: string) => typeof s === 'string')
          .map((s: string) => s.split(' -- ')[0]) // Take main category before '--'
          .slice(0, 3); // Limit to 3 genres
        
        setGenres(extractedGenres);
      } catch (error) {
        console.error("Error fetching genres:", error);
        setGenres([]);
      }
    };

    fetchGenres();
  }, [bookId]);

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
        genre: genres.join('#'), // Store genres as #-separated string
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
          genre: genres.join('#'), // Add genres to custom shelves
          dateAdded: new Date()
        });
      }

      setIsDropdownOpen(false);
      alert(`Added to ${shelfName}`);
    } catch (error) {
      console.error("Error adding to custom shelf:", error);
      alert("Failed to add to custom shelf.");
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
          <div className="absolute w-full mt-2 bg-[#DFDDCE] rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
            {/* Default shelves - removed "Stopped Reading" option */}
            <div className="py-1 border-b border-[#3D2F2A]">
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
                className="w-full px-4 py-2 text-left text-[#3D2F2A] hover:bg-[#92A48A] transition-colors"
              >
                Finished Reading
              </button>
            </div>
            
            
            {/* Custom shelves */}
            {customShelves.length > 0 && (
              <div className="py-1">
                {customShelves.map(shelf => (
                  <button
                    key={shelf.id}
                    onClick={() => addToCustomShelf(shelf.id, shelf.name)}
                    className="w-full px-4 py-2 text-left text-[#3D2F2A] hover:bg-[#92A48A] transition-colors"
                  >
                    {shelf.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookActions;