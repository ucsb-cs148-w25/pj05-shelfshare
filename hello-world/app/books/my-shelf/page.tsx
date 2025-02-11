'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from "@/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";

interface BookItem {
  bookId: string;
  title: string;
  author: string;
  coverUrl: string;
  shelfType?: string;
  dateAdded: any;
}

export default function UserLists() {
  const { user } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<BookItem[]>([]);
  const [currentlyReading, setCurrentlyReading] = useState<BookItem[]>([]);
  const [wantToRead, setWantToRead] = useState<BookItem[]>([]);
  const [finishedReading, setFinishedReading] = useState<BookItem[]>([]);

  console.log("Component rendering, user:", user?.uid); // Debug log

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    console.log("Setting up Firestore listeners"); // Debug log

    // Fetch favorites
    const favoritesQuery = query(collection(db, "users", user.uid, "favorites"));
    const unsubscribeFavorites = onSnapshot(favoritesQuery, (snapshot) => {
      console.log("Favorites snapshot:", snapshot.docs.length); // Debug log
      const favoritesData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as BookItem[];
      setFavorites(favoritesData);
    });

    // Fetch shelves
    const shelvesQuery = query(collection(db, "users", user.uid, "shelves"));
    const unsubscribeShelves = onSnapshot(shelvesQuery, (snapshot) => {
      console.log("Shelves snapshot:", snapshot.docs.length); // Debug log
      const shelvesData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as BookItem[];

      setCurrentlyReading(shelvesData.filter(book => book.shelfType === 'currently-reading'));
      setWantToRead(shelvesData.filter(book => book.shelfType === 'want-to-read'));
      setFinishedReading(shelvesData.filter(book => book.shelfType === 'finished'));
    });

    return () => {
      unsubscribeFavorites();
      unsubscribeShelves();
    };
  }, [user, router]);

  // Add this for debugging
  useEffect(() => {
    console.log("Current state:", {
      favorites: favorites.length,
      currentlyReading: currentlyReading.length,
      wantToRead: wantToRead.length,
      finishedReading: finishedReading.length
    });
  }, [favorites, currentlyReading, wantToRead, finishedReading]);

  const BookShelf = ({ title, books, icon }: { title: string; books: BookItem[]; icon?: string }) => (
    <div>
      <h2 className="text-[#DFDDCE] text-3xl font-bold mb-4">
        {title} {icon}
      </h2>
      <div className="relative bg-[#847266] border-t-8 border-b-8 border-[#3D2F2A] h-44 flex items-center">
        <div className="flex space-x-4 overflow-x-auto px-4">
          {books.length > 0 ? (
            books.map((book) => (
              <div
                key={book.bookId}
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
            <div className="flex items-center justify-center w-full">
              <p className="text-[#DFDDCE] italic">No books added yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!user) {
    console.log("No user, returning null"); // Debug log
    return null;
  }

  return (
    <div className="bg-[#5A7463] min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <BookShelf title="Favorites" books={favorites} icon="❤️" />
        <BookShelf title="Currently Reading" books={currentlyReading} />
        <BookShelf title="Want to Read" books={wantToRead} />
        <BookShelf title="Finished Reading" books={finishedReading} />
      </div>
    </div>
  );
}