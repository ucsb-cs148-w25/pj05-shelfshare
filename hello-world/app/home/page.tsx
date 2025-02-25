'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
// import LibraryMap from './map';
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
  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  if (!user) {
    return null; // Avoid rendering anything while redirecting
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
      .sort((a: Library, b : Library) => (a.distance ?? 0) - (b.distance ?? 0))
      .slice(0, 5);

    setLibraries(topFive);
    setIsLoaded(true);
  };

    return (
      <div className="min-h-screen" 
      style={{ backgroundColor: '#5A7463', fontFamily: 'Outfit, sans-serif' }}>
        
        {/* Main Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 gap-y-8 ml-20 mr-20">
          {/* Reading Now Section */}
          <div>
            <h2 className="font-bold items-center text-3xl mt-6"
            style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif' }}>
              Reading Now</h2>
            {/* Shelf Background */}
            <div
                className="relative w-full h-[300px] mt-2 mx-auto"
                style={{backgroundColor: '#847266', borderTop: '10px solid #3D2F2A', borderBottom: '10px solid #3D2F2A' }}
              >
                {/* Books */}
                <div className="relative top-4 left-3 flex space-x-5">
                  {Array(3)
                    .fill(null)
                    .map((_, index) => (
                      <div
                        key={index}
                        className="bg-[#3D2F2A] w-[150px] h-[250px] rounded-lg"
                      ></div>
                    ))}
                </div>
              </div>
          </div>
  
          {/* Discover Now Section */}
          <div>
            <h2 className="font-bold items-center text-3xl mt-6"
            style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif' }}>
              Discover Next</h2>
            {/* Shelf Background */}
            <div
                className="relative w-full h-[300px] mt-2 mx-auto"
                style={{backgroundColor: '#847266', borderTop: '10px solid #3D2F2A', borderBottom: '10px solid #3D2F2A' }}
              >
                {/* Books */}
                <div className="relative top-4 left-3 flex space-x-5">
                  {Array(3)
                    .fill(null)
                    .map((_, index) => (
                      <div
                        key={index}
                        className="bg-[#3D2F2A] w-[150px] h-[250px] rounded-lg"
                      ></div>
                    ))}
                </div>
              </div>
          </div>
  
          {/* Review Section */}
          <div
              className="p-4 rounded-lg w-full h-auto overflow-hidden"
              style={{ backgroundColor: '#DFDDCE'}}>
  
            <div>
              <h2 className="mb-4 font-bold text-3xl mr-8"
               style={{color: '#3D2F2A'}}
              >
                Find your local library! </h2>
                <input
                type="text"
                placeholder="zip-code"
                className="flex-grow p-2 border rounded-lg"
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
                }} >
                {(isLoaded && close) && (
                 <div className="ml-2" style={{backgroundColor: '#3D2F2A'}}> 
                 <h3>Nearby Libraries:</h3>
                   <ul>
                       {libraries.map((lib, index) => (
                        <li key={index}>{lib.name}</li>
                      ))}
                    </ul>
                  </div>)}
                  </div>
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
          
  
          {/*Timeline Preview */}
          <div
              className="p-4 rounded-lg w-full h-[300px]"
              style={{ backgroundColor: '#DFDDCE'}}
            >
              
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
    );
  }
  
  