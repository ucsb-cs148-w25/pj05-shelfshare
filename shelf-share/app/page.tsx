'use client';

import { useAuth } from './context/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [logoLoaded, setLogoLoaded] = useState(false);

  // Effect to animate logo after component mounts
  useEffect(() => {
    setLogoLoaded(true);
  }, []);

  const handleSignIn = async () => {
    await signIn();
    router.push('/home');
  };

  return (
    <div className="relative w-full h-screen">
      {/* Background divs - using the exact colors from the image */}
      <div className="absolute top-0 w-full h-[24%] bg-[#5D6E5F]"></div>
      <div className="absolute top-[24%] w-full h-[3%] bg-[#3D2F2A]"></div>
      <div className="absolute top-[27%] w-full h-[46%] bg-[#847266]"></div>
      <div className="absolute top-[73%] w-full h-[3%] bg-[#3D2F2A]"></div>
      <div className="absolute top-[76%] w-full h-[24%] bg-[#5D6E5F]"></div>

      {/* Logo - positioned higher in the green section */}
      <div 
        className={`absolute top-[-2%] left-1/2 transform -translate-x-1/2 w-[38%] transition-all duration-1000 ease-out ${
          logoLoaded ? 'opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <Image 
          src="/login-logo.png" 
          alt="Shelf Share logo" 
          width={400}
          height={330}
          className="object-contain w-full h-full filter drop-shadow-xl"
          onLoad={() => setLogoLoaded(true)}
        />
      </div>

      {/* Sign-in button - styled like the image */}
      <button 
        onClick={handleSignIn}
        className="absolute top-[58%] left-1/2 transform -translate-x-1/2 px-6 py-3 bg-[#5D6E5F] text-white text-xl font-normal rounded-full transition-transform hover:scale-105 hover:bg-[#4D5E4F]"
      >
        Sign in with Google
      </button>
    </div>
  );
}