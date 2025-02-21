"use client";

import React, { useEffect, useReducer, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from 'next/navigation';
import debounce from 'lodash.debounce';

// Interfaces for search results
interface SearchResult {
    key: string;
    title: string;
    author_name?: string[];
    cover_i?: number;
    language?: string[];
    edition_count?: number;
}

interface BookResult {
    key: string;
    title: string;
    author_name?: string[];
    language?: string[];
    cover_i?: number;
    edition_count?: number;
}

// Uncomment if using movies and music
interface MovieResult {
    id: number;
    title: string;
    poster_path?: string;
}

interface MusicResult {
    id: string;
    name: string;
    artists: { name: string }[];
    album: { cover_url: string };
}

// Define action types
type Action =
    | { type: "TOGGLE_DROPDOWN"; dropdown: string }
    | { type: "CLOSE_DROPDOWNS" }
    | { type: "SET_SELECTED_MEDIA"; option: string };

// Define the state type
type State = {
    openDropdown: string | null;
    selectedMedia: string;
};

// Initial state
const initialState: State = {
    openDropdown: null,
    selectedMedia: "Books",
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
        case "SET_SELECTED_MEDIA":
            return {
                ...state, selectedMedia: action.option, openDropdown: null
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
    const [searchCategory, setSearchCategory] = useState<"books" | "movies" | "music">("books");

    const { openDropdown, selectedMedia } = state;
    const searchCache = useRef(new Map<string, SearchResult[]>());
    const router = useRouter();

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
            let apiUrl = "";
            if (searchCategory === "books") {
                apiUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(trimmedQuery)}&language=eng&fields=key,title,author_name,cover_i,language,edition_count&limit=10`;
            } else if (searchCategory === "movies") {
                apiUrl = `http://www.omdbapi.com/?apikey=47d16ac6&s=${encodeURIComponent(trimmedQuery)}`;
            } else if (searchCategory === "music") {
                apiUrl = `https://api.musicdatabase.com/search?track=${trimmedQuery}&api_key=YOUR_MUSIC_API_KEY`;
            }
    
            const response = await fetch(apiUrl);
            const data = await response.json();
    
            let filteredResults: SearchResult[] = [];
            if (searchCategory === "books") {
                // Existing book search logic
                filteredResults = data.docs
                    .filter((doc: BookResult) => doc.language?.includes("eng"))
                    .map((result: BookResult) => ({
                        key: result.key,
                        title: result.title,
                        author_name: result.author_name?.slice(0, 1),
                        cover_i: result.cover_i,
                        edition_count: result.edition_count || 1,
                    }));
    
                // Deduplicate and sort results
                const seen = new Set();
                filteredResults = filteredResults.filter((book) => {
                    const identifier = `${book.title.toLowerCase()}|${book.author_name?.[0]?.toLowerCase()}`;
                    if (seen.has(identifier)) {
                        return false;
                    }
                    seen.add(identifier);
                    return true;
                });
    
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
            } else if (searchCategory === "movies") {
                // Map OMDb API results to SearchResult
                if (data.Search) {
                    filteredResults = data.Search.map((movie: any) => ({
                        key: `movie-${movie.imdbID}`,
                        title: movie.Title,
                        author_name: movie.Year ? [movie.Year] : [],
                        cover_i: movie.Poster !== "N/A" ? movie.Poster : undefined,
                    }));
                }
            } else if (searchCategory === "music") {
                // Existing music search logic
            }
    
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
    }, [searchCategory]);

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

    const handleSelectMedia = (option: "Books" | "Movies" | "Music") => {
        dispatch({ type: "SET_SELECTED_MEDIA", option });

        // Map the media selection to lowercase route names
        const mediaRoute = option.toLowerCase();

        // Ensure that if we are on the timeline page, we do not change the route
        if (pathname === "/timeline" || pathname === "/home" || pathname === "/for-you") {
            return; // Do nothing if the user is on the Timeline, Home, or For You page
        }

        // Extract the current route and update media type
        const segments = pathname.split("/").filter(Boolean); // Remove empty segments
        if (segments.length > 0) {
            segments[0] = mediaRoute; // Replace media type
            router.push(`/${segments.join("/")}`); // Navigate to updated URL
        } else {
            router.push(`/${mediaRoute}/browse`); // Default fallback
        }

        // Set the search category based on selected media
        const validCategories: ("books" | "movies" | "music")[] = ["books", "movies", "music"];
        if (validCategories.includes(option.toLowerCase() as "books" | "movies" | "music")) {
            setSearchCategory(option.toLowerCase() as "books" | "movies" | "music");
        }
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
                <div className="relative">
                    <button
                        className="nav-link flex items-center"
                        onClick={() => toggleDropdown("media")}
                    >
                        {selectedMedia} <span className="material-icons-outlined ml-1">expand_more</span>
                    </button>

                    {openDropdown === "media" && (
                        <div className="dropdown-menu">
                            <button className="dropdown-item" onClick={() => handleSelectMedia("Books")}>Books</button>
                            <button className="dropdown-item" onClick={() => handleSelectMedia("Movies")}>Movies</button>
                            <button className="dropdown-item" onClick={() => handleSelectMedia("Music")}>Music</button>
                        </div>
                    )}
                </div>

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
                                    href={`/${selectedMedia.toLowerCase()}/${result.key.split('/').pop()}`}
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

                <Link href={`/${selectedMedia.toLowerCase()}/browse`} className="nav-link">Browse</Link>
                <Link href="/timeline" className="nav-link">Timeline</Link>
                <Link href={`/${selectedMedia.toLowerCase()}/my-shelf`} className="nav-link">My Shelf</Link>
                <Link href="/for-you" className="nav-link">For You</Link>

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