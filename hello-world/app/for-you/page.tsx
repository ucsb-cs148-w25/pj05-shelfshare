// for-you/page.tsx

'use client';

import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { db } from "@/firebase";
import { collection, query, where, onSnapshot, DocumentData } from "firebase/firestore";

interface Book {
  title: string;
  author: string;
  coverUrl: string;
}

export default function ForYou() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<{
    readNext: Book[];
    youMayLike: Book[];
    topBooks: Book[];
  }>({
    readNext: [],
    youMayLike: [],
    topBooks: [],
  });

  useEffect(() => {
    if (!user) return;

    const shelvesQuery = query(
      collection(db, "users", user.uid, "shelves"),
      where("shelfType", "==", "finished")
    );

    const unsubscribe = onSnapshot(shelvesQuery, (snapshot) => {
      const books = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        return {
          title: data.title || "Unknown Title",
          author: data.author || "Unknown Author",
          coverUrl: data.coverUrl || "",
        };
      });
      if (books.length > 0) {
        generateRecommendations(books);
      }
    });

    return () => unsubscribe();
  }, [user]);

  async function generateRecommendations(books: Book[]) {
    try {
      console.log("Sending request to /api/ai-recommend with payload:", { 
        books: books.map(book => ({ title: book.title, author: book.author })) 
      });
  
      const response = await fetch('/api/ai-recommend', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          books: books.map(book => ({ title: book.title, author: book.author })) 
        }),
      });
  
      console.log("Response status:", response.status);
  
      if (!response.ok) {
        const errorResponse = await response.text();
        console.error("Error response from API:", errorResponse);
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
  
      const data = await response.json();
      console.log("AI Recommendations Response:", data);
  
      const fetchCovers = async (books: { title: string, author: string }[]) => {
        return books.map(book => ({
          ...book,
          coverUrl: `https://covers.openlibrary.org/b/olid/${encodeURIComponent(book.title)}-M.jpg`, 
        }));
      };
  
      const recommendationsWithCovers = await fetchCovers(data.recommendations || []);
      const newGenresWithCovers = await fetchCovers(data.newGenres || []);
      const topBooksWithCovers = await fetchCovers(data.topBooks || []);
  
      setRecommendations({
        readNext: recommendationsWithCovers,
        youMayLike: newGenresWithCovers,
        topBooks: topBooksWithCovers,
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#5A7463] font-['Outfit', sans-serif]">
      <Section title="Read Next" books={recommendations.readNext.slice(0, 4)} />
      <Section title="You may also like..." books={recommendations.youMayLike.slice(0, 4)} />
      <Section title="Top 10 books of the Year" books={recommendations.topBooks.slice(0, 4)} />
    </div>
  );  
}

interface SectionProps {
  title: string;
  books: { title: string; coverUrl: string }[];
} 

function Section({ title, books }: SectionProps) {
  return (
    <div className="flex flex-col items-center mt-12 w-full">
      <div className="relative w-full">
        <div
          className="font-bold items-center text-3xl mt-6"
          style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif', marginLeft: 'calc((100% - 1030px) / 2)' }}
        >
          {title}
        </div>
        <div
          className="relative w-[1030px] h-[300px] mt-2 mx-auto"
          style={{ backgroundColor: '#847266', borderTop: '10px solid #3D2F2A', borderBottom: '10px solid #3D2F2A' }}
        >
          <div className="relative top-4 left-3 flex space-x-5">
            {books.length > 0 ? (
              books.map((book, index) => (
                <div
                  key={index}
                  className="bg-[#3D2F2A] w-[150px] h-[250px] rounded-lg flex items-center justify-center text-white text-sm p-2"
                  style={{ backgroundImage: `url(${book.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  {book.title}
                </div>
              ))
            ) : (
              <p className="text-white">Loading...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}