"use client";
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';


export default function Home() {
  const { user, logOut } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <main className="main">
      <div className="flex justify-center items-center h-screen bg-green-200">
        <div className="text-center flex flex-col space-y-6">
          <h1 className="text-4xl font-bold text-green-800">Hello World</h1>
          <button className="px-6 py-3 bg-pink-400 text-white text-2xl font-normal rounded-full transform transition-all hover:scale-110 hover:bg-pink-500">
            <span className="mr-2">💖</span>≽^•⩊•^≼
          </button>
          <button
            onClick={logOut}
            className="px-6 py-3 bg-purple-500 text-white text-xl font-normal rounded-full transform transition-all hover:scale-110 hover:bg-blue-600"
          >
            <span className="mr-2">🚪</span>Sign out
          </button>
        </div>
      </div>
    </main>
  );
}




