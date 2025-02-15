'use client';
// for-you/page.tsx

import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';

export default function ForYou() {
  const { user } = useAuth();
  const [userBooks, setUserBooks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) return;
  
    fetch(`/api/my-shelf?userId=${user.uid}`)
      .then((res) => res.json())
      .then((data) => {
        setUserBooks(data.books);
        generateRecommendations(data.books.map((book) => book.title)); // Send only titles
      })
      .catch((err) => console.error("Error fetching shelf:", err));
  }, [user]);  

  interface Book {
    title: string;
    cover:string;
  }

  // Function to generate AI-based book recommendations
  async function generateRecommendations(books: Book[]) {
    try {
      const response = await fetch('/api/ai-recommend.ts', { // Adjust endpoint as needed
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books }),
      });
      const data = await response.json();
      setRecommendations(data.recommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
  }

  if (!user) return null; // Avoid rendering while redirecting

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#5A7463', fontFamily: 'Outfit, sans-serif' }}
    >
      {/* Read Next Section */}
      <Section title="Read Next" books={userBooks.slice(0, 4)} />
      
      {/* AI-Recommended Section */}
      <Section title="You may also like..." books={recommendations.slice(0, 4)} />

      {/* Top 10 Books of the Year */}
      <Section title="Top 10 books of the Year" books={recommendations.slice(4, 8)} />
    </div>
  );
}

interface SectionProps {
  title: string;
  books: { title: string; cover: string }[];
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
                  style={{ backgroundImage: `url(${book.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
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
  