import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai';

interface Playlist {
  name: string;
  description: string;
  tracks: { title: string; artist: string; reason: string }[];
}

export async function POST(req: NextRequest) {
  console.log("Received request for playlist generation");

  const { bookTitle } = await req.json();
  if (!bookTitle) {
    return NextResponse.json({ error: "Book title is required" }, { status: 400 });
  }

  // Initialize the Gemini API client
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Create the AI prompt for generating a playlist
  const prompt = `
    Create a reading playlist of 10-15 songs for the book titled "${bookTitle}".
    The response should be in JSON format:
    {
      "name": "Playlist name that relates to the book",
      "description": "A short description of how this playlist enhances the reading experience",
      "tracks": [
        {
          "title": "Song title",
          "artist": "Artist name",
          "reason": "Brief explanation of why this song fits the book"
        }
      ]
    }
    Ensure the playlist aligns with the genre and themes of the book.
  `;

  console.log("Sending prompt to Gemini API:", prompt);

  try {
    const response = await model.generateContent(prompt);
    const playlist = await parseResponse(response, bookTitle);
    
    return NextResponse.json(playlist);
  } catch (error: any) {
    console.error("Error generating playlist:", error?.message || error);
    return NextResponse.json(
      { error: "Failed to generate playlist recommendations", details: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// Function to parse AI response
async function parseResponse(response: GenerateContentResult, bookTitle: string): Promise<Playlist> {
  const text = await response.response.text();
  console.log("Raw AI response:", text);

  // Remove Markdown code blocks and ensure proper JSON format
  const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    if (cleanedText.startsWith('{')) {
      return JSON.parse(cleanedText) as Playlist;
    } else {
      console.warn("AI response is not valid JSON:", cleanedText);
      throw new Error("Invalid JSON response");
    }
  } catch (e) {
    console.error("Error parsing Gemini response:", e);
    return generateMockPlaylist(bookTitle);
  }
}

// Mock fallback playlist generator
function generateMockPlaylist(bookTitle: string): Playlist {
  return {
    name: `${bookTitle} Reading Playlist`,
    description: `A custom playlist inspired by "${bookTitle}" to enhance your reading experience`,
    tracks: [
      { title: "Soundtrack to Reading", artist: "Ambient Works", reason: "Creates a perfect reading atmosphere with minimal distractions" },
      { title: "Book Lover", artist: "The Literary Band", reason: "Gentle melodies that enhance focus while reading" },
      { title: "Chapter One", artist: "Page Turner", reason: "Helps set the pace for beginning your reading journey" },
      { title: "Quiet Mind", artist: "Reading Room", reason: "Calming instrumentals that fade into the background" },
      { title: "Lost in Words", artist: "Bookshelf", reason: "Ambient sounds perfect for deep literary immersion" }
    ]
  };
}
