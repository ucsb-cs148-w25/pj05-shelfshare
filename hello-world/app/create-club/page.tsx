'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useCallback, useRef } from 'react';
import { db, storage } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuth } from '@/app/context/AuthContext';
import debounce from 'lodash/debounce';

interface Chapter {
  title: string;
  deadline: string; // ISO string format
}

interface Book {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  edition_count?: number;
}

interface SearchResult {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  language?: string[];
  edition_count?: number;
}

export default function CreateClub() {
  const router = useRouter();
  const { user } = useAuth();
  const [clubName, setClubName] = useState<string>('');
  const [clubDescription, setClubDescription] = useState<string>('');
  const [clubImage, setClubImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [newChapterTitle, setNewChapterTitle] = useState<string>('');
  const [newChapterDeadline, setNewChapterDeadline] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Book search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const searchCache = useRef(new Map<string, SearchResult[]>());

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size must be less than 5MB.');
        return;
      }
      setError(null);
      setClubImage(file);
      setPreviewImage(URL.createObjectURL(file)); // Generate a preview URL
    }
  };

  const handleAddChapter = () => {
    if (newChapterTitle && newChapterDeadline) {
      setChapters([
        ...chapters,
        {
          title: newChapterTitle,
          deadline: newChapterDeadline.toISOString(),
        },
      ]);
      setNewChapterTitle('');
      setNewChapterDeadline(null);
    }
  };

  // Book search functionality
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

  const debouncedSearch = useCallback(
    debounce((query: string) => fetchSearchResults(query), 300),
    [fetchSearchResults]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowResults(query.length > 0);
    debouncedSearch(query);
  };

  const handleSelectBook = (book: SearchResult) => {
    setSelectedBook({
      key: book.key,
      title: book.title,
      author_name: book.author_name,
      cover_i: book.cover_i,
      edition_count: book.edition_count
    });
    setSearchQuery('');
    setShowResults(false);
  };

  const handleBookClick = (bookKey: string) => {
    // Navigate to book page
    router.push(`/books/${bookKey.split('/').pop()}`);
  };

  const handleRemoveBook = () => {
    setSelectedBook(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
  
    try {
      let imageUrl = '/bookclub.png'; // Default image URL
  
      // Upload custom image to Firebase Storage if provided
      if (clubImage) {
        try {
          console.log('Starting image upload...');
          const uniqueFileName = `${user?.uid}_${Date.now()}_${clubImage.name.replace(/\s+/g, '_')}`;
          const storageRef = ref(storage, `club-images/${uniqueFileName}`);
          console.log('Uploading bytes...');
          await uploadBytes(storageRef, clubImage);
          console.log('Getting download URL...');
          imageUrl = await getDownloadURL(storageRef);
          console.log('Image uploaded successfully:', imageUrl);
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          // Continue with default image instead of failing completely
          setError('Image upload failed, using default image instead.');
          imageUrl = '/bookclub.png';
        }
      }
  
      // Save club data to Firestore
      console.log('Creating club document with image:', imageUrl);
      const clubData = {
        name: clubName,
        description: clubDescription,
        memberCount: 1,
        imageUrl: imageUrl,
        chapters: chapters,
        creatorId: user?.uid,
        book: selectedBook ? {
          key: selectedBook.key,
          title: selectedBook.title,
          author: selectedBook.author_name?.[0] || 'Unknown',
          coverId: selectedBook.cover_i,
        } : null,
      };
  
      const docRef = await addDoc(collection(db, 'clubs'), clubData);
      console.log('Club created with ID:', docRef.id);
  
      // Redirect to the specific club's page
      router.push(`/clubs/${docRef.id}`);
    } catch (error) {
      console.error('Error creating club:', error);
      setError('Failed to create club. Please try again.');
      setLoading(false); // Make sure to reset loading state on error
    }
  };

  return (
    <div className="bg-[#5A7463] min-h-screen p-8 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-[#DFDDCE] p-6 rounded-lg shadow-lg w-full max-w-md"
      >
        <h2 className="text-2xl font-bold text-[#3D2F2A] mb-4">Create a Book Club</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="space-y-4">
          <div>
            <label className="block text-lg font-bold text-[#3D2F2A]">Club Name</label>
            <input
              type="text"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[#92A48A] text-[#3D2F2A]"
              required
            />
          </div>
          <div>
            <label className="block text-lg font-bold text-[#3D2F2A]">Description</label>
            <textarea
              value={clubDescription}
              onChange={(e) => setClubDescription(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[#92A48A] text-[#3D2F2A]"
              required
            />
          </div>
          <div>
            <label className="block text-lg font-bold text-[#3D2F2A]">Club Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full px-4 py-2 rounded-lg bg-[#92A48A] text-[#3D2F2A]"
            />
            {previewImage && (
              <div className="mt-4">
                <img
                  src={previewImage}
                  alt="Club Preview"
                  className="w-32 h-32 object-cover rounded-lg"
                />
              </div>
            )}
          </div>
          
          {/* Book Search Section */}
          <div>
            <label className="block text-lg font-bold text-[#3D2F2A]">Select Book</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search for a book by title"
                className="w-full px-4 py-2 rounded-lg bg-[#92A48A] text-[#3D2F2A] placeholder:text-[#3D2F2A]/55"
              />
              
              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-[#DFDDCE] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div 
                      key={result.key}
                      onClick={() => handleSelectBook(result)}
                      className="p-2 border-b border-[#92A48A] hover:bg-[#92A48A] cursor-pointer"
                    >
                      <div className="flex items-center">
                        {result.cover_i ? (
                          <img 
                            src={`https://covers.openlibrary.org/b/id/${result.cover_i}-S.jpg`} 
                            alt={result.title}
                            className="w-10 h-12 object-cover mr-2"
                          />
                        ) : (
                          <div className="w-10 h-12 bg-[#3D2F2A] flex items-center justify-center text-[#DFDDCE] mr-2">
                            No Cover
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-[#3D2F2A]">{result.title}</p>
                          <p className="text-sm text-[#3D2F2A]/70">
                            {result.author_name?.[0] || 'Unknown author'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin h-5 w-5 border-2 border-[#3D2F2A] border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
            
            {/* Selected Book Display */}
            {selectedBook && (
              <div className="mt-4 p-3 bg-[#92A48A]/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    {selectedBook.cover_i ? (
                      <img 
                        src={`https://covers.openlibrary.org/b/id/${selectedBook.cover_i}-M.jpg`} 
                        alt={selectedBook.title}
                        className="w-16 h-20 object-cover mr-3 rounded"
                        onClick={() => handleBookClick(selectedBook.key)}
                      />
                    ) : (
                      <div 
                        className="w-16 h-20 bg-[#3D2F2A] flex items-center justify-center text-[#DFDDCE] mr-3 rounded cursor-pointer"
                        onClick={() => handleBookClick(selectedBook.key)}
                      >
                        No Cover
                      </div>
                    )}
                    <div>
                      <h3 
                        className="font-bold text-[#3D2F2A] cursor-pointer hover:underline"
                        onClick={() => handleBookClick(selectedBook.key)}
                      >
                        {selectedBook.title}
                      </h3>
                      <p className="text-[#3D2F2A]/80">
                        {selectedBook.author_name?.[0] || 'Unknown author'}
                      </p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleRemoveBook}
                    className="text-[#3D2F2A] hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-lg font-bold text-[#3D2F2A]">Add Chapters</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                placeholder="Chapter Title"
                className="w-full px-4 py-2 rounded-lg bg-[#92A48A] text-[#3D2F2A] placeholder:text-[#3D2F2A]/55"
              />
              <DatePicker
                selected={newChapterDeadline}
                onChange={(date: Date | null) => setNewChapterDeadline(date)}
                placeholderText="Deadline"
                className="w-full px-4 py-2 rounded-lg bg-[#92A48A] text-[#3D2F2A] placeholder:text-[#3D2F2A]/55"
                dateFormat="yyyy/MM/dd"
              />
              <button
                type="button"
                onClick={handleAddChapter}
                className="bg-[#3D2F2A] text-[#DFDDCE] px-4 py-2 rounded-lg"
              >
                Add
              </button>
            </div>
            <ul className="mt-2">
              {chapters.map((chapter, index) => (
                <li key={index} className="text-[#3D2F2A]">
                  <strong>{chapter.title}</strong> - Due by{' '}
                  {new Date(chapter.deadline).toLocaleDateString()}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg bg-[#3D2F2A] text-[#DFDDCE] font-bold"
          >
            {loading ? 'Creating...' : 'Create Club'}
          </button>
        </div>
      </form>
    </div>
  );
}