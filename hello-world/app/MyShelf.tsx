import React from "react";

export default function UserLists() {
  return (
    <div className="bg-[#5A7463] h-screen flex flex-col items-center justify-center">
      {/* Spacer for navbar */}
      <div className="h-1/10"></div> {/* Reduced spacer height */}

      {/* Lists Section */}
      <div className="space-y-8 w-5/6"> {/* Adjusted container width */}
        {/* Reading Now */}
        <div>
          <h2 className="text-[#DFDDCE] text-3xl font-bold mb-4">Reading Now</h2>
          {/* Shelf Background */}
          <div
            className="relative bg-[#847266] border-t-8 border-b-8 border-[#3D2F2A] h-44 flex items-center"
          >
            {/* Books */}
            <div className="flex space-x-4 justify-start ml-4">
              {Array(4)
                .fill(null)
                .map((_, index) => (
                  <div
                    key={index}
                    className="bg-[#3D2F2A] w-32 h-36 rounded-lg"
                  ></div>
                ))}
            </div>
          </div>
        </div>

        {/* To Be Read */}
        <div>
          <h2 className="text-[#DFDDCE] text-3xl font-bold mb-4">To Be Read...</h2>
          {/* Shelf Background */}
          <div
            className="relative bg-[#847266] border-t-8 border-b-8 border-[#3D2F2A] h-44 flex items-center"
          >
            {/* Books */}
            <div className="flex space-x-4 justify-start ml-4">
              {Array(4)
                .fill(null)
                .map((_, index) => (
                  <div
                    key={index}
                    className="bg-[#3D2F2A] w-32 h-36 rounded-lg"
                  ></div>
                ))}
            </div>
          </div>
        </div>

        {/* Previously Read */}
        <div>
          <h2 className="text-[#DFDDCE] text-3xl font-bold mb-4">Previously Read</h2>
          {/* Shelf Background */}
          <div
            className="relative bg-[#847266] border-t-8 border-b-8 border-[#3D2F2A] h-44 flex items-center"
          >
            {/* Books */}
            <div className="flex space-x-4 justify-start ml-4">
              {Array(4)
                .fill(null)
                .map((_, index) => (
                  <div
                    key={index}
                    className="bg-[#3D2F2A] w-32 h-36 rounded-lg"
                  ></div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
