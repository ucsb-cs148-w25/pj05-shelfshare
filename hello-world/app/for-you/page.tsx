'use client';

import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { db } from "@/firebase";
import { collection, query, where, onSnapshot, DocumentData, getDocs } from "firebase/firestore";
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Book {
  title: string;
  author: string;
  coverUrl: string;
  bookId?: string;
  frequency?: number; // Add frequency field to track duplicates
}

// Hardcoded list of top 10 books
const topBooksList: Book[] = [
  { title: "ALl Fours", author: "Miranda July", coverUrl: "https://covers.openlibrary.org/b/olid/OL51098015M-M.jpg", bookId: "OL37827700W" },
  { title: "Good Material", author: "Dolly Alderton", coverUrl: "https://covers.openlibrary.org/b/olid/OL50718238M-M.jpg", bookId: "OL35714854W" },
  { title: "James", author: "Percival Everett", coverUrl: "https://covers.openlibrary.org/b/olid/OL51613391M-M.jpg", bookId: "OL36506504W" },
  { title: "You Dreamed of Empires", author: "Álvaro Enrigue", coverUrl: "https://covers.openlibrary.org/b/olid/OL50709435M-M.jpg", bookId: "OL35720233W" },
  { title: "Cold Crematorium", author: "József Debreczeni", coverUrl: "https://covers.openlibrary.org/b/olid/OL51083358M-M.jpg", bookId: "OL31473516W" },
  { title: "Everyone Who Is Gone Is Here", author: " Jonathan Blitzer", coverUrl: "https://covers.openlibrary.org/b/olid/OL50728881M-M.jpg", bookId: "OL37572496W" },
  { title: "I Heard Her Call My Name", author: "Lucy Sante", coverUrl: "https://covers.openlibrary.org/b/olid/OL51100380M-M.jpg", bookId: "OL37568416W" },
  { title: "Reagan: His Life and Legend", author: "Max Boot", coverUrl: "https://covers.openlibrary.org/b/olid/OL51133455M-M.jpg", bookId: "OL37878585W" },
  { title: "1984", author: "George Orwell", coverUrl: "https://covers.openlibrary.org/b/olid/OL36632156M-M.jpg", bookId: "OL1168083W" },
  { title: "Fahrenheit 451", author: "Ray Bradbury", coverUrl: "https://covers.openlibrary.org/b/olid/OL49348365M-M.jpg", bookId: "OL103123W" },
];

export default function ForYou() {
  const { user } = useAuth();
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<{
    readNext: Book[];
    youMayLike: Book[];
    topBooks: Book[];
    friendsFavorites: Book[];
  }>({
    readNext: [],
    youMayLike: [],
    topBooks: topBooksList,
    friendsFavorites: [],
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

  useEffect(() => {
    if (!user) return;

    // Fetch user's friends
    const friendsQuery = query(collection(db, "users", user.uid, "friends"));

    const unsubscribeFriends = onSnapshot(friendsQuery, async (friendsSnapshot) => {
      const friendIds = friendsSnapshot.docs.map(doc => doc.id);

      // Fetch favorite books from each friend
      const friendsFavoritesPromises = friendIds.map(async (friendId) => {
        const friendFavoritesQuery = query(
          collection(db, "users", friendId, "favorites")
        );
        const friendFavoritesSnapshot = await getDocs(friendFavoritesQuery);
        return friendFavoritesSnapshot.docs.map(doc => {
          const data = doc.data() as DocumentData;
          return {
            title: data.title || "Unknown Title",
            author: data.author || "Unknown Author",
            coverUrl: data.coverUrl || "",
            bookId: data.bookId || "",
          };
        });
      });

      const allFriendsFavorites = (await Promise.all(friendsFavoritesPromises)).flat();

      // Count occurrences of each book based on title and author
      const bookOccurrences = new Map<string, Book & { frequency: number }>();
      
      allFriendsFavorites.forEach(book => {
        const bookKey = `${book.title}|${book.author}`;
        if (bookOccurrences.has(bookKey)) {
          const existingBook = bookOccurrences.get(bookKey)!;
          existingBook.frequency += 1;
        } else {
          bookOccurrences.set(bookKey, { ...book, frequency: 1 });
        }
      });

      // Convert to array, sort by frequency (highest first), then by title
      const uniqueSortedBooks = Array.from(bookOccurrences.values())
        .sort((a, b) => {
          // First sort by frequency (descending)
          if (b.frequency !== a.frequency) {
            return b.frequency - a.frequency;
          }
          // Then sort alphabetically by title if frequencies are equal
          return a.title.localeCompare(b.title);
        });

      // Update recommendations state with sorted friends' favorite books
      setRecommendations(prev => ({
        ...prev,
        friendsFavorites: uniqueSortedBooks.slice(0, 10), // Limit to 10 books
      }));
    });

    return () => {
      unsubscribeFriends();
    };
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
  
      setRecommendations(prev => ({
        ...prev,
        readNext: recommendationsWithCovers,
        youMayLike: newGenresWithCovers,
        topBooks: topBooksList, // Use the hardcoded list here
      }));
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
  }

  useEffect(() => {
    const sections = [
      { type: 'readNext', books: recommendations.readNext },
      { type: 'youMayLike', books: recommendations.youMayLike },
      { type: 'topBooks', books: recommendations.topBooks },
      { type: 'friendsFavorites', books: recommendations.friendsFavorites }, 
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
        <Section title="Top books of the Year" books={recommendations.topBooks.slice(0, 10)} type="topBooks" scrollPositions={scrollPositions} maxScrolls={maxScrolls} scrollLeft={scrollLeft} scrollRight={scrollRight} onBookClick={(bookId) => bookId && router.push(`/books/${bookId}`)} />
        <Section title="Read Next" books={recommendations.readNext.slice(0, 10)} type="readNext" scrollPositions={scrollPositions} maxScrolls={maxScrolls} scrollLeft={scrollLeft} scrollRight={scrollRight} onBookClick={(bookId) => bookId && router.push(`/books/${bookId}`)} />
        <Section title="Try Something New" books={recommendations.youMayLike.slice(0, 10)} type="youMayLike" scrollPositions={scrollPositions} maxScrolls={maxScrolls} scrollLeft={scrollLeft} scrollRight={scrollRight} onBookClick={(bookId) => bookId && router.push(`/books/${bookId}`)} />
        <Section 
          title="Your Friends' Favorites" 
          books={recommendations.friendsFavorites.slice(0, 10)} 
          type="friendsFavorites" 
          scrollPositions={scrollPositions} 
          maxScrolls={maxScrolls} 
          scrollLeft={scrollLeft} 
          scrollRight={scrollRight} 
          onBookClick={(bookId) => bookId && router.push(`/books/${bookId}`)}
          showFrequency={true} // Optional prop to show frequency if needed
        />
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  books: { title: string; author: string; coverUrl: string; bookId?: string; frequency?: number }[];
  type: string;
  scrollPositions: { [key: string]: number };
  maxScrolls: { [key: string]: number };
  scrollLeft: (sectionType: string) => void;
  scrollRight: (sectionType: string) => void;
  onBookClick: (bookId?: string) => void;
  showFrequency?: boolean; // Optional prop to show frequency badges
}

function Section({ title, books, type, scrollPositions, maxScrolls, scrollLeft, scrollRight, onBookClick, showFrequency }: SectionProps) {
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
    zIndex: 10, 
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
          {/* Books Container */}
          <div
            id={`scroll-container-${type}`}
            className="relative bottom-1 flex space-x-5 overflow-x-auto no-scrollbar"
            style={{ width: 'calc(100% - 16px)', marginLeft: '8px', marginRight: '8px', paddingRight: '40px', paddingLeft: '40px' }}
          >
            {books.length > 0 ? (
              books.map((book, index) => (
                <div 
                  key={index} 
                  className="flex-shrink-0 cursor-pointer relative group mt-4"
                  onClick={() => onBookClick(book.bookId)}
                >
                  <Image
                    src={book.coverUrl}
                    alt={book.title}
                    width={128}
                    height={144}
                    className="w-[150px] h-[250px] rounded-lg object-cover bg-custom-brown"
                    onError={(e) => {
                      // Fallback if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML += `
                        <div class="w-[150px] h-[250px] rounded-lg bg-custom-brown flex items-center justify-center p-2">
                          <div class="text-center text-custom-tan">
                            <p class="font-bold">${book.title}</p>
                            <p class="text-xs">${book.author}</p>
                          </div>
                        </div>
                      `;
                    }}
                  />

                  {/* Frequency badge for friends' favorites - optional display */}
                  {showFrequency && book.frequency && book.frequency > 1 && (
                    <div className="absolute -top-3 -right-3 bg-[#3D2F2A] text-custom-tan rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                      {book.frequency}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center w-full h-full text-custom-tan text-lg italic">
                {type === 'friendsFavorites' 
                  ? "Add friends to see their favorite books" 
                  : "Add books to Finished reading to get personalized recommendations"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}