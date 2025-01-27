import React from "react";

const ReviewsPage: React.FC = () => {
  const reviews = [
    {
      id: 1,
      name: "Jessica",
      text: "The Great Gatsby by F. Scott Fitzgerald is a poignant exploration of ambition, love, and the illusion of the American Dream...",
      bookImage: "/GreatGatsby.png",
    },
    {
      id: 2,
      name: "Charlene",
      text: "City of Orange by David Yoon is a gripping post-apocalyptic tale that delves into memory, survival, and the raw resilience of the human spirit...",
      bookImage: "/CityOfOrange.png",
    },
    {
      id: 3,
      name: "Isabella",
      text: "Educated by Tara Westover is a powerful memoir about breaking free from a life of isolation and pursuing self-discovery through education...",
      bookImage: "/Educated.png",
    },
    // Add more reviews to test scrolling
    {
      id: 4,
      name: "Michael",
      text: "Another great book about self-discovery and life challenges...",
      bookImage: "/Educated.png",
    },
    {
      id: 5,
      name: "Laura",
      text: "An amazing tale of perseverance and adventure...",
      bookImage: "/CityOfOrange.png",
    },
   
    
  ];

  return (
    <div className="bg-[#5A7463] min-h-screen overflow-y-auto flex flex-col items-center p-6">
      {/* Review Cards */}
      <div className="space-y-4 w-full max-w-2xl">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-[#DFDDCE] p-4 rounded-2xl shadow-md flex items-start space-x-4"
          >
            <img
              src="/dark-user-circle.svg"
              alt="User Icon"
              className="w-10 h-10 text-gray-500"
            />
            <div>
              <h3 className="text-lg font-semibold">{review.name}</h3>
              <p className="text-gray-700">{review.text}</p>
            </div>
            <img
              src={review.bookImage}
              alt={review.name}
              className="w-16 h-20 object-cover rounded-lg"
            />
          </div>
        ))}
      </div>

      {/* Input Section */}
      <div className="bg-white p-4 rounded-full shadow-md mt-6 flex items-center space-x-4 w-full max-w-3xl">
        <div className="flex space-x-4">
            <img src="/camera.svg" alt="Camera Icon" className="w-6 h-6" />
            <img src="/paperclip.svg" alt="Paper Clip Icon" className="w-6 h-6" />
            <img src="/bookshelf.svg" alt="Book Icon" className="w-6 h-6" />
        </div>
        <input
          type="text"
          placeholder="Text..."
          className="flex-1 border-none focus:ring-0"
        />
        <img
          src="/user-circle.svg"
          alt="User Icon"
          className="w-6 h-6"
        />
      </div>
    </div>
  );
};

export default ReviewsPage;
