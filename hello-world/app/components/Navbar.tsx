"use client";

import React, { useEffect, useReducer, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import debounce from 'lodash.debounce';

// Interface for search results
interface SearchResult {
    key: string;
    title: string;
    author_name?: string[];
    cover_i?: number;
    language?: string[];
    edition_count?: number;
}

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
                ...state, openDropdown: state.openDropdown === action.dropdown ? null : action.dropdown,
            };
        case "CLOSE_DROPDOWNS":
            return {
                ...state, openDropdown: null,
            };
        default:
            return state;
    }
};

const Navbar: React.FC = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [isClient, setIsClient] = useState(false);
    const pathname = usePathname();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const { openDropdown } = state;
    const searchCache = useRef(new Map<string, SearchResult[]>());

    // Fetch function with language filtering and author limitation
    const fetchSearchResults = useCallback(async (query: string) => {
        const trimmedQuery = query.trim().toLowerCase();
        if (!trimmedQuery) {
            setSearchResults([]);
            return;
        }

        // Check cache first
        const cachedResults = searchCache.current.get(trimmedQuery);
        if (cachedResults) {
            setSearchResults(cachedResults);
            return;
        }

        setIsSearching(true);
        try {
            const apiUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(trimmedQuery)}&language=eng&fields=key,title,author_name,cover_i,language,edition_count&limit=10`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            let filteredResults: SearchResult[] = data.docs
                .filter((doc: SearchResult) => doc.language?.includes("eng"))
                .map((result: SearchResult) => ({
                    key: result.key,
                    title: result.title,
                    author_name: result.author_name?.slice(0, 1),
                    cover_i: result.cover_i,
                    edition_count: result.edition_count || 1,
                }));

            // Deduplicate results by title + author
            const seen = new Set();
            filteredResults = filteredResults.filter((book) => {
                const identifier = `${book.title.toLowerCase()}|${book.author_name?.[0]?.toLowerCase()}`;
                if (seen.has(identifier)) {
                    return false;
                }
                seen.add(identifier);
                return true;
            });

            // Sort results for better relevancy
            filteredResults.sort((a, b) => {
                const exactMatchA = a.title.toLowerCase() === trimmedQuery;
                const exactMatchB = b.title.toLowerCase() === trimmedQuery;

                if (exactMatchA && !exactMatchB) return -1;
                if (exactMatchB && !exactMatchA) return 1;

                const editionCountA = a.edition_count ?? 0;
                const editionCountB = b.edition_count ?? 0;

                if (editionCountA > editionCountB) return -1;
                if (editionCountA < editionCountB) return 1;

                return 0;
            });

            // Update cache
            searchCache.current.set(trimmedQuery, filteredResults);
            setSearchResults(filteredResults);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Debounced search with dependency (300ms)
    const debouncedSearch = useCallback(
        debounce((query: string) => fetchSearchResults(query), 200),
        [fetchSearchResults]
    );

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        dispatch({ type: "CLOSE_DROPDOWNS" }); // Close dropdowns on route change
    }, [pathname]);

    const handleSelectBook = () => {
        setSearchResults([]); // Clear search results after selection
        setSearchQuery("");    // Optionally clear the search query too
    };

    const toggleDropdown = (dropdown: string) => {
        dispatch({ type: "TOGGLE_DROPDOWN", dropdown });
    };

    if (!isClient) {
        return null;
    }

    return (
        <nav className="navbar-container">
            <div className="logo-container">
                <Link href="/home">
                <Image src="/logo.png" alt="ShelfShare Logo" width={180} height={15} />
                </Link>
            </div>

            <div className="nav-items">
                {/* Search bar section */}
                <div className="relative">
                <input
                    type="text"
                    placeholder="Search..."
                    className="search-bar text-gray-900 bg-white"
                    value={searchQuery}
                    onChange={(e) => {
                    setSearchQuery(e.target.value);
                    debouncedSearch(e.target.value);
                    }}
                    onBlur={() => setTimeout(() => setSearchResults([]), 200)}
                />

                {/* Search results dropdown */}
                {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-md mt-1 z-50 border border-gray-200">
                    {searchResults.map((result) => (
                        <Link
                        key={result.key}
                        href={`/books/${result.key.split('/').pop()}`}
                        className="flex items-center p-4 hover:bg-gray-50 transition-colors gap-4"
                        onClick={handleSelectBook}
                        >
                        {result.cover_i && (
                            <Image
                            src={`https://covers.openlibrary.org/b/id/${result.cover_i}-S.jpg`}
                            alt={result.title}
                            width={15} height={30}
                            className="w-10 h-14 object-cover flex-shrink-0"
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate text-base">
                            {result.title}
                            </div>
                            {Array.isArray(result.author_name) && result.author_name.length > 0 && (
                            <div className="text-sm text-gray-600 truncate mt-1">
                                by {result.author_name[0]}
                            </div>
                            )}
                        </div>
                        </Link>
                    ))}
                    </div>
                )}

                {/* Only show "Searching..." if there's an active query and results are still loading */}
                {isSearching && searchQuery.trim() && (
                    <div className="absolute top-full left-0 right-0 bg-white p-3 text-gray-500">
                    Searching...
                    </div>
                )}
                </div>

                {/* Updated Links with Rounded Box */}
                <Link 
                href="/books/browse" 
                className={`nav-link ${pathname === "/books/browse" ? "bg-custom-brown text-custom-tan px-3 py-1 rounded-lg" : ""}`}
                >
                Browse
                </Link>
                <Link 
                href="/clubs" 
                className={`nav-link ${pathname === "/clubs" ? "bg-custom-brown text-custom-tan px-3 py-1 rounded-lg" : ""}`}
                >
                Book Club
                </Link>
                <Link 
                href="/timeline" 
                className={`nav-link ${pathname === "/timeline" ? "bg-custom-brown text-custom-tan px-3 py-1 rounded-lg" : ""}`}
                >
                Timeline
                </Link>
                <Link 
                href="/books/my-shelf" 
                className={`nav-link ${pathname === "/books/my-shelf" ? "bg-custom-brown text-custom-tan px-3 py-1 rounded-lg" : ""}`}
                >
                My Shelf
                </Link>
                <Link 
                href="/for-you" 
                className={`nav-link ${pathname === "/for-you" ? "bg-custom-brown text-custom-tan px-3 py-1 rounded-lg" : ""}`}
                >
                For You
                </Link>

                {/* Profile Dropdown */}
                <div className="relative">
                    <button
                        className="nav-link flex items-center"
                        onClick={() => toggleDropdown("profile")}
                    >
                        <span className="material-icons-outlined text-3xl">account_circle</span>
                        <span className="material-icons-outlined">expand_more</span>
                    </button>

                    {openDropdown === "profile" && (
                        <div className="dropdown-menu">
                            <Link
                                href="/profile"
                                className="dropdown-item"
                            >
                                Profile
                            </Link>
                            <Link
                                href="/friends"
                                className="dropdown-item"
                            >
                                Friends
                            </Link>
                            <Link
                                href="/"
                                className="dropdown-item"
                            >
                                Logout
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;