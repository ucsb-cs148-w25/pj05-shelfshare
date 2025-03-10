'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';

export default function SpotifyCallback() {
  const router = useRouter();
  const { user } = useAuth();
  const [status, setStatus] = useState('Processing your Spotify login...');

  useEffect(() => {
    // Function to exchange the code for an access token
    async function handleSpotifyCallback() {
      if (!user) {
        setStatus('Please log in to connect your Spotify account');
        setTimeout(() => router.push('/'), 3000);
        return;
      }

      // Get the authorization code from the URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const storedState = localStorage.getItem('spotify_auth_state');
      
      // Validate the state parameter
      if (!state || state !== storedState) {
        setStatus('Authentication error: state mismatch');
        setTimeout(() => router.push('/home'), 3000);
        return;
      }
      
      // Clear the state from localStorage
      localStorage.removeItem('spotify_auth_state');
      
      if (!code) {
        setStatus('Authentication failed: No code received');
        setTimeout(() => router.push('/home'), 3000);
        return;
      }
      
      try {
        // Use your backend API to exchange the code for tokens
        // This should be done server-side for security, but for demo purposes:
        const response = await fetch('/api/ai-recommend/spotify-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to exchange code for token');
        }
        
        const data = await response.json();
        if(data.access_token){
        // Store the tokens in Firestore (only store what you need)
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, {
            spotifyToken: data.access_token,
            spotifyRefreshToken: data.refresh_token,
            spotifyTokenExpiry: new Date().getTime() + data.expires_in * 1000,
            }, { merge: true });
            
            localStorage.setItem('spotify_connected', 'true');
            setStatus('Successfully connected your Spotify account!');
            setTimeout(() => router.push('/home'), 2000);
        }
      } catch (error) {
        console.error('Error connecting Spotify:', error);
        setStatus('Failed to connect your Spotify account. Please try again.');
        setTimeout(() => router.push('/home'), 3000);
      }
    }
    
    handleSpotifyCallback();
  }, [router, user]);
  
  return (
    <div className="min-h-screen flex items-center justify-center" 
      style={{ backgroundColor: '#5A7463', fontFamily: 'Outfit, sans-serif' }}>
      <div className="bg-[#DFDDCE] p-8 rounded-lg shadow-xl text-center">
        <h1 className="text-2xl font-bold mb-4" style={{ color: '#3D2F2A' }}>
          {status}
        </h1>
        <div className="mt-4 animate-pulse">
          <div className="w-12 h-12 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512">
              <path fill="#1DB954" d="M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8zm100.7 364.9c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 30.6 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4zm26.9-65.6c-5.2 0-8.7-2.3-12.3-4.2-62.5-37-155.7-51.9-238.6-29.4-4.8 1.3-7.4 2.6-11.9 2.6-10.7 0-19.4-8.7-19.4-19.4s5.2-17.8 15.5-20.7c27.8-7.8 56.2-13.6 97.8-13.6 64.9 0 127.6 16.1 177 45.5 8.1 4.8 11.3 11 11.3 19.7-.1 10.8-8.5 19.5-19.4 19.5zm31-76.2c-5.2 0-8.4-1.3-12.9-3.9-71.2-42.5-198.5-52.7-280.9-29.7-3.6 1-8.1 2.6-12.9 2.6-13.2 0-23.3-10.3-23.3-23.6 0-13.6 8.4-21.3 17.4-23.9 35.2-10.3 74.6-15.2 117.5-15.2 73 0 149.5 15.2 205.4 47.8 7.8 4.5 12.9 10.7 12.9 22.6 0 13.6-11 23.3-23.2 23.3z"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}