// api/ai-recommend/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai';

interface BookRecommendation {
  title: string;
  author: string;
  genre?: string;
}

export async function POST(req: Request) {
  console.log("Received request");

  const { books } = await req.json();
  if (!books || books.length === 0) {
    return NextResponse.json({ message: "No books provided" }, { status: 400 });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const bookTitles = books.map((book: { title: string }) => book.title).join(", ");

    const prompts = {
      recommendations: `Based on these books: ${bookTitles}, what other books would the reader enjoy? Provide 5 recommendations in this JSON format: [{"title": "Book Title", "author": "Author Name", "genre": "Genre"}].`,
      newGenres: `The reader has read ${bookTitles}. Suggest 5 books from different genres they haven’t explored yet in this JSON format: [{"title": "Book Title", "author": "Author Name", "genre": "Genre"}].`,
      topBooks: `What are the top 10 books of the year? Provide them in this JSON format: [{"title": "Book Title", "author": "Author Name"}].`,
    };

    console.log("Sending prompts to Gemini API:", prompts);

    const responses = await Promise.all([
      model.generateContent(prompts.recommendations),
      model.generateContent(prompts.newGenres),
      model.generateContent(prompts.topBooks),
    ]);

    const parseResponse = async (response: GenerateContentResult): Promise<BookRecommendation[]> => {
      const text = await response.response.text();
      console.log("Raw AI response:", text);
      
      return JSON.parse(text) as BookRecommendation[];
      
    };

    return NextResponse.json({
      recommendations: await parseResponse(responses[0]),
      newGenres: await parseResponse(responses[1]),
      topBooks: await parseResponse(responses[2]),
    });
  } catch (error) {
    console.error("AI recommendation error:", error);
    return NextResponse.json({ message: "Error generating book recommendations" }, { status: 500 });
  }
}