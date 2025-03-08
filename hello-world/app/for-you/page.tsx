'use client';

import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from "@/firebase";
import { collection, query, where, onSnapshot, DocumentData } from "firebase/firestore";

interface Book {
  title: string;
  author: string;
  coverUrl: string;
}

// Hardcoded list of top 10 books
const topBooksList: Book[] = [
  { title: "ALl Fours", author: "Miranda July", coverUrl: "https://covers.openlibrary.org/b/olid/OL51098015M-M.jpg"},
  { title: "Good Material", author: "Dolly Alderton", coverUrl: "https://covers.openlibrary.org/b/olid/OL50718238M-M.jpg"},
  { title: "James", author: "Percival Everett", coverUrl: "https://covers.openlibrary.org/b/olid/OL51613391M-M.jpg"},
  { title: "You Dreamed of Empires", author: "Álvaro Enrigue", coverUrl: "https://covers.openlibrary.org/b/olid/OL50709435M-M.jpg"},
  { title: "Cold Crematorium", author: "József Debreczeni", coverUrl: "https://covers.openlibrary.org/b/olid/OL51083358M-M.jpg"},
  { title: "Everyone Who Is Gone Is Here", author: " Jonathan Blitzer", coverUrl: "https://covers.openlibrary.org/b/olid/OL50728881M-M.jpg"},
  { title: "I Heard Her Call My Name", author: "Lucy Sante", coverUrl: "https://covers.openlibrary.org/b/olid/OL51100380M-M.jpg"},
  { title: "Reagan: His Life and Legend", author: "Max Boot", coverUrl: "https://covers.openlibrary.org/b/olid/OL51133455M-M.jpg"},
  { title: "1984", author: "George Orwell", coverUrl: "https://covers.openlibrary.org/b/olid/OL36632156M-M.jpg"},
  { title: "Fahrenheit 451", author: "Ray Bradbury", coverUrl: "https://covers.openlibrary.org/b/olid/OL49348365M-M.jpg"},
];

// Function to search for a book key using the Open Library API
async function getBookKey(title: string, author: string): Promise<string | null> {
  try {
    // lenient search without exact matches
    let query = encodeURIComponent(`${title} ${author}`);
    let response = await fetch(`https://openlibrary.org/search.json?q=${query}&limit=10`);
    
    if (!response.ok) {
      console.error('Error searching for book:', response.statusText);
      return null;
    }
    
    let data = await response.json();
    
    // find the best match
    if (data.docs && data.docs.length > 0) {
      // find exact match
      const exactMatch = data.docs.find((book: Book) => 
          book.title && book.author && 
          book.title.toLowerCase() === title.toLowerCase() && 
          (book.author.toLowerCase().includes(author.toLowerCase()) || 
          author.toLowerCase().includes(book.author.toLowerCase()))
      );
      
      if (exactMatch && exactMatch.key) {
        return exactMatch.key.replace('/works/', '');
      }
      
      // with author that partially matches
      for (const book of data.docs) {
        if (book.title && book.author_name && book.key) {
          const titleSimilarity = title.toLowerCase().includes(book.title.toLowerCase()) || 
                                 book.title.toLowerCase().includes(title.toLowerCase());
                                 
          const authorMatch = book.author_name.some((name: string) => 
            author.toLowerCase().includes(name.toLowerCase()) || 
            name.toLowerCase().includes(author.toLowerCase())
          );
          
          if (titleSimilarity && authorMatch) {
            return book.key.replace('/works/', '');
          }
        }
      }
      
      // first result (fallback)
      if (data.docs[0].key) {
        return data.docs[0].key.replace('/works/', '');
      }
    }
    
    // title only
    query = encodeURIComponent(`title:${title}`);
    response = await fetch(`https://openlibrary.org/search.json?q=${query}&limit=5`);
    
    if (!response.ok) {
      return null;
    }
    
    data = await response.json();
    
    if (data.docs && data.docs.length > 0 && data.docs[0].key) {
      return data.docs[0].key.replace('/works/', '');
    }
    
    return null;
  } catch (error) {
    console.error('Error searching for book:', error);
    return null;
  }
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
    topBooks: topBooksList, // Use the hardcoded list here
  });
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});

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
    <div className="min-h-screen bg-custom-green font-['Outfit', sans-serif]">
      <Section 
        title="Read Next" 
        books={recommendations.readNext.slice(0, 10)} 
      />
      <Section 
        title="Try Something New" 
        books={recommendations.youMayLike.slice(0, 10)} 
      />
      <Section 
        title="Top books of the Year" 
        books={recommendations.topBooks.slice(0, 7)} 
      />
    </div>
  );
}

interface SectionProps {
  title: string;
  books: { title: string; author: string; coverUrl: string }[];
}

function Section({ title, books }: SectionProps) {
  const router = useRouter();
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const [loadingBooks, setLoadingBooks] = useState<{ [key: string]: boolean }>({});

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

  const handleBookClick = async (book: { title: string; author: string }) => {
    // Create a unique key for this book based on title and author
    const bookKey = `${book.title}-${book.author}`;
    
    // Set loading state for this book
    setLoadingBooks(prev => ({ ...prev, [bookKey]: true }));
    
    try {
      // Search for the book key using Open Library API
      const key = await getBookKey(book.title, book.author);
      
      if (key) {
        // Navigate to the book page
        router.push(`/books/${key}`);
      } else {
        // Handle case where key wasn't found
        console.error(`Book key not found for ${book.title} by ${book.author}`);
        // You could add a toast notification here to inform the user
        alert(`Sorry, we couldn't find the details for "${book.title}"`);
      }
    } catch (error) {
      console.error('Error navigating to book:', error);
    } finally {
      // Clear loading state for this book
      setLoadingBooks(prev => ({ ...prev, [bookKey]: false }));
    }
  };

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
            className="absolute left-0 top-0 h-full w-8 bg-custom-brown z-0"
            style={{ borderRight: '2px solid #847266' }}
          />
          <div
            className="absolute right-0 top-0 h-full w-8 bg-custom-brown z-0"
            style={{ borderLeft: '2px solid #847266' }}
          />

          {/* Scroll Buttons */}
          <button
            onClick={scrollLeft}
            className={`absolute left-0 top-0 h-full w-8 flex items-center justify-center bg-custom-brown text-white z-10 hover:bg-[#2E221E] transition-colors ${
              scrollPosition <= 0 ? '' : ''
            }`}
            style={{ borderRight: '2px solid #847266' }}
            disabled={scrollPosition <= 0}
          >
            &lt;
          </button>

          <button
            onClick={scrollRight}
            className={`absolute right-0 top-0 h-full w-8 flex items-center justify-center bg-custom-brown text-white z-10 hover:bg-[#2E221E] transition-colors ${
              scrollPosition >= maxScroll ? '' : ''
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
              books.map((book, index) => {
                const bookKey = `${book.title}-${book.author}`;
                const isLoading = loadingBooks[bookKey];
                
                return (
                  <div
                    key={index}
                    className="bg-custom-brown w-[150px] h-[250px] rounded-lg flex items-center justify-center text-white text-sm p-2 relative flex-shrink-0 cursor-pointer transition-transform hover:scale-105"
                    style={{ 
                      backgroundImage: `url(${book.coverUrl})`, 
                      backgroundSize: 'cover', 
                      backgroundPosition: 'center',
                      opacity: isLoading ? 0.6 : 1
                    }}
                    onClick={() => handleBookClick(book)}
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
                    {/* Loading indicator */}
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    )}
                    
                    {/* Show title and author if coverUrl is missing */}
                    {!book.coverUrl && (
                      <div className="text-center">
                        <p className="font-bold">{book.title}</p>
                        <p className="text-xs">{book.author}</p>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-white">Loading...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}