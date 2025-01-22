import React from "react";

export default function Browse() {
  return (
    <div className="bg-green-200 h-screen">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 bg-green-200">
        {/* Shelf Share button */}
        <button className="text-green-800 text-2xl font-bold">Shelf Share</button>

        {/* Search bar */}
        <input
          type="text"
          placeholder="Search..."
          className="flex-1 mx-4 px-4 py-2 rounded-full border border-green-400 focus:outline-none focus:ring focus:ring-green-300"
        />

        {/* Navbar Buttons */}
        <div className="flex space-x-6">
          <button className="text-green-800 text-lg font-medium hover:underline">
            Books
          </button>
          <button className="text-green-800 text-lg font-medium hover:underline">
            Browse
          </button>
          <button className="text-green-800 text-lg font-medium hover:underline">
            Timeline
          </button>
          <button className="text-green-800 text-lg font-medium hover:underline">
            My Shelf
          </button>

          {/* Profile Icon */}
          <div className="w-8 h-8 bg-green-800 rounded-full flex items-center justify-center text-white">
            P
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6">
        {/* Bookshelves */}
        <div className="space-y-8">
          {/* Reading Now */}
          <div>
            <h2 className="text-green-800 text-2xl font-bold mb-4">Reading Now</h2>
            <div className="bg-white p-4 rounded-md shadow-md">Books go here...</div>
          </div>

          {/* To Be Read */}
          <div>
            <h2 className="text-green-800 text-2xl font-bold mb-4">To Be Read...</h2>
            <div className="bg-white p-4 rounded-md shadow-md">Books go here...</div>
          </div>

          {/* Previously Read */}
          <div>
            <h2 className="text-green-800 text-2xl font-bold mb-4">Previously Read</h2>
            <div className="bg-white p-4 rounded-md shadow-md">Books go here...</div>
          </div>
        </div>
      </div>
    </div>
  );
}
