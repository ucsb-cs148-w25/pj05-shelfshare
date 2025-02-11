// pages/profile.tsx
'use client';
import React, { useState } from 'react';
const Profile = () => {
    const [inputPreferredGenre, setInputPreferredGenre] = useState(1);
    const [inputAboutMe, setInputAboutMe] = useState(1);

    const [preferredGenreString, setPreferredGenreString] = useState("#fantasy#romance#mystery");
    const [aboutMeString, setAboutMeString] = useState("Write about yourself!");

    const [preferredGenreStringUpdate, setPreferredGenreStringUpdate] = useState("#fantasy#romance#mystery");
    const [aboutMeStringUpdate, setAboutMeStringUpdate] = useState("Write about yourself!");    


    const handlePreferredGenre = () => {
        setInputPreferredGenre(!inputPreferredGenre)
        setPreferredGenreString("")
    };

    const handleAboutMe = () => {
        setInputAboutMe(!inputAboutMe)
        setAboutMeString("")
    };

    const handleInputPreferredGenre = (event) => {
        setPreferredGenreString(event.target.value);
    };

    const handleInputAboutMe = (event) => {
        setAboutMeString(event.target.value);
    };

    const updateInputPreferredGenre = () => {
        setPreferredGenreStringUpdate(preferredGenreString)
        handlePreferredGenre()
    };

    const updateInputAboutMe = () => {
        setAboutMeStringUpdate(aboutMeString)
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
            src="/profile-pic.svg"
            className="w-56 h-56 object-cover mb-4 rounded-full"
            alt="Profile"
        />
        <div className="flex">
            <p className="text-[#DFDDCE] text-xl">UserName</p>
            <button id="edit-picture">
                <img src="upload-pic.png" alt="edit profile picture"/>
            </button>
        </div>
        </div>
        <div className= "flex flex-col justify-start pl-20 mr-20 items-start transform translate-x-14">
                <div className="flex">
                    <h2 className="text-[#DFDDCE] text-2xl font-bold mb-6">Preferred Genre</h2>
                    <button id="preferred-genre-button" onClick={handlePreferredGenre}>
                        <img src="edit.png" alt="edit preferred genre"/>
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
                        <img src="edit.png" alt="edit about me"/>
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