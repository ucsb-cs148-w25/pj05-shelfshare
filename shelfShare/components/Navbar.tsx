import React from "react";
import Link from "next/link";

const Navbar: React.FC = () => {
    return (
        <nav className="bg-green-800 px-6 py-4 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="ShelfShare Logo" className="h-8 w-8" />
                    <Link href="/" className="text-3xl font-semibold text-white">ShelfShare</Link>
                </div>
                <div className="flex-1 max-w-2xl mx-4">
                    <input
                        type="text"
                        placeholder="Search"
                        className="w-full px-6 py-3 rounded-full bg-white/90 text-gray-800 focus:outline-none text-lg"
                    />
                </div>
                <div className="flex items-center gap-6">
                    <Link href="/books" className="text-white hover:text-gray-200">Books</Link>
                    <Link href="/browse" className="text-white hover:text-gray-200">Browse</Link>
                    <Link href="/timeline" className="text-white hover:text-gray-200">Timeline</Link>
                    <Link href="/my-shelf" className="px-4 py-2 rounded-full bg-gray-800/60 text-white hover:bg-gray-800/80">My Shelf</Link>
                    <button className="text-white hover:text-gray-200">
                        <span className="material-icons text-2xl">account_circle</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;