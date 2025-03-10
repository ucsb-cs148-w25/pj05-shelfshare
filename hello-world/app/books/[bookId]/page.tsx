// app/books/[bookId]/page.tsx
'use client';

import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/firebase';

// import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, doc, getDocs, writeBatch, FieldValue } from "firebase/firestore";
import { useParams } from 'next/navigation';
import BookActions from '@/app/components/BookActions';
import FriendActivity from '@/app/components/FriendActivity';

interface ProfileItem {
  email: string;
  aboutMe: string;
  pgenre: string;
  profilePicUrl: string;
  uid: string;
  username: string;
}

interface BookData {
  title: string;
  description?: string | { value: string };
  covers?: number[];
  authors?: string[];
  rating?: number;
  genres?: string[];
}

interface Review {
  userId: string;
  userName: string;
  userProfilePic: string;
  id?: string;
  text: string;
  rating: number;
  date: {
    seconds: number;
    nanoseconds: number;
  } | null; // Firestore timestamp type
}

interface ReviewData {
  userId: string;
  userName: string;
  userProfilePic: string;
  text: string;
  rating: number;
  date: 
    FieldValue | null; // This could be more specific based on what serverTimestamp returns
}

interface BookDetailsForNotification {
  title: string;
  author: string;
  coverUrl: string;
}

interface Author {
  author: {
    key: string;
  };
}

interface Friend {
  id: string;
  username?: string;
}

const normalizeGenre = (rawGenre: string) => {
  const genreMap: Record<string, string> = {
    'juvenile fiction': 'Young Adult',
    'bildungsroman': 'Coming of Age',
    'detective': 'Mystery',
    'mystery': 'Mystery',
    'historical fiction': 'Historical Fiction',
    'science fiction': 'Sci-Fi',
    'speculative fiction': 'Sci-Fi/Fantasy',
    'suspense': 'Thriller',
    'thriller': 'Thriller',
    'fiction': 'Fiction',
    'nonfiction': 'Non-Fiction',
    'fantasy': 'Fantasy',
    'romance': 'Romance',
    'biography': 'Biography',
    'history': 'History',
    'young adult': 'Young Adult',
    'children': "Children's",
    'kids': "Children's",
    'horror': 'Horror',
    'poetry': 'Poetry',
    'drama': 'Drama',
    'animals': 'Animals & Nature',
    'nature': 'Animals & Nature',
    'time travel': 'Sci-Fi',
    'detective stories': 'Mystery',
    'picture books': "Children's",
    'social life and customs': 'History',
    'romantic suspense fiction': 'Romance',
    'short stories': 'Fiction',
    'adventure stories': 'Adventure',
    'psychological fiction': 'Drama',
    
    //spanish
    'Pece': 'Animals & Nature',
    'animales': 'Animals & Nature',
    'caseros': 'Animals & Nature',
    'historias juveniles': 'Young Adult',
    'ficción juvenil': 'Young Adult',
    'cuentos infantiles': "Children's",
    'literatura juvenil': 'Young Adult',
    'novela policíaca': 'Mystery',
    'cuentos de animales': 'Animals & Nature',
    'aventura': 'Adventure',

    //common Open Library special categories
    'missing persons': 'Mystery',
    'stories in rhyme': 'Poetry',
    'journalists': 'Non-Fiction',
    'unspoken': 'Drama'
  };
  
  const cleanGenre = rawGenre
    .toLowerCase()
    .replace(/[^a-z\s]/gi, '')
    .trim();

  const exactMatch = genreMap[cleanGenre];
  if (exactMatch) return exactMatch;

  const partialMatch = Object.keys(genreMap).find(key => 
    cleanGenre.includes(key.toLowerCase())
  );

  return partialMatch ? genreMap[partialMatch] : 'Other';
};



export default function BookDetails() {
  const { bookId } = useParams<{ bookId: string }>();
  const { user } = useAuth();

  const [book, setBook] = useState<BookData | null>({
    title: '',
    description: '',
    covers: [],
    authors: [],
    rating: 0,
    genres: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState<string>("");
  const [userRating, setUserRating] = useState<number>(0);

  const [profilePicture, setProfilePicture] = useState("upload-pic.png");
  const [username, setUsername] = useState("username");
  const [userFriends, setUserFriends] = useState<Friend[]>([]);

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
        const res = await fetch(`https://openlibrary.org/works/${bookId}.json`);
        if (!res.ok) throw new Error("Failed to fetch book details.");
        const data = await res.json();

        const genres = data.subjects
          ?.map((subject: string) => {
            const baseSubject = typeof subject === 'string' 
              ? subject.split(' -- ')[0] 
              : 'Unknown';
            return normalizeGenre(baseSubject);
          })
          .filter((genre: string) => genre !== 'Other') 
          .filter((genre: string, index: number, self: string[]) => 
            self.indexOf(genre) === index
          ) || [];

        const ratingRes = await fetch(`https://openlibrary.org/works/${bookId}/ratings.json`);
        let rating = 0;
        if (ratingRes.ok) {
          const ratingData = await ratingRes.json();
          rating = ratingData.summary?.average || 0;
        }

        const cleanDescription =
          typeof data.description === "string"
            ? data.description
            : data.description?.value || "No description available.";

        const authors = await Promise.all(
          (data.authors || []).map(async (author: Author) => {
            const authorRes = await fetch(`https://openlibrary.org${author.author.key}.json`);
            const authorData = await authorRes.json();
            return authorData.name || "Unknown Author";
          })
        );

        setBook({
          ...data,
          description: cleanDescription,
          rating,
          authors,
          genres,
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

    if (bookId) fetchBookDetails();
  }, [bookId]);

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
        userName: username || "Anonymous",
        userProfilePic: profilePicture || "/user-circle.png",
        text: newReview,
        rating: userRating,
        date: serverTimestamp(),
      };
      try {
        await addDoc(collection(db, "books", bookId, "reviews"), reviewData);
        if (!book) return;

        const coverId = book.covers && book.covers[0];
        const coverImageUrl = coverId && coverId > 0
          ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
          : "/placeholder.png";
        
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

  const description =
    typeof book.description === 'string'
      ? book.description
      : book.description?.value || 'No description available.';

  const coverId = book.covers && book.covers[0];
  const coverImageUrl = coverId && coverId > 0
    ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
    : "/placeholder.png";

  return (
    <div className="bg-[#5A7463] min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-4xl bg-[#92A48A] rounded-lg shadow-xl p-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-shrink-0">
            <div className="w-64 h-96 bg-[#3D2F2A] rounded-lg shadow-lg overflow-hidden flex items-center justify-center">
              <Image 
                src={coverImageUrl} 
                alt={book.title}
                width={300}
                height={400}
                quality={100}
                className="object-cover"
              />
            </div>
            <div className="mt-4">
              <BookActions 
                bookId={bookId}
                title={book.title}
                author={book.authors?.[0] || "Unknown Author"}
                coverUrl={coverImageUrl}
                genres={book.genres || []}
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
              <StarRating rating={book.rating || 0} />
              <p className="text-[#DFDDCE] text-sm">
                Average: {book.rating?.toFixed(1)+" stars" || "N/A"}
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-[#DFDDCE] leading-relaxed">
                {description}
              </p>
            </div>

            {/* Friend Activity Section */}
            {user && <FriendActivity bookId={bookId as string} />}

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
                      <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden">
                      <Image 
                        src={review.userProfilePic || "/user-circle.png"}
                        alt={`${review.userName}'s profile`}
                        width={24}
                        height={24}
                        className="w-full h-full object-cover"
                            unoptimized
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/upload-pic.png";
                            }}
                      />
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-[#DFDDCE]">
                              {review.userName || "Anonymous"}
                            </span>
                              {review.userId === user?.uid && (
                                <span className="text-xs bg-[#3D2F2A] text-[#DFDDCE] px-2 py-0.5 rounded">You</span>
                              )}
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

