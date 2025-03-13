'use client';

import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/app/context/AuthContext';
import { db } from "@/firebase";
import { collection, Timestamp, onSnapshot, updateDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { Upload, Check, X, Plus, Pencil, PieChart as PieChartIcon, LineChart as LineChartIcon, Book, BarChart as BarChartIcon } from "lucide-react";
import dotenv from "dotenv";
import { useCallback } from 'react';

dotenv.config();

// Keep the interface but mark it as exported to avoid unused warning
export interface ProfileItem {
  email: string;
  aboutMe: string;
  pgenre: string;
  profilePicUrl: string;
  uid: string;
  username: string;
}

interface BookItem {
  id: string;
  bookId: string;
  title: string;
  author: string;
  coverUrl: string;
  dateAdded: Timestamp;
  shelfType?: string;
  dateFinished?: Timestamp | null;
  genre?: string;
}

interface GenreData {
  name: string;
  value: number;
}

interface TimelineData {
  date: string;
  count: number;
}

interface WeeklyData {
  day: string;
  count: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ 
    name: string;
    value: number;
    payload: GenreData | TimelineData | WeeklyData 
  }>;
  label?: string;
}


const Profile = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isAddingGenre, setIsAddingGenre] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [profilePicture, setProfilePicture] = useState("https://via.placeholder.com/150");
  const [username, setUsername] = useState("username");
  const [editingUsername, setEditingUsername] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [newGenre, setNewGenre] = useState("");
  const [aboutMe, setAboutMe] = useState("Write about yourself!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Removed unused state variables: changeProfile, setChangeProfile
  const nameInputRef = useRef<HTMLInputElement>(null);
  const genreInputRef = useRef<HTMLInputElement>(null);
  
  //states for chart data
  const [genreDistribution, setGenreDistribution] = useState<GenreData[]>([]);
  const [finishedBooksTimeline, setFinishedBooksTimeline] = useState<TimelineData[]>([]);
  const [currentlyReadingTimeline, setCurrentlyReadingTimeline] = useState<TimelineData[]>([]);
  const [finishedBooksWeekly, setFinishedBooksWeekly] = useState<WeeklyData[]>([]);
  const [currentlyReadingWeekly, setCurrentlyReadingWeekly] = useState<WeeklyData[]>([]);
  const [activeTab, setActiveTab] = useState('genre');
  const [activeSubTab, setActiveSubTab] = useState('monthly');
  const [booksLoaded, setBooksLoaded] = useState(false);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1', '#A4DE6C', '#D0ED57'];

  const monthAbbreviations = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayAbbreviations = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];


  const processWeeklyData = useCallback((books: BookItem[]) => {

    const weeklyData: Record<string, number> = {};
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    
    for (let day = 0; day < 7; day++) {
      const currentDay = new Date(monday);
      currentDay.setDate(monday.getDate() + day);
      weeklyData[dayAbbreviations[day]] = 0;
    }
    
    books.forEach(book => {
      const dateObj = book.dateFinished instanceof Timestamp ? 
        book.dateFinished.toDate() : 
        (book.dateAdded instanceof Timestamp ? book.dateAdded.toDate() : new Date(book.dateAdded));
      
      if (dateObj >= monday && dateObj < new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)) {
        const day = dateObj.getDay();
        const dayIndex = day === 0 ? 6 : day - 1;
        weeklyData[dayAbbreviations[dayIndex]] = (weeklyData[dayAbbreviations[dayIndex]] || 0) + 1;
      }
    });
    
    return Object.entries(weeklyData)
      .map(([day, count]) => ({ day, count }));
  }, [dayAbbreviations]);

    

  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const userDocRef = doc(db, "profile", user.uid);
    
    // Check if profile exists, create if it doesn't
    const checkProfile = async () => {
      try {
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
          // Profile doesn't exist yet, create it
          await setDoc(userDocRef, {
            email: user.email || "",
            aboutMe: "Write about yourself!",
            genres: [],
            profilePicUrl: "",
            uid: user.uid,
            username: user.displayName || "username",
          });
          console.log("Created new profile document");
        }
      } catch (err: unknown) {
        console.error("Error checking profile:", err);
        setError("Failed to load profile");
      }
    };
    
    checkProfile();

    // Set up listener for profile changes
    const unsubscribe = onSnapshot(userDocRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          console.log("Profile data from Firestore:", data);
          
          setProfilePicture(data.profilePicUrl || "https://via.placeholder.com/150");
          setUsername(data.username || "username");
          setAboutMe(data.aboutMe || "Write about yourself!");
          
          // Handle genres array properly
          if (Array.isArray(data.genres)) {
            setGenres(data.genres);
          } else if (typeof data.genres === 'string') {
            // Handle legacy string format if needed
            const parsedGenres = data.genres
              .split('#')
              .filter(tag => tag.trim() !== '')
              .map(tag => tag.trim());
            setGenres(parsedGenres);
          } else {
            setGenres([]);
          }
        }
      },
      (err: unknown) => {
        console.error("Error in profile snapshot listener:", err);
        setError("Failed to sync profile changes");
      }
    );

    return () => unsubscribe();
  }, [user, router]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      setEditingUsername(username);
    }
  }, [isEditingName, username]);

  useEffect(() => {
    if (isAddingGenre && genreInputRef.current) {
      genreInputRef.current.focus();
    }
  }, [isAddingGenre]);
  
  

  // Fetch books data for charts
  useEffect(() => {
    if (!user) return;

    const fetchBooks = async () => {
      try {
        const shelvesRef = collection(db, "users", user.uid, "shelves");
        
        const unsubscribe = onSnapshot(shelvesRef, (snapshot) => {
          const booksData: BookItem[] = [];
          
          snapshot.docs.forEach((doc) => {
            const shelfData = doc.data();
            const shelfType = shelfData.shelfType;
            
            if (shelfType !== "currently-reading" && shelfType !== "finished") return;
            
            booksData.push({
              id: doc.id,
              bookId: shelfData.bookId,
              title: shelfData.title || "Unknown Title",
              author: shelfData.author || "Unknown Author",
              coverUrl: shelfData.coverUrl || "",
              genre: shelfData.genre || "", // use shelfData's genre
              dateAdded: shelfData.dateAdded || Timestamp.now(),
              dateFinished: shelfData.dateFinished || null,
              shelfType: shelfType
            });
          });

          processGenreDistribution(booksData);
          setFinishedBooksTimeline(processTimelineData(
            booksData.filter(book => book.shelfType === "finished"), 
            true
          ));
          setCurrentlyReadingTimeline(processTimelineData(
            booksData.filter(book => book.shelfType === "currently-reading"), 
            false
          ));
          
          setFinishedBooksWeekly(processWeeklyData(
            booksData.filter(book => book.shelfType === "finished")
          ));
          setCurrentlyReadingWeekly(processWeeklyData(
            booksData.filter(book => book.shelfType === "currently-reading")
          ));
          
          setBooksLoaded(true);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error("Error setting up books listener:", error);
        setBooksLoaded(true);
      }
    };

    const unsubscribeBooks = fetchBooks();
    
    return () => {
      unsubscribeBooks.then(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, [user, processWeeklyData]);


  //pie chart
  const processGenreDistribution = (books: BookItem[]) => {
    const genreCounts: Record<string, number> = {};
    const CORE_GENRES = [
      'Fiction', 'Non-Fiction', 'Fantasy', 'Mystery', 'Romance', 
      'Science Fiction', 'Biography', 'History', 'Young Adult', 
      "Children's", 'Horror', 'Poetry', 'Drama', 'Animals & Nature'
    ];
  
    books.forEach(book => {
      const genres = book.genre?.split('#').filter(g => g.trim()) || [];

      const coreGenres = genres.map(genre => {
        const cleanInput = genre.toLowerCase().replace(/[^a-z]/g, '');
        return CORE_GENRES.find(core => 
          core.toLowerCase().replace(/[^a-z]/g, '') === cleanInput
        ) || 'Unspecified';
      });
  
      coreGenres.forEach(genre => {
        if (genre !== 'Unspecified') {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        }
      });
  
      if (coreGenres.length === 0 || coreGenres.every(g => g === 'Unspecified')) {
        genreCounts["Unspecified"] = (genreCounts["Unspecified"] || 0) + 1;
      }
    });
  
    const genreData: GenreData[] = Object.entries(genreCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  
    setGenreDistribution(genreData);
  };

  //process month timeline
  const processTimelineData = (books: BookItem[], isFinished: boolean) => {
    const monthlyData: Record<string, number> = {};
    const currentYear = new Date().getFullYear();
    
    for (let month = 0; month < 12; month++) {
      const monthKey = `${currentYear}-${(month + 1).toString().padStart(2, '0')}`;
      monthlyData[monthKey] = 0;
    }

    books.forEach(book => {
      const dateObj = isFinished && book.dateFinished ? 
        (book.dateFinished instanceof Timestamp ? book.dateFinished.toDate() : new Date(book.dateFinished)) :
        (book.dateAdded instanceof Timestamp ? book.dateAdded.toDate() : new Date(book.dateAdded));
      
      if (dateObj.getFullYear() === currentYear) {
        const month = dateObj.getMonth();
        const monthKey = `${currentYear}-${(month + 1).toString().padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      }
    });

    return Object.entries(monthlyData)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };
  

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return; // Add user null check here
    
    // Validate file size (limit to 500KB to avoid Firestore document size limits)
    if (file.size > 500 * 1024) {
      setError("Image too large. Please select an image under 500KB.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    // Create a local preview immediately
    const localPreviewUrl = URL.createObjectURL(file);
    setProfilePicture(localPreviewUrl);
    
    try {
      // Convert to base64 and update Firestore directly
      console.log("Converting image to base64...");
      const base64Image = await convertToBase64(file);
      console.log("Image converted successfully");
      
      console.log("Updating Firestore document...");
      const userDocRef = doc(db, "profile", user.uid);
      await updateDoc(userDocRef, {
        profilePicUrl: base64Image,
      });
      console.log("Profile image updated in Firestore");
      
      // Image is already displayed from local preview
    } catch (err: unknown) {
      console.error("Error updating profile picture:", err);
      // Type check err before accessing message property
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to upload image: ${errorMessage}`);
      
      // Revert to previous picture on error
      if (user) { // Add null check here
        const userDocRef = doc(db, "profile", user.uid);
        const snapshot = await getDoc(userDocRef);
        if (snapshot.exists()) {
          setProfilePicture(snapshot.data().profilePicUrl || "https://via.placeholder.com/150");
        }
      }
    } finally {
      setLoading(false);
      // Clean up the object URL to avoid memory leaks
      URL.revokeObjectURL(localPreviewUrl);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  
  // Fixed the any type issue
  const updateProfile = async (field: string, value: string | string[]) => {
    if (!user) return;
    setLoading(true);
    setError("");
    
    try {
      const userDocRef = doc(db, "profile", user.uid);
      console.log(`Updating ${field} with:`, value);
      
      await updateDoc(userDocRef, {
        [field]: value
      });
      
      console.log(`Successfully updated ${field}`);
    } catch (err: unknown) {
      console.error(`Error updating ${field}:`, err);
      setError(`Failed to update ${field}`);
    } finally {
      setLoading(false);
    }
  };

  const addGenre = async () => {
    if (!user || !newGenre.trim()) return;
    setLoading(true);
    setError("");
    
    try {
      const genre = newGenre.trim();
      if (!genres.includes(genre)) {
        // Create a new array with all existing genres plus the new one
        const updatedGenres = [...genres, genre];
        console.log("Adding genre, new genres array:", updatedGenres);
        
        await updateProfile('genres', updatedGenres);
        // Local state is updated through the Firestore listener
      }
      
      setNewGenre("");
      setIsAddingGenre(false);
    } catch (err: unknown) {
      console.error("Error adding genre:", err);
      setError("Failed to add genre");
    } finally {
      setLoading(false);
    }
  };

  const removeGenre = async (genre: string) => {
    if (!user) return;
    setLoading(true);
    setError("");
    
    try {
      const updatedGenres = genres.filter(g => g !== genre);
      console.log("Removing genre, new genres array:", updatedGenres);
      
      await updateProfile('genres', updatedGenres);
      // Local state is updated through the Firestore listener
    } catch (err: unknown) {
      console.error("Error removing genre:", err);
      setError("Failed to remove genre");
    } finally {
      setLoading(false);
    }
  };

  const saveUsername = async () => {
    if (editingUsername.trim() !== "") {
      await updateProfile('username', editingUsername.trim());
      // Local state is updated through the Firestore listener
    }
    setIsEditingName(false);
  };

  const cancelEditName = () => {
    setEditingUsername(username);
    setIsEditingName(false);
  };

  //pie chart
  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#DFDDCE] p-2 rounded border border-[#3D2F2A]">
          <p className="font-bold">{payload[0].name}</p>
          <p>{`Books: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };
  
  //timeline charts
  const TimelineTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length && label) {
      const monthNumber = label.split('-')[1] ?? '1';
      const month = parseInt(monthNumber) - 1;
      const monthName = new Date(0, month).toLocaleString('default', { month: 'long' });
  
      return (
        <div className="bg-[#DFDDCE] p-2 rounded border border-[#3D2F2A]">
          <p className="font-bold">{monthName}</p>
          <p>{`Books: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };
  
  const WeeklyTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#DFDDCE] p-2 rounded border border-[#3D2F2A]">
          <p className="font-bold">{label}</p>
          <p>{`Books: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  const formatMonthAbbreviation = (dateStr: string) => {
    const month = parseInt(dateStr.split('-')[1]) - 1;
    return monthAbbreviations[month];
  };

  return (
    <div className="min-h-screen bg-[#5A7463] p-8">
      <div className="max-w-6xl mx-auto">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-8">
          {/* Left Column - Profile Text, Picture & Name */}
          <div className="flex flex-col items-center">
            <h1 className="text-[#DFDDCE] text-4xl font-bold mb-8">Profile</h1>
            
            <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-[#DFDDCE] mb-4 relative">
              {/* Replaced img with Next.js Image component */}
              <Image
                src={profilePicture}
                alt="Profile"
                className="object-cover"
                fill
                sizes="(max-width: 768px) 100vw, 256px"
                priority
              />
              {loading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            
            {/* Editable Username */}
            <div className="flex items-center gap-2 mb-4">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={editingUsername}
                    onChange={(e) => setEditingUsername(e.target.value)}
                    className="bg-[#DFDDCE] text-[#3D2F2A] px-3 py-2 rounded text-xl text-center"
                    maxLength={30}
                    disabled={loading}
                  />
                  <button
                    onClick={saveUsername}
                    className="ml-2 bg-[#3D2F2A] text-[#DFDDCE] p-2 rounded hover:bg-opacity-80 disabled:opacity-50"
                    aria-label="Save username"
                    disabled={loading}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelEditName}
                    className="ml-1 bg-[#847266] text-[#DFDDCE] p-2 rounded hover:bg-opacity-80 disabled:opacity-50"
                    aria-label="Cancel edit"
                    disabled={loading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold text-[#DFDDCE]">{username}</h2>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-[#DFDDCE] disabled:opacity-50"
                    aria-label="Edit username"
                    disabled={loading}
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="profile-upload"
                accept="image/*"
                disabled={loading}
              />
              <label
                htmlFor="profile-upload"
                className={`cursor-pointer bg-[#DFDDCE] text-[#3D2F2A] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-opacity-90 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Upload className="w-4 h-4" />
                {loading ? 'Uploading...' : 'Choose Photo'}
              </label>
            </div>
            <p className="text-[#DFDDCE] text-xs mt-2">Please select images under 500KB</p>
          </div>

          {/* Right Column - Profile Info */}
          <div className="space-y-6 mt-16">
            {/* About Me Box - Moved to top */}
            <div className="bg-[#DFDDCE] p-6 rounded-lg relative">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold text-[#3D2F2A]">About Me</h3>
                <button
                  onClick={() => {
                    if (isEditingAbout) {
                      updateProfile('aboutMe', aboutMe);
                    }
                    setIsEditingAbout(!isEditingAbout);
                  }}
                  className="bg-[#5A7463] text-[#DFDDCE] px-4 py-1 rounded hover:bg-opacity-90 disabled:opacity-50"
                  disabled={loading}
                >
                  {isEditingAbout ? 'Done' : 'Edit'}
                </button>
              </div>
              {isEditingAbout ? (
                <textarea
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value)}
                  className="w-full bg-white text-[#3D2F2A] p-3 rounded border border-[#3D2F2A] focus:outline-none focus:ring-2 focus:ring-[#5A7463] text-lg min-h-[120px]"
                  disabled={loading}
                />
              ) : (
                <p className="text-[#3D2F2A] text-lg">{aboutMe}</p>
              )}
            </div>
            
            {/* Preferred Genre Box - Now with interactive tags */}
            <div className="bg-[#DFDDCE] p-6 rounded-lg relative">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold text-[#3D2F2A]">Preferred Genres</h3>
                <button
                  onClick={() => setIsAddingGenre(true)}
                  className="bg-[#5A7463] text-[#DFDDCE] px-4 py-1 rounded hover:bg-opacity-90 flex items-center disabled:opacity-50"
                  disabled={loading || isAddingGenre}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Genre
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {genres.length > 0 ? (
                  genres.map((genre, index) => (
                    <div key={index} className="flex items-center">
                      <span className="bg-[#847266] text-[#DFDDCE] px-3 py-2 rounded-[15px] font-medium">
                        {genre}
                      </span>
                      <button 
                        onClick={() => removeGenre(genre)}
                        className="ml-1 bg-[#3D2F2A] text-[#DFDDCE] rounded-full p-1 hover:bg-opacity-80 disabled:opacity-50"
                        aria-label={`Remove ${genre}`}
                        disabled={loading}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-[#3D2F2A] text-lg italic">Add your favorite genres</p>
                )}
              </div>
              
              {isAddingGenre && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    ref={genreInputRef}
                    type="text"
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    placeholder="Enter genre..."
                    className="flex-grow bg-white text-[#3D2F2A] p-2 rounded border border-[#3D2F2A] focus:outline-none focus:ring-2 focus:ring-[#5A7463]"
                    maxLength={20}
                    disabled={loading}
                  />
                  <button
                    onClick={addGenre}
                    className="bg-[#3D2F2A] text-[#DFDDCE] p-2 rounded hover:bg-opacity-80 disabled:opacity-50"
                    aria-label="Add genre"
                    disabled={loading}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingGenre(false);
                      setNewGenre('');
                    }}
                    className="bg-[#847266] text-[#DFDDCE] p-2 rounded hover:bg-opacity-80 disabled:opacity-50"
                    aria-label="Cancel"
                    disabled={loading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Reading Analytics Section */}
            <div className="bg-[#DFDDCE] p-6 rounded-lg relative">
              <h3 className="text-2xl font-semibold text-[#3D2F2A] mb-4">Reading Analytics</h3>
              
              {/* Analytics Tabs */}
              <div className="flex mb-4 border-b border-[#3D2F2A]">
                <button
                  onClick={() => setActiveTab('genre')}
                  className={`flex items-center px-4 py-2 ${activeTab === 'genre' ? 'bg-[#5A7463] text-[#DFDDCE] rounded-t' : 'text-[#3D2F2A]'}`}
                >
                  <PieChartIcon className="w-4 h-4 mr-2" />
                  Genre Distribution
                </button>
                <button
                  onClick={() => setActiveTab('reading')}
                  className={`flex items-center px-4 py-2 ${activeTab === 'reading' ? 'bg-[#5A7463] text-[#DFDDCE] rounded-t' : 'text-[#3D2F2A]'}`}
                >
                  <Book className="w-4 h-4 mr-2" />
                  Currently Reading
                </button>
                <button
                  onClick={() => setActiveTab('finished')}
                  className={`flex items-center px-4 py-2 ${activeTab === 'finished' ? 'bg-[#5A7463] text-[#DFDDCE] rounded-t' : 'text-[#3D2F2A]'}`}
                >
                  <LineChartIcon className="w-4 h-4 mr-2" />
                  Finished Books
                </button>
              </div>
              
              {/* Sub-tabs for timeline and weekly views - Only show for reading and finished tabs */}
              {(activeTab === 'reading' || activeTab === 'finished') && (
                <div className="flex mb-4">
                  <button
                    onClick={() => setActiveSubTab('monthly')}
                    className={`flex items-center px-4 py-1 mr-2 rounded ${activeSubTab === 'monthly' ? 'bg-[#3D2F2A] text-[#DFDDCE]' : 'bg-gray-200 text-[#3D2F2A]'}`}
                  >
                    <LineChartIcon className="w-4 h-4 mr-2" />
                    Monthly
                  </button>
                  <button
                    onClick={() => setActiveSubTab('weekly')}
                    className={`flex items-center px-4 py-1 rounded ${activeSubTab === 'weekly' ? 'bg-[#3D2F2A] text-[#DFDDCE]' : 'bg-gray-200 text-[#3D2F2A]'}`}
                  >
                    <BarChartIcon className="w-4 h-4 mr-2" />
                    This Week
                  </button>
                </div>
              )}
              
              {/* Charts */}
              <div className="h-64 md:h-80">
                {!booksLoaded ? (
                  <div className="flex items-center justify-center h-full text-[#3D2F2A]">
                    Loading data...
                  </div>
                ) : (
                  <>
                    {activeTab === 'genre' && (
                      <div className="h-full">
                        {genreDistribution.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={genreDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {genreDistribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-[#3D2F2A]">
                            {booksLoaded ? 
                              "No genre data available. Add books to your shelves!" : 
                              "Loading genre data..."
                            }
                          </div>
                        )}
                      </div>
                    )}
                    
                    {activeTab === 'reading' && activeSubTab === 'monthly' && (
                      <div className="h-full">
                        {currentlyReadingTimeline.length > 0 ? (
                          <>
                            {/* Legend above chart */}
                            <div className="flex mb-2 ml-2">
                              <div className="flex items-center">
                                <div className="w-4 h-4 bg-[#82ca9d] mr-2"></div>
                                <span className="text-sm text-[#3D2F2A]">Currently Reading</span>
                              </div>
                            </div>
                            
                            <ResponsiveContainer width="100%" height="90%">
                              <LineChart 
                                data={currentlyReadingTimeline}
                                margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
                              >
                                <XAxis 
                                  dataKey="date" 
                                  tickFormatter={formatMonthAbbreviation}
                                  height={50}
                                  label={{ 
                                    value: 'Month', 
                                    position: 'insideBottom', 
                                    offset: -10
                                  }}
                                />
                                <YAxis 
                                  domain={[0, 25]} // Y-axis = 25 books 
                                  label={{ 
                                    value: 'Books', 
                                    angle: -90, 
                                    position: 'insideLeft',
                                    style: { textAnchor: 'middle' },
                                    offset: 0
                                  }}
                                />
                                <Tooltip content={<TimelineTooltip />} />
                                <Line  
                                  type="monotone" 
                                  dataKey="count" 
                                  stroke="#82ca9d" 
                                  activeDot={{ r: 8 }} 
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full text-[#3D2F2A]">
                            No currently reading data available. Add books to your currently reading shelf!
                          </div>
                        )}
                      </div>
                    )}
                    
                    {activeTab === 'reading' && activeSubTab === 'weekly' && (
                      <div className="h-full">
                        {currentlyReadingWeekly.length > 0 ? (
                          <>
                            {/* Legend above chart */}
                            <div className="flex mb-2 ml-2">
                              <div className="flex items-center">
                                <div className="w-4 h-4 bg-[#82ca9d] mr-2"></div>
                                <span className="text-sm text-[#3D2F2A]">Current Week Reading Activity</span>
                              </div>
                            </div>
                            
                            <ResponsiveContainer width="100%" height="90%">
                              <BarChart 
                                data={currentlyReadingWeekly}
                                margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
                              >
                                <XAxis 
                                  dataKey="day" 
                                  height={50}
                                  label={{ 
                                    value: 'Day of Week', 
                                    position: 'insideBottom', 
                                    offset: -10
                                  }}
                                />
                                <YAxis 
                                  domain={[0, 10]} // Y-axis = 10 books
                                  label={{ 
                                    value: 'Books', 
                                    angle: -90, 
                                    position: 'insideLeft',
                                    style: { textAnchor: 'middle' },
                                    offset: 0
                                  }}
                                  />
                                  <Tooltip content={<WeeklyTooltip />} />
                                  <Bar  
                                    dataKey="count" 
                                    fill="#82ca9d" 
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-full text-[#3D2F2A]">
                              No weekly reading data available for this week.
                            </div>
                          )}
                        </div>
                      )}
                      
                      {activeTab === 'finished' && activeSubTab === 'monthly' && (
                        <div className="h-full">
                          {finishedBooksTimeline.length > 0 ? (
                            <>
                              {/* Legend above chart */}
                              <div className="flex mb-2 ml-2">
                                <div className="flex items-center">
                                  <div className="w-4 h-4 bg-[#8884d8] mr-2"></div>
                                  <span className="text-sm text-[#3D2F2A]">Finished Books</span>
                                </div>
                              </div>
                              
                              <ResponsiveContainer width="100%" height="90%">
                                <LineChart 
                                  data={finishedBooksTimeline}
                                  margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
                                >
                                  <XAxis 
                                    dataKey="date" 
                                    tickFormatter={formatMonthAbbreviation}
                                    height={50}
                                    label={{ 
                                      value: 'Month', 
                                      position: 'insideBottom', 
                                      offset: -10
                                    }}
                                  />
                                  <YAxis 
                                    domain={[0, 25]} // Y-axis = 25 books
                                    label={{ 
                                      value: 'Books', 
                                      angle: -90, 
                                      position: 'insideLeft',
                                      style: { textAnchor: 'middle' },
                                      offset: 0
                                    }}
                                  />
                                  <Tooltip content={<TimelineTooltip />} />
                                  <Line 
                                    type="monotone" 
                                    dataKey="count" 
                                    stroke="#8884d8" 
                                    activeDot={{ r: 8 }} 
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-full text-[#3D2F2A]">
                              No finished books data available. Mark some books as finished!
                            </div>
                          )}
                        </div>
                      )}
                      
                      {activeTab === 'finished' && activeSubTab === 'weekly' && (
                        <div className="h-full">
                          {finishedBooksWeekly.length > 0 ? (
                            <>
                              {/* Legend above chart */}
                              <div className="flex mb-2 ml-2">
                                <div className="flex items-center">
                                  <div className="w-4 h-4 bg-[#8884d8] mr-2"></div>
                                  <span className="text-sm text-[#3D2F2A]">Current Week Finished Books</span>
                                </div>
                              </div>
                              
                              <ResponsiveContainer width="100%" height="90%">
                                <BarChart 
                                  data={finishedBooksWeekly}
                                  margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
                                >
                                  <XAxis 
                                    dataKey="day" 
                                    height={50}
                                    label={{ 
                                      value: 'Day of Week', 
                                      position: 'insideBottom', 
                                      offset: -10
                                    }}
                                  />
                                  <YAxis 
                                    domain={[0, 10]} // Y-axis = 10
                                    label={{ 
                                      value: 'Books', 
                                      angle: -90, 
                                      position: 'insideLeft',
                                      style: { textAnchor: 'middle' },
                                      offset: 0
                                    }}
                                  />
                                  <Tooltip content={<WeeklyTooltip />} />
                                  <Bar 
                                    dataKey="count" 
                                    fill="#8884d8" 
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-full text-[#3D2F2A]">
                              No books finished this week yet.
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

export default Profile;

