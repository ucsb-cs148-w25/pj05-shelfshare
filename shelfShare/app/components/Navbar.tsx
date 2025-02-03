// components/Navbar.tsx
"use client"; 
import React, { useEffect, useReducer, useState, useCallback, useRef} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import debounce from 'lodash.debounce';

// Interfaces for search results
interface SearchResult {
    key: string;
    title: string;
    author_name?: string[];
    cover_i?: number;
    language?: string[];
}

interface ApiResponse {
    docs: SearchResult[];
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
    const [isClient, setIsClient] = useState(false);
    const pathname = usePathname(); // Get current route
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const { openDropdown } = state;

    const searchCache = useRef(new Map<string, SearchResult[]>());

    // Fetch function with language filtering and author limitation
    
    const fetchSearchResults = useCallback(async (query: string) => {
        const trimmedQuery = query.trim();
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
            const response = await fetch(
                `https://openlibrary.org/search.json?` + new URLSearchParams({
                    title: trimmedQuery, // Search by title
                    language: 'eng',
                    fields: 'key,title,author_name,cover_i,language',
                    limit: '10', // Get more results to filter better
                })
            );

            const data: ApiResponse = await response.json();

            const filteredResults = data.docs
                .filter(doc => doc.language?.includes('eng')) // Ensure only English books
                .map(result => ({
                    ...result,
                    author_name: result.author_name?.slice(0, 1),
                }));
    
            // Sort: exact matches appear first
            filteredResults.sort((a, b) => {
                if (a.title.toLowerCase() === trimmedQuery.toLowerCase()) return -1;
                if (b.title.toLowerCase() === trimmedQuery.toLowerCase()) return 1;
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
        debounce((query: string) => fetchSearchResults(query), 300),
        [fetchSearchResults]
    );
    
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
                
                {/* Search bar section */}
                <div className="relative">
                    <input
                    type="text"
                    placeholder="Search books..."
                    className="search-bar text-gray-900 bg-white"
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (e.target.value.trim()) setIsSearching(true); // Immediate loading state

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
                    
                    {/* Loading indicator */}
                    {isSearching && (
                    <div className="absolute top-full left-0 right-0 bg-white p-3 text-gray-500">
                        Searching...
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
                        <span className="material-icons-outlined text-3xl">account_circle</span>
                        <span className="material-icons-outlined">expand_more</span>
                    </button>

                    {openDropdown === "profile" && (
                        <div className="dropdown-menu">
                            <Link href="/profile" className="dropdown-item">Profile</Link>
                            <Link href="/friends" className="dropdown-item">Friends</Link>
                            <Link href="/settings" className="dropdown-item">Settings</Link>
                            <Link href="/" className="dropdown-item">Logout</Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

