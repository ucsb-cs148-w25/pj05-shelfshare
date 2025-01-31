'use client';

import { useAuth } from './context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSignIn = async () => {
    await signIn(); // Ensure signIn resolves before navigation
    router.push('/home'); // Redirect to home page
  };

  return (
    <div className="flex justify-center items-center h-screen bg-custom-green">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-6 text-custom-tan">
          Welcome to ShelfShare! 
        </h1>
        <button
          onClick={handleSignIn}
          className="px-6 py-3 bg-pink-500 text-white text-lg font-medium rounded-full transition-transform transform hover:scale-105 hover:bg-pink-600"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}