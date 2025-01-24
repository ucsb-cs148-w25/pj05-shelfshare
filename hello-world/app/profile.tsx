
export default function Profile() {
  return (
    <div className="flex flex-col justify-center items-center h-screen background-profile bg-contain">
        <img className="rounded-full profile-image" src="/defult_profile_picture.jpg" alt="profile"/>
        <div className="text text-color text-location1">
          Write about your favorite genre!
        </div>
        <div className="text text-color text-location2">
            Write about yourself!
        </div>
    </div>

  );
}
  