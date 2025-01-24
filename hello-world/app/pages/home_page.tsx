export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Section */}
      <header className="bg-blue-600 text-white py-6">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold">Book Haven</h1>
          <nav>
            <ul className="flex space-x-4">
              <li><a href="#" className="hover:underline">Home</a></li>
              <li><a href="#" className="hover:underline">Categories</a></li>
              <li><a href="#" className="hover:underline">Contact</a></li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Welcome to Book Haven</h2>
          <p className="text-lg text-gray-600 mb-6">Discover your next favorite book today!</p>
          <input
            type="text"
            placeholder="Search for books..."
            className="border border-gray-300 rounded-lg px-4 py-2 w-1/2"
          />
        </div>
      </section>

      {/* Featured Books Section */}
      <section className="py-16">
        <div className="container mx-auto">
          <h3 className="text-2xl font-bold mb-6">Featured Books</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-md p-4">
              <img src="/book1.jpg" alt="Book 1" className="w-full h-48 object-cover rounded" />
              <h4 className="text-xl font-bold mt-4">Book Title 1</h4>
              <p className="text-gray-600">Author Name</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <img src="/book2.jpg" alt="Book 2" className="w-full h-48 object-cover rounded" />
              <h4 className="text-xl font-bold mt-4">Book Title 2</h4>
              <p className="text-gray-600">Author Name</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <img src="/book3.jpg" alt="Book 3" className="w-full h-48 object-cover rounded" />
              <h4 className="text-xl font-bold mt-4">Book Title 3</h4>
              <p className="text-gray-600">Author Name</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto text-center">
          <p>&copy; 2025 Book Haven. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
