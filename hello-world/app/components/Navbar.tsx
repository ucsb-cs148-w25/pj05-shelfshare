// components/Navbar.tsx
"use client"; 
import React, { useEffect, useReducer, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from 'next/navigation';

// Define action types
type Action =
    | { type: "TOGGLE_DROPDOWN"; dropdown: string }
    | { type: "CLOSE_DROPDOWNS" };

// Define the state type
type State = {
    openDropdown: string | null;
};

// Initial state
const initialState: State = {
    openDropdown: null,
};

// Reducer function
const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case "TOGGLE_DROPDOWN":
            return {
                openDropdown: state.openDropdown === action.dropdown ? null : action.dropdown,
            };
        case "CLOSE_DROPDOWNS":
            return {
                openDropdown: null,
            };
        default:
            return state;
    }
};

const Navbar: React.FC = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { openDropdown } = state;

    const [isClient, setIsClient] = useState(false);
    const pathname = usePathname(); // Get current route

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        dispatch({ type: "CLOSE_DROPDOWNS" }); // Close dropdowns on route change
    }, [pathname]);

    if (!isClient) {
        // Avoid rendering on the server to prevent hydration errors
        return null;
    }

    const toggleDropdown = (dropdown: string) => {
        dispatch({ type: "TOGGLE_DROPDOWN", dropdown });
    };

    return (
        <nav className="navbar-container">
            <div className="logo-container">
                <Link href="/home">
                    <Image src="/logo.png" alt="ShelfShare Logo" width={180} height={15} />
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
