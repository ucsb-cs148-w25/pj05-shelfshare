"use client";

import React, { useEffect, useReducer, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import debounce from 'lodash.debounce';

// Interface for search results
interface SearchResult {
    id: string;
    title: string;
    authors?: string[];
    imageLinks?: {
        thumbnail?: string;
        smallThumbnail?: string;
    };
    language?: string;
    publishedDate?: string;
    isbn?: string; // Used for OpenLibrary cover lookup
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

// Replace with your actual Google Books API Key
const GOOGLE_BOOKS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY || '';

const Navbar: React.FC = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [isClient, setIsClient] = useState(false);
    const pathname = usePathname();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [coverCache, setCoverCache] = useState<Record<string, string>>({});

    const { openDropdown } = state;
    const searchCache = useRef(new Map<string, SearchResult[]>());

    // Function to get ISBN from Google Books volume info
    const extractISBN = (volumeInfo: any): string => {
        if (!volumeInfo.industryIdentifiers || !volumeInfo.industryIdentifiers.length) {
            return '';
        }
        
        // Prefer ISBN_13 if available
        const isbn13 = volumeInfo.industryIdentifiers.find(
            (id: any) => id.type === 'ISBN_13'
        );
        
        const isbn10 = volumeInfo.industryIdentifiers.find(
            (id: any) => id.type === 'ISBN_10'
        );
        
        return isbn13?.identifier || isbn10?.identifier || '';
    };

    // Function to check if an OpenLibrary cover exists and update the cache
    const checkOpenLibraryCover = async (isbn: string): Promise<string | null> => {
        // Return from cache if we've already checked this ISBN
        if (coverCache[isbn]) {
            return coverCache[isbn];
        }
        
        try {
            // Try medium size first
            const response = await fetch(`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`, {
                method: 'HEAD'
            });
            
            if (response.ok) {
                // Add a cache buster to prevent browser caching
                const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?t=${Date.now()}`;
                setCoverCache(prev => ({ ...prev, [isbn]: coverUrl }));
                return coverUrl;
            }
            
            // If no cover found, cache this result too
            setCoverCache(prev => ({ ...prev, [isbn]: 'null' }));
            return null;
        } catch (error) {
            console.error("Error checking OpenLibrary cover:", error);
            return null;
        }
    };

    // Fetch function for Google Books API
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
            // Google Books API URL - filtering for English language books
            const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(trimmedQuery)}&langRestrict=en&maxResults=10&key=${GOOGLE_BOOKS_API_KEY}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (!data.items) {
                setSearchResults([]);
                return;
            }

            // Map Google Books response to our SearchResult interface
            const processedResults: SearchResult[] = data.items.map((item: any) => {
                const isbn = extractISBN(item.volumeInfo);
                
                return {
                    id: item.id,
                    title: item.volumeInfo.title || 'Unknown Title',
                    authors: item.volumeInfo.authors || ['Unknown Author'],
                    imageLinks: item.volumeInfo.imageLinks || {},
                    language: item.volumeInfo.language,
                    publishedDate: item.volumeInfo.publishedDate,
                    isbn: isbn
                };
            });

            // Filter English-language books and deduplicate by title+author
            let filteredResults = processedResults.filter(book => book.language === 'en');
            
            // Deduplicate by title and first author
            const seen = new Set();
            filteredResults = filteredResults.filter((book) => {
                const identifier = `${book.title.toLowerCase()}|${book.authors?.[0]?.toLowerCase() || ''}`;
                if (seen.has(identifier)) {
                    return false;
                }
                seen.add(identifier);
                return true;
            });

            // Update cache
            searchCache.current.set(trimmedQuery, filteredResults);
            setSearchResults(filteredResults);
            
            // Check OpenLibrary for book covers
            for (const book of filteredResults) {
                if (book.isbn) {
                    await checkOpenLibraryCover(book.isbn);
                }
            }
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Debounced search with dependency (200ms)
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
        setSearchQuery("");   // Optionally clear the search query too
    };

    const toggleDropdown = (dropdown: string) => {
        dispatch({ type: "TOGGLE_DROPDOWN", dropdown });
    };

    // Get book cover using OpenLibrary API first, fallback to Google Books
    const getBookCover = (result: SearchResult) => {
        // If we have the ISBN, try to use the OpenLibrary cover first
        if (result.isbn && coverCache[result.isbn] && coverCache[result.isbn] !== 'null') {
            return coverCache[result.isbn];
        }
        
        // Fallback to Google Books thumbnail
        return result.imageLinks?.thumbnail || result.imageLinks?.smallThumbnail || null;
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
                                    key={result.id}
                                    href={`/books/${result.id}`}
                                    className="flex items-center p-4 hover:bg-gray-50 transition-colors gap-4"
                                    onClick={handleSelectBook}
                                >
                                    {result.isbn && coverCache[result.isbn] && coverCache[result.isbn] !== 'null' ? (
                                        <Image
                                            src={coverCache[result.isbn]}
                                            alt={result.title}
                                            width={30} height={45}
                                            className="w-10 h-14 object-cover flex-shrink-0"
                                            unoptimized={true}
                                            priority={true}
                                        />
                                    ) : getBookCover(result) ? (
                                        <Image
                                            src={getBookCover(result)!}
                                            alt={result.title}
                                            width={30} height={45}
                                            className="w-10 h-14 object-cover flex-shrink-0"
                                            unoptimized={true}
                                            priority={true}
                                        />
                                    ) : (
                                        <div className="w-10 h-14 bg-gray-200 flex-shrink-0 flex items-center justify-center">
                                            <span className="text-gray-400 text-sm">No cover</span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 truncate text-base">
                                            {result.title}
                                        </div>
                                        {Array.isArray(result.authors) && result.authors.length > 0 && (
                                            <div className="text-sm text-gray-600 truncate mt-1">
                                                by {result.authors[0]}
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

                <Link href="/books/browse" className="nav-link">Browse</Link>
                <Link href="/clubs" className="nav-link">Book Club</Link>
                <Link href="/timeline" className="nav-link">Timeline</Link>
                <Link href="/books/my-shelf" className="nav-link">My Shelf</Link>
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
                            <Link href="/" className="dropdown-item">Logout</Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;