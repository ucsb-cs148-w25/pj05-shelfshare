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

  // Month abbreviations array - Changed to 3-letter abbreviations
  const monthAbbreviations = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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


  // Process genre distribution for pie chart
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
  
      // Count only valid core genres
      coreGenres.forEach(genre => {
        if (genre !== 'Unspecified') {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        }
      });
  
      // Only count as Unspecified if NO valid genres found
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

  // New function to process monthly timeline data
  const processTimelineData = (books: BookItem[], isFinished: boolean) => {
    // Initialize monthly data with all 12 months
    const monthlyData: Record<string, number> = {};
    const currentYear = new Date().getFullYear();
    
    // Create entries for all 12 months
    for (let month = 0; month < 12; month++) {
      const monthKey = `${currentYear}-${(month + 1).toString().padStart(2, '0')}`;
      monthlyData[monthKey] = 0;
    }

    // Process books to populate monthly counts
    books.forEach(book => {
      const dateObj = isFinished && book.dateFinished ? 
        (book.dateFinished instanceof Timestamp ? book.dateFinished.toDate() : new Date(book.dateFinished)) :
        (book.dateAdded instanceof Timestamp ? book.dateAdded.toDate() : new Date(book.dateAdded));
      
      // Only count books from the current year
      if (dateObj.getFullYear() === currentYear) {
        const month = dateObj.getMonth();
        const monthKey = `${currentYear}-${(month + 1).toString().padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      }
    });

    // Convert to array format needed for chart
    return Object.entries(monthlyData)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
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
      // Extract month from date (format: YYYY-MM)
      const month = parseInt(label.split('-')[1]) - 1;
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

  // Format month abbreviation for x-axis - Updated to use three-letter abbreviations
  const formatMonthAbbreviation = (dateStr: string) => {
    const month = parseInt(dateStr.split('-')[1]) - 1; // Convert from 1-based to 0-based
    return monthAbbreviations[month];
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
              
              {/* Analytics Tabs - Reordered tabs to put "Currently Reading" before "Finished" */}
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
                    
                    {activeTab === 'reading' && (
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
                                  domain={[0, 15]}
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
                    
                    {activeTab === 'finished' && (
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
                                  domain={[0, 15]}
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