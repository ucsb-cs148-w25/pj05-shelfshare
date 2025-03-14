import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log("📥 Received request to create Spotify playlist");

  try {
    const { playlistData, accessToken } = await req.json();

    if (!playlistData || !playlistData.name || !playlistData.tracks || playlistData.tracks.length === 0) {
      return NextResponse.json({ error: "Invalid playlist data" }, { status: 400 });
    }

    console.log("✅ Creating Spotify playlist:", playlistData.name);

    // Step 1: Create a new playlist on the user's Spotify account
    const userProfileResponse = await fetch('https://api.spotify.com/v1/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userProfileResponse.ok) {
      throw new Error('Failed to fetch Spotify user profile');
    }

    const userProfile = await userProfileResponse.json();
    const userId = userProfile.id;

    console.log("🎵 Spotify User ID:", userId);

    // Step 2: Create the Playlist
    const createPlaylistResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: playlistData.name,
        description: playlistData.description,
        public: false, // Set to true if you want it public
      }),
    });

    if (!createPlaylistResponse.ok) {
      const errorData = await createPlaylistResponse.json();
      console.error("❌ Spotify API Error (Creating Playlist):", errorData);
      return NextResponse.json({ error: "Failed to create playlist in Spotify" }, { status: 500 });
    }

    const playlist = await createPlaylistResponse.json();
    console.log("✅ Playlist created:", playlist.id);

    // Step 3: Convert Track Names to Spotify URIs
    const trackUris = await getSpotifyTrackUris(playlistData.tracks, accessToken);

    if (trackUris.length === 0) {
      return NextResponse.json({ error: "No valid tracks found on Spotify" }, { status: 400 });
    }

    console.log("🎵 Adding tracks to playlist:", trackUris);

    // Step 4: Add Tracks to Playlist
    const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: trackUris }),
    });

    if (!addTracksResponse.ok) {
      const errorData = await addTracksResponse.json();
      console.error("❌ Spotify API Error (Adding Tracks):", errorData);
      return NextResponse.json({ error: "Failed to add tracks to playlist" }, { status: 500 });
    }

    console.log("✅ Tracks added successfully!");

    return NextResponse.json({ playlistUrl: playlist.external_urls.spotify });

  } catch (error: unknown) {
    console.error("❌ Error in create-spotify-playlist:", error);

    let errorMessage = "Unknown error";
    if (error instanceof Error) {
        errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
}
}

// Function to search for track URIs on Spotify
async function getSpotifyTrackUris(tracks: { title: string; artist: string }[], accessToken: string) {
  const trackUris: string[] = [];

  for (const track of tracks) {
    const query = encodeURIComponent(`${track.title} ${track.artist}`);
    const searchUrl = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`;

    try {
      const response = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) continue;

      const data = await response.json();
      if (data.tracks.items.length > 0) {
        trackUris.push(data.tracks.items[0].uri);
      }
    } catch (error) {
      console.error(`⚠ Failed to fetch track: ${track.title} by ${track.artist}`, error);
    }
  }

  return trackUris;
}
