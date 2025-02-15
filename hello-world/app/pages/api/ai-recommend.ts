// api/ai-recommend.ts

import { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { books } = req.body as { books: string[] };
  if (!books || books.length === 0) {
    return res.status(400).json({ message: "No books provided" });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Prompt AI for different shelves
    const prompts = {
      recommendations: `Based on these books: ${books.join(", ")}, what other books would the reader enjoy? Provide 5 recommendations with title, author, and genre.`,
      newGenres: `The reader has read ${books.join(", ")}. Suggest 5 books from different genres they haven’t explored yet.`,
      topBooks: `What are the top 10 books of the year? Provide a list of titles and authors.`,
    };

    // Fetch AI-generated results
    const responses: { response: { text: () => string } }[] = await Promise.all([
      model.generateContent(prompts.recommendations),
      model.generateContent(prompts.newGenres),
      model.generateContent(prompts.topBooks),
    ]);    
    
    const parseResponse = async (response: any) => {
      const text = await response.response.text();
      return text.split("\n").filter((line) => line.trim() !== "");
    };
    
    res.status(200).json({
      recommendations: await parseResponse(responses[0]),
      newGenres: await parseResponse(responses[1]),
      topBooks: await parseResponse(responses[2]),
    });
    
  } catch (error) {
    console.error("AI recommendation error:", error);
    res.status(500).json({ message: "Error generating book recommendations" });
  }
}
