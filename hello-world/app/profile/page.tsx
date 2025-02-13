// pages/profile.tsx
'use client';
import React, { useState, useEffect} from 'react';
import { auth, db } from '../../firebase';
import { doc, updateDoc, onSnapshot} from 'firebase/firestore';
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from 'next/navigation';



const Profile = () => {


   const [inputPreferredGenre, setInputPreferredGenre] = useState(1);
   const [inputAboutMe, setInputAboutMe] = useState(1);


   const [preferredGenreString, setPreferredGenreString] = useState("#fantasy#romance#mystery");
   const [aboutMeString, setAboutMeString] = useState("Write about yourself!");


   const [preferredGenreStringUpdate, setPreferredGenreStringUpdate] = useState("#fantasy#romance#mystery");
   const [aboutMeStringUpdate, setAboutMeStringUpdate] = useState("Write about yourself!");   
   const userId = auth.currentUser?.uid;

   const [user, setUser] = useState(null);
   const router = useRouter();
   
   useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!userId) {
          console.warn("No authenticated user found.");
          return;
        }
        const userRef = doc(db, 'profile', auth.currentUser?.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setPreferredGenreStringUpdate(userSnap.data().pgenre);
          setAboutMeStringUpdate(userSnap.data().aboutMe);
        }
    };
  
    fetchUserData();
  }},[auth]);

  // change written status for preferred genere
   const handlePreferredGenre = () => {
       setInputPreferredGenre(!inputPreferredGenre)
       setPreferredGenreString("")
   };

  // change writtenn status for preferred genre
   const handleAboutMe = () => {
       setInputAboutMe(!inputAboutMe)
       setAboutMeString("")
   };

  // put preferGenreString input as user input
   const handleInputPreferredGenre = (event) => {
       setPreferredGenreString(event.target.value);
   };

  // put aboutMeString input as user input
   const handleInputAboutMe = (event) => {
       setAboutMeString(event.target.value);
   };

  // update user input to the database - preferred genre
   const updateInputPreferredGenre = async () => {
        await updateDoc(doc(db, "profile", userId), {
          pgenre: preferredGenreString
        });
        setUserData(getUserData()); 
       setPreferredGenreStringUpdate(preferredGenreString)
       handlePreferredGenre()
   };

  // update user input to the database - about me
   const updateInputAboutMe = async () => {
        await updateDoc(doc(db, "profile", userId), {
          aboutMe: aboutMeString
        });
        setUserData(getUserData()); 
       setAboutMeStringUpdate(aboutMeString)
       handleAboutMe()
   };
  //  if (!userData) return <p>Loading...</p>; // ✅ Prevents errors

   return (
   <div className="bg-[#5A7463] min-h-screen flex">
          
       <div className="flex flex-col items-center ml-48 mt-[39px]">
       <h1 className="text-[#DFDDCE] text-4xl font-bold mb-10">
           Profile
       </h1>




       {/* Profile Image */}
       <img
           src="/profile-pic.svg"
           className="w-56 h-56 object-cover mb-4 rounded-full"
           alt="Profile"
       />
       <div className="flex">
           <p className="text-[#DFDDCE] text-xl">UserName</p>
           {/* <button id="edit-picture"> */}
           <input type="file" accept=".png, .jpg, .jpeg" />
           {/* <img src="upload-pic.png" alt="edit profile picture"/> */}


           {/* </button> */}
       </div>
       </div>
       <div className= "flex flex-col justify-start pl-20 mr-20 items-start transform translate-x-14">
               <div className="flex">
                   <h2 className="text-[#DFDDCE] text-2xl font-bold mb-6">Preferred Genre</h2>
                   <button id="preferred-genre-button" className="ml-3" onClick={handlePreferredGenre}>
                      Edit
                   </button>
                   <button id="edit-preferredgenre" className="ml-3" onClick={updateInputPreferredGenre}>
                       Submit
                   </button>                   
               </div>
               <input type="text" id="preferred-genre" value={preferredGenreString} onChange={handleInputPreferredGenre} name="pgenre" disabled={inputPreferredGenre} hidden={inputPreferredGenre} className="bg-[#DFDDCE] text-[#3D2F2A] mt-2 p-4 rounded-lg text-lg mb-4 h-1/5 width=1"/>
               <div className="bg-[#DFDDCE] text-[#3D2F2A] mt-2 p-4 rounded-lg text-lg mb-4 h-1/5" hidden={!inputPreferredGenre}>
                   {preferredGenreStringUpdate}
               </div>
               <div className="flex">
                   <h2 className="text-[#DFDDCE] text-2xl font-bold mb-6">About Me</h2>
                   <button id="about-me-button" className="ml-3" onClick={handleAboutMe}>
                       Edit
                   </button>
                   <button id="edit-aboutme" className="ml-3" onClick={updateInputAboutMe}>
                       Submit
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