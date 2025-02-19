// pages/profile.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import React, { useState, useEffect } from 'react';
import { db } from "@/firebase";
import { onSnapshot, updateDoc, doc} from "firebase/firestore";

interface ProfileItem {
  email: string;
  aboutMe: string;
  pgenre: string;
  profilePicUrl: string;
  uid: string;
  username: string;
}
const Profile = () => {

   const { user } = useAuth();
   const router = useRouter();


   const [inputPreferredGenre, setInputPreferredGenre] = useState(true);
   const [inputAboutMe, setInputAboutMe] = useState(true);


   const [preferredGenreString, setPreferredGenreString] = useState("#fantasy#romance#mystery");
   const [aboutMeString, setAboutMeString] = useState("Write about yourself!");


   const [preferredGenreStringUpdate, setPreferredGenreStringUpdate] = useState("#fantasy#romance#mystery");
   const [aboutMeStringUpdate, setAboutMeStringUpdate] = useState("Write about yourself!");  

   
   const [profilePicture, setProfilePicture] = useState("upload-pic.png");

   const [username, setUsername] = useState("username");

   const [changeProfile, setChangeProfile] = useState<File | null>(null);

   useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const userDocRef = doc(db, "profile", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();

        const profileItem: ProfileItem = {
          email: data.email || "email@shelfshare.com",
          aboutMe: data.aboutMe || "Write about yourself!",
          pgenre: data.pgenre || "#fantasy#romance#mystery",
          profilePicUrl: data.profilePicUrl || "", 
          uid: data.uid,
          username: data.username || "username",
        };

        setProfilePicture(profileItem.profilePicUrl); 
        setPreferredGenreStringUpdate(profileItem.pgenre);
        setUsername(profileItem.username);
        setAboutMeStringUpdate(profileItem.aboutMe);
      }
    });


    return () => unsubscribe();
  }, [user]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; 
    if (!file) return;
    setChangeProfile(file);
  };
  
  const uploadToCloudinary = async (file: File) => {
    if (!user) return;
    const CLOUD_NAME = "dwsk8lhiy";
    const UPLOAD_PRESET = "shelfshare"; 
  
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
  
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();
    return data.secure_url; 

  };
  
  const updateProfilePicture = async () => {
    if (!user) return;
    if (!changeProfile) return;
  
    const pic = await uploadToCloudinary(changeProfile);
    if (!pic) return;
  
    setProfilePicture(pic);
  
    const userDocRef = doc(db, "profile", user.uid);
    await updateDoc(userDocRef, {
      profilePicUrl: pic,
    });
  };



   const handlePreferredGenre = () => {
       setInputPreferredGenre(!inputPreferredGenre)
       setPreferredGenreString("")
   };


   const handleAboutMe = () => {
       setInputAboutMe(!inputAboutMe)
       setAboutMeString("")
   };


   const handleInputPreferredGenre = (event: React.ChangeEvent<HTMLInputElement>) => {
       setPreferredGenreString(event.target.value);
   };


   const handleInputAboutMe = (event: React.ChangeEvent<HTMLInputElement>) => {
       setAboutMeString(event.target.value);
   };


   const updateInputPreferredGenre = async () => {
       if (!user) return;
       const userDocRef = doc(db, "profile", user.uid);
        updateDoc(userDocRef, {
        pgenre: preferredGenreString
        });
       setPreferredGenreStringUpdate(preferredGenreString)
       handlePreferredGenre()
   };


   const updateInputAboutMe = async () => {
      if (!user) return;
       const userDocRef = doc(db, "profile", user.uid);
       updateDoc(userDocRef, {
        aboutMe: aboutMeString
        });
      setPreferredGenreStringUpdate(preferredGenreString)
       handleAboutMe()
   };


   return (
   <div className="bg-[#5A7463] min-h-screen flex">
          
       <div className="flex flex-col items-center ml-48 mt-[39px]">
       <h1 className="text-[#DFDDCE] text-4xl font-bold mb-10">
           Profile
       </h1>




       {/* Profile Image */}
       <img
           src={profilePicture}
           className="w-56 h-56 object-cover mb-4 rounded-full"
           alt="Profile"
       />
       <div className="flex">
           <p className="text-[#DFDDCE] text-xl">{username}</p>
          <input className="block w-full text-sm text-gray-900" aria-describedby="file_input_help" id="file_input" type="file" onChange={handleFileChange}/>
          <button id="change-profile-picture" onClick={updateProfilePicture}> Edit</button> 
       </div>
       </div>
       <div className= "flex flex-col justify-start pl-20 mr-20 items-start transform translate-x-14">
               <div className="flex">
                   <h2 className="text-[#DFDDCE] text-2xl font-bold mb-6">Preferred Genre</h2>
                   <button id="preferred-genre-button" onClick={handlePreferredGenre}>
                       Start Editing
                   </button>
                   <button id="edit-preferredgenre" onClick={updateInputPreferredGenre}>
                       Edit
                   </button>                   
               </div>
               <input type="text" id="preferred-genre" value={preferredGenreString} onChange={handleInputPreferredGenre} name="pgenre" disabled={inputPreferredGenre} hidden={inputPreferredGenre} className="bg-[#DFDDCE] text-[#3D2F2A] mt-2 p-4 rounded-lg text-lg mb-4 h-1/5 width=1"/>
               <div className="bg-[#DFDDCE] text-[#3D2F2A] mt-2 p-4 rounded-lg text-lg mb-4 h-1/5" hidden={!inputPreferredGenre}>
                   {preferredGenreStringUpdate}
               </div>
               <div className="flex">
                   <h2 className="text-[#DFDDCE] text-2xl font-bold mb-6">About Me</h2>
                   <button id="about-me-button" onClick={handleAboutMe}>
                      Start Editing
                   </button>
                   <button id="edit-aboutme" onClick={updateInputAboutMe}>
                       Edit
                   </button> 
               </div>
               <input type="text" id="preferred-genre" name="pgenre" value={aboutMeString} onChange={handleInputAboutMe} disabled={inputAboutMe} hidden={inputAboutMe} className="bg-[#DFDDCE] text-[#3D2F2A] mt-2 p-4 rounded-lg text-lg mb-4 h-1/5"/>
               <div className="bg-[#DFDDCE] text-[#3D2F2A] mt-2 p-4 rounded-lg text-lg mb-4 h-1/5" hidden={!inputAboutMe}>
                   {aboutMeStringUpdate}
               </div>
           </div>
       </div>


   )
}


export default Profile