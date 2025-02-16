// pages/profile.tsx
'use client';


import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';
import React from 'react'


const Profile = () => {
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
    <div className="bg-[#5A7463] min-h-screen flex">  
      <div className="flex flex-col items-center ml-48 mt-[39px]">
        <h1 className="text-[#DFDDCE] text-4xl font-bold mb-10">
            Profile
        </h1>


        {/* Profile Image */}
        <Image
            src="/profile-pic.svg"
            width={224}
            height={224}
            className="object-cover mb-4 rounded-full"
            alt="Profile"
        />


        {/* Username Text */}
        <p className="text-[#DFDDCE] text-xl">UserName</p>
        </div>
        <div className= "flex flex-col justify-start pl-20 mr-20 items-start transform translate-x-14 mb-10">
            <h2 className="text-[#DFDDCE] text-2xl font-bold mb-6">Preferred Genre:</h2>
            <div className="bg-[#DFDDCE] text-[#3D2F2A] mt-2 p-4 rounded-lg text-lg mb-4 h-1/5">
              #mystery #romance #fantasy
            </div>
           
            <h2 className="text-[#DFDDCE] text-2xl font-bold mb-6">About Me:</h2>
            <div className="bg-[#DFDDCE] text-[#3D2F2A] mt-2 p-4 rounded-lg text-lg mb-4 h-1/5">
              A blurb about the reader and whatever they want to put up.
            </div>
          </div>
        </div>
    )
}


export default Profile