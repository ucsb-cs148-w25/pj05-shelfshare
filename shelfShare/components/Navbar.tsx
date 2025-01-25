// components/Navbar.tsx
"use client"; 
import React, { useState } from "react";
import Link from "next/link";

const Navbar: React.FC = () => {
    const [isMediaDropdownOpen, setIsMediaDropdownOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

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

                <div className="relative">
                    <button 
                        className="nav-link flex items-center"
                        onClick={() => setIsMediaDropdownOpen(!isMediaDropdownOpen)}
                    >
                        Media <span className="material-icons-outlined ml-1">expand_more</span>
                    </button>

                    {isMediaDropdownOpen && (
                        <div className="dropdown-menu">
                            <Link href="/books" className="dropdown-item">Books</Link>
                            <Link href="/movies" className="dropdown-item">Movies</Link>
                            <Link href="/music" className="dropdown-item">Music</Link>
                        </div>
                    )}
                </div>

                <Link href="/browse" className="nav-link">Browse</Link>
                <Link href="/timeline" className="nav-link">Timeline</Link>
                <Link href="/my-shelf" className="nav-link">My Shelf</Link>

                <div className="relative">
                    <button 
                        className="nav-link flex items-center"
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    >
                        <span className="material-icons-outlined text-3xl">account_circle expand_more</span>
                    </button>

                    {isProfileDropdownOpen && (
                        <div className="dropdown-menu">
                            <Link href="/profile" className="dropdown-item">Profile</Link>
                            <Link href="/friends" className="dropdown-item">Friends</Link>
                            <Link href="/settings" className="dropdown-item">Settings</Link>
                            <Link href="/logout" className="dropdown-item">Logout</Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

