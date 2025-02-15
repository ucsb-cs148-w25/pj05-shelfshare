'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from "@/firebase";
import { collection, query, onSnapshot, Timestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Trash2 } from 'lucide-react';

interface BookItem {
  id: string;
  bookId: string;
  title: string;
  author: string;
  coverUrl: string;
  dateAdded: Timestamp | Date;
  shelfType?: 'currently-reading' | 'want-to-read' | 'finished';
}

interface ShelfSection {
  title: string;
  books: BookItem[];
  icon?: string;
  type: 'favorites' | 'currently-reading' | 'want-to-read' | 'finished';
}

export default function UserLists() {
  const { user } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<BookItem[]>([]);
  const [currentlyReading, setCurrentlyReading] = useState<BookItem[]>([]);
  const [wantToRead, setWantToRead] = useState<BookItem[]>([]);
  const [finishedReading, setFinishedReading] = useState<BookItem[]>([]);
  const [editModes, setEditModes] = useState<{ [key: string]: boolean }>({
    favorites: false,
    'currently-reading': false,
    'want-to-read': false,
    'finished': false
  });
  const [draggedBook, setDraggedBook] = useState<BookItem | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    // Fetch favorites
    const favoritesQuery = query(collection(db, "users", user.uid, "favorites"));
    const unsubscribeFavorites = onSnapshot(favoritesQuery, (snapshot) => {
      const favoritesData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          bookId: data.bookId || '',
          title: data.title || 'Unknown Title',
          author: data.author || 'Unknown Author',
          coverUrl: data.coverUrl || '',
          dateAdded: data.dateAdded instanceof Timestamp ? data.dateAdded : new Date()
        };
      });
      setFavorites(favoritesData);
    });

    // Fetch shelves
    const shelvesQuery = query(collection(db, "users", user.uid, "shelves"));
    const unsubscribeShelves = onSnapshot(shelvesQuery, (snapshot) => {
      const shelvesData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          bookId: data.bookId || '',
          title: data.title || 'Unknown Title',
          author: data.author || 'Unknown Author',
          coverUrl: data.coverUrl || '',
          dateAdded: data.dateAdded instanceof Timestamp ? data.dateAdded : new Date(),
          shelfType: data.shelfType as ('currently-reading' | 'want-to-read' | 'finished')
        };
      });

      setCurrentlyReading(shelvesData.filter(book => book.shelfType === 'currently-reading'));
      setWantToRead(shelvesData.filter(book => book.shelfType === 'want-to-read'));
      setFinishedReading(shelvesData.filter(book => book.shelfType === 'finished'));
    });

    return () => {
      unsubscribeFavorites();
      unsubscribeShelves();
    };
  }, [user, router]);

  const toggleEditMode = (sectionType: string) => {
    setEditModes(prev => ({
      ...prev,
      [sectionType]: !prev[sectionType]
    }));
  };

  const handleDragStart = (book: BookItem, e: React.DragEvent) => {
    setDraggedBook(book);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedBook(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.backgroundColor = 'rgba(61, 47, 42, 0.2)';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.backgroundColor = '';
    }
  };

  const handleDrop = async (targetShelfType: 'currently-reading' | 'want-to-read' | 'finished', e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.backgroundColor = '';
    }

    if (!draggedBook || !user || draggedBook.shelfType === targetShelfType) return;

    try {
      const bookRef = doc(db, "users", user.uid, "shelves", draggedBook.id);
      await updateDoc(bookRef, {
        shelfType: targetShelfType
      });
    } catch (error) {
      console.error("Error moving book:", error);
    }
  };

  const deleteBook = async (bookId: string, sectionType: string) => {
    if (!user) return;
    
    try {
      if (sectionType === 'favorites') {
        const bookToDelete = favorites.find(book => book.id === bookId);
        if (bookToDelete) {
          await deleteDoc(doc(db, "users", user.uid, "favorites", bookId));
        }
      } else {
        const bookToDelete = [...currentlyReading, ...wantToRead, ...finishedReading]
          .find(book => book.id === bookId);
        if (bookToDelete) {
          await deleteDoc(doc(db, "users", user.uid, "shelves", bookId));
        }
      }
    } catch (error) {
      console.error("Error deleting book:", error);
    }
  };

  if (!user) {
    return null;
  }

  const sections: ShelfSection[] = [
    { title: 'Favorites', books: favorites, icon: '❤️', type: 'favorites' },
    { title: 'Currently Reading', books: currentlyReading, type: 'currently-reading' },
    { title: 'Want to Read', books: wantToRead, type: 'want-to-read' },
    { title: 'Finished Reading', books: finishedReading, type: 'finished' }
  ];

  return (
    <div className="bg-[#5A7463] min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {sections.map((section) => (
          <div key={section.type}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[#DFDDCE] text-3xl font-bold">
                {section.title} {section.icon}
              </h2>
              <button
                onClick={() => toggleEditMode(section.type)}
                className="text-[#DFDDCE] px-4 py-2 rounded-lg hover:bg-[#3D2F2A] transition-colors"
              >
                {editModes[section.type] ? 'Done' : 'Edit'}
              </button>
            </div>
            <div 
              className="relative bg-[#847266] border-t-8 border-b-8 border-[#3D2F2A] h-44 flex items-center transition-colors"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => section.type !== 'favorites' && handleDrop(section.type as 'currently-reading' | 'want-to-read' | 'finished', e)}
            >
              <div className="flex space-x-4 overflow-x-auto px-4">
                {section.books.length > 0 ? (
                  section.books.map((book) => (
                    <div
                      key={book.id}
                      className="flex-shrink-0 cursor-pointer relative group"
                      draggable={section.type !== 'favorites'}
                      onDragStart={(e) => handleDragStart(book, e)}
                      onDragEnd={handleDragEnd}
                      onClick={() => !editModes[section.type] && router.push(`/books/${book.bookId}`)}
                    >
                      <Image
                        src={book.coverUrl}
                        alt={book.title}
                        width={128}
                        height={144}
                        className="w-32 h-36 rounded-lg object-cover bg-[#3D2F2A]"
                      />
                      {editModes[section.type] && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBook(book.id, section.type);
                          }}
                          className="absolute top-2 right-2 p-2 rounded-full bg-[#3D2F2A] text-[#DFDDCE] hover:bg-[#847266] transition-colors opacity-100"
                          aria-label="Delete book"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="bg-[#3D2F2A] w-32 h-36 rounded-lg" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}