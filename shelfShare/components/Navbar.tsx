// components/Navbar.tsx
"use client"; 
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from 'next/navigation';

const Navbar: React.FC = () => {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    const pathname = usePathname(); // Get current route

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        setOpenDropdown(null); // Close dropdowns on route change
    }, [pathname]);

    if (!isClient) return null; // Prevent mismatch by not rendering until client-side

    const toggleDropdown = (dropdown: string) => {
        setOpenDropdown(openDropdown === dropdown ? null : dropdown);
        
    };

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
                        onClick={() => toggleDropdown("media")}
                    >
                        Media <span className="material-icons-outlined ml-1">expand_more</span>
                    </button>

                    {openDropdown === "media" && (
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
                        onClick={() => toggleDropdown("profile")}
                    >
                        <span className="material-icons-outlined text-3xl">account_circle expand_more</span>
                    </button>

                    {openDropdown === "profile" && (
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

