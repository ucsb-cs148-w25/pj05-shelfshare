import React from "react";

export default function Browse() {
  return (
    <div className="bg-green-700 h-screen"> {/* Darker green background */}
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 bg-green-600"> {/* Navbar */}
        {/* Left Side */}
        <button className="text-amber-100 text-2xl font-bold">Shelf Share</button>

        {/* Middle Section */}
        <input
          type="text"
          placeholder="Search..."
          className="w-1/4 px-4 py-2 rounded-full border border-green-400 focus:outline-none focus:ring focus:ring-green-300"
        />

        {/* Right Side */}
        <div className="flex space-x-6">
          <button className="text-amber-100 text-lg font-medium hover:underline">
            Books
          </button>
          <button className="text-amber-100 text-lg font-medium hover:underline">
            Browse
          </button>
          <button className="text-amber-100 text-lg font-medium hover:underline">
            Timeline
          </button>
          <button className="text-amber-100 text-lg font-medium hover:underline">
            My Shelf
          </button>

          {/* Profile Icon */}
          <div className="w-8 h-8 bg-green-800 rounded-full flex items-center justify-center text-white">
            P
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6 space-y-8"> {/* Add spacing between sections */}
        {/* Reading Now */}
        <div>
          <h2 className="text-amber-100 text-2xl font-bold mb-4">Reading Now</h2>
          <div className="bg-brown-600 p-6 rounded-md shadow-md text-white"> {/* Fixed brown color */}
            Books go here...
          </div>
        </div>

        {/* To Be Read */}
        <div>
          <h2 className="text-amber-100 text-2xl font-bold mb-4">To Be Read...</h2>
          <div className="bg-brown-600 p-6 rounded-md shadow-md text-white"> {/* Fixed brown color */}
            Books go here...
          </div>
        </div>

        {/* Previously Read */}
        <div>
          <h2 className="text-amber-100 text-2xl font-bold mb-4">Previously Read</h2>
          <div className="bg-brown-600 p-6 rounded-md shadow-md text-white"> {/* Fixed brown color */}
            Books go here...
          </div>
        </div>
      </div>
    </div>
  );
}

