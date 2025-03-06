'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Book {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  rating?: number | null;
  first_publish_year?: number;
}

interface StarRatingProps {
  rating: number;
  maxStars?: number;
}

interface RatingData {
  summary: {
    average: number | null;
  };
}

export default function Browse() {
  const { user } = useAuth();
  const router = useRouter();

  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [filterMessage, setFilterMessage] = useState<string>('');
  const [minYear, setMinYear] = useState<string>('');
  const [maxYear, setMaxYear] = useState<string>('');
  const [showTrending, setShowTrending] = useState<boolean>(true); 

  // State for rating filter
  const [minRating, setMinRating] = useState<string>('');
  const [maxRating, setMaxRating] = useState<string>('');

  const genres = [
    'Fiction', 'Nonfiction', 'Adventure', 'Biography', 'Drama', 
    'Fantasy', 'History', 'Horror', 'Mystery', 'Philosophy', 
    'Poetry', 'Romance', 'Science Fiction', 'Thriller'
  ];

  const StarRating: React.FC<StarRatingProps> = ({ rating, maxStars = 5 }) => {
    return (
      <div className="flex items-center space-x-1">
        {[...Array(maxStars)].map((_, index) => (
          <div key={index} className="relative">
            <span
              className={`text-lg cursor-default ${
                index + 1 <= rating
                  ? "text-[#3D2F2A]"
                  : index + 0.5 === rating
                  ? "relative overflow-hidden inline before:content-['★'] before:absolute before:text-[#3D2F2A] before:overflow-hidden before:w-[50%] text-[#DFDDCE]"
                  : "text-[#DFDDCE]"
              }`}
            >
              ★
            </span>
          </div>
        ))}
        <span className="text-md text-[#3D2F2A] font-bold ml-2">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  const fetchRandomBooks = useCallback(async () => {
    setLoading(true);
    try {
      const randomGenres = ['fiction', 'nonfiction', 'fantasy', 'mystery', 'history']; 
      const randomGenre = randomGenres[Math.floor(Math.random() * randomGenres.length)];
      await fetchBooksBySubject(randomGenre);
    } catch (error) {
      console.error('Error fetching random books:', error);
      setLoading(false);
    }
  }, []);

  const fetchMoreBooks = async (subject: string | null, currentBooks: Book[]) => {
    try {
      let newBookList: Book[] = [];
      
      if (showTrending) {
        const res = await fetch(
          `https://openlibrary.org/trending/yearly.json?limit=50&offset=${currentBooks.length}`
        );
        if (!res.ok) throw new Error('Failed to fetch more trending books');
        
        const data = await res.json();
        newBookList = data.works.map((book: { 
          key: string;
          title: string;
          author_name?: string[];
          cover_i?: number;
          first_publish_year?: number;
        }) => ({
          key: book.key.replace('/works/', ''),
          title: book.title,
          author_name: book.author_name || [],
          cover_i: book.cover_i || null,
          first_publish_year: book.first_publish_year,
        }));
      } else if (subject) {
        // Original code for fetching by subject
        const formattedSubject = subject.toLowerCase().replace(/\s+/g, '-');
        const res = await fetch(
          `https://openlibrary.org/subjects/${formattedSubject}.json?limit=50&offset=${currentBooks.length}`
        );
        if (!res.ok) throw new Error('Failed to fetch more books');
    
        const data = await res.json();
        newBookList = data.works.map((book: { 
          key: string;
          title: string;
          authors?: { name: string }[];
          cover_id?: number;
          first_publish_year?: number;
        }) => ({
          key: book.key.replace('/works/', ''),
          title: book.title,
          author_name: book.authors?.map((a) => a.name) || [],
          cover_i: book.cover_id || null,
          first_publish_year: book.first_publish_year,
        }));
      }
      
      const newBooksWithRatings = await Promise.all(
        newBookList.map(async (book) => {
          try {
            const ratingRes = await fetch(
              `https://openlibrary.org/works/${book.key}/ratings.json`
            );
            if (!ratingRes.ok) return { ...book, rating: null };
    
            const ratingData: RatingData = await ratingRes.json();
            return {
              ...book,
              rating: ratingData.summary?.average || null,
            };
          } catch {
            return { ...book, rating: null };
          }
        })
      );
    
      return [...currentBooks, ...newBooksWithRatings];
    } catch (error) {
      console.error('Error fetching more books:', error);
      return currentBooks;
    }
  };

  const fetchTrendingBooks = async () => {
    setLoading(true);
    try {
      console.log("Fetching trending books");
      const res = await fetch(
        `https://openlibrary.org/trending/yearly.json?limit=50`
      );
      if (!res.ok) throw new Error('Failed to fetch trending books');
  
      const data = await res.json();
      console.log("Trending data received:", data.works.length, "books");
      
      const bookList: Book[] = data.works.map((book: { 
        key: string;
        title: string;
        author_name?: string[];
        cover_i?: number;
        first_publish_year?: number;
      }) => ({
        key: book.key.replace('/works/', ''),
        title: book.title,
        author_name: book.author_name || [],
        cover_i: book.cover_i || null,
        first_publish_year: book.first_publish_year,
      }));
      
      const booksWithRatings = await Promise.all(
        bookList.map(async (book) => {
          try {
            const ratingRes = await fetch(
              `https://openlibrary.org/works/${book.key}/ratings.json`
            );
            if (!ratingRes.ok) return { ...book, rating: null };
  
            const ratingData: RatingData = await ratingRes.json();
            return {
              ...book,
              rating: ratingData.summary?.average || null,
            };
          } catch {
            return { ...book, rating: null };
          }
        })
      );
  
      setBooks(booksWithRatings);
      setFilteredBooks(booksWithRatings);
      setFilterMessage('');
    } catch (error) {
      console.error('Error fetching trending books:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBooksBySubject = async (subject: string) => {
    setLoading(true);
    try {
      console.log(`Fetching books for subject: ${subject}`);
      const formattedSubject = subject.toLowerCase().replace(/\s+/g, '-');
      
      const res = await fetch(
        `https://openlibrary.org/subjects/${formattedSubject}.json?limit=50`
      );
      
      if (!res.ok) {
        console.error(`Failed to fetch books for ${subject}, status: ${res.status}`);
        throw new Error(`Failed to fetch books for ${subject}`);
      }
  
      const data = await res.json();
      console.log(`${subject} data received:`, data.works?.length || 0, "books");
      
      // Check if there are works in the response
      if (!data.works || data.works.length === 0) {
        console.warn(`No works found for subject: ${subject}`);
        setBooks([]);
        setFilteredBooks([]);
        setFilterMessage(`No books found for ${subject}`);
        setLoading(false);
        return;
      }
      
      const bookList: Book[] = data.works.map((book: { 
        key: string;
        title: string;
        authors?: { name: string }[];
        cover_id?: number;
        first_publish_year?: number;
      }) => ({
        key: book.key.replace('/works/', ''),
        title: book.title,
        author_name: book.authors?.map((a) => a.name) || [],
        cover_i: book.cover_id || null,
        first_publish_year: book.first_publish_year,
      }));
      
      const booksWithRatings = await Promise.all(
        bookList.map(async (book) => {
          try {
            const ratingRes = await fetch(
              `https://openlibrary.org/works/${book.key}/ratings.json`
            );
            if (!ratingRes.ok) return { ...book, rating: null };
  
            const ratingData: RatingData = await ratingRes.json();
            return {
              ...book,
              rating: ratingData.summary?.average || null,
            };
          } catch {
            return { ...book, rating: null };
          }
        })
      );
  
      setBooks(booksWithRatings);
      setFilteredBooks(booksWithRatings);
      setFilterMessage('');
    } catch (error) {
      console.error('Error fetching books by subject:', error);
      setBooks([]);
      setFilteredBooks([]);
      setFilterMessage(`Error fetching books for ${subject}`);
    } finally {
      setLoading(false);
    }
  };

  // This effect handles authentication redirect
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return; // Don't fetch if user isn't authenticated
      
      console.log("Data fetch effect triggered:", { showTrending, selectedGenre });
      
      if (showTrending) {
        await fetchTrendingBooks();
      } else if (selectedGenre) {
        await fetchBooksBySubject(selectedGenre);
      } else {
        await fetchRandomBooks();
      }
    };
    
    fetchData();
  }, [showTrending, selectedGenre, fetchRandomBooks, user]);

  const applyFilters = async () => {
    // Parse rating inputs
    let min = parseFloat(minRating);
    let max = parseFloat(maxRating);
    if (isNaN(min) || min < 0) min = 0;
    if (isNaN(max) || max > 5) max = 5;
    if (min > max) [min, max] = [max, min];
    
    // Parse year inputs
    let minPublishYear = parseInt(minYear);
    let maxPublishYear = parseInt(maxYear);
    const currentYear = new Date().getFullYear();
    if (isNaN(minPublishYear)) minPublishYear = 0;
    if (isNaN(maxPublishYear)) maxPublishYear = currentYear;
    if (minPublishYear > maxPublishYear) [minPublishYear, maxPublishYear] = [maxPublishYear, minPublishYear];
  
    // Clear any previous messages
    setFilterMessage('');
    
    // Apply filters to current set of books
    let filtered = books.filter(book => {
      // Check rating criteria
      const bookRating = typeof book.rating === 'number' ? book.rating : parseFloat(book.rating as unknown as string);
      const ratingMatch = isNaN(min) || (
        !isNaN(bookRating) && 
        (isNaN(min) || bookRating >= min) && 
        (isNaN(max) || bookRating <= max)
      );
      
      // Check year criteria - only if year filter is actually provided
      let yearMatch = true;
      if (minYear || maxYear) {
        yearMatch = book.first_publish_year !== undefined && 
                   book.first_publish_year >= minPublishYear && 
                   book.first_publish_year <= maxPublishYear;
      }
      
      // Book must match both criteria
      return ratingMatch && yearMatch;
    });
    
    // Same logic for fetching more books if needed
    if (filtered.length < 20 && (selectedGenre || showTrending)) {
      setLoading(true);
      
      let currentBooks = [...books];
      let attempts = 0;
      const maxAttempts = 6;
      
      while (filtered.length < 20 && attempts < maxAttempts) {
        attempts++;
        
        // Fetch more books
        const moreBooks = await fetchMoreBooks(selectedGenre, currentBooks);
        
        if (moreBooks.length === currentBooks.length) {
          break;
        }
        
        currentBooks = moreBooks;
        
        // Apply both filters to the expanded set
        filtered = currentBooks.filter(book => {
          const bookRating = typeof book.rating === 'number' ? book.rating : parseFloat(book.rating as unknown as string);
          const ratingMatch = isNaN(min) || (
            !isNaN(bookRating) && 
            (isNaN(min) || bookRating >= min) && 
            (isNaN(max) || bookRating <= max)
          );
          
          let yearMatch = true;
          if (minYear || maxYear) {
            yearMatch = book.first_publish_year !== undefined && 
                       book.first_publish_year >= minPublishYear && 
                       book.first_publish_year <= maxPublishYear;
          }
          
          return ratingMatch && yearMatch;
        });
      }
      
      setBooks(currentBooks);
      
      if (filtered.length < 20) {
        setFilterMessage(`Showing ${filtered.length} results for your filter criteria.`);
      }
      
      setLoading(false);
    }
    
    setFilteredBooks(filtered);
  };

  const selectGenre = (genre: string) => {
    console.log(`Selecting genre: ${genre}`);
    if (selectedGenre === genre && !showTrending) {
      return;
    }
    
    setShowTrending(false);
    setSelectedGenre(genre);
  };

  const selectTrending = () => {
    console.log("Selecting trending");
    if (showTrending) {
      return;
    }
    
    setSelectedGenre(null);
    setShowTrending(true);
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="bg-[#5A7463] min-h-screen p-12">
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-4 overflow-x-auto pb-2 max-w-full">
          <span className="text-lg font-bold text-[#DFDDCE] whitespace-nowrap">Genre</span>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={selectTrending}
              className={`px-4 py-2 rounded-[15px] shadow-md font-bold transition-colors whitespace-nowrap 
                ${showTrending ? 'bg-[#3D2F2A] text-[#DFDDCE]' : 'bg-[#DFDDCE] text-[#3D2F2A]'} 
                hover:bg-[#3D2F2A] hover:text-[#DFDDCE]`}
            >
              Popular
            </button>
            
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => selectGenre(genre.toLowerCase())}
                className={`px-4 py-2 font-bold rounded-[15px] shadow-md transition-colors whitespace-nowrap 
                  ${
                    selectedGenre === genre.toLowerCase() && !showTrending
                      ? 'bg-[#3D2F2A] text-[#DFDDCE]'
                      : 'bg-[#DFDDCE] text-[#3D2F2A]'
                  } 
                  hover:bg-[#3D2F2A] hover:text-[#DFDDCE]`}
              >
                {genre}
              </button>
            ))}
          </div>

        </div>
      </div>

      <div className="flex mt-6 gap-6">
        <div className="p-4 rounded-lg bg-[#DFDDCE] h-[300px] w-[250px]">
          <h3 className="text-2xl font-bold text-[#3D2F2A] mb-4">Filter By:</h3>
          <div>
            <label className="block text-xl font-bold text-[#3D2F2A]">Average Rating</label>
            <div className="flex space-x-2 mt-1">
              <input 
                type="number" 
                value={minRating} 
                onChange={(e) => setMinRating(e.target.value)} 
                className="w-16 px-2 py-1 rounded text-[#3D2F2A]" 
                placeholder="Min" 
              />
              <span
              className="py-1 rounded text-[#3D2F2A]" 
              >to</span>
              <input 
                type="number" 
                value={maxRating} 
                onChange={(e) => setMaxRating(e.target.value)} 
                className="w-16 px-2 py-1 rounded text-[#3D2F2A]" 
                placeholder="Max" 
              />
            </div>
          </div>
              
          <div className="mb-2 mt-4">
            <label className="block text-xl font-bold text-[#3D2F2A]">Year Published</label>
            <div className="flex space-x-2 mt-1">
              <input 
                type="number" 
                value={minYear} 
                onChange={(e) => setMinYear(e.target.value)} 
                className="w-20 px-2 py-1 rounded text-[#3D2F2A]" 
                placeholder="From" 
              />
              <span
              className="py-1 rounded text-[#3D2F2A]" 
              >to</span>
              <input 
                type="number" 
                value={maxYear} 
                onChange={(e) => setMaxYear(e.target.value)} 
                className="w-20 px-2 py-1 rounded text-[#3D2F2A]" 
                placeholder="To" 
              />
            </div>
          </div>

          <button 
            onClick={applyFilters} 
            className="mt-4 px-4 py-2 bg-[#3D2F2A] text-[#DFDDCE] rounded-[15px] shadow-md w-full"
          >
            APPLY
          </button>
          
          {filterMessage && (
            <p className="mt-4 text-[#3D2F2A] text-sm font-semibold">{filterMessage}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 flex-1">
          {filteredBooks.length > 0 ? (
            filteredBooks.map((book) => (
              <Link key={book.key} href={`/books/${book.key}`} passHref>
                <div className="bg-[#92A48A] p-4 rounded-lg shadow-lg cursor-pointer transition transform hover:scale-105 h-[400px] flex flex-col">
                  <div className="w-full h-56 bg-[#3D2F2A] rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {book.cover_i ? (
                      <Image
                        src={`https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`}
                        alt={book.title}
                        width={200}
                        height={300}
                        className="object-cover"
                      />
                    ) : (
                      <p className="text-[#DFDDCE]">No Image</p>
                    )}
                  </div>
                  <div className="flex flex-col flex-grow">
                    <h2 className="text-xl font-semibold text-[#3D2F2A] mt-4 line-clamp-2 overflow-hidden">
                      {book.title}
                    </h2>
                    <p className="text-md mt-1 text-[#3D2F2A] line-clamp-1 overflow-hidden">
                      {book.author_name?.join(', ') || 'Unknown Author'} {book.first_publish_year ? `[${book.first_publish_year}]` : ''}
                    </p>
                  
                    <div className="mt-auto">
                      <StarRating rating={book.rating || 0} />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center text-[#DFDDCE] text-xl">
              No books found. Try a different genre or filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}