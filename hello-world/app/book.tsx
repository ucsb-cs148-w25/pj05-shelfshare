"use client";
import React, { useState } from "react";
import Image from "next/image";

export default function BookDetails() {
  const [reviews, setReviews] = useState<{ text: string; date: string; username: string }[]>([]);
  const [newReview, setNewReview] = useState<string>("");

  const StarRating: React.FC<{ rating: number; maxStars?: number }> = ({ rating, maxStars = 5 }) => (
    <div className="flex space-x-1">
      {[...Array(maxStars)].map((_, index) => (
        <span key={index} className={`text-2xl ${index < rating ? "text-[#3D2F2A]" : "text-[#DFDDCE]"}`}>
          ★
        </span>
      ))}
    </div>
  );

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (newReview.trim()) {
      setReviews([
        ...reviews,
        {
          text: newReview,
          date: new Date().toLocaleDateString(),
          username: "User123", // Replace with actual username from auth
        },
      ]);
      setNewReview("");
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
                width={224} // 64 * 3.5
                height={320} // 96 * 3.5
                className="object-cover"
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
              <div className="mt-4">
                <h2 className="text-2xl font-semibold text-[#DFDDCE] mb-4">Rate:</h2>
                <StarRating rating={0} />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[#DFDDCE] leading-relaxed">
                The Great Gatsby, F. Scott Fitzgerald&apos;s third book, stands as the supreme achievement
                of his career. This exemplary novel of the Jazz Age has been acclaimed by generations
                of readers. The story of the fabulously wealthy Jay Gatsby and his love for the
                beautiful Daisy Buchanan, of lavish parties on Long Island at a time when The New York
                Times noted &quot;gin was the national drink and sex the national obsession,&quot; it is an
                exquisitely crafted tale of America in the 1920s.
              </p>
              <p className="text-[#DFDDCE] italic">
                The Great Gatsby is one of the great classics of twentieth-century literature.
              </p>
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-semibold text-[#DFDDCE] mb-4">Leave A Review:</h2>
              <form onSubmit={handleSubmitReview} className="space-y-4">
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
                  <div key={index} className="bg-[#847266] p-4 rounded-lg relative">
                    <p className="text-[#DFDDCE] mb-4">{review.text}</p>
                    <p className="absolute top-2 right-4 text-sm text-[#DFDDCE]">{review.date}</p>
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
