'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function SpotifyCallback() {
  const router = useRouter();
  const { user } = useAuth();
  const [status, setStatus] = useState('Connecting...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function handleSpotifyCallback() {
      if (!user) {
        setStatus('Please log in to continue');
        setTimeout(() => router.push('/home'), 3000);
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (!code) {
        setStatus('Authentication failed');
        setTimeout(() => router.push('/home'), 3000);
        return;
      }

      try {
        const response = await fetch('/api/ai-recommend/spotify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) throw new Error('Failed to exchange code for token');

        const data = await response.json();
        console.log('Received Spotify token:', data);

        localStorage.setItem('spotify_access_token', data.access_token);
        localStorage.setItem('spotify_refresh_token', data.refresh_token);
        localStorage.setItem('spotify_token_expiry', (Date.now() + data.expires_in * 1000).toString());
        sessionStorage.setItem('auth_in_progress', 'true');
        
        setStatus('Connected');
        setIsLoading(false);
        setTimeout(() => router.push('/home'), 2000);
      } catch (error) {
        console.error('Error connecting Spotify:', error);
        setStatus('Connection failed');
        setIsLoading(false);
        setTimeout(() => router.push('/home'), 3000);
      }
    }

    handleSpotifyCallback();
  }, [router, user]);

  return (
    <div className="min-h-screen flex items-center justify-center" 
         style={{ backgroundColor: '#5A7463', fontFamily: 'Outfit, sans-serif' }}>
      <div className="p-6 rounded-lg shadow-lg w-64 text-center border-t-4 border-b-4 border-[#3D2F2A]" 
           style={{ backgroundColor: '#DFDDCE' }}>
        <div className="flex flex-col items-center space-y-4">
          {/* Spotify logo */}
          <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-black" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.63 14.63c-.18.18-.47.18-.64 0-1.79-1.79-4.58-2.34-7.17-1.29-.22.08-.47-.04-.55-.26-.08-.22.04-.47.26-.55 2.93-1.18 6.03-.54 8.1 1.53.17.18.17.47 0 .65v-.08zm1.22-2.72c-.25.25-.61.25-.86 0-2.05-2.05-5.15-2.63-7.54-1.44-.25.09-.54-.03-.63-.28-.09-.25.03-.54.28-.63 2.77-1.35 6.26-.69 8.61 1.67.24.24.24.61-.01.86.05-.08.05-.12.15-.18zm.12-2.81c-2.45-2.45-6.5-2.68-8.85-1.48-.3.12-.65-.03-.77-.33-.12-.3.03-.65.33-.77 2.7-1.38 7.22-1.11 10.01 1.69.28.28.28.73 0 1.01-.28.28-.73.28-1.01 0 .17-.03.22-.07.29-.12z" />
            </svg>
          </div>
          
          {isLoading ? (
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="h-5 w-5 text-[#3D2F2A] animate-spin" />
              <p className="text-[#3D2F2A] text-sm font-bold">{status}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <p className="text-[#3D2F2A] text-sm font-bold">{status}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}