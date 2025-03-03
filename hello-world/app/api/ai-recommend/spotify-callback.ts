import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: "Authorization code missing" });
  }

  const response = await axios.post("https://accounts.spotify.com/api/token", null, {
    params: {
      grant_type: "authorization_code",
      code,
      redirect_uri: "http://localhost:3000/api/spotify-callback",
      client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET,
    },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const { access_token } = response.data;
  res.redirect(`/dashboard?spotifyToken=${access_token}`);
}
