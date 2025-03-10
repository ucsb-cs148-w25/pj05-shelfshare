import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { playlistData, accessToken, userId, idToken } = await request.json();

    if (!playlistData || !accessToken || !userId || !idToken) {
      return NextResponse.json(
        { error: "Missing required fields (playlistData, accessToken, userId, idToken)" },
        { status: 400 }
      );
    }

    console.log("User ID from request:", userId);

    // Verify Firebase ID Token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
      console.log("Decoded token:", decodedToken);
    } catch (error: any) {
      console.error("Invalid Firebase ID Token:", error);
      return NextResponse.json(
        { error: "Unauthorized request - Invalid Firebase ID Token" },
        { status: 401 }
      );
    }

    // Ensure the user making the request is the same as the authenticated user
    if (decodedToken.uid !== userId) {
      console.error("User ID mismatch - Unauthorized");
      return NextResponse.json(
        { error: "Unauthorized request - User ID mismatch" },
        { status: 403 }
      );
    }

    // Get user document
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.error("User document not found in Firestore");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("User found, updating Spotify token...");

    // Update Firestore with the Spotify token
    await setDoc(userRef, {
      spotifyToken: accessToken,
      spotifyTokenExpiry: Date.now() + 3600 * 1000, // Token expires in 1 hour
    }, { merge: true });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Server error creating playlist:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as any).message || "Unknown error" },
      { status: 500 }
    );
  }
}
