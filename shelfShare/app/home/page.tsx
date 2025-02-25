'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import '../globals.css';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  if (!user) {
    return null; // Avoid rendering anything while redirecting
  }

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
              className="p-4 rounded-lg w-full h-[300px]"
              style={{ backgroundColor: '#DFDDCE'}}>
  
            <div>
              <h2 className="mb-4 font-bold text-3xl "
               style={{color: '#3D2F2A'}}
              >
                You just finished reading <span className="underline">Book Title</span>
              </h2>
              <p className="text-lg font-bold">Rate:</p>
              <p className="mb-3 text-2xl" style={{ color: '#3D2F2A' }}>★★★★★</p>
              <p className="mb-2 font-bold">Leave A Review:</p>
              <textarea
                placeholder="Book Review"
                className="w-full p-2 border rounded-lg h-24"
              ></textarea>
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
                placeholder="Username"
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
  