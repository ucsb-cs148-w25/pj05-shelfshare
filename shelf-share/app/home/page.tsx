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


interface TrackReccomendation {
  title: string;
  artist: string;
  reason:string;
}

interface PlaylistData{
  playlistName: string;
  description: string;
  tracks: TrackReccomendation[];
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

  const [spotifyConnected, setSpotifyConnected] = useState(false);

  // New states for book playlist recommendation
  const [bookTitle, setBookTitle] = useState('');
  const [isGeneratingPlaylist, setIsGeneratingPlaylist] = useState(false);
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null);
  const [showPlaylistForm, setShowPlaylistForm] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

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
  // useEffect(() => {
  //   if (!user) {
  //     router.push('/');
  //   }
  // }, [user, router]);


  
 // First useEffect - handle initial auth check and Spotify connection status
  useEffect(() => {
  // Check if authentication is in progress from the callback
  const authInProgress = sessionStorage.getItem('auth_in_progress') === 'true';
  
  if (authInProgress) {
    // Clear the flag after we've handled it
    sessionStorage.removeItem('auth_in_progress');
    setIsAuthenticating(true);
  }
  
  const checkSpotifyConnection = async () => {
    if (authInProgress) {
      setIsAuthenticating(true);
    }
  
    const accessToken = localStorage.getItem('spotify_access_token');
    const tokenExpiry = localStorage.getItem('spotify_token_expiry');
  
    if (accessToken && tokenExpiry && parseInt(tokenExpiry) > Date.now()) {
      console.log("✅ Spotify token is still valid.");
      setSpotifyConnected(true);
      setIsAuthenticating(false);
    } else {
      console.log("⏳ Spotify token expired or missing. Waiting for re-authentication...");
      setSpotifyConnected(false);
  
      // Remove expired tokens
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_refresh_token');
      localStorage.removeItem('spotify_token_expiry');
  
      if (!authInProgress) {
        setTimeout(() => {
          setIsAuthenticating(false);
          if (user) { // Only show alert if user is logged in
            //alert("Your Spotify session has expired. Please log in again.");
          }
        }, 3000);
      }
    }
  };
  
  checkSpotifyConnection();
  const intervalId = setInterval(checkSpotifyConnection, 60000); // Recheck every 60 seconds
  
  return () => clearInterval(intervalId);
}, [user]); // Only depend on user, not on router or isAuthenticating

// Second useEffect - handle redirects to login page
useEffect(() => {
  const authInProgress = sessionStorage.getItem('auth_in_progress') === 'true';
  
  if (!user && !isAuthenticating && !authInProgress) {
    console.log("Redirecting to ShelfShare login...");
    router.push('/');
  }
}, [user, router, isAuthenticating]);


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

  // New function to handle generating a playlist
  const generatePlaylist = async () => {
    if (!bookTitle.trim()) return;
    
    setIsGeneratingPlaylist(true);
    
    try {
      const response = await fetch('/api/ai-recommend/generate-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          bookTitle,
          // You could add these as optional inputs:
          // bookAuthor, 
          // bookGenre,
          // mood
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate playlist');
      }
      
      const data = await response.json();
      setPlaylistData(data);
      
    } catch (error) {
      console.error('Error generating playlist:', error);
    } finally {
      setIsGeneratingPlaylist(false);
    }
  };


  const createSpotifyPlaylist = async () => {
    if (!playlistData) {
      console.error("❌ No playlist data available.");
      //alert("Something went wrong. Try generating the playlist again.");
      return;
    }
  
    const accessToken = localStorage.getItem('spotify_access_token');
  
    if (!accessToken) {
      console.error("❌ No access token found.");
      //alert("Spotify authentication required. Please log in.");
      return;
    }
  
    console.log("🔄 Sending playlist to Spotify:", playlistData);
  
    try {
      const response = await fetch('/api/ai-recommend/create-spotify-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistData, accessToken }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        console.error("❌ Failed to create playlist:", data);
        //alert(`Error creating playlist: ${data.error}`);
        return;
      }
  
      console.log("✅ Created Spotify playlist:", data.playlistUrl);
      window.open(data.playlistUrl, '_blank');
    } catch (error) {
      console.error("❌ Unexpected error:", error);
      //alert("Failed to create Spotify playlist.");
    }
  };
  


  const handleSpotifyLogin = () => {
    const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || `${window.location.origin}/spotify-callback`;
  
    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-modify-public',
      'playlist-modify-private'
    ].join(' ');
  
    const state = generateRandomString(16);
    localStorage.setItem('spotify_auth_state', state);
  
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', CLIENT_ID as string);
    authUrl.searchParams.append('scope', scopes);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('state', state);
  
    console.log('Redirecting to Spotify:', authUrl.toString());
    window.location.href = authUrl.toString();
  };

  // Helper function to generate a random string for the state parameter
  function generateRandomString(length: number) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    
    return text;
  }

  // Show a loading message while authenticating
  if (isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl font-bold" 
           style={{ color: '#DFDDCE', backgroundColor: '#5A7463', fontFamily: 'Outfit, sans-serif' }}>
        ⏳ Wait while we connect your Spotify...
      </div>
    );
  }

// Redirect to login page if user is not authenticated and not in the middle of Spotify authentication
if (!user && !isAuthenticating) {
  router.push('/');
  return null; // Prevent rendering during redirect
}

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
          
          {/* Spotify Connection Section - MOVED TO BOTTOM LEFT */}
          <div className="mt-6">
            <h2 className="font-bold text-3xl"
              style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif' }}>
              Connect with Spotify
            </h2>
            <div className="bg-[#DFDDCE] p-4 rounded-lg shadow-lg mt-2">
              {spotifyConnected ? (
                <div>
                  <div className="mb-4">
                    <p className="text-lg font-bold text-[#3D2F2A]">
                      ✅ Your Spotify account is connected
                    </p>
                    <p className="text-[#3D2F2A] mt-2">
                      Track your audiobooks and share your reading playlists with friends.
                    </p>
                    
                    {/* Toggle for playlist recommendation form */}
                    <button
                      className="mt-4 px-4 py-2 bg-[#3D2F2A] text-[#DFDDCE] rounded-lg font-bold"
                      onClick={() => setShowPlaylistForm(!showPlaylistForm)}
                    >
                      {showPlaylistForm ? 'Hide Playlist Generator' : 'Get AI Reading Playlist'}
                    </button>
                  </div>
                  
                  {/* AI Reading Playlist Generator */}
                  {showPlaylistForm && (
                    <div className="mt-4 p-4 bg-[#847266] rounded-lg">
                      <h3 className="text-lg font-bold text-[#DFDDCE] mb-2">Reading Playlist Generator</h3>
                      <input
                        type="text"
                        className="p-2 border rounded-lg w-full mb-2 text-[#3D2F2A]"
                        placeholder="Enter book title"
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                      />
                      <button
                        className="px-4 py-2 bg-[#3D2F2A] text-[#DFDDCE] rounded-lg font-bold w-full"
                        onClick={generatePlaylist}
                        disabled={isGeneratingPlaylist || !bookTitle.trim()}
                      >
                        {isGeneratingPlaylist ? 'Generating...' : 'Generate Playlist'}
                      </button>
                      
                      {/* Display playlist recommendations */}
                      {playlistData && (
                        <div className="mt-4 bg-[#DFDDCE] p-3 rounded-lg text-[#3D2F2A]">
                          <h3 className="text-xl font-bold">{playlistData.playlistName}</h3>
                          <p className="text-sm mb-3">{playlistData.description}</p>
                          
                          <div className="max-h-60 overflow-y-auto pr-2">
                            {playlistData.tracks.map((track, index) => (
                              <div key={index} className="mb-2 pb-2 border-b border-[#847266]">
                                <p className="font-bold">{track.title} - {track.artist}</p>
                                <p className="text-sm">{track.reason}</p>
                              </div>
                            ))}
                          </div>
                          
                          <button
                            className="mt-3 px-4 py-2 bg-[#1DB954] text-white rounded-lg font-bold flex items-center justify-center w-full"
                            onClick={createSpotifyPlaylist}
                          >
                            <span className="mr-2">Create in Spotify</span>
                            <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512">
                              <path fill="currentColor" d="M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8zm100.7 364.9c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 30.6 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4zm26.9-65.6c-5.2 0-8.7-2.3-12.3-4.2-62.5-37-155.7-51.9-238.6-29.4-4.8 1.3-7.4 2.6-11.9 2.6-10.7 0-19.4-8.7-19.4-19.4s5.2-17.8 15.5-20.7c27.8-7.8 56.2-13.6 97.8-13.6 64.9 0 127.6 16.1 177 45.5 8.1 4.8 11.3 11 11.3 19.7-.1 10.8-8.5 19.5-19.4 19.5z"/>
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-lg font-bold text-[#3D2F2A]">
                    Connect your Spotify account to:
                  </p>
                  <ul className="list-disc ml-5 my-2 text-[#3D2F2A]">
                    <li>Track your audiobooks</li>
                    <li>Create reading playlists</li>
                    <li>Get AI song recommendations for your books</li>
                    <li>Share music with reading buddies</li>
                    
                  </ul>
                  <button
                    className="mt-2 px-4 py-2 bg-[#1DB954] text-white rounded-lg font-bold flex items-center"
                    onClick={handleSpotifyLogin}
                  >
                    <span className="mr-2">Connect with Spotify</span>
                    <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512">
                      <path fill="currentColor" d="M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8zm100.7 364.9c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 30.6 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4zm26.9-65.6c-5.2 0-8.7-2.3-12.3-4.2-62.5-37-155.7-51.9-238.6-29.4-4.8 1.3-7.4 2.6-11.9 2.6-10.7 0-19.4-8.7-19.4-19.4s5.2-17.8 15.5-20.7c27.8-7.8 56.2-13.6 97.8-13.6 64.9 0 127.6 16.1 177 45.5 8.1 4.8 11.3 11 11.3 19.7-.1 10.8-8.5 19.5-19.4 19.5z"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Column */}
        <div className="md:w-1/2 flex flex-col gap-8">
          {/* Yearly Reading Challenge Section - MOVED TO TOP RIGHT */}
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

          {/* Add Friend Section */}
          <div className="p-4">
            <h2 className="font-bold text-3xl mb-4"
              style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif' }}>
              Add Friend
            </h2>
            <div className="relative mb-4 w-full">
              <input
                type="text"
                placeholder="Search by name or email"
                className="w-full p-3 border rounded-lg pr-24"
                style={{
                  backgroundColor: '#DFDDCE',
                  color: '#3D2F2A',
                }}
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
              />
              <button 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 rounded-[15px] shadow-md font-bold"
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

          {/* Map Section - MOVED TO BOTTOM RIGHT */}
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
      </div>
    </div>
  );
}