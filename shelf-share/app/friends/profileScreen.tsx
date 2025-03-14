import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase"; // Ensure this is your Firebase instance
import Link from "next/link";

const Profile_Screen: React.FC<{ friendUid: string }> = ({ friendUid }) => {
  const [friendData, setFriendData] = useState<{
    email?: string;
    aboutMe?: string;
    genres?: string[];
    profilePicUrl?: string;
    uid?: string;
    username?: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFriendProfile = async () => {
      if (!friendUid) return;

      try {
        const profileRef = doc(db, "profile", friendUid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          setFriendData(profileSnap.data());
        } else {
          setFriendData(null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriendProfile();
  }, [friendUid]);

  if (loading) return <p className="text-gray-500">Loading profile...</p>;

  if (!friendData) return <p className="text-red-500">Profile not found.</p>;

  // Format genres for display
  const formatGenres = () => {
    if (Array.isArray(friendData.genres) && friendData.genres.length > 0) {
      return friendData.genres.join(", ");
    }
    return "No genres specified";
  };

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white w-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-16 h-16 rounded-full overflow-hidden">
          {friendData.profilePicUrl ? (
            <img
              src={friendData.profilePicUrl}
              alt={`${friendData.username}'s profile`}
              className="w-full h-full object-cover border rounded-full"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 rounded-full">
              {friendData.username?.charAt(0) || "?"}
            </div>
          )}
        </div>
        <h2 className="text-xl font-semibold text-gray-800">{friendData.username || "User"}</h2>
      </div>

      <div className="space-y-2">
        <p className="text-gray-700">
          <strong className="text-gray-900">Email:</strong> {friendData.email || "No email provided"}
        </p>
        <p className="text-gray-700">
          <strong className="text-gray-900">About Me:</strong> {friendData.aboutMe || "No information provided"}
        </p>
        <p className="text-gray-700">
          <strong className="text-gray-900">Preferred Genres:</strong> {formatGenres()}
        </p>
      </div>
      
      {/* View Full Profile Button */}
      <div className="mt-4 flex justify-end">
        <Link href={`/friend-profile?id=${friendUid}`}>
          <button className="bg-[#5a7463] text-white px-6 py-2 rounded-lg hover:bg-[#4a6453] transition shadow-sm">
            View Full Profile
          </button>
        </Link>
      </div>
    </div>
  );
};

export default Profile_Screen;