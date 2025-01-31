// pages/profile.tsx
import React from 'react'

const Profile = () => {
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


        {/* Username Text */}
        <p className="text-[#DFDDCE] text-xl">UserName</p>
        </div>
        <div className= "flex flex-col justify-start pl-20 mr-20 items-start transform translate-x-14 mb-10">
                <h2 className="text-[#DFDDCE] text-2xl font-bold mb-6">Preferred Genre:</h2>
                <div className="bg-[#DFDDCE] text-[#3D2F2A] mt-2 p-4 rounded-lg text-lg mb-4 h-1/5">
                #mystery #romance #fantasy
                </div>
                <h2 className="text-[#DFDDCE] text-2xl font-bold mb-6">About Me:</h2>
                <div className="bg-[#DFDDCE] text-[#3D2F2A] mt-2 p-4 rounded-lg text-lg mb-4 h-1/5">
                A blurb about the reader and whatever they want to put up.
                </div>
            </div>
        </div>

    )
}

export default Profile