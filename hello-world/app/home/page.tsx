'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import '../globals.css';

export default function Home() {
  const { user, logOut } = useAuth();
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
    <main className="main">
      <div className="flex justify-center items-center h-screen bg-custom-green">
        <div className="text-center flex flex-col space-y-6">
          <h1 className="text-4xl font-bold text-custom-tan">Hello World</h1>
          <button className="px-6 py-3 bg-pink-400 text-white text-2xl font-normal rounded-full transform transition-all hover:scale-110 hover:bg-pink-500">
            <span className="mr-2">💖</span>≽^•⩊•^≼
          </button>
          <button
            onClick={logOut}
            className="px-6 py-3 bg-purple-500 text-white text-xl font-normal rounded-full transform transition-all hover:scale-110 hover:bg-blue-600"
          >
            <span className="mr-2">🚪</span>Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
