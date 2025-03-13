'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '@/firebase';
import { collection, query, where, getDocs, getDoc, doc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import '../globals.css';
import Image from 'next/image';
import { sendFriendRequest, unsendFriendRequest } from '../context/friends'; 

import dynamic from "next/dynamic";
import dotenv from "dotenv";
dotenv.config();

const LibraryMap = dynamic(() => import("./map"), { ssr: false });

interface Library {
  name: string;
  lat: number;
  lng: number;
  distance?: number;
}

interface dataLibrary {
  type: string,
  id: number,
  lat: number,
  lon: number,
  tags: {
    name: string,
    operator: string,
    opening_hours: string
  }
}

interface BookItem {
  id: string;
  bookId: string;
  title: string;
  author: string;
  coverUrl: string;
  dateAdded: Timestamp | Date;
  shelfType?: string;
}

interface UserProfile {
  id: string;
  name: string;
  username?: string;
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [zipCode, setZipCode] = useState("");
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([38.8887, -77.0047]);
  const [isLoaded, setIsLoaded] = useState(false); // Track when data is ready
  const [close, setClose] = useState(false);
  const [readingGoal, setReadingGoal] = useState<number | null>(null);
  const [booksRead, setBooksRead] = useState(0);
  const [inputGoal, setInputGoal] = useState('');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalError, setGoalError] = useState('');
  const [currentlyReading, setCurrentlyReading] = useState<BookItem[]>([]);

  // New state for friend functionality
  const [friendSearch, setFriendSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResultMessage, setSearchResultMessage] = useState("");

  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);


  useEffect(() => {
    if (!user) return;
  
    // Track sent friend requests
    const sentRequestsQuery = query(
      collection(db, "users", user.uid, "sentFriendRequests")
    );
  
    const unsubscribeSentRequests = onSnapshot(sentRequestsQuery, (snapshot) => {
      setSentRequests(snapshot.docs.map((doc) => doc.id));
    });
  
    // Track current friends
    const friendsQuery = query(collection(db, "users", user.uid, "friends"));
    
    const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
      const friendsList = snapshot.docs.map((doc) => doc.id);
      setFriends(friendsList);
    });
  
    return () => {
      unsubscribeSentRequests();
      unsubscribeFriends();
    };
  }, [user]);

  // Fetch the reading goal and books read count
  useEffect(() => {
    const fetchReadingGoalAndBooksRead = async () => {
      if (!user) return;

      // Fetch the reading goal
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        setReadingGoal(data.readingGoal || null);
      }

      // Fetch the number of books in the "Finished" shelf for 2025
      const shelvesRef = collection(db, "users", user.uid, "shelves");
      const q = query(
        shelvesRef,
        where("shelfType", "==", "finished"),
        where("dateFinished", ">=", new Date("2025-01-01")), // Start of 2025
        where("dateFinished", "<=", new Date("2025-12-31")) // End of 2025
      );

      const querySnapshot = await getDocs(q);
      setBooksRead(querySnapshot.size); // Set booksRead to the number of books in the "Finished" shelf for 2025
    };

    fetchReadingGoalAndBooksRead();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const shelvesRef = collection(db, "users", user.uid, "shelves");
    const q = query(shelvesRef, where("shelfType", "==", "currently-reading"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const booksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dateAdded: doc.data().dateAdded instanceof Timestamp ? doc.data().dateAdded : new Date()
      })) as BookItem[];
      
      setCurrentlyReading(booksData);
    });
    
    return () => unsubscribe();
  }, [user]);

  // New function to search for users
const searchUsers = async () => {
  if (!user || !friendSearch.trim()) {
    setShowSearchResults(false);
    return;
  }

  setShowSearchResults(true);
  setSearchResults([]);
  setSearchResultMessage("Searching...");

  const usersQuery = query(collection(db, "users"));
  const querySnapshot = await getDocs(usersQuery);
  
  const results: UserProfile[] = [];
  
  // First pass: Direct name match
  querySnapshot.forEach((docSnapshot) => {
    if (docSnapshot.id === user.uid) return; // Skip current user
    
    const userData = docSnapshot.data();
    const name = userData.name?.toLowerCase() || '';
    const username = userData.username?.toLowerCase() || '';
    const email = userData.email?.toLowerCase() || '';
    const searchTerm = friendSearch.toLowerCase();
    
    if (name.includes(searchTerm) || username.includes(searchTerm) || email.includes(searchTerm)) {
      results.push({
        id: docSnapshot.id,
        name: userData.name || "Unknown User",
        username: userData.username
      });
    }
  });
  
  if (results.length === 0) {
    setSearchResultMessage("No users found. Try a different search term.");
  } else {
    setSearchResultMessage("");
  }
  
  setSearchResults(results);
};

// Handle sending a friend request
const handleSendFriendRequest = async (friendId: string) => {
  if (!user) return;
  
  await sendFriendRequest(user.uid, friendId);
  // Update local state to reflect the sent request
  setSentRequests(prev => [...prev, friendId]);
};

// Handle canceling a friend request
const handleUnsendRequest = async (friendId: string) => {
  if (!user) return;
  
  await unsendFriendRequest(user.uid, friendId);
  // Update local state to reflect the canceled request
  setSentRequests(prev => prev.filter(id => id !== friendId));
};

  const handleSetGoal = async () => {
    const goal = parseInt(inputGoal, 10);
    // Clear previous error
    setGoalError('');
    
    if (isNaN(goal)) {
      setGoalError('Please enter a valid number');
    } else if (goal <= 0) {
      setGoalError('Book goal must be greater than zero');
    } else {
      setReadingGoal(goal);
      setInputGoal('');
      setIsEditingGoal(false);

      // Save the goal to Firestore
      if (user) {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, { readingGoal: goal }, { merge: true });
      }
    }
  };

  const handleEditGoal = () => {
    setIsEditingGoal(true);
    setInputGoal(readingGoal?.toString() || '');
    setGoalError(''); // Clear any previous errors
  };

  if (!user) {
    return null; // Avoid rendering anything while redirecting
  }

  const progressPercentage = Math.min((booksRead / (readingGoal || 1)) * 100, 100); // Cap progress at 100%

  const fetchCoordinates = async (zipCode: string) => {
    setIsLoaded(false);
    const API_KEY = process.env.NEXT_PUBLIC_MAP_API_KEY;
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${zipCode}&countrycode=US&key=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const data = await response.json();
    console.log("API Response:", data); // Debugging response

    if (data.results.length > 0) {
      const coordinates = {
        lat: data.results[0].geometry.lat,
        lng: data.results[0].geometry.lng
      };
      console.log(mapCenter);
      console.log(`ZIP Code ${zipCode} → Coordinates:`, coordinates);
      return coordinates;
    }
  };

  const fetchLibraries = async (lat: number, lng: number) => {
    const query = `
      [out:json];
      node["amenity"="library"](around:20000, ${lat}, ${lng});
      out;
    `;

    const response = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
    );
    const data = await response.json();

    return data.elements.map((library: dataLibrary) => {
      return {
        name: library.tags?.name || "Unnamed Library",
        lat: library.lat,
        lng: library.lon
      };
    });
  };

  // Fetch and update top 5 libraries
  const findTop5LibrariesByZip = async () => {
    if (!zipCode) return;

    const coords = await fetchCoordinates(zipCode);
    if (!coords) return;
    setMapCenter([coords.lat, coords.lng]);

    const librariesList = await fetchLibraries(coords.lat, coords.lng);

    // Sort by closest distance & select top 5
    const topFive = librariesList
      .sort((a: Library, b: Library) => (a.distance ?? 0) - (b.distance ?? 0))
      .slice(0, 5);

    setLibraries(topFive);
    setIsLoaded(true);
  };

  return (
    <div className="min-h-screen" 
      style={{ backgroundColor: '#5A7463', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Main Container - Flex instead of Grid */}
      <div className="flex flex-col md:flex-row gap-8 p-8">
        
        {/* Left Column */}
        <div className="md:w-1/2 flex flex-col gap-8">
          {/* Currently Reading Section */}
          <div className="p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold text-3xl"
                style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif' }}>
                Currently Reading
              </h2>
              
            </div>
            <div className="relative bg-light-brown border-t-8 border-b-8 border-[#3D2F2A] h-72 rounded-lg overflow-hidden">
              {/* Left scroll button */}
              <button 
                onClick={() => {
                  const container = document.getElementById('home-currently-reading-container');
                  if (container) container.scrollBy({ left: -170, behavior: 'smooth' });
                }} 
                className="absolute left-0 top-0 h-full w-10 flex items-center justify-center bg-custom-brown text-custom-tan z-10 hover:bg-[#2E221E] transition-colors"
                style={{ borderRight: '2px solid #3D2F2A' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              
              {/* Right scroll button */}
              <button 
                onClick={() => {
                  const container = document.getElementById('home-currently-reading-container');
                  if (container) container.scrollBy({ left: 170, behavior: 'smooth' });
                }}
                className="absolute right-0 top-0 h-full w-10 flex items-center justify-center bg-custom-brown text-custom-tan z-10 hover:bg-[#2E221E] transition-colors"
                style={{ borderLeft: '2px solid #3D2F2A' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
              
              {/* Books container */}
              <div 
                id="home-currently-reading-container" 
                className="relative bottom-1 flex space-x-5 overflow-x-auto no-scrollbar h-full items-center" 
                style={{ width: 'calc(100% - 20px)', marginLeft: '10px', marginRight: '10px', paddingRight: '50px', paddingLeft: '50px' }}
              >
                {currentlyReading.length > 0 ? (
                  currentlyReading.map((book) => (
                    <div 
                      key={book.id} 
                      className="flex-shrink-0 cursor-pointer relative group mt-4" 
                      onClick={() => router.push(`/books/${book.bookId}`)}
                    >
                      <Image 
                        src={book.coverUrl} 
                        alt={book.title} 
                        width={128} 
                        height={144} 
                        className="w-[150px] h-[250px] rounded-lg object-cover bg-custom-brown shadow-md transform transition-transform duration-300 hover:scale-105" 
                      />
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-custom-tan text-lg italic">
                    Track what you&apos;re reading
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Map Section */}
          <div className="p-4">
            <h2 className="font-bold items-center text-3xl"
            style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif' }}>
              Find Your Local Library
            </h2>
            <div className="p-4 rounded-lg w-full h-auto overflow-hidden"
                style={{ backgroundColor: '#DFDDCE'}}>
              <input
                type="text"
                placeholder="Enter zip-code"
                className="flex-grow p-2 border rounded-lg mb-4"
                style={{
                  backgroundColor: '#847266',
                  color: '#3D2F2A',
                }}
                onChange={(e) => setZipCode(e.target.value)}
              />
              <button className="px-4 py-2 rounded-[15px] shadow-md font-bold mb-6 ml-2"
                style={{
                  backgroundColor: '#3D2F2A',
                  color: '#DFDDCE',
                  fontFamily: 'Outfit, sans-serif',
                }} 
                onClick={() => {
                  findTop5LibrariesByZip();
                  setClose(true);
                }}>
                Search
              </button>
              <button className="ml-2 mt-1" hidden={!(isLoaded && close)} onClick={() => {setIsLoaded(false); setClose(true)}}
                style={{width: "25px", height: "25px"}}> <img src="close.png"/> </button>
              <div style={{
                backgroundColor: '#3D2F2A',
                color: '#DFDDCE',
                fontFamily: 'Outfit, sans-serif',
              }}>
                {(isLoaded && close) && (
                  <div className="ml-2" style={{backgroundColor: '#3D2F2A'}}> 
                    <h3>Nearby Libraries:</h3>
                    <ul>
                      {libraries.map((lib, index) => (
                        <li key={index}>{lib.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div style={{
                backgroundColor: '#847266',
                color: '#3D2F2A',
              }}>
                {isLoaded && close && (
                  <LibraryMap libraries={libraries} mapCenterCoord={mapCenter} />
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column */}
        <div className="md:w-1/2 flex flex-col gap-8">
          {/* Add Friend Section */}
          <div className="p-4">
            <h2 className="font-bold text-3xl mb-4"
              style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif' }}>
              Add Friend
            </h2>
            <div className="flex space-x-2 mb-4 w-full">
              <input
                type="text"
                placeholder="Search by name or email"
                className="flex-grow p-2 border rounded-lg"
                style={{
                  backgroundColor: '#DFDDCE',
                  color: '#3D2F2A',
                }}
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
              />
              <button className="px-4 py-2 rounded-[15px] shadow-md font-bold"
                style={{
                  backgroundColor: '#3D2F2A',
                  color: '#DFDDCE',
                  fontFamily: 'Outfit, sans-serif',
                }}
                onClick={searchUsers}>
                Search
              </button>
            </div>
            
            {/* Search Results */}
            {showSearchResults && (
              <div className="bg-[#DFDDCE] p-4 rounded-lg mt-2 max-h-60 overflow-y-auto">
                {searchResultMessage ? (
                  <p className="text-[#3D2F2A]">{searchResultMessage}</p>
                ) : (
                  <ul className="divide-y divide-gray-300">
                    {searchResults.map((user) => (
                      <li key={user.id} className="py-2 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-[#3D2F2A]">{user.name}</p>
                          {user.username && (
                            <p className="text-xs text-gray-500">@{user.username}</p>
                          )}
                        </div>
                        <div>
                          {friends.includes(user.id) ? (
                            <span className="text-[#5A7463] font-medium">Already friends</span>
                          ) : sentRequests.includes(user.id) ? (
                            <button
                              onClick={() => handleUnsendRequest(user.id)}
                              className="px-3 py-1 rounded-lg text-sm bg-[#847266] text-[#DFDDCE]"
                            >
                              Cancel Request
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSendFriendRequest(user.id)}
                              className="px-3 py-1 rounded-lg text-sm bg-[#5A7463] text-[#DFDDCE]"
                            >
                              Add Friend
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Yearly Reading Challenge Section */}
          <div className="p-4">
            <h2 className="font-bold items-center text-3xl"
            style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif' }}>
              2025 Reading Challenge</h2>
            <div className="bg-[#DFDDCE] p-4 rounded-lg shadow-lg mt-2">
              {readingGoal === null || isEditingGoal ? (
                <div>
                  <p className="text-lg font-bold text-[#3D2F2A]">Set your reading goal for the year:</p>
                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <input
                      type="number"
                      className={`p-2 border rounded-lg flex-grow mt-2 font-bold text-[#3D2F2A] placeholder-[#847266] ${
                        goalError ? 'border-red-500' : ''
                      }`}
                      placeholder="Enter goal"
                      value={inputGoal}
                      onChange={(e) => {
                        setInputGoal(e.target.value);
                        setGoalError('');
                      }}
                    />
                    <button
                      className="mt-2 px-4 py-2 bg-[#3D2F2A] text-[#DFDDCE] rounded-lg font-bold"
                      onClick={handleSetGoal}
                    >
                      Set Goal
                    </button>
                  </div>
                  {goalError && (
                    <p className="text-red-600 mt-1 text-sm font-medium">{goalError}</p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-lg font-bold text-[#3D2F2A]">Books Read: {booksRead} / {readingGoal}</p>
                  {booksRead >= readingGoal && (
                    <p className="text-lg font-bold text-[#3D2F2A] mt-2">
                      🎉 Congratulations on reaching your yearly goal! 🎉
                    </p>
                  )}
                  <div className="w-full bg-gray-300 rounded-full h-4 mt-2">
                    <div
                      className="bg-[#3D2F2A] h-4 rounded-full"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  <button
                    className="mt-2 px-4 py-2 bg-[#847266] text-[#DFDDCE] rounded-lg font-bold"
                    onClick={handleEditGoal}
                  >
                    Edit Goal
                  </button>
                </div>
              )}
            </div>
          </div>
  
        </div>
      </div>
    </div>
  );
}