'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Book {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  rating?: number | null;
}


interface StarRatingProps {
  rating: number;
  maxStars?: number;
  isInput?: boolean;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedGenre, setSelectedGenre] = useState<string>('fiction');
  
  const genres = [
    'Fiction',
    'Nonfiction',
    'Adventure',
    'Biography',
    'Drama',
    'Fantasy',
    'History',
    'Horror',
    'Mystery',
    'Philosophy',
    'Poetry',
    'Romance',
    'Science Fiction',
    'Thriller'
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
          &nbsp;{rating.toFixed(1)}
        </span>
      </div>
    );
  };
  
  

  const fetchBooksBySubject = async (subject: string) => {
    setLoading(true);
    try {
      const formattedSubject = subject.toLowerCase().replace(/\s+/g, '-');
      const res = await fetch(
        `https://openlibrary.org/subjects/${formattedSubject}.json?limit=30`
      );
      if (!res.ok) throw new Error('Failed to fetch books');
  
      const data = await res.json();
      const bookList: Book[] = data.works.map((book: { 
        key: string;
        title: string;
        authors?: { name: string }[];
        cover_id?: number;
      }) => ({
        key: book.key.replace('/works/', ''),
        title: book.title,
        author_name: book.authors?.map((a) => a.name) || [],
        cover_i: book.cover_id || null,
      }));
      
  
      // Fetch ratings for each book
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
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);
  
  useEffect(() => {
    fetchBooksBySubject(selectedGenre);
  }, [selectedGenre]);
  
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
  }
  

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="bg-[#5A7463] min-h-screen p-8">
      {/* Genre and Tags Section */}
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-4">
          <span
            className="text-lg font-bold"
            style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif' }}
          >
            Genre
          </span>
          <div className="flex space-x-4 font-bold">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre.toLowerCase())}
                className={`px-4 py-2 rounded-[15px] shadow-md transition-colors ${
                  selectedGenre === genre.toLowerCase()
                    ? 'bg-[#3D2F2A] text-[#DFDDCE]'
                    : 'bg-[#DFDDCE] text-[#3D2F2A]'
                }`}
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      </div>
                
      {/* Main Layout: Filter Box and Book List */}
      
      <div className="flex mt-6 gap-6 h-[370px]">
        {/* Filter Box */}
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: '#DFDDCE', width: '250px' }}
        >
          <h3
            className="text-2xl font-bold mb-4"
            style={{ color: '#3D2F2A', fontFamily: 'Outfit, sans-serif' }}
          >
            Filter By:
          </h3>
          <div className="space-y-4">
            <div>
              <label
                className="block text-xl font-bold"
                style={{ color: '#3D2F2A', fontFamily: 'Outfit, sans-serif' }}
              >
                Average Rating
              </label>
              <div className="flex space-x-2 mt-1">
                <input type="number" className="w-16 px-2 py-1 rounded" />
                <span>to</span>
                <input type="number" className="w-16 px-2 py-1 rounded" />
              </div>
            </div>
            <div>
              <label
                className="block text-xl font-bold"
                style={{ color: '#3D2F2A', fontFamily: 'Outfit, sans-serif' }}
              >
                Number Of Ratings
              </label>
              <div className="flex space-x-2 mt-1">
                <input type="number" className="w-16 px-2 py-1 rounded" />
                <span>to</span>
                <input type="number" className="w-16 px-2 py-1 rounded" />
              </div>
            </div>
            <div>
              <label
                className="block text-xl font-bold"
                style={{ color: '#3D2F2A', fontFamily: 'Outfit, sans-serif' }}
              >
                Year Published
              </label>
              <div className="flex space-x-2 mt-1">
                <input type="number" className="w-16 px-2 py-1 rounded" />
                <span>to</span>
                <input type="number" className="w-16 px-2 py-1 rounded" />
              </div>
            </div>
            <div className="flex space-x-4 font-bold">
              {['APPLY'].map((apply) => (
                <button
                  key={apply}
                  className="px-4 py-2 rounded-[15px] shadow-md"
                  style={{
                    backgroundColor: '#3D2F2A',
                    color: '#DFDDCE',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  {apply}
                </button>
              ))}
            </div>
          </div>
        </div>
  
        {/* Book List */}
        <div className="grid grid-cols-4 md:grid-cols-6 gap-6 w-full">
          {books.map((book) => (
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
                    {book.author_name?.join(', ') || 'Unknown Author'}
                  </p>
                  <div className="mt-auto">
                    <StarRating rating={book.rating || 0} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
  