'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '@/firebase';
import { collection, query, where, getDocs, getDoc, doc, setDoc } from 'firebase/firestore';
import '../globals.css';

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
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [bookInput, setBookInput] = useState("");

  // Getting Spotify Token from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("spotifyToken");

    if (token) {
        localStorage.setItem("spotifyToken", token);
        setSpotifyToken(token);
    }
}, []);

  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

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

  const handleSetGoal = async () => {
    const goal = parseInt(inputGoal, 10);
    if (!isNaN(goal) && goal > 0) {
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

  const generatePlaylist = async () => {
    if (!inputGoal) {
      alert("Please enter a book name!");
      return;
  }

  const response = await fetch("/api/generate-playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookDescription: inputGoal }), // Use user input
  });

  const data = await response.json();
  console.log("Generated Playlist:", data.playlist);
};

  const handleEditGoal = () => {
    setIsEditingGoal(true);
    setInputGoal(readingGoal?.toString() || '');
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
      
      {/* Main Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-20 gap-y-8 ml-20 mr-20">
        {/* Map Section (Left Side) */}
        <div>
          <h2 className="font-bold items-center text-3xl mt-6"
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
                backgroundColor: '#847266', // Tan background for search bar
                color: '#3D2F2A', // Brown text color
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
              backgroundColor: '#847266', // Tan background for search bar
              color: '#3D2F2A', // Brown text color
            }}>
              {isLoaded && close && (
                <LibraryMap libraries={libraries} mapCenterCoord={mapCenter} />
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Reading Challenge and Add Friends */}
        <div>
          {/* Yearly Reading Challenge Section */}
          <div>
            <h2 className="font-bold items-center text-3xl mt-6"
            style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif' }}>
              2025 Reading Challenge</h2>
            <div className="bg-[#DFDDCE] p-4 rounded-lg shadow-lg mt-2">
              {readingGoal === null || isEditingGoal ? (
                <div>
                  <p className="text-lg font-bold text-[#3D2F2A]">Set your reading goal for the year:</p>
                  <input
                    type="number"
                    className="p-2 border rounded-lg w-full mt-2 font-bold text-[#3D2F2A] placeholder-[#847266]"
                    placeholder="Enter goal"
                    value={inputGoal}
                    onChange={(e) => setInputGoal(e.target.value)}
                  />
                  <button
                    className="mt-2 px-4 py-2 bg-[#3D2F2A] text-[#DFDDCE] rounded-lg font-bold"
                    onClick={handleSetGoal}
                  >
                    Set Goal
                  </button>
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
          {/* Spotify Connect Section */}
          <div className="mt-6">
            <h2 className="font-bold text-3xl"
              style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif' }}>
              Connect to Spotify
            </h2>
            
            {!spotifyToken ? (
              <button
                onClick={() => {
                  window.location.href = `/api/spotify-login`; // Redirects to Spotify login API
                }}
                className="mt-2 px-4 py-2 bg-[#3D2F2A] text-[#DFDDCE] rounded-lg font-bold"
              >
                Login with Spotify
              </button>
            ) : (
              <p className="text-lg font-bold text-[#3D2F2A] mt-2">Connected to Spotify ✅</p>
            )}
          </div>
          
          {/* Book Input Form */}
          <div className="mt-6">
            <h2 className="font-bold text-3xl"
              style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif' }}>
              Generate a Playlist for a Book
            </h2>
            
            <input
              type="text"
              placeholder="Enter book name"
              value={bookInput} // Reuse the same input state for simplicity
              onChange={(e) => setBookInput(e.target.value)}
              className="flex-grow p-2 border rounded-lg w-full mt-2"
              style={{
                backgroundColor: '#DFDDCE',
                color: '#3D2F2A',
              }}
            />
            
            <button
              onClick={generatePlaylist}
              className="mt-2 px-4 py-2 bg-[#3D2F2A] text-[#DFDDCE] rounded-lg font-bold"
            >
              Generate Playlist
            </button>
          </div>


          {/* Add Friend Section */}
          <div className="flex items-center space-x-2 mt-6">
            <h2 className="font-bold text-3xl"
              style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif' }}>
              Add Friend
            </h2>

            <div className="flex space-x-2 mb-4 w-full"> {/* Added w-full for full width */}
              <input
                type="text"
                placeholder="Add Friend!"
                className="flex-grow p-2 border rounded-lg"
                style={{
                  backgroundColor: '#DFDDCE', // Tan background for search bar
                  color: '#3D2F2A', // Brown text color
                }}
              />
              <button className="px-4 py-2 rounded-[15px] shadow-md font-bold"
                style={{
                  backgroundColor: '#3D2F2A',
                  color: '#DFDDCE',
                  fontFamily: 'Outfit, sans-serif',
                }}>
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}