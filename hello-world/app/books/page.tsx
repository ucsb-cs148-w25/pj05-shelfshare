'use client';

import { useAuth } from '../context/AuthContext';
import React, { useEffect, useState } from 'react';
import Image from "next/image";
import {db} from "../../firebase"
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy } from "firebase/firestore";

export default function BookDetails() {
  interface Review {
    userId: string;
    userName: string;
    id?: string;
    text: string;
    rating: number;
    date: string;
  }

  // Explicitly type reviews to prevent "never[]" error
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState<string>("");
  const [userRating, setUserRating] = useState<number>(0);

  const { user } = useAuth();

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

  useEffect(() => {

    const q = query(collection(db, "books", "the-great-gatsby", "reviews"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id:doc.id,
        ...doc.data()
      })) as Review[];
      setReviews(reviewsData);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmitReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      alert("You need to be logged in to submit a review.");
      return;
    }

    if (newReview.trim() && userRating > 0) {
      const reviewData = {
        userId: user.uid || "Unkown User",
        userName: user.displayName || "No Email",
        text: newReview,
        rating: userRating,
        date: serverTimestamp(),
      };
      try{
        await addDoc(collection(db, "books", "the-great-gatsby", "reviews"), reviewData);
        setNewReview("");
        setUserRating(0);
      } catch (error) {
        console.error("error adding review: ", error);
        alert("Failed to submit review.");
      }
    }
  };

  return (
    <div className="bg-[#5A7463] min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-4xl bg-[#92A48A] rounded-lg shadow-xl p-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-shrink-0">
            <div className="w-64 h-96 bg-[#3D2F2A] rounded-lg shadow-lg overflow-hidden flex items-center justify-center">
              <Image 
                src="/cover.png" 
                alt="The Great Gatsby Book Cover"
                width = {40}
                height = {40}
                className="w-56 h-80 object-cover"
              />
            </div>
            <button className="w-full mt-4 bg-[#3D2F2A] text-[#DFDDCE] py-3 px-6 rounded-full font-bold hover:bg-[#847266] transition-colors">
              Add To Shelf
            </button>
          </div>

          <div className="flex-grow space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-[#DFDDCE]">The Great Gatsby</h1>
              <p className="text-xl text-[#DFDDCE] mt-2">F. Scott Fitzgerald</p>
            </div>

            <div className="space-y-4">
              <StarRating rating={4} />
            </div>

            <div className="space-y-4">
              <p className="text-[#DFDDCE] leading-relaxed">
                The Great Gatsby, F. Scott Fitzgerald&aposs third book, stands as the supreme achievement
                of his career. This exemplary novel of the Jazz Age has been acclaimed by generations
                of readers. The story of the fabulously wealthy Jay Gatsby and his love for the
                beautiful Daisy Buchanan, of lavish parties on Long Island at a time when The New York
                Times noted &quotegin was the national drink and sex the national obsession,&quote it is an
                exquisitely crafted tale of America in the 1920s.
              </p>
              <p className="text-[#DFDDCE] italic">
                The Great Gatsby is one of the great classics of twentieth-century literature.
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
                        width = {24}
                        height = {24}
                        className="w-12 h-12 rounded-full flex-shrink-0"
                      />
                      
                      <div className="flex-grow">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-[#DFDDCE]">{review.userName || "Anonymous User"}</span>
                          </div>
                          <span className="text-sm text-[#DFDDCE]">
                            {review.date && typeof review.date === "object" && "seconds" in review.date 
                            ? new Date((review.date as { seconds: number }).seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) 
                            : "Just now"}</span>
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
