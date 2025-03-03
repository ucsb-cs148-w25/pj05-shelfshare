import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const REDIRECT_URI = "http://localhost:3000/api/spotify-callback";
  const scope = "playlist-modify-public playlist-modify-private user-read-email";

  const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scope)}`;

  res.redirect(authUrl);
}
