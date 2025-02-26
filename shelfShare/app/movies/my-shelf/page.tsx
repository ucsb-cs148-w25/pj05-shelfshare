'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import React from "react";

export default function UserLists() {
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
    <div className="bg-custom-green h-screen flex flex-col items-center justify-center">
      {/* Spacer for navbar */}
      <div className="h-1/10"></div> {/* Reduced spacer height */}

      {/* Lists Section */}
      <div className="space-y-8 w-5/6"> {/* Adjusted container width */}
        {/* Reading Now */}
        <div>
          <h2 className="text-custom-tan text-3xl font-bold mb-4">Favorites</h2>
          {/* Shelf Background */}
          <div
            className="relative bg-light-brown border-t-8 border-b-8 border-[#3D2F2A] h-44 flex items-center"
          >
            {/* Books */}
            <div className="flex space-x-4 justify-start ml-4">
              {Array(4)
                .fill(null)
                .map((_, index) => (
                  <div
                    key={index}
                    className="bg-[#3D2F2A] w-32 h-36 rounded-lg"
                  ></div>
                ))}
            </div>
          </div>
        </div>

        {/* To Be Read */}
        <div>
          <h2 className="text-custom-tan text-3xl font-bold mb-4">To Be Watched...</h2>
          {/* Shelf Background */}
          <div
            className="relative bg-light-brown border-t-8 border-b-8 border-[#3D2F2A] h-44 flex items-center"
          >
            {/* Books */}
            <div className="flex space-x-4 justify-start ml-4">
              {Array(4)
                .fill(null)
                .map((_, index) => (
                  <div
                    key={index}
                    className="bg-[#3D2F2A] w-32 h-36 rounded-lg"
                  ></div>
                ))}
            </div>
          </div>
        </div>

        {/* Previously Read */}
        <div>
          <h2 className="text-custom-tan text-3xl font-bold mb-4">Previously Watched</h2>
          {/* Shelf Background */}
          <div
            className="relative bg-light-brown border-t-8 border-b-8 border-[#3D2F2A] h-44 flex items-center"
          >
            {/* Books */}
            <div className="flex space-x-4 justify-start ml-4">
              {Array(4)
                .fill(null)
                .map((_, index) => (
                  <div
                    key={index}
                    className="bg-[#3D2F2A] w-32 h-36 rounded-lg"
                  ></div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
