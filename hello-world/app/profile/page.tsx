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
  pgenre?: string;
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

    const fetchBooks = async () => {
      try {
        // Get currently reading and finished books
        const shelvesQuery = query(
          collection(db, "users", user.uid, "shelves"),
          where("shelfType", "in", ["currently-reading", "finished"])
        );
        
        const shelvesSnapshot = await getDocs(shelvesQuery);
        const booksData = shelvesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dateAdded: doc.data().dateAdded,
          dateFinished: doc.data().dateFinished || null
        })) as BookItem[];

        // Process genre distribution
        processGenreDistribution(booksData);
        
        // Process timeline data
        processFinishedBooksTimeline(booksData.filter(book => book.shelfType === "finished"));
        processCurrentlyReadingTimeline(booksData.filter(book => book.shelfType === "currently-reading"));
      } catch (error) {
        console.error("Error fetching books data:", error);
      }
    };

    fetchBooks();
  }, [user]);

  // Process genre distribution for pie chart
  const processGenreDistribution = (books: BookItem[]) => {
    const genreCounts: Record<string, number> = {};

    books.forEach(book => {
      // Extract genre from pgenre field or use a default
      let bookGenres: string[] = [];
      
      if (book.pgenre) {
        // If book has specific genres
        bookGenres = book.pgenre.split('#').filter(genre => genre.trim() !== '');
      } else {
        // Use a default genre if none is specified
        bookGenres = ['Unspecified'];
      }

      // Count each genre
      bookGenres.forEach(genre => {
        if (genre) {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        }
      });
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
    const monthlyData: Record<string, number> = {};
    const weeklyData: Record<string, number> = {};
    
    books.forEach(book => {
      if (book.dateFinished) {
        const finishedDate = book.dateFinished instanceof Timestamp 
          ? book.dateFinished.toDate() 
          : new Date(book.dateFinished);
        
        // Format for monthly data (YYYY-MM)
        const monthKey = `${finishedDate.getFullYear()}-${String(finishedDate.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
        
        // Format for weekly data
        const weekNumber = getWeekNumber(finishedDate);
        const weekKey = `${finishedDate.getFullYear()}-W${weekNumber}`;
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
      }
    });

    // Convert monthly data to array and sort chronologically
    const monthlyTimeline = Object.keys(monthlyData)
      .map(date => ({ date, count: monthlyData[date] }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Convert weekly data to array and sort chronologically
    const weeklyTimeline = Object.keys(weeklyData)
      .map(date => ({ date, count: weeklyData[date] }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Combine data for the chart (using monthly data for now)
    setFinishedBooksTimeline(monthlyTimeline);
  };

  // Process timeline data for currently reading books
  const processCurrentlyReadingTimeline = (books: BookItem[]) => {
    const monthlyData: Record<string, number> = {};
    const weeklyData: Record<string, number> = {};
    
    books.forEach(book => {
      const addedDate = book.dateAdded instanceof Timestamp 
        ? book.dateAdded.toDate() 
        : new Date(book.dateAdded);
      
      // Format for monthly data (YYYY-MM)
      const monthKey = `${addedDate.getFullYear()}-${String(addedDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      
      // Format for weekly data
      const weekNumber = getWeekNumber(addedDate);
      const weekKey = `${addedDate.getFullYear()}-W${weekNumber}`;
      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
    });

    // Convert monthly data to array and sort chronologically
    const monthlyTimeline = Object.keys(monthlyData)
      .map(date => ({ date, count: monthlyData[date] }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Convert weekly data to array and sort chronologically
    const weeklyTimeline = Object.keys(weeklyData)
      .map(date => ({ date, count: weeklyData[date] }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Combine data for the chart (using monthly data for now)
    setCurrentlyReadingTimeline(monthlyTimeline);
  };

  // Helper function to get week number of a date
  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
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
                            tickFormatter={(value) => {
                              const [year, month] = value.split('-');
                              return `${month}/${year.slice(2)}`;
                            }}
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
                            tickFormatter={(value) => {
                              const [year, month] = value.split('-');
                              return `${month}/${year.slice(2)}`;
                            }}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;