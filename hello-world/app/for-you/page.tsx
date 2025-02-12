'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ForYou() {
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
      <div
        className="min-h-screen"
        style={{ backgroundColor: '#5A7463', fontFamily: 'Outfit, sans-serif' }}
      >
        {/* Shelf Section */}
        <div className="flex flex-col items-center mt-12 w-full">
          <div className="relative w-full">
            {/* Read Next Text */}
            <div
              className="font-bold items-center text-3xl mt-6"
              style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif', marginLeft: 'calc((100% - 1030px) / 2)' }}
            >
              Read Next
            </div>
  
            {/* Shelf Background */}
            <div
              className="relative w-[1030px] h-[300px] mt-2 mx-auto"
              style={{backgroundColor: '#847266', borderTop: '10px solid #3D2F2A', borderBottom: '10px solid #3D2F2A' }}
            >
              {/* Books */}
              <div className="relative top-4 left-3 flex space-x-5">
                {Array(4)
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
        </div>

        {/* Shelf Section */}
        <div className="flex flex-col items-center mt-12 w-full">
          <div className="relative w-full">
            {/* Read Next Text */}
            <div
              className="font-bold items-center text-3xl mt-6"
              style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif', marginLeft: 'calc((100% - 1030px) / 2)' }}
            >
              You may also like...
            </div>
  
            {/* Shelf Background */}
            <div
              className="relative w-[1030px] h-[300px] mt-2 mx-auto"
              style={{backgroundColor: '#847266', borderTop: '10px solid #3D2F2A', borderBottom: '10px solid #3D2F2A' }}
            >
              {/* Books */}
              <div className="relative top-4 left-3 flex space-x-5">
                {Array(4)
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
        </div>

        {/* Shelf Section */}
        <div className="flex flex-col items-center mt-12 w-full">
          <div className="relative w-full">
            {/* Read Next Text */}
            <div
              className="font-bold items-center text-3xl mt-6"
              style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif', marginLeft: 'calc((100% - 1030px) / 2)' }}
            >
              Top 10 books of the Year
            </div>
  
            {/* Shelf Background */}
            <div
              className="relative w-[1030px] h-[300px] mt-2 mx-auto"
              style={{backgroundColor: '#847266', borderTop: '10px solid #3D2F2A', borderBottom: '10px solid #3D2F2A' }}
            >
              {/* Books */}
              <div className="relative top-4 left-3 flex space-x-5">
                {Array(4)
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
        </div>
  
        
      </div>
    );
  }
  