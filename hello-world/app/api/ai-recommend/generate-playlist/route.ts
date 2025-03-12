import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai';

interface Playlist {
  name: string;
  description: string;
  tracks: { title: string; artist: string; reason: string }[];
}

export async function POST(req: NextRequest) {
  console.log("📥 Received request for playlist generation");

  const { bookTitle } = await req.json();
  if (!bookTitle) {
    return NextResponse.json({ error: "Book title is required" }, { status: 400 });
  }

  // Initialize the Gemini API client
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Create AI prompt
  const prompt = `
    Create a reading playlist of 10-15 songs for the book titled "${bookTitle}".
    The response must be in JSON format with this structure:
    {
      "name": "A unique playlist name inspired by the book",
      "description": "A short description explaining why these songs match the book's themes",
      "tracks": [
        {
          "title": "Song title",
          "artist": "Artist name",
          "reason": "Brief explanation of why this song fits the book"
        }
      ]
    }
    DO NOT include any extra text, explanations, or formatting like Markdown.
  `;

  console.log("📝 Sending prompt to Gemini API:", prompt);

  try {
    const response = await model.generateContent(prompt);
    const playlist = await parseResponse(response, bookTitle);

    return NextResponse.json(playlist);
  } catch (error: unknown) {
    console.error("❌ Error generating playlist:", error);

    let errorMessage = "Unknown error";
    if (error instanceof Error) {
        errorMessage = error.message;
    }

    return NextResponse.json(
        { error: "Failed to generate playlist recommendations", details: errorMessage },
        { status: 500 }
    );
}
}

// Function to parse AI response
async function parseResponse(response: GenerateContentResult, bookTitle: string): Promise<Playlist> {
  const text = await response.response.text();
  console.log("📄 Raw AI response:", text);

  // Remove Markdown code blocks if present
  const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    const parsedData = JSON.parse(cleanedText) as Playlist;

    // Validate the structure of the parsed playlist
    if (!parsedData.name || !parsedData.tracks || parsedData.tracks.length === 0) {
      console.warn("⚠ AI response missing required fields, falling back to mock playlist.");
      return generateMockPlaylist(bookTitle);
    }

    return parsedData;
  } catch (e) {
    console.error("❌ Error parsing Gemini response:", e);
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
