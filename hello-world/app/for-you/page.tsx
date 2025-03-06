'use client';

import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { db } from "@/firebase";
import { collection, query, where, onSnapshot, DocumentData } from "firebase/firestore";
import Image from 'next/image';

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

  const [scrollPositions, setScrollPositions] = useState<{ [key: string]: number }>({});
  const [maxScrolls, setMaxScrolls] = useState<{ [key: string]: number }>({});

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

  useEffect(() => {
    const sections = [
      { type: 'readNext', books: recommendations.readNext },
      { type: 'youMayLike', books: recommendations.youMayLike },
      { type: 'topBooks', books: recommendations.topBooks },
    ];

    sections.forEach(section => {
      const container = document.getElementById(`scroll-container-${section.type}`);
      if (container) {
        const handleScroll = () => {
          setScrollPositions(prev => ({
            ...prev,
            [section.type]: container.scrollLeft
          }));
          setMaxScrolls(prev => ({
            ...prev,
            [section.type]: container.scrollWidth - container.clientWidth
          }));
        };

        // Initialize scroll positions
        handleScroll();
        
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
      }
    });
  }, [recommendations]);

  const scrollLeft = (sectionType: string) => {
    const container = document.getElementById(`scroll-container-${sectionType}`);
    if (container) {
      container.scrollBy({ left: -170, behavior: 'smooth' }); // Scroll by one book width
    }
  };

  const scrollRight = (sectionType: string) => {
    const container = document.getElementById(`scroll-container-${sectionType}`);
    if (container) {
      container.scrollBy({ left: 170, behavior: 'smooth' }); // Scroll by one book width
    }
  };

  if (!user) return null;

  return (
    <div className="bg-[#5A7463] min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <Section title="Read Next" books={recommendations.readNext.slice(0, 10)} type="readNext" scrollPositions={scrollPositions} maxScrolls={maxScrolls} scrollLeft={scrollLeft} scrollRight={scrollRight} />
        <Section title="Try Something New" books={recommendations.youMayLike.slice(0, 10)} type="youMayLike" scrollPositions={scrollPositions} maxScrolls={maxScrolls} scrollLeft={scrollLeft} scrollRight={scrollRight} />
        <Section title="Top books of the Year" books={recommendations.topBooks.slice(0, 2)} type="topBooks" scrollPositions={scrollPositions} maxScrolls={maxScrolls} scrollLeft={scrollLeft} scrollRight={scrollRight} />
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  books: { title: string; author: string; coverUrl: string }[];
  type: string;
  scrollPositions: { [key: string]: number };
  maxScrolls: { [key: string]: number };
  scrollLeft: (sectionType: string) => void;
  scrollRight: (sectionType: string) => void;
}

function Section({ title, books, type, scrollPositions, maxScrolls, scrollLeft, scrollRight }: SectionProps) {
  const leftShadowStyle: React.CSSProperties = {
    position: 'absolute',
    left: '30px',
    top: '0',
    height: '100%',
    width: '40px',
    background: 'linear-gradient(to right, #3D2F2A, rgba(90, 57, 44, 0))',
    pointerEvents: 'none',
    zIndex: 5,
    transition: 'opacity 0.3s ease',
  };

  const rightShadowStyle: React.CSSProperties = {
    position: 'absolute',
    right: '35px',
    top: '0',
    height: '100%',
    width: '40px',
    background: 'linear-gradient(to left, #3D2F2A, rgba(90, 57, 44, 0))',
    pointerEvents: 'none',
    zIndex: 5,
    transition: 'opacity 0.3s ease',
  };

  const scrollButtonStyle: React.CSSProperties = {
    position: 'absolute',
    right: '0',
    top: '0',
    height: '100%',
    width: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3D2F2A',
    color: '#FFF',
    zIndex: 10, // Higher than the shadow
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-custom-tan text-2xl font-bold">{title}</h2>
      </div>
      <div className="relative bg-light-brown border-t-8 border-b-8 border-[#3D2F2A] h-72">
        <button
          onClick={() => scrollLeft(type)}
          className={`absolute left-0 top-0 h-full w-8 flex items-center justify-center bg-custom-brown text-custom-tan z-10 hover:bg-[#2E221E] transition-colors ${
            !scrollPositions[type] || scrollPositions[type] <= 0 ? '' : ''
          }`}
          style={{ borderRight: '2px solid #3D2F2A' }}
          disabled={!scrollPositions[type] || scrollPositions[type] <= 0}
        >
          &lt;
        </button>

        {/* Left Shadow */}
        {scrollPositions[type] > 5 && (
          <div style={{ ...leftShadowStyle, opacity: scrollPositions[type] > 0 ? 1 : 0 }}></div>
        )}

        {/* Right Shadow */}
        {maxScrolls[type] > 0 && scrollPositions[type] < maxScrolls[type] - 5 && (
          <div style={{ ...rightShadowStyle, opacity: scrollPositions[type] < maxScrolls[type] ? 1 : 0 }}></div>
        )}

        {/* Right Scroll Button */}
        <button
          onClick={() => scrollRight(type)}
          style={scrollButtonStyle}
          disabled={!maxScrolls[type] || !scrollPositions[type] || scrollPositions[type] >= maxScrolls[type]}
        >
          &gt;
        </button>

        {/* Books Container */}
        <div
          id={`scroll-container-${type}`}
          className="relative bottom-1 flex space-x-5 overflow-x-auto no-scrollbar"
          style={{ width: 'calc(100% - 16px)', marginLeft: '8px', marginRight: '8px', paddingRight: '40px', paddingLeft: '40px' }}
        >
          {books.length > 0 ? (
            books.map((book, index) => (
              <div key={index} className="flex-shrink-0 cursor-pointer relative group mt-4">
                <Image
                  src={book.coverUrl}
                  alt={book.title}
                  width={128}
                  height={144}
                  className="w-[150px] h-[250px] rounded-lg object-cover bg-custom-brown"
                />
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center w-full h-full text-custom-tan text-lg italic">
              Add books to Finished reading to get recommendations
            </div>
          )}
        </div>
      </div>
    </div>
  );
}