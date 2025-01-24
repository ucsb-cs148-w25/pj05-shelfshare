'use client';

import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { signIn } = useAuth();

  return (
    <div className="flex justify-center items-center h-screen bg-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Welcome to ShelfShare! 
        </h1>
        <button
          onClick={signIn}
          className="px-6 py-3 bg-pink-500 text-white text-lg font-medium rounded-full transition-transform transform hover:scale-105 hover:bg-pink-600"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
