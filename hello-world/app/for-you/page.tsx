'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

export default function ForYou() {
  const { user } = useAuth();
  const router = useRouter();
  const [userBooks, setUserBooks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true); // Add a loading state

  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
    } else {
      setLoading(false); // Set loading to false once user is available
    }
  }, [user, router]);

  // Fetch user books and recommendations
  useEffect(() => {
    if (user) {
      fetch('/api/books/my-shelf') // Adjust API endpoint as needed
        .then((res) => res.json())
        .then((data) => {
          setUserBooks(data.books);
          generateRecommendations(data.books);
        })
        .catch((err) => console.error('Error fetching shelf:', err));
    }
  }, [user]);

  // Function to generate AI-based book recommendations
  async function generateRecommendations(books) {
    try {
      const response = await fetch('/api/recommend-books', { // Adjust endpoint as needed
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books }),
      });
      const data = await response.json();
      setRecommendations(data.recommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
  }

  // Avoid rendering while redirecting or loading
  if (!user || loading) {
    return null;
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#5A7463', fontFamily: 'Outfit, sans-serif' }}
    >
      {/* Read Next Section */}
      <Section title="Read Next" books={userBooks.slice(0, 4)} />
      
      {/* AI-Recommended Section */}
      <Section title="You may also like..." books={recommendations.slice(0, 4)} />

      {/* Top 10 Books of the Year */}
      <Section title="Top 10 books of the Year" books={recommendations.slice(4, 8)} />
    </div>
  );
}

// Reusable Book Display Component -- added animations 
function Section({ title, books }) {
  const shelfRef = useRef(null);

  const slide = (direction) => {
    const shelf = shelfRef.current;
    const scrollAmount = 300; // Adjust scroll amount as needed
    if (direction === 'left') {
      shelf.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      shelf.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col items-center mt-12 w-full">
      <div className="relative w-full">
        {/* Section Title */}
        <div
          className="font-bold items-center text-3xl mt-6"
          style={{ color: '#DFDDCE', fontFamily: 'Outfit, sans-serif', marginLeft: 'calc((100% - 1030px) / 2)' }}
        >
          {title}
        </div>

        {/* Shelf Background */}
        <div
          className="relative w-[1030px] h-[300px] mt-2 mx-auto"
          style={{ backgroundColor: '#847266', borderTop: '10px solid #3D2F2A', borderBottom: '10px solid #3D2F2A' }}
        >
          {/* Left Arrow */}
          <button
            onClick={() => slide('left')}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full z-10"
            style={{ left: '-40px' }}
          >
            &lt;
          </button>

          {/* Right Arrow */}
          <button
            onClick={() => slide('right')}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full z-10"
            style={{ right: '-40px' }}
          >
            &gt;
          </button>

          {/* Books Display */}
          <div
            ref={shelfRef}
            className="relative top-4 left-3 flex space-x-5 overflow-x-auto scrollbar-hide"
          >
            {books.length > 0 ? (
              books.map((book, index) => (
                <div
                  key={index}
                  className="book-container group relative bg-[#3D2F2A] w-[150px] h-[250px] rounded-lg flex items-center justify-center text-white text-sm p-2 transition-all duration-300 hover:z-50"
                  style={{ backgroundImage: `url(${book.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  {/* Page Flip Animation Layer */}
                  <div className="absolute inset-0 page-flip-animation origin-left"></div>
                  
                  {/* Book Content */}
                  <div className="relative z-10 group-hover:scale-150 group-hover:-translate-y-12 transition-transform duration-300">
                    {book.title}
                  </div>
                </div>
              ))
            ) : (
              Array(4).fill(null).map((_, index) => (
                <div
                  key={index}
                  className="book-container group relative bg-[#3D2F2A] w-[150px] h-[250px] rounded-lg flex items-center justify-center text-white text-sm p-2 transition-all duration-300 hover:z-50"
                >
                  <div className="absolute inset-0 page-flip-animation origin-left"></div>
                  <div className="relative z-10 group-hover:scale-150 group-hover:-translate-y-12 transition-transform duration-300">
                    Placeholder
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
            


//             {books.length > 0 ? (
//               books.map((book, index) => (
//                 <div
//                   key={index}
//                   className="book-container group relative bg-[#3D2F2A] w-[150px] h-[250px] rounded-lg flex items-center justify-center text-white text-sm p-2 transition-all duration-300 hover:z-20"
//                   style={{ backgroundImage: `url(${book.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
//                 >
//                   <div className="book-pages"></div>
//                   {book.title}
//                 </div>
//               ))
//             ) : (
//               // Placeholder books if no books are available
//               Array(4)
//                 .fill(null)
//                 .map((_, index) => (
//                   <div
//                     key={index}
//                     className="book-container bg-[#3D2F2A] w-[150px] h-[250px] rounded-lg flex items-center justify-center text-white text-sm p-2 transition-transform duration-300 hover:scale-110 hover:z-20"
//                   >
//                     <div className="book-pages"></div>
//                   </div>
//                 ))
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }