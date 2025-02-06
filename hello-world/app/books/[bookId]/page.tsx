// app/books/[bookId]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';

interface BookData {
  title: string;
  description?: string | { value: string };
  covers?: number[];
  authors?: { author: { key: string } }[];
  rating?: number; 
}

interface Review {
  text: string;
  rating: number;
  date: string;
}

export default function BookDetails() {
  // Get the dynamic parameter from the URL (e.g., OL12345W)
  const { bookId } = useParams<{ bookId: string }>();

  // Book details state
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Review related state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState<string>("");
  const [userRating, setUserRating] = useState<number>(0);



  
  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        // Fetch book details
        const res = await fetch(`https://openlibrary.org/works/${bookId}.json`);
        if (!res.ok) throw new Error("Failed to fetch book details.");
        const data = await res.json();
  
        // Fetch rating
        const ratingRes = await fetch(`https://openlibrary.org/works/${bookId}/ratings.json`);
        let rating = 0;
        if (ratingRes.ok) {
          const ratingData = await ratingRes.json();
          rating = ratingData.summary?.average || 0; // Default to 0 if no rating
        }
  
        // Clean description
        const cleanDescription =
          typeof data.description === "string"
            ? data.description
            : data.description?.value || "No description available.";

        // Add to the useEffect where you fetch book details
        // After fetching book details, fetch author names
        const authors = await Promise.all(
          (data.authors || []).map(async (author: any) => {
            const authorRes = await fetch(`https://openlibrary.org${author.author.key}.json`);
            const authorData = await authorRes.json();
            return authorData.name || "Unknown Author";
          })
        );

        // Update setBook
        setBook({ 
          ...data, 
          description: cleanDescription, 
          rating,
          authors // Add this to the BookData interface
        });
  
      } catch (err: any) {
        setError(err.message || "An error occurred.");
      } finally {
        setLoading(false);
      }
    };
  
    if (bookId) fetchBookDetails();
  }, [bookId]);
  





  // Format date for reviews
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Star rating component (supports both display and input)
  interface StarRatingProps {
    rating: number;
    maxStars?: number;
    isInput?: boolean;
  }
  const StarRating: React.FC<StarRatingProps> = ({ rating, maxStars = 5, isInput = false }) => {
    return (
      <div className="flex space-x-1">
        {[...Array(maxStars)].map((_, index) => (
          <div 
            key={index}
            className="relative"
            onClick={() => isInput && setUserRating(index + 1)}
            onMouseMove={(e) => {
              if (isInput) {
                const rect = e.currentTarget.getBoundingClientRect();
                const halfPoint = rect.left + rect.width / 2;
                if (e.clientX < halfPoint) {
                  setUserRating(index + 0.5);
                } else {
                  setUserRating(index + 1);
                }
              }
            }}
          >
            <span 
              className={`text-2xl ${isInput ? 'cursor-pointer' : 'cursor-default'} ${
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
      </div>
    );
  };

  // Handle review submission
  const handleSubmitReview = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newReview.trim() && userRating > 0) {
      setReviews([...reviews, { 
        text: newReview, 
        rating: userRating,
        date: formatDate(new Date())
      }]);
      setNewReview('');
      setUserRating(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Error: {error || 'Book not found.'}</p>
      </div>
    );
  }

  // Handle description (it can be a string or an object with a 'value' property)
  const description =
    typeof book.description === 'string'
      ? book.description
      : book.description?.value || 'No description available.';

  // Construct cover image URL using the first cover ID (if available)
  const coverId = book.covers && book.covers[0];

  // Ensure coverId is valid (greater than 0)
  const coverImageUrl = coverId && coverId > 0
    ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
    : "/placeholder.png"; // Use local placeholder
    

  return (
    <div className="bg-[#5A7463] min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-4xl bg-[#92A48A] rounded-lg shadow-xl p-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left side: Book cover and "Add To Shelf" */}
          <div className="flex-shrink-0">
            <div className="w-64 h-96 bg-[#3D2F2A] rounded-lg shadow-lg overflow-hidden flex items-center justify-center">
              <Image 
                src={coverImageUrl} 
                alt={book.title}
                width={300}
                height={400}
                className="object-cover"
              />
            </div>
            <button className="w-full mt-4 bg-[#3D2F2A] text-[#DFDDCE] py-3 px-6 rounded-full font-bold hover:bg-[#847266] transition-colors">
              Add To Shelf
            </button>
          </div>

          {/* Right side: Book details, star rating, description, and reviews */}
          <div className="flex-grow space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-[#DFDDCE]">{book.title}</h1>
              {book.authors?.length ? (
                <p className="text-[#DFDDCE] text-lg mt-2">
                  By: {book.authors.join(', ')}
                </p>
              ) : (
                <p className="text-[#DFDDCE] text-lg mt-2">Author unknown</p>
              )}
            </div>

            {/* Display average rating */}
            <div className="space-y-4">
              <StarRating rating={book.rating || 0} />
              <p className="text-[#DFDDCE] text-sm">Average Rating: {book.rating?.toFixed(1) || "N/A"}</p>
            </div>

            <div className="space-y-4">
              <p className="text-[#DFDDCE] leading-relaxed">
                {description}
              </p>
              <p className="text-[#DFDDCE] italic">
                {/* {book.authors?.length ? `Written by ${book.authors.join(', ')}` : "Author information not available."} */}
              </p>
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-semibold text-[#DFDDCE] mb-4">Leave A Review:</h2>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="mb-4">
                  <p className="text-[#DFDDCE] mb-2">Your Rating:</p>
                  <StarRating rating={userRating} isInput={true} />
                </div>
                <textarea
                  value={newReview}
                  onChange={(e) => setNewReview(e.target.value)}
                  className="w-full h-32 p-4 bg-[#847266] text-[#DFDDCE] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#3D2F2A]"
                  placeholder="Write your review here..."
                />
                <button 
                  type="submit"
                  className="bg-[#3D2F2A] text-[#DFDDCE] px-6 py-2 rounded-lg hover:bg-[#847266] transition-colors"
                >
                  Post Review
                </button>
              </form>

              <div className="mt-8 space-y-4">
                <h3 className="text-xl font-semibold text-[#DFDDCE]">Reviews</h3>
                {reviews.map((review, index) => (
                  <div key={index} className="bg-[#847266] p-6 rounded-lg relative">
                    <div className="flex items-start space-x-4">
                      <Image 
                        src="/profile.png"
                        alt="Profile"
                        width={24}
                        height={24}
                        className="w-12 h-12 rounded-full flex-shrink-0"
                      />
                      <div className="flex-grow">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-[#DFDDCE]">Anonymous User</span>
                          </div>
                          <span className="text-sm text-[#DFDDCE]">{review.date}</span>
                        </div>
                        <div className="mb-2">
                          <StarRating rating={review.rating} />
                        </div>
                        <p className="text-[#DFDDCE]">{review.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}