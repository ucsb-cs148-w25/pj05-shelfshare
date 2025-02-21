'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import '../globals.css';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [readingGoal, setReadingGoal] = useState(null);
  const [booksRead, setBooksRead] = useState(0);
  const [inputGoal, setInputGoal] = useState('');

  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  if (!user) {
    return null; // Avoid rendering anything while redirecting
  }

  const handleSetGoal = () => {
    const goal = parseInt(inputGoal, 10);
    if (!isNaN(goal) && goal > 0) {
      setReadingGoal(goal);
      setInputGoal('');
    }
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

        {/* Yearly Reading Challenge Section */}
        <div>
          <h2 className="font-bold items-center text-3xl mt-6"
          style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif' }}>
            2025 Reading Challenge</h2>
          <div className="bg-[#DFDDCE] p-4 rounded-lg shadow-lg mt-2">
            {readingGoal === null ? (
              <div>
                <p className="text-lg font-bold text-[#3D2F2A]">Set your reading goal for the year:</p>
                <input
                  type="number"
                  className="p-2 border rounded-lg w-full mt-2"
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
                <p className="text-lg font-bold text-[#3D2F2A]">Books Read: {booksRead}/{readingGoal}</p>
                <div className="w-full bg-gray-300 rounded-full h-4 mt-2">
                  <div
                    className="bg-[#3D2F2A] h-4 rounded-full"
                    style={{ width: `${(booksRead / readingGoal) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
