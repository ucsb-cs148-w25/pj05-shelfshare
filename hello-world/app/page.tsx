import React from "react";

export default function UserLists() {
  return (
    <div className="bg-[#5b7463] h-screen flex flex-col items-center justify-center">
      {/* Spacer for navbar */}
      <div className="h-1/10"></div> {/* Reduced spacer height */}

      {/* Lists Section */}
      <div className="space-y-7 w-5/6"> {/* Adjusted container width */}
        {/* Reading Now */}
        <div>
          <h2 className="text-[#bfc4b1] text-4xl font-bold mb-4">Reading Now</h2>
          <div className="bg-[#847165] h-36 p-6 py-6 rounded-lg shadow-lg text-white"> {/* Increased padding */}
            Book 1, Book 2, Book 3...
          </div>
        </div>

        {/* To Be Read */}
        <div>
          <h2 className="text-[#bfc4b1] text-4xl font-bold mb-4">To Be Read...</h2>
          <div className="bg-[#847165] h-36 p-6 py-6 rounded-lg shadow-lg text-white"> {/* Increased padding */}
            Book 4, Book 5, Book 6...
          </div>
        </div>

        {/* Previously Read */}
        <div>
          <h2 className="text-[#bfc4b1] text-4xl font-bold mb-4">Previously Read</h2>
          <div className="bg-[#847165] h-36 p-6 py-6 rounded-lg shadow-lg text-white"> {/* Increased padding */}
            Book 7, Book 8, Book 9...
          </div>
        </div>
      </div>
    </div>
  );
}
