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

// Hardcoded list of top 10 books
const topBooksList: Book[] = [
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", coverUrl: "https://covers.openlibrary.org/b/olid/OL22864904M-M.jpg" },
  { title: "To Kill a Mockingbird", author: "Harper Lee", coverUrl: "https://covers.openlibrary.org/b/olid/OL8050340M-M.jpg" },
  { title: "1984", author: "George Orwell", coverUrl: "https://covers.openlibrary.org/b/olid/23745689M-M.jpg" },
  { title: "Pride and Prejudice", author: "Jane Austen", coverUrl: "https://covers.openlibrary.org/b/olid/OL34974914M-M.jpg" },
  { title: "The Catcher in the Rye", author: "J.D. Salinger", coverUrl: "https://covers.openlibrary.org/b/olid/OL24288435M-M.jpg" },
  { title: "The Hobbit", author: "J.R.R. Tolkien", coverUrl: "https://covers.openlibrary.org/b/olid/OL27320742M-M.jpg" },
  { title: "Fahrenheit 451", author: "Ray Bradbury", coverUrl: "https://covers.openlibrary.org/b/olid/OL24963144M-M.jpg" },
  { title: "Moby-Dick", author: "Herman Melville", coverUrl: "https://covers.openlibrary.org/b/olid/OL24963144M-M.jpg" },
  { title: "War and Peace", author: "Leo Tolstoy", coverUrl: "https://covers.openlibrary.org/b/olid/OL24963144M-M.jpg" },
  { title: "The Odyssey", author: "Homer", coverUrl: "https://covers.openlibrary.org/b/olid/OL24963144M-M.jpg" },
];

export default function ForYou() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<{
    readNext: Book[];
    youMayLike: Book[];
    topBooks: Book[];
  }>({
    readNext: [],
    youMayLike: [],
    topBooks: topBooksList, // Use the hardcoded list here
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
          coverUrl: `https://covers.openlibrary.org/b/title/${encodeURIComponent(book.title)}-M.jpg`,
        }));
      };

      const recommendationsWithCovers = await fetchCovers(data.recommendations || []);
      const newGenresWithCovers = await fetchCovers(data.newGenres || []);

      setRecommendations({
        readNext: recommendationsWithCovers,
        youMayLike: newGenresWithCovers,
        topBooks: topBooksList, // Use the hardcoded list here
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#5A7463] font-['Outfit', sans-serif]">
      <Section title="Read Next" books={recommendations.readNext.slice(0, 10)} />
      <Section title="Try Something New" books={recommendations.youMayLike.slice(0, 10)} />
      <Section title="Top books of the Year" books={recommendations.topBooks.slice(0, 2)} />
    </div>
  );
}

interface SectionProps {
  title: string;
  books: { title: string; author: string; coverUrl: string }[];
}

function Section({ title, books }: SectionProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);

  const scrollLeft = () => {
    const container = document.getElementById(`scroll-container-${title}`);
    if (container) {
      container.scrollBy({ left: -170, behavior: 'smooth' }); // Scroll by one book width
      setScrollPosition(container.scrollLeft);
    }
  };

  const scrollRight = () => {
    const container = document.getElementById(`scroll-container-${title}`);
    if (container) {
      container.scrollBy({ left: 170, behavior: 'smooth' }); // Scroll by one book width
      setScrollPosition(container.scrollLeft);
    }
  };

  useEffect(() => {
    const container = document.getElementById(`scroll-container-${title}`);
    if (container) {
      const handleScroll = () => {
        setScrollPosition(container.scrollLeft);
        setMaxScroll(container.scrollWidth - container.clientWidth);
      };

      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [title]);

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
          {/* Background Bar for Scroll Buttons */}
          <div
            className="absolute left-0 top-0 h-full w-8 bg-[#3D2F2A] z-0"
            style={{ borderRight: '2px solid #847266' }}
          />
          <div
            className="absolute right-0 top-0 h-full w-8 bg-[#3D2F2A] z-0"
            style={{ borderLeft: '2px solid #847266' }}
          />

          {/* Scroll Buttons */}
          <button
            onClick={scrollLeft}
            className={`absolute left-0 top-0 h-full w-8 flex items-center justify-center bg-[#3D2F2A] text-white z-10 hover:bg-[#2E221E] transition-colors ${
              scrollPosition <= 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{ borderRight: '2px solid #847266' }}
            disabled={scrollPosition <= 0}
          >
            &lt;
          </button>

          <button
            onClick={scrollRight}
            className={`absolute right-0 top-0 h-full w-8 flex items-center justify-center bg-[#3D2F2A] text-white z-10 hover:bg-[#2E221E] transition-colors ${
              scrollPosition >= maxScroll ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{ borderLeft: '2px solid #847266' }}
            disabled={scrollPosition >= maxScroll}
          >
            &gt;
          </button>

          {/* Books Display with Horizontal Scroll */}
          <div
            id={`scroll-container-${title}`}
            className="relative top-4 left-3 flex space-x-5 overflow-x-auto no-scrollbar"
            style={{ width: 'calc(100% - 85px)', marginLeft: '32px', marginRight: '32px' }}
          >
            {books.length > 0 ? (
              books.map((book, index) => (
                <div
                  key={index}
                  className="bg-[#3D2F2A] w-[150px] h-[250px] rounded-lg flex items-center justify-center text-white text-sm p-2 relative flex-shrink-0"
                  style={{ 
                    backgroundImage: `url(${book.coverUrl})`, 
                    backgroundSize: 'cover', 
                    backgroundPosition: 'center' 
                  }}
                  onError={(e) => {
                    // Fallback to showing title and author if the cover image fails to load
                    const target = e.target as HTMLDivElement;
                    target.style.backgroundImage = 'none';
                    target.innerHTML = `
                      <div class="text-center">
                        <p class="font-bold">${book.title}</p>
                        <p class="text-xs">${book.author}</p>
                      </div>
                    `;
                  }}
                >
                  {/* Show title and author if coverUrl is missing */}
                  {!book.coverUrl && (
                    <div className="text-center">
                      <p className="font-bold">{book.title}</p>
                      <p className="text-xs">{book.author}</p>
                    </div>
                  )}
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