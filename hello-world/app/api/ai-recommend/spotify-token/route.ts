// app/api/ai-recommend/spotify-token/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code }: { code: string } = await request.json(); // ✅ Explicitly typed code

    // Your application's credentials
    const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
    const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
    const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 
      (process.env.VERCEL_URL ? 
        `https://${process.env.VERCEL_URL}/spotify-callback` : 
        'http://localhost:3000/spotify-callback');
    
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error("Missing Spotify API credentials");
      return NextResponse.json(
        { error: "Missing Spotify API credentials" },
        { status: 500 }
      );
    }

    // Create authorization string (Base64 encoded)
    const authorization = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    // Exchange code for token
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authorization}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Spotify API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to exchange code for token' },
        { status: response.status }
      );
    }
    
    // Get token response data
    const data: { access_token: string; refresh_token: string; expires_in: number } = await response.json();
    
    // Return tokens to client
    return NextResponse.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
