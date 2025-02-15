import { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/firebase";
import { collection, query, getDocs } from "firebase/firestore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: "Missing user ID" });
  }

  try {
    const shelfQuery = query(collection(db, "users", userId as string, "shelves"));
    const shelfSnapshot = await getDocs(shelfQuery);
    
    const finishedBooks = shelfSnapshot.docs
      .map((doc) => ({
        title: doc.data().title,
        cover: doc.data().coverUrl
      }))
      .filter((book) => doc.data().shelfType === "finished");

    res.status(200).json({ books: finishedBooks });
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({ message: "Error fetching books" });
  }
}
