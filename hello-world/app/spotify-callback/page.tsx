'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function SpotifyCallback() {
  const router = useRouter();
  const { user } = useAuth();
  const [status, setStatus] = useState('Processing your Spotify login...');

  useEffect(() => {
    async function handleSpotifyCallback() {
      if (!user) {
        setStatus('Please log in to connect Spotify');
        setTimeout(() => router.push('/home'), 3000);
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (!code) {
        setStatus('Authentication failed: No code received');
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

        // In spotify-callback.js
        localStorage.setItem('spotify_access_token', data.access_token);
        localStorage.setItem('spotify_refresh_token', data.refresh_token);
        localStorage.setItem('spotify_token_expiry', (Date.now() + data.expires_in * 1000).toString());
        // Add this line to let Home component know we're in auth process
        sessionStorage.setItem('auth_in_progress', 'true');
        alert("Successfully connected to Spotify!");
        setTimeout(() => router.push('/home'), 2000);
      } catch (error) {
        console.error('Error connecting Spotify:', error);
        alert("Failed to connect Spotify. Please try again.");
        setTimeout(() => router.push('/home'), 3000);
      }
    }

    handleSpotifyCallback();
  }, [router, user]);

  return <div>{status}</div>;
}
