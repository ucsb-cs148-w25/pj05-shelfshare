'use client';
// my-shelf/page.tsx

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from "@/firebase";
import { collection, query, onSnapshot, DocumentData, Timestamp } from "firebase/firestore";

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
}

export default function UserLists() {
  const { user } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<BookItem[]>([]);
  const [currentlyReading, setCurrentlyReading] = useState<BookItem[]>([]);
  const [wantToRead, setWantToRead] = useState<BookItem[]>([]);
  const [finishedReading, setFinishedReading] = useState<BookItem[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    // Fetch favorites
    const favoritesQuery = query(collection(db, "users", user.uid, "favorites"));
    const unsubscribeFavorites = onSnapshot(favoritesQuery, (snapshot) => {
      const favoritesData = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        const bookItem: BookItem = {
          id: doc.id,
          bookId: data.bookId || '',
          title: data.title || 'Unknown Title',
          author: data.author || 'Unknown Author',
          coverUrl: data.coverUrl || '',
          dateAdded: data.dateAdded instanceof Timestamp ? data.dateAdded : new Date()
        };
        return bookItem;
      });
      setFavorites(favoritesData);
    });

    // Fetch shelves
    const shelvesQuery = query(collection(db, "users", user.uid, "shelves"));
    const unsubscribeShelves = onSnapshot(shelvesQuery, (snapshot) => {
      const shelvesData = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        const bookItem: BookItem = {
          id: doc.id,
          bookId: data.bookId || '',
          title: data.title || 'Unknown Title',
          author: data.author || 'Unknown Author',
          coverUrl: data.coverUrl || '',
          dateAdded: data.dateAdded instanceof Timestamp ? data.dateAdded : new Date(),
          shelfType: (data.shelfType as BookItem['shelfType']) || 'want-to-read'
        };
        return bookItem;
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

  if (!user) {
    return null;
  }

  const sections: ShelfSection[] = [
    { title: 'Favorites', books: favorites, icon: '❤️' },
    { title: 'Currently Reading', books: currentlyReading },
    { title: 'Want to Read', books: wantToRead },
    { title: 'Finished Reading', books: finishedReading }
  ];

  return (
    <div className="bg-[#5A7463] min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-[#DFDDCE] text-3xl font-bold mb-4">
              {section.title} {section.icon}
            </h2>
            <div className="relative bg-[#847266] border-t-8 border-b-8 border-[#3D2F2A] h-44 flex items-center">
              <div className="flex space-x-4 overflow-x-auto px-4">
                {section.books.length > 0 ? (
                  section.books.map((book) => (
                    <div
                      key={book.id}
                      className="flex-shrink-0 cursor-pointer"
                      onClick={() => router.push(`/books/${book.bookId}`)}
                    >
                      <Image
                        src={book.coverUrl}
                        alt={book.title}
                        width={128}
                        height={144}
                        className="w-32 h-36 rounded-lg object-cover bg-[#3D2F2A]"
                      />
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