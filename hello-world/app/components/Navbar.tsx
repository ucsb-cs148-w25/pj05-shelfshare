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
    isAuthor?: boolean; // Flag to identify if this is an author result
    relevanceScore?: number; // Score for sorting by relevance
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
    const [currentPage, setCurrentPage] = useState(1);
    const [showDropdown, setShowDropdown] = useState(false);
    const resultsPerPage = 7;
    const maxPages = 4;

    const { openDropdown } = state;
    const searchCache = useRef(new Map<string, SearchResult[]>());
    const searchInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Calculate relevance score based on query match
    const calculateRelevanceScore = (result: SearchResult, query: string): number => {
        const queryLower = query.toLowerCase();
        const titleLower = result.title.toLowerCase();
        const authorLower = result.author_name?.[0]?.toLowerCase() || "";
        
        let score = 0;
        
        // Exact title match (highest priority)
        if (titleLower === queryLower) {
            score += 100;
        }
        // Title contains query as a complete word
        else if (new RegExp(`\\b${queryLower}\\b`).test(titleLower)) {
            score += 80;
        }
        // Title starts with query
        else if (titleLower.startsWith(queryLower)) {
            score += 70;
        }
        // Title contains query
        else if (titleLower.includes(queryLower)) {
            score += 50;
        }
        
        // Exact author match
        if (authorLower === queryLower) {
            score += 90;
        }
        // Author contains query as a complete word
        else if (new RegExp(`\\b${queryLower}\\b`).test(authorLower)) {
            score += 70;
        }
        // Author starts with query
        else if (authorLower.startsWith(queryLower)) {
            score += 60;
        }
        // Author contains query
        else if (authorLower.includes(queryLower)) {
            score += 40;
        }
        
        // Add a small bonus for popularity
        score += Math.min((result.edition_count || 0) / 100, 10);
        
        return score;
    };

    // Fetch function with improved relevance scoring
    const fetchSearchResults = useCallback(async (query: string) => {
        const trimmedQuery = query.trim().toLowerCase();
        if (!trimmedQuery) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        // Check cache first for faster response
        const cachedResults = searchCache.current.get(trimmedQuery);
        if (cachedResults) {
            setSearchResults(cachedResults);
            setCurrentPage(1);
            setShowDropdown(true);
            return;
        }

        setIsSearching(true);
        try {
            // Reduce the API call limit for faster response, we'll filter client-side
            const limit = 50; // Get more results initially for better filtering
            
            // Search by title
            const titleApiUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(trimmedQuery)}&language=eng&fields=key,title,author_name,cover_i,language,edition_count&limit=${limit}`;
            
            // Search by author
            const authorApiUrl = `https://openlibrary.org/search.json?author=${encodeURIComponent(trimmedQuery)}&language=eng&fields=key,title,author_name,cover_i,language,edition_count&limit=${limit}`;

            // Perform both searches in parallel for speed
            const [titleResponse, authorResponse] = await Promise.all([
                fetch(titleApiUrl),
                fetch(authorApiUrl)
            ]);

            const titleData = await titleResponse.json();
            const authorData = await authorResponse.json();

            // Process title search results
            let titleResults: SearchResult[] = titleData.docs
                .filter((doc: SearchResult) => doc.language?.includes("eng"))
                .map((result: SearchResult) => ({
                    key: result.key,
                    title: result.title,
                    author_name: result.author_name?.slice(0, 1),
                    cover_i: result.cover_i,
                    edition_count: result.edition_count || 1,
                    isAuthor: false
                }));

            // Process author search results
            let authorResults: SearchResult[] = authorData.docs
                .filter((doc: SearchResult) => doc.language?.includes("eng"))
                .map((result: SearchResult) => ({
                    key: result.key,
                    title: result.title,
                    author_name: result.author_name?.slice(0, 1),
                    cover_i: result.cover_i,
                    edition_count: result.edition_count || 1,
                    isAuthor: true
                }));

            // Combine results, removing duplicates
            const allResults = [...titleResults, ...authorResults];
            const seen = new Set();
            let filteredResults = allResults.filter((book) => {
                const identifier = `${book.title.toLowerCase()}|${book.author_name?.[0]?.toLowerCase() || ''}`;
                if (seen.has(identifier)) {
                    return false;
                }
                seen.add(identifier);
                return true;
            });

            // Apply relevance scoring for better results
            filteredResults = filteredResults.map(result => {
                return {
                    ...result,
                    relevanceScore: calculateRelevanceScore(result, trimmedQuery)
                };
            });

            // Only keep relevant results (with a minimum score)
            filteredResults = filteredResults.filter(result => result.relevanceScore! > 20);

            // Sort by relevance score (highest first)
            filteredResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

            // Limit to total results for all pages
            filteredResults = filteredResults.slice(0, maxPages * resultsPerPage);

            // Update cache
            searchCache.current.set(trimmedQuery, filteredResults);
            setSearchResults(filteredResults);
            setCurrentPage(1);
            setShowDropdown(true);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Much faster debounce (reduced from 200ms to 100ms)
    const debouncedSearch = useCallback(
        debounce((query: string) => fetchSearchResults(query), 100),
        [fetchSearchResults]
    );

    // Handle click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current && 
                !dropdownRef.current.contains(event.target as Node) &&
                searchInputRef.current && 
                !searchInputRef.current.contains(event.target as Node)
            ) {
                setShowDropdown(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        dispatch({ type: "CLOSE_DROPDOWNS" });
    }, [pathname]);

    // Handle focus on search input - immediately search with current text
    const handleSearchFocus = () => {
        if (searchQuery.trim()) {
            fetchSearchResults(searchQuery);
        }
    };

    const handleSelectBook = () => {
        setShowDropdown(false);
    };

    const toggleDropdown = (dropdown: string) => {
        dispatch({ type: "TOGGLE_DROPDOWN", dropdown });
    };

    // Calculate pagination
    const totalPages = Math.min(
        Math.ceil(searchResults.length / resultsPerPage),
        maxPages
    );
    
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = Math.min(startIndex + resultsPerPage, searchResults.length);
    const currentResults = searchResults.slice(startIndex, endIndex);

    const goToNextPage = (e: React.MouseEvent) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const goToPrevPage = (e: React.MouseEvent) => {
        e.preventDefault();
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
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
                {/* Search bar section */}
                <div className="relative">
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search by title or author..."
                    className="search-bar text-gray-900 bg-white"
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        debouncedSearch(e.target.value);
                    }}
                    onFocus={handleSearchFocus}
                />

                {/* Search results dropdown */}
                {showDropdown && searchResults.length > 0 && (
                    <div 
                        ref={dropdownRef}
                        className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-md mt-1 z-50 border border-gray-200 search-results-dropdown"
                    >
                        {/* Results section */}
                        {currentResults.map((result) => (
                            <Link
                            key={result.key}
                            href={`/books/${result.key.split('/').pop()}`}
                            className="flex items-center p-4 hover:bg-gray-50 transition-colors gap-4"
                            onClick={handleSelectBook}
                            >
                            {result.cover_i ? (
                                <Image
                                src={`https://covers.openlibrary.org/b/id/${result.cover_i}-S.jpg`}
                                alt={result.title}
                                width={15} height={30}
                                className="w-10 h-14 object-cover flex-shrink-0"
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
                                {Array.isArray(result.author_name) && result.author_name.length > 0 && (
                                <div className="text-sm text-gray-600 truncate mt-1">
                                    by {result.author_name[0]}
                                    {result.isAuthor && " ★"}
                                </div>
                                )}
                            </div>
                            </Link>
                        ))}

                        {/* Pagination controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center p-3 border-t border-gray-200">
                                <button 
                                    onClick={goToPrevPage}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1 rounded ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button 
                                    onClick={goToNextPage}
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-1 rounded ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Only show "Searching..." if there's an active query and results are still loading */}
                {isSearching && searchQuery.trim() && (
                    <div className="absolute top-full left-0 right-0 bg-white p-3 text-gray-500">
                    Searching...
                    </div>
                )}
                </div>

                {/* Navigation Links */}
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