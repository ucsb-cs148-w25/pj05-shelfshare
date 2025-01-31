// export default function Profile() {
//   return (
//     <div className="bg-[#5A7463] min-h-screen flex flex-col items-center justify-start p-8">
      
//       {/* Profile Title (moves up using margin-bottom) */}
//       <h1 className="text-[#DFDDCE] text-4xl font-bold space-y-6 w-4/6 h-1/6">
//         Profile
//       </h1>

//       {/* Profile Image (moves down using margin-top) */}
//       <img
//           src="/profile-pic.svg"
//           className="w-56 h-56 object-cover space-y-6"
//           alt="Profile"
//         />
//         <p className="text-[#DFDDCE] text-xl">UserName</p>

//       {/* Preferred Genre Section (moves right with margin-left) */}
//       <div className="mt-10 w-11/12 max-w-2xl text-center ml-10">
//         <h2 className="text-[#DFDDCE] text-2xl font-bold">Preferred Genre:</h2>
//         <div className="bg-[#DFDDCE] text-[#3D2F2A] mt-2 p-4 rounded-lg text-lg">
//           #mystery #romance #fantasy
//         </div>
//       </div>

//       {/* About Me Section (moves left with negative margin) */}
//       <div className="mt-10 w-11/12 max-w-2xl text-center -ml-10">
//         <h2 className="text-[#DFDDCE] text-2xl font-bold">About Me:</h2>
//         <div className="bg-[#DFDDCE] text-[#3D2F2A] mt-2 p-4 rounded-lg text-lg">
//           A blurb about the reader and whatever they want to put up.
//         </div>
//       </div>

//     </div>
//   );
// }

export default function Profile() {
  return (
    <div className="bg-[#5A7463] min-h-screen flex p-8">
      
  <div className="flex flex-col items-center ml-48 mt-40 justify-start">
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
  <div className= "flex flex-col justify-start pl-20 mr-20 mt-52 items-start transform translate-x-14 mb-10">
         <h2 className="text-[#DFDDCE] text-2xl font-bold mb-6">Preferred Genre:</h2>
         <div className="bg-[#DFDDCE] text-[#3D2F2A] mt-2 p-4 rounded-lg text-lg mb-4 h-1/5">
           #mystery #romance #fantasy
         </div>
         <h2 className="text-[#DFDDCE] text-2xl font-bold mb-6">About Me:</h2>
         <div className="bg-[#DFDDCE] text-[#3D2F2A] mt-2 p-4 rounded-lg text-lg mb-4 h-1/3">
           A blurb about the reader and whatever they want to put up.
         </div>
       </div>
</div>

  );
}