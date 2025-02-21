'use client';

import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/firebase';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy } from "firebase/firestore";
import { useParams } from 'next/navigation';
import MovieActions from '@/app/components/MovieActions';

interface MovieData {
  title: string;
  overview?: string;
  poster_path?: string;
  release_date?: string;
  vote_average?: number;
  genres?: { id: number; name: string }[];
}

interface Review {
  userId: string;
  userName: string;
  id?: string;
  text: string;
  rating: number;
  date: {
    seconds: number;
    nanoseconds: number;
  } | null; // Firestore timestamp type
}

export default function MovieDetails() {
  const { movieId } = useParams<{ movieId: string }>();
  const { user } = useAuth();

  const [movie, setMovie] = useState<MovieData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState<string>("");
  const [userRating, setUserRating] = useState<number>(0);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=YOUR_API_KEY`);
        if (!res.ok) throw new Error("Failed to fetch movie details.");
        const data = await res.json();

        setMovie({
          title: data.title,
          overview: data.overview,
          poster_path: data.poster_path,
          release_date: data.release_date,
          vote_average: data.vote_average,
          genres: data.genres,
        });
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unexpected error occurred.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (movieId) fetchMovieDetails();
  }, [movieId]);

  // Firestore reviews integration
  useEffect(() => {
    if (!movieId) return;

    const q = query(
      collection(db, "movies", movieId, "reviews"),
      orderBy("date", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];
      setReviews(reviewsData);
    });
    return () => unsubscribe();
  }, [movieId]);

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

  const handleSubmitReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      alert("You need to be logged in to submit a review.");
      return;
    }

    if (newReview.trim() && userRating > 0) {
      const reviewData = {
        userId: user.uid || "Unknown User",
        userName: user.displayName || "Anonymous",
        text: newReview,
        rating: userRating,
        date: serverTimestamp(),
      };
      try {
        await addDoc(collection(db, "movies", movieId, "reviews"), reviewData);
        setNewReview("");
        setUserRating(0);
      } catch (error) {
        console.error("Error adding review: ", error);
        alert("Failed to submit review.");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Error: {error || 'Movie not found.'}</p>
      </div>
    );
  }

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : "/placeholder.png";

  return (
    <div className="bg-[#5A7463] min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-4xl bg-[#92A48A] rounded-lg shadow-xl p-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-shrink-0">
            <div className="w-64 h-96 bg-[#3D2F2A] rounded-lg shadow-lg overflow-hidden flex items-center justify-center">
              <Image 
                src={posterUrl} 
                alt={movie.title}
                width={300}
                height={400}
                className="object-cover"
              />
            </div>
            <div className="mt-4">
              <MovieActions 
                movieId={movieId}
                title={movie.title}
                posterUrl={posterUrl}
              />
            </div>
          </div>
          
          <div className="flex-grow space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-[#DFDDCE]">{movie.title}</h1>
              {movie.release_date && (
                <p className="text-[#DFDDCE] text-lg mt-2">
                  Release Date: {new Date(movie.release_date).toLocaleDateString()}
                </p>
              )}
              {movie.genres?.length ? (
                <p className="text-[#DFDDCE] text-lg mt-2">
                  Genres: {movie.genres.map(genre => genre.name).join(', ')}
                </p>
              ) : (
                <p className="text-[#DFDDCE] text-lg mt-2">Genres unknown</p>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <StarRating rating={movie.vote_average ? movie.vote_average / 2 : 0} />
              <p className="text-[#DFDDCE] text-sm">
                Average: {movie.vote_average?.toFixed(1)+" stars" || "N/A"}
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-[#DFDDCE] leading-relaxed">
                {movie.overview || 'No overview available.'}
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
                {reviews.map((review) => (
                  <div key={review.id} className="bg-[#847266] p-6 rounded-lg relative">
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
                            <span className="font-medium text-[#DFDDCE]">
                              {review.userName || "Anonymous User"}
                            </span>
                          </div>
                          <span className="text-sm text-[#DFDDCE]">
                            {review.date?.seconds 
                              ? new Date(review.date.seconds * 1000).toLocaleDateString("en-US", { 
                                  month: "short", 
                                  day: "numeric", 
                                  year: "numeric" 
                                })
                              : "Just now"}
                          </span>
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