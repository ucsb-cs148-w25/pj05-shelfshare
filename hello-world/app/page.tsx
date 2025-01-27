// app/page.tsx
import './globals.css';

export default function Home() {
  return (
    <div className="flex justify-center items-center h-screen bg-custom-green">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-custom-tan">Hello ShelfShare</h1>
        <button className="mt-8 px-6 py-3 bg-pink-400 text-white text-2xl font-normal rounded-full transform transition-all hover:scale-110 hover:bg-pink-500">
          <span className="mr-2">💖</span>≽^•⩊•^≼
        </button>
      </div>
    </div>
  );
}

