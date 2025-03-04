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
        const shelvesRef = collection(db, "users", user.uid, "shelves");
        
        // Listen for changes to shelves collection
        const unsubscribe = onSnapshot(shelvesRef, (snapshot) => {
          const booksData: BookItem[] = [];
          
          // Process each shelf document
          snapshot.docs.forEach((doc) => {
            const shelfData = doc.data();
            const shelfType = shelfData.shelfType;
            
            // Only include 'currently-reading' and 'finished' shelves
            if (shelfType !== "currently-reading" && shelfType !== "finished") return;
            
            booksData.push({
              id: doc.id,
              bookId: shelfData.bookId,
              title: shelfData.title || "Unknown Title",
              author: shelfData.author || "Unknown Author",
              coverUrl: shelfData.coverUrl || "",
              genre: shelfData.genre || "", // Use shelfData's genre if available
              dateAdded: shelfData.dateAdded || Timestamp.now(),
              dateFinished: shelfData.dateFinished || null,
              shelfType: shelfType
            });
          });

          // Process data for charts
          processGenreDistribution(booksData);
          setFinishedBooksTimeline(processTimelineData(
            booksData.filter(book => book.shelfType === "finished"), 
            true
          ));
          setCurrentlyReadingTimeline(processTimelineData(
            booksData.filter(book => book.shelfType === "currently-reading"), 
            false
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
  }, [user]);


  // Process genre distribution for pie chart ####################
  const processGenreDistribution = (books: BookItem[]) => {
    if (!books.length) {
      setGenreDistribution([]);
      return;
    }
    
    const genreCounts: Record<string, number> = {};

    books.forEach(book => {
      const genres = book.genre?.split('#').filter(g => g.trim()) || [];
      
      if (genres.length === 0) {
        genreCounts["Unspecified"] = (genreCounts["Unspecified"] || 0) + 1;
      } else {
        genres.forEach(genre => {
          genreCounts[genre.trim()] = (genreCounts[genre.trim()] || 0) + 1;
        });
      }
    });

    const genreData: GenreData[] = Object.keys(genreCounts).map(genre => ({
      name: genre,
      value: genreCounts[genre]
    }));

    genreData.sort((a, b) => b.value - a.value);
    setGenreDistribution(genreData.slice(0, 10));
  };

  // New helper function for weekly timeline processing
  const getWeekNumber = (d: Date) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const yearStart = new Date(date.getFullYear(), 0, 1);
    return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };


  const processTimelineData = (books: BookItem[], isFinished: boolean) => {
    const weeklyData: Record<string, number> = {};
    const today = new Date();
    const weeksToShow = 12;

    // Create weekly buckets for the last 12 weeks
    const weekKeys: string[] = [];
    for (let i = weeksToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - (7 * i));
      const weekNumber = getWeekNumber(date);
      weekKeys.push(`${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`);
    }

    books.forEach(book => {
      const date = isFinished && book.dateFinished ? 
        (book.dateFinished instanceof Timestamp ? book.dateFinished.toDate() : new Date(book.dateFinished)) :
        (book.dateAdded instanceof Timestamp ? book.dateAdded.toDate() : new Date(book.dateAdded));
      
      const weekNumber = getWeekNumber(date);
      const weekKey = `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
      
      if (weekKeys.includes(weekKey)) {
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
      }
    });

    return weekKeys.map(weekKey => ({
      date: weekKey,
      count: weeklyData[weekKey] || 0
    }));
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
                            <LineChart data={finishedBooksTimeline}>
                              <XAxis 
                                dataKey="date" 
                                tickFormatter={formatDateForXAxis}
                                label={{ 
                                  value: 'Week', 
                                  position: 'bottom', 
                                  offset: 0 
                                }}
                              />
                              <YAxis 
                                label={{ 
                                  value: 'Books Added', 
                                  angle: -90, 
                                  position: 'insideLeft' 
                                }}
                              />
                              <Tooltip content={<TimelineTooltip />} />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="count" 
                                name="Finished Books" 
                                stroke="#8884d8" 
                                activeDot={{ r: 8 }}
                              />
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
                            <LineChart data={currentlyReadingTimeline}>
                              <XAxis 
                                dataKey="date" 
                                tickFormatter={formatDateForXAxis}
                                label={{ 
                                  value: 'Week', 
                                  position: 'bottom', 
                                  offset: 0 
                                }}
                              />
                              <YAxis 
                                label={{ 
                                  value: 'Books Added', 
                                  angle: -90, 
                                  position: 'insideLeft' 
                                }}
                              />
                              <Tooltip content={<TimelineTooltip />} />
                              <Legend />
                              <Line  
                                type="monotone" 
                                dataKey="count" 
                                name="Currently Reading" 
                                stroke="#82ca9d" 
                                activeDot={{ r: 8 }} 
                              />
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