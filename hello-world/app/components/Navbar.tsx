// components/Navbar.tsx
"use client"; 
import React, { useEffect, useReducer, useState, useCallback, useRef} from "react";
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
}

interface BookResult {
    title: string;
    author_name?: string[];
    language?: string[];
    cover_i?: number;
}

interface MovieResult {
    id: number;
    title: string;
    release_date?: string;
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
    const pathname = usePathname(); // Get current route
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchCategory, setSearchCategory] = useState<"books" | "movies" | "music">("books");

    const { openDropdown, selectedMedia } = state;

    const searchCache = useRef(new Map<string, SearchResult[]>());

    const router = useRouter(); // Use Next.js router

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
            let apiUrl = ""; 
            if (searchCategory === "books") {
                apiUrl = `https://openlibrary.org/search.json?title=${trimmedQuery}&language=eng&fields=key,title,author_name,cover_i,language&limit=10`;
            } else if (searchCategory === "movies") {
                apiUrl = `https://api.themoviedb.org/3/search/movie?query=${trimmedQuery}&api_key=YOUR_TMDB_API_KEY`;
            } else if (searchCategory === "music") {
                apiUrl = `https://api.musicdatabase.com/search?track=${trimmedQuery}&api_key=YOUR_MUSIC_API_KEY`;
            }

            const response = await fetch(apiUrl);
            const data = await response.json();

            let filteredResults: SearchResult[] = [];
            if (searchCategory === "books") {
                filteredResults = data.docs
                .filter((doc: BookResult) => doc.language?.includes("eng"))
                .map((result: BookResult) => ({
                    ...result,
                    author_name: result.author_name?.slice(0, 1),
                }));

            } else if (searchCategory === "movies") {
                filteredResults = data.results.map((movie: MovieResult) => ({
                    key: `movie-${movie.id}`,
                    title: movie.title,
                    author_name: movie.release_date ? [movie.release_date.split("-")[0]] : [],
                    cover_i: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : undefined,
                }));
            } else if (searchCategory === "music") {
                filteredResults = data.tracks.map((track: MusicResult) => ({
                    key: `music-${track.id}`,
                    title: track.name,
                    author_name: track.artists.map((artist) => artist.name),
                    cover_i: track.album.cover_url,
                }));
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

    const handleSelectMedia = (option: "Books" | "Movies" | "Music") => {
        dispatch({ type: "SET_SELECTED_MEDIA", option });

        // Map the media selection to lowercase route names
        const mediaRoute = option.toLowerCase();

        // Ensure that if we are on the timeline page, we do not change the route
        if (pathname === "/timeline") {
            return; // Do nothing if the user is on the Timeline page
        }

        if (pathname === "/home") {
            return;
        }

        if (pathname === "/for-you") {
            return;
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
        switch (option) {
            case "Books":
                setSearchCategory("books");
                break;
            case "Movies":
                setSearchCategory("movies");
                break;
            case "Music":
                setSearchCategory("music");
                break;
        }
    };    

    if (!isClient) {
        // Avoid rendering on the server to prevent hydration errors
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
                                    key={`/${selectedMedia.toLowerCase()}/${result.key.split('/').pop()}`}
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
