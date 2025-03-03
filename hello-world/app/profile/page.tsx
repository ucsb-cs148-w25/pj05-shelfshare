// app/profile/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { db } from "@/firebase";
import { collection, query, Timestamp, onSnapshot, updateDoc, doc, getDocs, where } from "firebase/firestore";
import { Upload, Pencil, PieChart as PieChartIcon, LineChart as LineChartIcon, Book } from "lucide-react";
import dotenv from "dotenv";

dotenv.config();

interface ProfileItem {
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
  genre?: string; // Changed from pgenre to genre to match your actual data structure
}

interface GenreData {
  name: string;
  value: number;
}

interface TimelineData {
  date: string;
  count: number;
}

const Profile = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingGenre, setIsEditingGenre] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [profilePicture, setProfilePicture] = useState("upload-pic.png");
  const [username, setUsername] = useState("username");
  const [changeProfile, setChangeProfile] = useState<File | null>(null);
  const [preferredGenre, setPreferredGenre] = useState("#fantasy#romance#mystery");
  const [aboutMe, setAboutMe] = useState("Write about yourself!");
  
  // States for chart data
  const [genreDistribution, setGenreDistribution] = useState<GenreData[]>([]);
  const [finishedBooksTimeline, setFinishedBooksTimeline] = useState<TimelineData[]>([]);
  const [currentlyReadingTimeline, setCurrentlyReadingTimeline] = useState<TimelineData[]>([]);
  const [activeTab, setActiveTab] = useState('genre');
  const [booksLoaded, setBooksLoaded] = useState(false);

  // COLORS for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1', '#A4DE6C', '#D0ED57'];

  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const userDocRef = doc(db, "profile", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
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
        setPreferredGenre(profileItem.pgenre);
        setUsername(profileItem.username);
        setAboutMe(profileItem.aboutMe);
      }
    });

    return () => unsubscribe();
  }, [user, router]);

  // Fetch books data for charts
  useEffect(() => {
    if (!user) return;

    // Set up a real-time listener for books data
    const fetchBooks = async () => {
      try {
        // First, fetch books from the "shelves" collection
        const shelvesRef = collection(db, "users", user.uid, "shelves");
        
        // Listen for changes to shelves collection
        const unsubscribe = onSnapshot(shelvesRef, async (snapshot) => {
          const booksData: BookItem[] = [];
          
          // Get book data from each shelf document
          for (const doc of snapshot.docs) {
            const shelfData = doc.data();
            const shelfType = shelfData.shelfType;
            
            // Skip shelves that aren't "currently-reading" or "finished"
            if (shelfType !== "currently-reading" && shelfType !== "finished") continue;
            
            // If the document has a bookId, fetch the book details
            if (shelfData.bookId) {
              try {
                // Get the book data from the books collection
                const bookDoc = await getDocs(
                  query(collection(db, "books"), where("bookId", "==", shelfData.bookId))
                );
                
                if (!bookDoc.empty) {
                  const bookData = bookDoc.docs[0].data();
                  
                  booksData.push({
                    id: doc.id,
                    bookId: shelfData.bookId,
                    title: bookData.title || "Unknown Title",
                    author: bookData.author || "Unknown Author",
                    coverUrl: bookData.coverUrl || "",
                    // Use book's genre if available, otherwise try to extract from preferred genre
                    genre: bookData.genre || shelfData.genre || "",
                    dateAdded: shelfData.dateAdded || Timestamp.now(),
                    dateFinished: shelfData.dateFinished || null,
                    shelfType: shelfType
                  });
                }
              } catch (err) {
                console.error("Error fetching book:", err);
              }
            }
          }
          
          // Process the data for charts
          processGenreDistribution(booksData);
          processFinishedBooksTimeline(booksData.filter(book => book.shelfType === "finished"));
          processCurrentlyReadingTimeline(booksData.filter(book => book.shelfType === "currently-reading"));
          
          setBooksLoaded(true);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error("Error setting up books listener:", error);
        setBooksLoaded(true); // Set to true even on error to prevent infinite loading
      }
    };

    // Call the function and store the unsubscribe function
    const unsubscribeBooks = fetchBooks();
    
    // Clean up the listener when component unmounts
    return () => {
      unsubscribeBooks.then(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, [user]);

  // Process genre distribution for pie chart
  const processGenreDistribution = (books: BookItem[]) => {
    if (!books.length) {
      setGenreDistribution([]);
      return;
    }
    
    const genreCounts: Record<string, number> = {};

    books.forEach(book => {
      // Try to get genre from the book's genre field
      let bookGenre = book.genre || "";
      
      // If no genre is available, mark as "Unspecified"
      if (!bookGenre || bookGenre.trim() === '') {
        genreCounts["Unspecified"] = (genreCounts["Unspecified"] || 0) + 1;
        return;
      }
      
      // Handle different genre formats - some might use # as separators
      if (bookGenre.includes('#')) {
        // Split the genre string by # and process each genre
        const genres = bookGenre.split('#').filter(g => g.trim() !== '');
        
        if (genres.length === 0) {
          genreCounts["Unspecified"] = (genreCounts["Unspecified"] || 0) + 1;
        } else {
          genres.forEach(genre => {
            if (genre.trim()) {
              genreCounts[genre.trim()] = (genreCounts[genre.trim()] || 0) + 1;
            }
          });
        }
      } else {
        // If it's a simple string without separators
        genreCounts[bookGenre.trim()] = (genreCounts[bookGenre.trim()] || 0) + 1;
      }
    });

    // Convert to array format for pie chart
    const genreData: GenreData[] = Object.keys(genreCounts).map(genre => ({
      name: genre,
      value: genreCounts[genre]
    }));

    // Sort by count (descending) and limit to top 10 genres
    genreData.sort((a, b) => b.value - a.value);
    setGenreDistribution(genreData.slice(0, 10));
  };

  // Process timeline data for finished books
  const processFinishedBooksTimeline = (books: BookItem[]) => {
    if (!books.length) {
      setFinishedBooksTimeline([]);
      return;
    }
    
    const monthlyData: Record<string, number> = {};
    
    books.forEach(book => {
      // Make sure we have a valid dateFinished
      if (book.dateFinished) {
        // Convert Timestamp to JavaScript Date
        const finishedDate = book.dateFinished instanceof Timestamp 
          ? book.dateFinished.toDate() 
          : new Date(book.dateFinished);
        
        // Format for monthly data (YYYY-MM)
        const monthKey = `${finishedDate.getFullYear()}-${String(finishedDate.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      }
    });

    // Create an array of the last 12 months (for a complete timeline even if no books)
    const last12Months: string[] = [];
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      last12Months.unshift(monthKey); // Add to the beginning so months are in ascending order
    }
    
    // Create timeline data with the last 12 months, with 0 counts for months with no data
    const monthlyTimeline = last12Months.map(monthKey => ({
      date: monthKey,
      count: monthlyData[monthKey] || 0
    }));
    
    setFinishedBooksTimeline(monthlyTimeline);
  };

  // Process timeline data for currently reading books
  const processCurrentlyReadingTimeline = (books: BookItem[]) => {
    if (!books.length) {
      setCurrentlyReadingTimeline([]);
      return;
    }
    
    const monthlyData: Record<string, number> = {};
    
    books.forEach(book => {
      // Make sure we have a valid dateAdded
      if (book.dateAdded) {
        // Convert Timestamp to JavaScript Date
        const addedDate = book.dateAdded instanceof Timestamp 
          ? book.dateAdded.toDate() 
          : new Date(book.dateAdded);
        
        // Format for monthly data (YYYY-MM)
        const monthKey = `${addedDate.getFullYear()}-${String(addedDate.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      }
    });

    // Create an array of the last 12 months (for a complete timeline even if no books)
    const last12Months: string[] = [];
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      last12Months.unshift(monthKey); // Add to the beginning so months are in ascending order
    }
    
    // Create timeline data with the last 12 months, with 0 counts for months with no data
    const monthlyTimeline = last12Months.map(monthKey => ({
      date: monthKey,
      count: monthlyData[monthKey] || 0
    }));
    
    setCurrentlyReadingTimeline(monthlyTimeline);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setChangeProfile(file);
  };

  const uploadToCloudinary = async (file: File) => {
    if (!user) return;
    const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUD_NAME;
    const UPLOAD_PRESET = "shelfshare";
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();
    return data.secure_url;
  };

  const updateProfilePicture = async () => {
    if (!user || !changeProfile) return;
    const pic = await uploadToCloudinary(changeProfile);
    if (!pic) return;

    setProfilePicture(pic);
    const userDocRef = doc(db, "profile", user.uid);
    await updateDoc(userDocRef, {
      profilePicUrl: pic,
    });
  };

  const updateProfile = async (field: string, value: string) => {
    if (!user) return;
    const userDocRef = doc(db, "profile", user.uid);
    await updateDoc(userDocRef, {
      [field]: value
    });
  };

  // Custom tooltip component for the pie chart
  const CustomTooltip = ({ active, payload }: any) => {
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
  
  // Custom tooltip component for timeline charts
  const TimelineTooltip = ({ active, payload, label }: any) => {
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

  // Helper function to format dates for display on x-axis
  const formatDateForXAxis = (dateStr: string) => {
    const [year, month] = dateStr.split('-');
    return `${month}/${year.slice(2)}`;
  };

  return (
    <div className="min-h-screen bg-[#5A7463] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-8">
          {/* Left Column - Profile Text, Picture & Name */}
          <div className="flex flex-col items-center">
            <h1 className="text-[#DFDDCE] text-4xl font-bold mb-8">Profile</h1>
            
            <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-[#DFDDCE] mb-4">
              <img
                src={profilePicture}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Editable Username */}
            <div className="flex items-center gap-2 mb-4">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-[#DFDDCE] text-[#3D2F2A] px-3 py-2 rounded text-xl text-center"
                  />
                  <button
                    onClick={() => {
                      updateProfile('username', username);
                      setIsEditingName(false);
                    }}
                    className="text-[#DFDDCE]"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold text-[#DFDDCE]">{username}</h2>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-[#DFDDCE]"
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
              />
              <label
                htmlFor="profile-upload"
                className="cursor-pointer bg-[#DFDDCE] text-[#3D2F2A] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-opacity-90"
              >
                <Upload className="w-4 h-4" />
                Choose File
              </label>
              <button
                onClick={updateProfilePicture}
                className="bg-[#3D2F2A] text-[#DFDDCE] px-4 py-2 rounded-lg hover:bg-opacity-90"
              >
                Update
              </button>
            </div>
          </div>

          {/* Right Column - Profile Info */}
          <div className="space-y-6 mt-16">
            {/* Preferred Genre Box */}
            <div className="bg-[#DFDDCE] p-6 rounded-lg relative">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold text-[#3D2F2A]">Preferred Genre</h3>
                <button
                  onClick={() => {
                    if (isEditingGenre) {
                      updateProfile('pgenre', preferredGenre);
                    }
                    setIsEditingGenre(!isEditingGenre);
                  }}
                  className="bg-[#5A7463] text-[#DFDDCE] px-4 py-1 rounded hover:bg-opacity-90"
                >
                  {isEditingGenre ? 'Done' : 'Edit'}
                </button>
              </div>
              {isEditingGenre ? (
                <input
                  type="text"
                  value={preferredGenre}
                  onChange={(e) => setPreferredGenre(e.target.value)}
                  className="w-full bg-white text-[#3D2F2A] p-3 rounded border border-[#3D2F2A] focus:outline-none focus:ring-2 focus:ring-[#5A7463] text-lg"
                />
              ) : (
                <p className="text-[#3D2F2A] text-lg">{preferredGenre}</p>
              )}
            </div>

            {/* About Me Box */}
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
                  className="bg-[#5A7463] text-[#DFDDCE] px-4 py-1 rounded hover:bg-opacity-90"
                >
                  {isEditingAbout ? 'Done' : 'Edit'}
                </button>
              </div>
              {isEditingAbout ? (
                <textarea
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value)}
                  className="w-full bg-white text-[#3D2F2A] p-3 rounded border border-[#3D2F2A] focus:outline-none focus:ring-2 focus:ring-[#5A7463] text-lg min-h-[120px]"
                />
              ) : (
                <p className="text-[#3D2F2A] text-lg">{aboutMe}</p>
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
                  onClick={() => setActiveTab('finished')}
                  className={`flex items-center px-4 py-2 ${activeTab === 'finished' ? 'bg-[#5A7463] text-[#DFDDCE] rounded-t' : 'text-[#3D2F2A]'}`}
                >
                  <LineChartIcon className="w-4 h-4 mr-2" />
                  Finished Books
                </button>
                <button
                  onClick={() => setActiveTab('reading')}
                  className={`flex items-center px-4 py-2 ${activeTab === 'reading' ? 'bg-[#5A7463] text-[#DFDDCE] rounded-t' : 'text-[#3D2F2A]'}`}
                >
                  <Book className="w-4 h-4 mr-2" />
                  Currently Reading
                </button>
              </div>
              
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
                            No genre data available. Add books to your shelves!
                          </div>
                        )}
                      </div>
                    )}
                    
                    {activeTab === 'finished' && (
                      <div className="h-full">
                        {finishedBooksTimeline.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={finishedBooksTimeline}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <XAxis 
                                dataKey="date" 
                                tickFormatter={formatDateForXAxis}
                              />
                              <YAxis />
                              <Tooltip content={<TimelineTooltip />} />
                              <Legend />
                              <Line type="monotone" dataKey="count" name="Finished Books" stroke="#8884d8" activeDot={{ r: 8 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-[#3D2F2A]">
                            No finished books data available. Mark some books as finished!
                          </div>
                        )}
                      </div>
                    )}
                    
                    {activeTab === 'reading' && (
                      <div className="h-full">
                        {currentlyReadingTimeline.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={currentlyReadingTimeline}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <XAxis 
                                dataKey="date" 
                                tickFormatter={formatDateForXAxis}
                              />
                              <YAxis />
                              <Tooltip content={<TimelineTooltip />} />
                              <Legend />
                              <Line type="monotone" dataKey="count" name="Currently Reading" stroke="#82ca9d" activeDot={{ r: 8 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-[#3D2F2A]">
                            No currently reading data available. Add books to your currently reading shelf!
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