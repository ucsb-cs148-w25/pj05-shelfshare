'use client';
// for-you/page.tsx

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

  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) return;
  
    // Fetch user's finished books directly from Firebase
    const shelvesQuery = query(
      collection(db, "users", user.uid, "shelves"),
      where("shelfType", "==", "finished") // Only fetch finished books
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

  // Function to generate AI-based book recommendations
  async function generateRecommendations(books: Book[]) {
    try {
      const response = await fetch('/api/ai-recommend', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books }), // Send only titles to AI -- books: books.map(book => book.title)
      });

      const data = await response.json();
      
      console.log("AI Recommendations Response:", data); // Debugging log

      const fetchCovers = async (books: { title: string, author: string }[]) => {
        return books.map(book => ({
          ...book,
          coverUrl: `https://covers.openlibrary.org/b/olid/${encodeURIComponent(book.title)}-M.jpg`, 
        }));
      };

      // Fetch covers for each recommendation list
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

  if (!user) return null; // Avoid rendering while redirecting

  return (
    <div className="min-h-screen bg-[#5A7463] font-['Outfit', sans-serif]">
      {/* Read Next Section */}
      <Section title="Read Next" books={recommendations.readNext.slice(0, 4)} />
  
      {/* AI-Recommended Section */}
      <Section title="You may also like..." books={recommendations.youMayLike.slice(0, 4)} />
  
      {/* Top 10 Books of the Year */}
      <Section title="Top 10 books of the Year" books={recommendations.topBooks.slice(0, 4)} />
    </div>
  );  
}

interface SectionProps {
  title: string;
  books: { title: string; coverUrl: string }[];
} 

// Reusable Book Display Component
function Section({ title, books }: SectionProps) {
  return (
    <div className="flex flex-col items-center mt-12 w-full">
      <div className="relative w-full">
        {/* Section Title */}
        <div
          className="font-bold items-center text-3xl mt-6"
          style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif', marginLeft: 'calc((100% - 1030px) / 2)' }}
        >
          {title}
        </div>

        {/* Shelf Background */}
        <div
          className="relative w-[1030px] h-[300px] mt-2 mx-auto"
          style={{ backgroundColor: '#847266', borderTop: '10px solid #3D2F2A', borderBottom: '10px solid #3D2F2A' }}
        >
          {/* Books Display */}
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
  