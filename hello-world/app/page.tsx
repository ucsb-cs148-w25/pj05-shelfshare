'use client';

import { useAuth } from './context/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSignIn = async () => {
    await signIn();
    router.push('/home');
  };

  return (
    <div className="relative w-full h-screen">
      {/* Background divs */}
      <div className="absolute top-[24%] w-full h-[40%] bg-[#847266]"></div>
      <div className="absolute top-[24%] w-full h-[3%] bg-[#3D2F2A]"></div>
      <div className="absolute top-[62%] w-full h-[3%] bg-[#3D2F2A]"></div>

      {/* Logo */}
      <Image 
        src="/login-logo.png" 
        alt="book" 
        width={200} 
        height={150} 
        className="absolute top-[31%] left-[42%] w-[14%] object-contain"
      />

      {/* Sign-in button */}
      <button 
        onClick={handleSignIn}
        className="absolute top-[50%] left-[43%] w-[12%] px-6 py-3 bg-custom-green text-white text-xl font-normal rounded-full transition-transform hover:scale-110 hover:bg-blue-600"
      >
        Sign in with Google
      </button>
    </div>
  );
}