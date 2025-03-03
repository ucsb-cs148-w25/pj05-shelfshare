// app/books/[bookId]/page.tsx
'use client';

import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/firebase';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, doc, getDocs, writeBatch, FieldValue } from "firebase/firestore";
import { useParams } from 'next/navigation';
import BookActions from '@/app/components/BookActions';

interface ProfileItem {
  email: string;
  aboutMe: string;
  pgenre: string;
  profilePicUrl: string;
  uid: string;
  username: string;
}

interface BookData {
  id: string;
  title: string;
  description?: string;
  authors?: string[];
  rating?: number;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
  isbn?: string; // Store ISBN for OpenLibrary cover lookup
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
  } | null;
}

interface ReviewData {
  userId: string;
  userName: string;
  text: string;
  rating: number;
  date: FieldValue | null;
}

interface BookDetailsForNotification {
  title: string;
  author: string;
  coverUrl: string;
}

interface Friend {
  id: string;
  username?: string;
}

// Replace with your actual Google Books API Key if needed for volume details
const GOOGLE_BOOKS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY || '';

export default function BookDetails() {
  const { bookId } = useParams<{ bookId: string }>();
  const { user } = useAuth();

  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openLibraryCoverUrl, setOpenLibraryCoverUrl] = useState<string | null>(null);
  const [openLibraryRating, setOpenLibraryRating] = useState<number | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState<string>("");
  const [userRating, setUserRating] = useState<number>(0);

  const [profilePicture, setProfilePicture] = useState("upload-pic.png");
  const [username, setUsername] = useState("username");
  const [userFriends, setUserFriends] = useState<Friend[]>([]);

  // Function to clean HTML tags from text
  const cleanHtmlTags = (html: string): string => {
    if (!html) return '';
    
    // First replace common HTML entities
    let text = html
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Then remove all HTML tags
    text = text.replace(/<[^>]*>/g, '');
    
    // Remove any multiple spaces
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  };

  // Function to get OpenLibrary rating by ISBN
  const getOpenLibraryRating = async (isbn: string) => {
    try {
      // Try to get book data from OpenLibrary
      const response = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
      
      if (response.status === 200) {
        const data = await response.json();
        const olKey = data.key;
        
        if (olKey) {
          // If we have the OpenLibrary key, try to get ratings
          const ratingsResponse = await fetch(`https://openlibrary.org${olKey}/ratings.json`);
          if (ratingsResponse.status === 200) {
            const ratingsData = await ratingsResponse.json();
            if (ratingsData.summary?.average) {
              return ratingsData.summary.average;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching OpenLibrary rating:", error);
      return null;
    }
  };

  // Function to get OpenLibrary cover URL by ISBN - with better error handling
  const getOpenLibraryCover = async (isbn: string) => {
    if (!isbn) return null;
    
    try {
      // Add a cache buster to prevent browser caching
      const timestamp = Date.now();
      
      // Try to get a large cover image from OpenLibrary
      const response = await fetch(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false&t=${timestamp}`, {
        method: 'HEAD' // Use HEAD request to check if image exists without downloading
      });
      
      if (response.ok) {
        return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?t=${timestamp}`;
      }
      
      // If large image fails, try medium size
      const mediumResponse = await fetch(`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false&t=${timestamp}`, {
        method: 'HEAD'
      });
      
      if (mediumResponse.ok) {
        return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?t=${timestamp}`;
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching OpenLibrary cover:", error);
      return null;
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      try {
        const friendsSnapshot = await getDocs(collection(db, "users", user.uid, "friends"));
        const friendsData = friendsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Friend[];
        setUserFriends(friendsData);
      } catch (error) {
        console.error("Error fetching friends:", error);
      }
    };

    fetchFriends();
  }, [user]);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        // Use Google Books API to fetch volume details
        const apiUrl = `https://www.googleapis.com/books/v1/volumes/${bookId}?key=${GOOGLE_BOOKS_API_KEY}`;
        const res = await fetch(apiUrl);
        
        if (!res.ok) throw new Error("Failed to fetch book details.");
        
        const data = await res.json();
        const volumeInfo = data.volumeInfo || {};
        
        // Extract ISBN for OpenLibrary cover lookup
        let isbn = '';
        if (volumeInfo.industryIdentifiers && volumeInfo.industryIdentifiers.length > 0) {
          // Prefer ISBN_13 if available
          const isbn13 = volumeInfo.industryIdentifiers.find(
            (id: any) => id.type === 'ISBN_13'
          );
          
          const isbn10 = volumeInfo.industryIdentifiers.find(
            (id: any) => id.type === 'ISBN_10'
          );
          
          isbn = isbn13?.identifier || isbn10?.identifier || '';
        }
        
        // Clean description from HTML tags
        const cleanDescription = volumeInfo.description ? 
                              cleanHtmlTags(volumeInfo.description) : 
                              "No description available.";
        
        // Process the Google Books data
        const bookData = {
          id: data.id,
          title: volumeInfo.title || "Unknown Title",
          description: cleanDescription,
          authors: volumeInfo.authors || ["Unknown Author"],
          rating: volumeInfo.averageRating || 0,
          imageLinks: volumeInfo.imageLinks || {},
          isbn: isbn
        };
        
        setBook(bookData);
        
        // If we have an ISBN, try to get an OpenLibrary cover and rating
        if (isbn) {
          const [openLibraryCover, openLibraryRatingValue] = await Promise.all([
            getOpenLibraryCover(isbn),
            getOpenLibraryRating(isbn)
          ]);
          
          if (openLibraryCover) {
            setOpenLibraryCoverUrl(openLibraryCover);
          }
          
          if (openLibraryRatingValue && (!bookData.rating || bookData.rating === 0)) {
            setOpenLibraryRating(openLibraryRatingValue);
          }
        }
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

    if (bookId) fetchBookDetails();
  }, [bookId, GOOGLE_BOOKS_API_KEY]);

  // Firestore reviews integration
  useEffect(() => {
    if (!bookId) return;
    if (!user) return;

    const q = query(
      collection(db, "books", bookId, "reviews"),
      orderBy("date", "desc")
    );

    const userDocRef = doc(db, "profile", user.uid);
    const unsubscribe1 = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const profileItem: ProfileItem = {
          email: data.email || "email@shelfshare.com",
          aboutMe: data.aboutMe || "Write about yourself!",
          pgenre: data.pgenre || "#fantasy#romance#mystery",
          profilePicUrl: data.profilePicUrl || "",
          uid: data.uid,
          username: data.username || "username",
        };

        setProfilePicture(profileItem.profilePicUrl);
        setUsername(profileItem.username);
      }
    });

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];
      setReviews(reviewsData);
    });
    return () => {unsubscribe();
                  unsubscribe1(); };
  }, [bookId, user]);


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

  const sendNotificationsToFriends = async (
    reviewData: ReviewData, 
    bookDetails: BookDetailsForNotification) => {
    if (!user || userFriends.length === 0) return;
    
    const timestamp = serverTimestamp();
    const batch = writeBatch(db);
    
    // Prepare notification data
    const notificationData = {
      type: 'review',
      senderId: user.uid,
      senderName: username,
      senderProfilePic: profilePicture,
      bookId: bookId,
      bookTitle: bookDetails.title,
      bookCover: bookDetails.coverUrl,
      reviewText: reviewData.text.substring(0, 100) + (reviewData.text.length > 100 ? '...' : ''),
      rating: reviewData.rating,
      date: timestamp,
      read: false
    };
    
    // Add a notification for each friend
    userFriends.forEach(friend => {
      const notificationRef = doc(collection(db, "users", friend.id, "notifications"));
      batch.set(notificationRef, notificationData);
    });
    
    // Commit the batch
    try {
      await batch.commit();
      console.log("Notifications sent to all friends");
    } catch (error) {
      console.error("Error sending notifications:", error);
    }
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
        await addDoc(collection(db, "books", bookId, "reviews"), reviewData);
        if (!book) return;

        // Prefer OpenLibrary cover if available, otherwise use Google Books
        const coverImageUrl = openLibraryCoverUrl || 
                              book.imageLinks?.thumbnail || 
                              "/placeholder.png";
        
        // Prepare book details for notification
        const bookDetails = {
          title: book.title,
          author: book.authors?.[0] || "Unknown Author",
          coverUrl: coverImageUrl
        };

        await sendNotificationsToFriends(reviewData, bookDetails);

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

  if (error || !book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Error: {error || 'Book not found.'}</p>
      </div>
    );
  }

  // Prefer OpenLibrary cover if available, otherwise use Google Books thumbnail
  const coverImageUrl = openLibraryCoverUrl || 
                        book.imageLinks?.thumbnail || 
                        book.imageLinks?.smallThumbnail || 
                        "/placeholder.png";
                        
  // Use OpenLibrary rating if Google Books rating is not available
  const displayRating = openLibraryRating || book.rating || 0;

  return (
    <div className="bg-[#5A7463] min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-4xl bg-[#92A48A] rounded-lg shadow-xl p-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-shrink-0">
            <div className="w-64 h-96 bg-[#3D2F2A] rounded-lg shadow-lg overflow-hidden flex items-center justify-center">
              {coverImageUrl !== "/placeholder.png" ? (
                <Image 
                  src={coverImageUrl} 
                  alt={book.title}
                  width={300}
                  height={450}
                  quality={100}
                  priority
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <div className="flex items-center justify-center h-full w-full bg-[#3D2F2A] text-[#DFDDCE]">
                  <p className="text-center px-4">No cover available</p>
                </div>
              )}
            </div>
            <div className="mt-4">
              <BookActions 
                bookId={bookId}
                title={book.title}
                author={book.authors?.[0] || "Unknown Author"}
                coverUrl={coverImageUrl}
              />
            </div>
          </div>
          
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

            <div className="flex items-center space-x-4">
              <StarRating rating={displayRating} />
              <p className="text-[#DFDDCE] text-sm">
                Average: {displayRating > 0 ? displayRating.toFixed(1)+" stars" : "No ratings yet"}
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-[#DFDDCE] leading-relaxed">
                {book.description}
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
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="bg-[#847266] p-6 rounded-lg relative">
                      <div className="flex items-start space-x-4">
                        <Image 
                          src={profilePicture}
                          alt="Profile"
                          width={24}
                          height={24}
                          className="w-12 h-12 rounded-full flex-shrink-0"
                        />
                        <div className="flex-grow">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-[#DFDDCE]">
                                {username}
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
                  ))
                ) : (
                  <p className="text-[#DFDDCE]">No reviews yet. Be the first to review!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}