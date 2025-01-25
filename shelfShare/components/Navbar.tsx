// components/Navbar.tsx
import React from "react";
import Link from "next/link";

const Navbar: React.FC = () => {
    return (
        <nav className="navbar-container">
            <div className="logo-container">
                <Link href="/">
                    <img src="/logo.png" alt="ShelfShare Logo" className="h-8 w-8" />
                </Link>
            </div>

            <div className="nav-items">
                <input
                    type="text"
                    placeholder="Search"
                    className="search-bar"
                />
                <Link href="/books" className="nav-link">Books</Link>
                <Link href="/browse" className="nav-link">Browse</Link>
                <Link href="/timeline" className="nav-link">Timeline</Link>
                <Link href="/my-shelf" className="nav-link">My Shelf</Link>
                <Link href="/profile" className="nav-link">
                    <span className="material-icons-outlined text-3xl">account_circle</span>
                </Link>
            </div>
        </nav>
    );
};

export default Navbar;
