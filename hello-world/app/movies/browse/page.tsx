'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Browse() {
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
              Watch Next
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
  
        {/* Genre and Tags Section */}
        <div className="flex flex-col items-center mt-6 space-y-6">
          <div className="flex items-center space-x-4">
            <span
              className="text-lg font-bold"
              style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif' }}
            >
              Genre
            </span>
            <div className="flex space-x-4 font-bold">
              {['Fiction', 'Nonfiction', 'Biography', 'Thriller', 'Horror', 'Fantasy'].map((genre) => (
                <button
                  key={genre}
                  className="px-4 py-2 rounded-[15px] shadow-md"
                  style={{
                    backgroundColor: '#DFDDCE',
                    color: '#3D2F2A',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span
              className="text-lg font-bold"
              style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif' }}
            >
              Tags
            </span>
            <div className="flex space-x-4 font-bold">
              {['Popular All Time', 'Popular This Year', 'Underrated', 'Series'].map((tag) => (
                <button
                  key={tag}
                  className="px-4 py-2 rounded-[15px] shadow-md"
                  style={{
                    backgroundColor: '#DFDDCE',
                    color: '#3D2F2A',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
  
        {/* Filters and Book Details */}
        <div className="flex justify-center mt-8 space-x-20 w-full">
          {/* Filters */}
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: '#DFDDCE', width: '250px' }}
          >
            <h3
              className="text-2xl font-bold mb-4"
              style={{ color: '#3D2F2A', fontFamily: 'Outfit, sans-serif' }}
            >
              Filter By:
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  className="block text-xl font-bold"
                  style={{ color: '#3D2F2A', fontFamily: 'Outfit, sans-serif' }}
                >
                  Average Rating
                </label>
                <div className="flex space-x-2 mt-1">
                  <input type="number" className="w-16 px-2 py-1 rounded" />
                  <span>to</span>
                  <input type="number" className="w-16 px-2 py-1 rounded" />
                </div>
              </div>
              <div>
                <label
                  className="block text-xl font-bold"
                  style={{ color: '#3D2F2A', fontFamily: 'Outfit, sans-serif' }}
                >
                  Number Of Ratings
                </label>
                <div className="flex space-x-2 mt-1">
                  <input type="number" className="w-16 px-2 py-1 rounded" />
                  <span>to</span>
                  <input type="number" className="w-16 px-2 py-1 rounded" />
                </div>
              </div>
              <div>
                <label
                  className="block text-xl font-bold"
                  style={{ color: '#3D2F2A', fontFamily: 'Outfit, sans-serif' }}
                >
                  Year Published
                </label>
                <div className="flex space-x-2 mt-1">
                  <input type="number" className="w-16 px-2 py-1 rounded" />
                  <span>to</span>
                  <input type="number" className="w-16 px-2 py-1 rounded" />
                </div>
              </div>
  
              <div className="flex space-x-4 font-bold">
              {['APPLY'].map((apply) => (
                <button
                  key={apply}
                  className="px-4 py-2 rounded-[15px] shadow-md"
                  style={{
                    backgroundColor: '#3D2F2A',
                    color: '#DFDDCE',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  {apply}
                </button>
              ))}
              </div>
  
              
            </div>
          </div>
  
          {/* Book Details */}
          <div className="flex flex-col space-y-4">
            <div
              className="p-4 rounded-lg flex space-x-4"
              style={{ backgroundColor: '#DFDDCE', width: '700px', height:'200px' }}
            >
              <div className="w-[100px] h-[150px] bg-[#3D2F2A] rounded-lg"></div>
              <div>
              <h3 className="text-2xl font-bold" style={{ color: '#3D2F2A' }}>
                  Title
                </h3>
                <p className="text-xl" style={{ color: '#3D2F2A' }}>
                  Director
                </p>
                <p className="text-xl" style={{ color: '#3D2F2A' }}>★★★★★</p>
                <div className="flex space-x-4 font-bold mt-1">
                {['Tag 1', 'Tag 2'].map((tag) => (
                <button
                  key={tag}
                  className="px-4 py-2 rounded-[15px] shadow-md"
                  style={{
                    backgroundColor: '#847266',
                    color: '#DFDDCE',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  {tag}
                </button>
                ))}
                </div>
              </div>
            </div>
            <div
              className="p-4 rounded-lg flex space-x-4"
              style={{ backgroundColor: '#DFDDCE', width: '700px', height: '200px' }}
            >
              <div className="w-[100px] h-[150px] bg-[#3D2F2A] rounded-lg"></div>
              <div>
                <h3 className="text-2xl font-bold" style={{ color: '#3D2F2A' }}>
                  Title
                </h3>
                <p className="text-xl" style={{ color: '#3D2F2A' }}>
                Director
                </p>
                <p className="text-xl" style={{ color: '#3D2F2A' }}>★★★★★</p>
                <div className="flex space-x-4 font-bold mt-1">
                {['Tag 1', 'Tag 2', 'Tag 3'].map((tag) => (
                  <button
                    key={tag}
                    className="px-4 py-2 rounded-[15px] shadow-md"
                    style={{
                      backgroundColor: '#847266',
                      color: '#DFDDCE',
                      fontFamily: 'Outfit, sans-serif',
                    }} > {tag}
                  </button> ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  