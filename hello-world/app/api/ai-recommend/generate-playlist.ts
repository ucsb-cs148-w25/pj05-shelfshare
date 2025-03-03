import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { bookDescription } = req.body;

  if (!bookDescription) {
    return res.status(400).json({ error: "Book description is required" });
  }

  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: `Create a music playlist based on this book: ${bookDescription}` },
      ],
    });

    res.json({ playlist: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: "OpenAI API request failed" });
  }
}
