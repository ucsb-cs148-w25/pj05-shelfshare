'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { db } from "@/firebase";
import { collection, query, onSnapshot, Timestamp, deleteDoc, doc, updateDoc, addDoc, getDocs, where } from "firebase/firestore";
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';

interface BookItem {
  id: string;
  bookId: string;
  title: string;
  author: string;
  coverUrl: string;
  dateAdded: Timestamp | Date;
  shelfType?: string;
  dateFinished?: Date | null;
  isFromCustomShelf?: boolean;
  customShelfId?: string;
}

// Using the interface since ShelfSection refers to it and we need to export it for type safety
export interface CustomShelf {
  id: string;
  name: string;
  userId: string;
  dateCreated: Timestamp | Date;
}

interface ShelfSection {
  title: string;
  books: BookItem[];
  icon?: string;
  type: string;
  emptyMessage: string;
  isCustom?: boolean;
  id?: string;
}

export default function UserLists() {
  const { user } = useAuth();
  const router = useRouter();
  const [defaultShelves, setDefaultShelves] = useState<ShelfSection[]>([
    { 
      title: 'Favorites', 
      books: [], 
      icon: '❤️', 
      type: 'favorites',
      emptyMessage: "Mark your favorite books with the heart icon"
    },
    { 
      title: 'Currently Reading', 
      books: [], 
      type: 'currently-reading',
      emptyMessage: "Start tracking what you're reading"
    },
    { 
      title: 'Want to Read', 
      books: [], 
      type: 'want-to-read',
      emptyMessage: "Build your reading wishlist"
    },
    { 
      title: 'Finished Reading', 
      books: [], 
      type: 'finished',
      emptyMessage: "Your completed books will appear here"
    },
    { 
      title: 'Dropped', 
      books: [], 
      type: 'stopped-reading',
      emptyMessage: "Books you decided not to finish"
    }
  ]);
  
  const [customShelves, setCustomShelves] = useState<ShelfSection[]>([]);
  const [editModes, setEditModes] = useState<{ [key: string]: boolean }>({});
  const [draggedBook, setDraggedBook] = useState<BookItem | null>(null);
  const [isCreatingShelf, setIsCreatingShelf] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [editingShelfId, setEditingShelfId] = useState<string | null>(null);
  const [editingShelfName, setEditingShelfName] = useState('');
  const newShelfInputRef = useRef<HTMLInputElement>(null);
  const editShelfInputRef = useRef<HTMLInputElement>(null);
  const [customShelvesMap, setCustomShelvesMap] = useState<Map<string, { name: string, books: BookItem[] }>>(new Map());
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [scrollPositions, setScrollPositions] = useState<{ [key: string]: number }>({});
  const [maxScrolls, setMaxScrolls] = useState<{ [key: string]: number }>({});

  // Use this function to trigger a reload when needed
  const triggerReload = useCallback(() => {
    setReloadTrigger(prev => prev + 1);
  }, []);

  // Set up listeners for default shelves
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const unsubscribers: (() => void)[] = [];

    // Fetch favorites
    const favoritesQuery = query(collection(db, "users", user.uid, "favorites"));
    const unsubscribeFavorites = onSnapshot(favoritesQuery, (snapshot) => {
      const favoritesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dateAdded: doc.data().dateAdded instanceof Timestamp ? doc.data().dateAdded : new Date()
      })) as BookItem[];

      setDefaultShelves(prev => 
        prev.map(shelf => 
          shelf.type === 'favorites' ? { ...shelf, books: favoritesData } : shelf
        )
      );
    });
    unsubscribers.push(unsubscribeFavorites);

    // Fetch default shelves
    const shelvesQuery = query(collection(db, "users", user.uid, "shelves"));
    const unsubscribeShelves = onSnapshot(shelvesQuery, (snapshot) => {
      const shelvesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dateAdded: doc.data().dateAdded instanceof Timestamp ? doc.data().dateAdded : new Date(),
        dateFinished: doc.data().dateFinished || null,
      })) as BookItem[];

      // Update each default shelf type
      setDefaultShelves(prev => 
        prev.map(shelf => {
          if (shelf.type === 'favorites') return shelf;
          
          const filteredBooks = shelvesData.filter(book => book.shelfType === shelf.type);
          return { ...shelf, books: filteredBooks };
        })
      );
    });
    unsubscribers.push(unsubscribeShelves);

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [user, router, reloadTrigger]);

  // Set up listeners for custom shelves
  useEffect(() => {
    if (!user) return;

    const unsubscribers: (() => void)[] = [];

    // Listen to custom shelves collection
    const customShelvesQuery = query(collection(db, "users", user.uid, "customShelves"));
    const unsubscribeCustomShelves = onSnapshot(customShelvesQuery, async (snapshot) => {
      const newCustomShelvesMap = new Map<string, { name: string, books: BookItem[] }>();
      
      // Initialize map with all shelves (empty books arrays)
      snapshot.docs.forEach(doc => {
        newCustomShelvesMap.set(doc.id, {
          name: doc.data().name,
          books: []
        });
      });
      
      setCustomShelvesMap(newCustomShelvesMap);
      
      // Now set up listeners for each shelf's books
      snapshot.docs.forEach(shelfDoc => {
        const shelfId = shelfDoc.id;
        const shelfName = shelfDoc.data().name;
        
        const booksQuery = query(
          collection(db, "users", user.uid, "customShelfBooks"),
          where("shelfId", "==", shelfId)
        );
        
        const unsubscribeBooks = onSnapshot(booksQuery, (booksSnapshot) => {
          const books = booksSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            dateAdded: doc.data().dateAdded instanceof Timestamp ? doc.data().dateAdded : new Date(),
            isFromCustomShelf: true,
            customShelfId: shelfId
          })) as BookItem[];
          
          setCustomShelvesMap(prevMap => {
            const newMap = new Map(prevMap);
            // Merge with existing entry if it exists
            const existing = newMap.get(shelfId);
            if (existing) {
              newMap.set(shelfId, { ...existing, books });
            } else {
              newMap.set(shelfId, { name: shelfName, books });
            }
            return newMap;
          });
        });
        
        unsubscribers.push(unsubscribeBooks);
      });
    });
    
    unsubscribers.push(unsubscribeCustomShelves);

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [user, reloadTrigger]);

  // Convert customShelvesMap to array format for rendering
  useEffect(() => {
    const shelves: ShelfSection[] = [];
    
    customShelvesMap.forEach((value, key) => {
      shelves.push({
        id: key,
        title: value.name,
        books: value.books,
        type: `custom-${key}`,
        emptyMessage: "Add books to this shelf",
        isCustom: true
      });
    });
    
    setCustomShelves(shelves);
  }, [customShelvesMap]);

  useEffect(() => {
    if (isCreatingShelf && newShelfInputRef.current) {
      newShelfInputRef.current.focus();
    }
    
    if (editingShelfId && editShelfInputRef.current) {
      editShelfInputRef.current.focus();
    }
  }, [isCreatingShelf, editingShelfId]);

  // Set up scroll handling for each shelf
  useEffect(() => {
    const allShelves = [...defaultShelves, ...customShelves];
    
    allShelves.forEach(section => {
      const container = document.getElementById(`scroll-container-${section.type}`);
      if (container) {
        const handleScroll = () => {
          setScrollPositions(prev => ({
            ...prev,
            [section.type]: container.scrollLeft
          }));
          setMaxScrolls(prev => ({
            ...prev,
            [section.type]: container.scrollWidth - container.clientWidth
          }));
        };

        // Initialize scroll positions
        handleScroll();
        
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
      }
    });
  }, [defaultShelves, customShelves]);

  // Inside your component, add these style constants
  const leftShadowStyle: React.CSSProperties = {
    position: 'absolute',
    left: '40px',
    top: '0',
    height: '100%',
    width: '40px',
    background: 'linear-gradient(to right, rgba(90, 57, 44, 0.5), rgba(90, 57, 44, 0))',
    pointerEvents: 'none', // Correctly typed as a valid CSS value
    zIndex: 5,
    transition: 'opacity 0.3s ease',
  };
  
  const rightShadowStyle: React.CSSProperties = {
    position: 'absolute',
    right: '40px',
    top: '0',
    height: '100%',
    width: '40px',
    background: 'linear-gradient(to left, rgba(90, 57, 44, 0.5), rgba(90, 57, 44, 0))',
    pointerEvents: 'none', // Correctly typed as a valid CSS value
    zIndex: 5,
    transition: 'opacity 0.3s ease',
  };

  const toggleEditMode = (sectionType: string) => {
    setEditModes(prev => ({
      ...prev,
      [sectionType]: !prev[sectionType]
    }));
  };

  const scrollLeft = (sectionType: string) => {
    const container = document.getElementById(`scroll-container-${sectionType}`);
    if (container) {
      container.scrollBy({ left: -170, behavior: 'smooth' }); // Scroll by one book width
    }
  };

  const scrollRight = (sectionType: string) => {
    const container = document.getElementById(`scroll-container-${sectionType}`);
    if (container) {
      container.scrollBy({ left: 170, behavior: 'smooth' }); // Scroll by one book width
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (book: BookItem, e: React.DragEvent, isCustomShelf = false, customShelfId?: string) => {
    e.stopPropagation();
    
    // Make a copy of the book to avoid modifying the original state
    const dragBook = {...book};
    
    // Attach custom shelf info if it's from a custom shelf
    if (isCustomShelf && customShelfId) {
      dragBook.isFromCustomShelf = true;
      dragBook.customShelfId = customShelfId;
    }
    
    setDraggedBook(dragBook);
    
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedBook(null);
  };

  const handleDragOver = (e: React.DragEvent, sectionType: string) => {
    if (sectionType === 'favorites') {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.backgroundColor = 'rgba(61, 47, 42, 0.2)';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.backgroundColor = '';
    }
  };

  const handleDrop = async (targetShelfType: string, e: React.DragEvent, isCustomShelf = false, customShelfId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.backgroundColor = '';
    }
  
    if (!draggedBook || !user) return;
    
    // Don't allow dropping onto favorites
    if (targetShelfType === 'favorites') return;
    
    try {
      // Check if book is from a custom shelf
      const isFromCustomShelf = draggedBook.isFromCustomShelf;
      const sourceCustomShelfId = draggedBook.customShelfId;
      
      // Don't do anything if dropping onto the same shelf
      if (!isCustomShelf && !isFromCustomShelf && draggedBook.shelfType === targetShelfType) return;
      if (isCustomShelf && isFromCustomShelf && sourceCustomShelfId === customShelfId) return;
      
      console.log("Dropping book:", draggedBook);
      console.log("Target shelf:", isCustomShelf ? `custom-${customShelfId}` : targetShelfType);
      
      if (isCustomShelf && customShelfId) {
        // Handle dropping to custom shelf
        
        // Check if book already exists in this custom shelf
        const existingBookQuery = query(
          collection(db, "users", user.uid, "customShelfBooks"),
          where("bookId", "==", draggedBook.bookId),
          where("shelfId", "==", customShelfId)
        );
        
        const existingBookSnapshot = await getDocs(existingBookQuery);
        
        // Only add if book doesn't already exist in this custom shelf
        if (existingBookSnapshot.empty) {
          console.log("Adding to custom shelf:", customShelfId);
          
          // Add to custom shelf collection
          await addDoc(collection(db, "users", user.uid, "customShelfBooks"), {
            bookId: draggedBook.bookId,
            title: draggedBook.title,
            author: draggedBook.author,
            coverUrl: draggedBook.coverUrl,
            shelfId: customShelfId,
            dateAdded: new Date()
          });
          
          // If coming from another custom shelf, delete from that shelf
          if (isFromCustomShelf && sourceCustomShelfId) {
            console.log("Removing from source custom shelf:", sourceCustomShelfId);
            
            const customBooksQuery = query(
              collection(db, "users", user.uid, "customShelfBooks"),
              where("bookId", "==", draggedBook.bookId),
              where("shelfId", "==", sourceCustomShelfId)
            );
            
            const querySnapshot = await getDocs(customBooksQuery);
            for (const doc of querySnapshot.docs) {
              await deleteDoc(doc.ref);
            }
          } 
          // We don't remove from default shelf if moving to a custom shelf
        }
      }
      else {
        // Handle dropping to default shelf
        console.log("Adding to default shelf:", targetShelfType);
        
        // Check if book already exists in shelves
        const existingInShelvesQuery = query(
          collection(db, "users", user.uid, "shelves"),
          where("bookId", "==", draggedBook.bookId)
        );
        
        const existingInShelvesSnapshot = await getDocs(existingInShelvesQuery);
        
        if (existingInShelvesSnapshot.empty) {
          // Add to default shelves if it doesn't exist
          await addDoc(collection(db, "users", user.uid, "shelves"), {
            bookId: draggedBook.bookId,
            title: draggedBook.title,
            author: draggedBook.author,
            coverUrl: draggedBook.coverUrl,
            shelfType: targetShelfType,
            dateAdded: new Date(),
            dateFinished: targetShelfType === 'finished' ? new Date() : null,
          });
        } else {
          // Update existing entry in default shelves
          const bookRef = doc(db, "users", user.uid, "shelves", existingInShelvesSnapshot.docs[0].id);
          await updateDoc(bookRef, {
            shelfType: targetShelfType,
            dateFinished: targetShelfType === 'finished' ? new Date() : null,
          });
        }
        
        // If coming from a custom shelf, remove from custom shelf automatically
        if (isFromCustomShelf && sourceCustomShelfId) {
          console.log("Removing from source custom shelf:", sourceCustomShelfId);
          
          const customBooksQuery = query(
            collection(db, "users", user.uid, "customShelfBooks"),
            where("bookId", "==", draggedBook.bookId),
            where("shelfId", "==", sourceCustomShelfId)
          );
          
          const querySnapshot = await getDocs(customBooksQuery);
          for (const doc of querySnapshot.docs) {
            await deleteDoc(doc.ref);
          }
        }
      }
      
      // Force reload after drag/drop
      triggerReload();
      
    } catch (error) {
      console.error("Error moving book:", error);
    }
  };

  const deleteBook = async (book: BookItem, sectionType: string, isCustom = false, customShelfId?: string) => {
    if (!user) return;
    
    try {
      if (isCustom && customShelfId) {
        // Delete from custom shelf
        console.log("Deleting from custom shelf:", customShelfId, "Book ID:", book.bookId);
        
        const customBooksQuery = query(
          collection(db, "users", user.uid, "customShelfBooks"),
          where("bookId", "==", book.bookId),
          where("shelfId", "==", customShelfId)
        );
        
        const querySnapshot = await getDocs(customBooksQuery);
        
        console.log(`Found ${querySnapshot.docs.length} books to delete`);
        
        // Need to cleanup all matched documents
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      } else if (sectionType === 'favorites') {
        // Delete from favorites collection
        await deleteDoc(doc(db, "users", user.uid, "favorites", book.id));
      } else {
        // Delete from default shelves collection
        await deleteDoc(doc(db, "users", user.uid, "shelves", book.id));
      }
      
      // Force reload after deletion
      triggerReload();
    } catch (error) {
      console.error("Error deleting book:", error);
    }
  };

  const createCustomShelf = async () => {
    if (!user || !newShelfName.trim()) return;
    
    try {
      await addDoc(collection(db, "users", user.uid, "customShelves"), {
        name: newShelfName.trim(),
        userId: user.uid,
        dateCreated: new Date()
      });
      
      setNewShelfName('');
      setIsCreatingShelf(false);
      
      // Force refresh after creating a new shelf
      triggerReload();
    } catch (error) {
      console.error("Error creating custom shelf:", error);
    }
  };

  const startEditingShelf = (shelfId: string, shelfName: string) => {
    setEditingShelfId(shelfId);
    setEditingShelfName(shelfName);
  };

  const saveShelfEdit = async () => {
    if (!user || !editingShelfId || !editingShelfName.trim()) return;
    
    try {
      const shelfRef = doc(db, "users", user.uid, "customShelves", editingShelfId);
      await updateDoc(shelfRef, {
        name: editingShelfName.trim()
      });
      
      setEditingShelfId(null);
      setEditingShelfName('');
      
      // Force refresh after editing a shelf
      triggerReload();
    } catch (error) {
      console.error("Error updating custom shelf:", error);
    }
  };

  const deleteCustomShelf = async (shelfId: string, shelfName: string) => {
    if (!user) return;
    
    // Show confirmation dialog
    const confirmation = window.confirm(`Are you sure you want to delete the shelf "${shelfName}"? All books in this shelf will be removed from it.`);
    
    if (!confirmation) {
      // User cancelled the deletion
      return;
    }
    
    try {
      // Delete the shelf
      await deleteDoc(doc(db, "users", user.uid, "customShelves", shelfId));
      
      // Delete all books in this shelf
      const customBooksQuery = query(
        collection(db, "users", user.uid, "customShelfBooks"),
        where("shelfId", "==", shelfId)
      );
      
      const querySnapshot = await getDocs(customBooksQuery);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Force refresh after deleting a shelf
      triggerReload();
    } catch (error) {
      console.error("Error deleting custom shelf:", error);
      alert("Failed to delete shelf");
    }
  };

  if (!user) return null;

  const allShelves = [...defaultShelves, ...customShelves];

  return (
    <div className="bg-[#5A7463] min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Custom Shelves Management */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h2 className="text-custom-tan text-3xl font-bold">My Shelves</h2>
            <button onClick={() => setIsCreatingShelf(true)} className="bg-custom-brown text-custom-tan px-4 py-2 rounded-lg hover:bg-light-brown transition-colors flex items-center">
              <Plus className="mr-2" /> Create New Shelf
            </button>
          </div>
          {isCreatingShelf && (
            <div className="mt-4 flex items-center bg-light-brown p-3 rounded-lg">
              <input ref={newShelfInputRef} type="text" value={newShelfName} onChange={(e) => setNewShelfName(e.target.value)} placeholder="Enter shelf name..." className="bg-custom-tan text-custom-brown p-2 rounded flex-grow" maxLength={30} />
              <button onClick={createCustomShelf} className="ml-2 bg-custom-brown text-custom-tan p-2 rounded hover:bg-opacity-80">
                <Check className="w-5 h-5" />
              </button>
              <button onClick={() => { setIsCreatingShelf(false); setNewShelfName(''); }} className="ml-1 bg-light-brown text-custom-tan p-2 rounded hover:bg-opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
        {allShelves.map((section) => (
          <div key={section.type}>
            <div className="flex justify-between items-center mb-4">
              {section.isCustom && editingShelfId === section.id ? (
                <div className="flex items-center">
                  <input ref={editShelfInputRef} type="text" value={editingShelfName} onChange={(e) => setEditingShelfName(e.target.value)} className="bg-custom-tan text-custom-brown p-1 rounded" maxLength={30} />
                  <button onClick={saveShelfEdit} className="ml-2 bg-custom-brown text-custom-tan p-1 rounded hover:bg-opacity-80">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setEditingShelfId(null); setEditingShelfName(''); }} className="ml-1 bg-light-brown text-custom-tan p-1 rounded hover:bg-opacity-80">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <h2 className="text-custom-tan text-2xl font-bold flex items-center">
                  {section.title} {section.icon}
                  {section.isCustom && (
                    <button onClick={() => startEditingShelf(section.id!, section.title)} className="ml-2 text-custom-tan hover:text-custom-brown">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </h2>
              )}
              <div className="flex items-center">
                <button onClick={() => toggleEditMode(section.type)} className="text-custom-tan px-4 py-2 rounded-lg hover:bg-[#3D2F2A] transition-colors">
                  {editModes[section.type] ? 'Done' : 'Edit'}
                </button>
                {section.isCustom && (
                  <button onClick={() => section.id && deleteCustomShelf(section.id, section.title)} className="ml-4 text-custom-tan bg-custom-brown px-3 py-1 rounded-lg hover:bg-light-brown transition-colors flex items-center">
                    <Trash2 className="w-4 h-4 mr-1" /> Delete Shelf
                  </button>
                )}
              </div>
            </div>
            <div className="relative bg-light-brown border-t-8 border-b-8 border-[#3D2F2A] h-72" onDragOver={(e) => handleDragOver(e, section.type)} onDragLeave={handleDragLeave} onDrop={(e) => section.isCustom ? handleDrop(section.type, e, true, section.id) : handleDrop(section.type, e)}>
              <button onClick={() => scrollLeft(section.type)} className={`absolute left-0 top-0 h-full w-8 flex items-center justify-center bg-custom-brown text-custom-tan z-10 hover:bg-[#2E221E] transition-colors ${!scrollPositions[section.type] || scrollPositions[section.type] <= 0 ? '' : ''}`} style={{ borderRight: '2px solid #3D2F2A' }} disabled={!scrollPositions[section.type] || scrollPositions[section.type] <= 0}>
                &lt;
              </button>
              {scrollPositions[section.type] > 5 && (
                <div style={{ ...leftShadowStyle, opacity: scrollPositions[section.type] > 0 ? 1 : 0 }}></div>
              )}
              {maxScrolls[section.type] > 0 && scrollPositions[section.type] < maxScrolls[section.type] - 5 && (
                <div style={{ ...rightShadowStyle, opacity: scrollPositions[section.type] < maxScrolls[section.type] ? 1 : 0 }}></div>
              )}
              <button onClick={() => scrollRight(section.type)} className={`absolute right-0 top-0 h-full w-8 flex items-center justify-center bg-custom-brown text-custom-tan z-10 hover:bg-[#2E221E] transition-colors ${!maxScrolls[section.type] || !scrollPositions[section.type] || scrollPositions[section.type] >= maxScrolls[section.type] ? '' : ''}`} style={{ borderLeft: '2px solid #847266' }} disabled={!maxScrolls[section.type] || !scrollPositions[section.type] || scrollPositions[section.type] >= maxScrolls[section.type]}>
                &gt;
              </button>
              <div id={`scroll-container-${section.type}`} className="relative bottom-1 left-3 flex space-x-5 overflow-x-auto no-scrollbar" style={{ width: 'calc(100% - 85px)', marginLeft: '32px', marginRight: '32px' }}>
                {section.books.length > 0 ? (
                  section.books.map((book) => (
                    <div key={`${section.type}-${book.id}`} className="flex-shrink-0 cursor-pointer relative group mt-4" draggable={true} onDragStart={(e) => handleDragStart(book, e, section.isCustom, section.id)} onDragEnd={handleDragEnd} onClick={() => !editModes[section.type] && router.push(`/books/${book.bookId}`)}>
                      <Image src={book.coverUrl} alt={book.title} width={128} height={144} className="w-[150px] h-[250px] rounded-lg object-cover bg-custom-brown" />
                      {editModes[section.type] && (
                        <button onClick={(e) => { e.stopPropagation(); deleteBook(book, section.type, section.isCustom, section.id);
                          }}
                          className="absolute top-2 right-2 p-2 rounded-full bg-custom-brown text-custom-tan hover:bg-light-brown transition-colors opacity-100"
                          aria-label="Delete book"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-custom-tan text-lg italic">
                    {section.emptyMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}