import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase"; // Ensure this is your Firebase instance

const Profile_Screen: React.FC<{ friendUid: string }> = ({ friendUid }) => {
  const [friendData, setFriendData] = useState<{
    email?: string;
    aboutMe?: string;
    pgenre?: string;
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

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white">
      <div className="flex items-center gap-3">
        {friendData.profilePicUrl && (
          <img
            src={friendData.profilePicUrl}
            alt={`${friendData.username}'s profile`}
            className="w-16 h-16 rounded-full border"
          />
        )}
        <h2 className="text-xl font-semibold text-gray-800">{friendData.username}</h2>
      </div>
      <p className="text-gray-600 mt-2"><strong>Email:</strong> {friendData.email}</p>
      <p className="text-gray-600 mt-2"><strong>About Me:</strong> {friendData.aboutMe}</p>
      <p className="text-gray-600 mt-2"><strong>Preferred Genres:</strong> {friendData.pgenre}</p>
    </div>
  );
};

export default Profile_Screen;