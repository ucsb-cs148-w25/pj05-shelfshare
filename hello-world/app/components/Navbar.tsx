// components/Navbar.tsx
"use client"; 
import React, { useEffect, useReducer, useState, useCallback} from "react";
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

    // Fetch function with language filtering and author limitation
    const fetchSearchResults = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        
        setIsSearching(true);
        try {
            const response = await fetch(
                `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&language=eng`
            );
            const data: ApiResponse = await response.json();
            
            const filteredResults = data.docs
              .filter(doc => 
                doc.language?.includes('eng') || 
                doc.title?.match(/[a-zA-Z]/)
              )
              .slice(0, 5)
              .map(result => ({
                ...result,
                author_name: result.author_name?.slice(0, 1)
              }));

            setSearchResults(filteredResults);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Debounced search with dependency
    const debouncedSearch = useCallback(
        debounce((query: string) => fetchSearchResults(query), 500),
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
                <Link href="/">
                    <img src="/logo.png" alt="ShelfShare Logo" className="h-8 w-8" />
                </Link>
            </div>

            <div className="nav-items">
                {/* Search bar section */}
                <div className="relative">
                    <input
                    type="text"
                    placeholder="Search books..."
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
                    <div className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-md mt-1 z-50">
                        {searchResults.map((result) => (
                        <Link
                            key={result.key}
                            href={`/books/${result.key.split('/').pop()}`}
                            className="flex items-center p-3 hover:bg-gray-100 transition-colors"
                        >
                            {result.cover_i && (
                            <img
                                src={`https://covers.openlibrary.org/b/id/${result.cover_i}-S.jpg`}
                                alt={result.title}
                                className="w-8 h-12 mr-4 object-cover"
                            />
                            )}
                            <div className="ml-4 flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                                {result.title}
                            </div>
                            {result.author_name?.length > 0 && (
                                <div className="text-sm text-gray-600 truncate">
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

                {/* Rest of nav items */}
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
                        <span className="material-icons-outlined text-3xl">account_circle</span>
                        <span className="material-icons-outlined">expand_more</span>
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










// CHANGES I WANT TO MAKE: 
// - filter results to show english 
// - more room between cover img and book title 
// - want search dropdown to be white bg with black text








// // components/Navbar.tsx
// "use client"; 
// import React, { useEffect, useReducer, useState, useCallback} from "react";
// import Link from "next/link";
// import { usePathname } from 'next/navigation';
// import debounce from 'lodash.debounce'; // Add this package - npm install lodash.debounce

// // Interfaces for search results
// interface SearchResult {
//     key: string;
//     title: string;
//     author_name?: string[];
//     cover_i?: number;
// }
  
// interface ApiResponse {
//     docs: SearchResult[];
// }

// // Define action types
// type Action =
//     | { type: "TOGGLE_DROPDOWN"; dropdown: string }
//     | { type: "CLOSE_DROPDOWNS" };

// // Define the state type
// type State = {
//     openDropdown: string | null;
// };

// // Initial state
// const initialState: State = {
//     openDropdown: null,
// };

// // Reducer function
// const reducer = (state: State, action: Action): State => {
//     switch (action.type) {
//         case "TOGGLE_DROPDOWN":
//             return {
//                 openDropdown: state.openDropdown === action.dropdown ? null : action.dropdown,
//             };
//         case "CLOSE_DROPDOWNS":
//             return {
//                 openDropdown: null,
//             };
//         default:
//             return state;
//     }
// };

// const Navbar: React.FC = () => {
//     // Keep ALL hooks at the top unconditionally -> or could get errors
//     const [state, dispatch] = useReducer(reducer, initialState);
//     const [isClient, setIsClient] = useState(false);
//     const pathname = usePathname(); // Get current route
//     const [searchQuery, setSearchQuery] = useState("");
//     const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
//     const [isSearching, setIsSearching] = useState(false);

//     // Destructure state 
//     const { openDropdown } = state;

//     // Define fetchSearchResults with useCallback FIRST
//     const fetchSearchResults = useCallback(async (query: string) => {
//         if (!query.trim()) {
//             setSearchResults([]);
//             return;
//         }
        
//         setIsSearching(true);
//         try {
//             const response = await fetch(
//                 `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`
//             );
//             const data: ApiResponse = await response.json();
//             setSearchResults(data.docs.slice(0, 7));
//         } catch (error) {
//             console.error("Search error:", error);
//         } finally {
//             setIsSearching(false);
//         }
//     }, []); // Empty array because state setters are stable


//     // Other hooks (useCallback, useEffect)
//     const debouncedSearch = useCallback(
//     debounce((query: string) => fetchSearchResults(query), 500),
//     []
//     );
    
//     useEffect(() => {
//         setIsClient(true);
//     }, []);

//     useEffect(() => {
//         dispatch({ type: "CLOSE_DROPDOWNS" }); // Close dropdowns on route change
//     }, [pathname]);

//     if (!isClient) {
//         // Avoid rendering on the server to prevent hydration errors
//         return null;
//     }
      

//     const toggleDropdown = (dropdown: string) => {
//         dispatch({ type: "TOGGLE_DROPDOWN", dropdown });
//     };

//     return (
//         <nav className="navbar-container">
//             <div className="logo-container">
//                 <Link href="/">
//                     <img src="/logo.png" alt="ShelfShare Logo" className="h-8 w-8" />
//                 </Link>
//             </div>

//             <div className="nav-items">
            
//                 {/* Search bar API addition */}
//                 <div className="relative">
//                     <input
//                     type="text"
//                     placeholder="Search books..."
//                     className="search-bar"
//                     value={searchQuery}
//                     onChange={(e) => {
//                         setSearchQuery(e.target.value);
//                         debouncedSearch(e.target.value);
//                     }}
//                     onBlur={() => setTimeout(() => setSearchResults([]), 200)}
//                     />
                    
//                     {/* Search results dropdown */}
//                     {searchResults.length > 0 && (
//                     <div className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-md mt-1 z-50">
//                         {searchResults.map((result) => (
//                         <Link
//                             key={result.key}
//                             href={`/books/${result.key.split('/').pop()}`}
//                             className="flex items-center p-3 hover:bg-gray-100 transition-colors"
//                         >
//                             {result.cover_i && (
//                             <img
//                                 src={`https://covers.openlibrary.org/b/id/${result.cover_i}-S.jpg`}
//                                 alt={result.title}
//                                 className="w-8 h-12 mr-3 object-cover"
//                             />
//                             )}
//                             <div>
//                             <div className="font-medium">{result.title}</div>
//                             {result.author_name && (
//                                 <div className="text-sm text-gray-600">
//                                 by {result.author_name.join(', ')}
//                                 </div>
//                             )}
//                             </div>
//                         </Link>
//                         ))}
//                     </div>
//                     )}
                    
//                     {/* Loading indicator */}
//                     {isSearching && (
//                     <div className="absolute top-full left-0 right-0 bg-white p-3 text-gray-500">
//                         Searching...
//                     </div>
//                     )}
//                 </div>
//                 {/* End of Search bar API */}


//                 <div className="relative">
//                     <button 
//                         className="nav-link flex items-center"
//                         onClick={() => toggleDropdown("media")}
//                     >
//                         Media <span className="material-icons-outlined ml-1">expand_more</span>
//                     </button>

//                     {openDropdown === "media" && (
//                         <div className="dropdown-menu">
//                             <Link href="/books" className="dropdown-item">Books</Link>
//                             <Link href="/movies" className="dropdown-item">Movies</Link>
//                             <Link href="/music" className="dropdown-item">Music</Link>
//                         </div>
//                     )}
//                 </div>

//                 <Link href="/browse" className="nav-link">Browse</Link>
//                 <Link href="/timeline" className="nav-link">Timeline</Link>
//                 <Link href="/my-shelf" className="nav-link">My Shelf</Link>

//                 <div className="relative">
//                     <button 
//                         className="nav-link flex items-center"
//                         onClick={() => toggleDropdown("profile")}
//                     >
//                         <span className="material-icons-outlined text-3xl">account_circle expand_more</span>
//                     </button>

//                     {openDropdown === "profile" && (
//                         <div className="dropdown-menu">
//                             <Link href="/profile" className="dropdown-item">Profile</Link>
//                             <Link href="/friends" className="dropdown-item">Friends</Link>
//                             <Link href="/settings" className="dropdown-item">Settings</Link>
//                             <Link href="/logout" className="dropdown-item">Logout</Link>
//                         </div>
//                     )}
//                 </div>
//             </div>
//         </nav>
//     );
// };

// export default Navbar;
