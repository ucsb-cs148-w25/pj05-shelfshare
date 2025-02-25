'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react';
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

interface CustomShelf {
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
      title: 'Stopped Reading', 
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

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    // Fetch default shelves
    const fetchDefaultBooks = async () => {
      // Fetch favorites
      const favoritesQuery = query(collection(db, "users", user.uid, "favorites"));
      const unsubscribeFavorites = onSnapshot(favoritesQuery, (snapshot) => {
        const favoritesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          dateAdded: doc.data().dateAdded instanceof Timestamp ? doc.data().dateAdded : new Date()
        })) as BookItem[];

        updateDefaultShelfBooks('favorites', favoritesData);
      });

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
        updateDefaultShelfBooks('currently-reading', shelvesData.filter(book => book.shelfType === 'currently-reading'));
        updateDefaultShelfBooks('want-to-read', shelvesData.filter(book => book.shelfType === 'want-to-read'));
        updateDefaultShelfBooks('finished', shelvesData.filter(book => book.shelfType === 'finished'));
        updateDefaultShelfBooks('stopped-reading', shelvesData.filter(book => book.shelfType === 'stopped-reading'));
      });

      return () => {
        unsubscribeFavorites();
        unsubscribeShelves();
      };
    };

    // Fetch custom shelves
    const fetchCustomShelves = async () => {
      const customShelvesQuery = query(
        collection(db, "users", user.uid, "customShelves")
      );
      
      const unsubscribeCustomShelves = onSnapshot(customShelvesQuery, async (snapshot) => {
        const customShelvesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          dateCreated: doc.data().dateCreated instanceof Timestamp ? doc.data().dateCreated : new Date()
        })) as CustomShelf[];

        // Create array of shelf sections for each custom shelf
        const customShelfSections: ShelfSection[] = [];
        
        for (const shelf of customShelvesData) {
          // Fetch books for this custom shelf
          const customBooksQuery = query(
            collection(db, "users", user.uid, "customShelfBooks"),
            where("shelfId", "==", shelf.id)
          );
          
          const customBooksSnapshot = await getDocs(customBooksQuery);
          const customBooksData = customBooksSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            dateAdded: doc.data().dateAdded instanceof Timestamp ? doc.data().dateAdded : new Date(),
            isFromCustomShelf: true,
            customShelfId: shelf.id
          })) as BookItem[];
          
          customShelfSections.push({
            title: shelf.name,
            books: customBooksData,
            type: `custom-${shelf.id}`,
            emptyMessage: "Add books to this shelf",
            isCustom: true,
            id: shelf.id
          });
        }
        
        setCustomShelves(customShelfSections);
      });

      return () => {
        unsubscribeCustomShelves();
      };
    };

    fetchDefaultBooks();
    fetchCustomShelves();
  }, [user, router]);

  useEffect(() => {
    if (isCreatingShelf && newShelfInputRef.current) {
      newShelfInputRef.current.focus();
    }
    
    if (editingShelfId && editShelfInputRef.current) {
      editShelfInputRef.current.focus();
    }
  }, [isCreatingShelf, editingShelfId]);

  const updateDefaultShelfBooks = (shelfType: string, books: BookItem[]) => {
    setDefaultShelves(currentShelves => 
      currentShelves.map(shelf => 
        shelf.type === shelfType ? { ...shelf, books } : shelf
      )
    );
  };

  const toggleEditMode = (sectionType: string) => {
    setEditModes(prev => ({
      ...prev,
      [sectionType]: !prev[sectionType]
    }));
  };

  // Drag and Drop Handlers
  const handleDragStart = (book: BookItem, e: React.DragEvent, isCustomShelf = false, customShelfId?: string) => {
    // Make a copy of the book to avoid modifying the original state
    let dragBook = {...book};
    
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
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.backgroundColor = 'rgba(61, 47, 42, 0.2)';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.backgroundColor = '';
    }
  };

  const handleDrop = async (targetShelfType: string, e: React.DragEvent, isCustomShelf = false, customShelfId?: string) => {
    e.preventDefault();
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
          // If coming from a default shelf, don't automatically remove from default shelf
          // This allows books to exist in both custom shelves and default shelves
        }
      }
      else {
        // Handle dropping to default shelf
        
        // If coming from a custom shelf, we'll add to default shelves
        // but we won't remove from custom shelf - books can exist in both places
        if (isFromCustomShelf) {
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
        } else {
          // Normal case - moving within default shelves
          // We'll use the document ID from the draggedBook directly
          if (draggedBook.id) {
            const bookRef = doc(db, "users", user.uid, "shelves", draggedBook.id);
            await updateDoc(bookRef, {
              shelfType: targetShelfType,
              dateFinished: targetShelfType === 'finished' ? new Date() : null,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error moving book:", error);
    }
  };

  const deleteBook = async (bookId: string, sectionType: string, isCustom = false, customShelfId?: string) => {
    if (!user) return;
    
    try {
      if (isCustom && customShelfId) {
        // Delete from custom shelf
        const customBooksQuery = query(
          collection(db, "users", user.uid, "customShelfBooks"),
          where("bookId", "==", bookId),
          where("shelfId", "==", customShelfId)
        );
        
        const querySnapshot = await getDocs(customBooksQuery);
        if (!querySnapshot.empty) {
          await deleteDoc(querySnapshot.docs[0].ref);
        }
      } else {
        // Delete from default shelf or favorites
        const collectionName = sectionType === 'favorites' ? 'favorites' : 'shelves';
        await deleteDoc(doc(db, "users", user.uid, collectionName, bookId));
      }
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
    } catch (error) {
      console.error("Error updating custom shelf:", error);
    }
  };

  const deleteCustomShelf = async (shelfId: string) => {
    if (!user) return;
    
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
      
    } catch (error) {
      console.error("Error deleting custom shelf:", error);
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
            <h2 className="text-[#DFDDCE] text-3xl font-bold">
              My Shelves
            </h2>
            <button
              onClick={() => setIsCreatingShelf(true)}
              className="bg-[#3D2F2A] text-[#DFDDCE] px-4 py-2 rounded-lg hover:bg-[#847266] transition-colors flex items-center"
            >
              <Plus className="mr-2" /> Create New Shelf
            </button>
          </div>
          
          {isCreatingShelf && (
            <div className="mt-4 flex items-center bg-[#847266] p-3 rounded-lg">
              <input
                ref={newShelfInputRef}
                type="text"
                value={newShelfName}
                onChange={(e) => setNewShelfName(e.target.value)}
                placeholder="Enter shelf name..."
                className="bg-[#DFDDCE] text-[#3D2F2A] p-2 rounded flex-grow"
                maxLength={30}
              />
              <button
                onClick={createCustomShelf}
                className="ml-2 bg-[#3D2F2A] text-[#DFDDCE] p-2 rounded hover:bg-opacity-80"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setIsCreatingShelf(false);
                  setNewShelfName('');
                }}
                className="ml-1 bg-[#847266] text-[#DFDDCE] p-2 rounded hover:bg-opacity-80"
              >
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
                  <input
                    ref={editShelfInputRef}
                    type="text"
                    value={editingShelfName}
                    onChange={(e) => setEditingShelfName(e.target.value)}
                    className="bg-[#DFDDCE] text-[#3D2F2A] p-1 rounded"
                    maxLength={30}
                  />
                  <button
                    onClick={saveShelfEdit}
                    className="ml-2 bg-[#3D2F2A] text-[#DFDDCE] p-1 rounded hover:bg-opacity-80"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingShelfId(null);
                      setEditingShelfName('');
                    }}
                    className="ml-1 bg-[#847266] text-[#DFDDCE] p-1 rounded hover:bg-opacity-80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <h2 className="text-[#DFDDCE] text-2xl font-bold flex items-center">
                  {section.title} {section.icon}
                  {section.isCustom && (
                    <button
                      onClick={() => startEditingShelf(section.id!, section.title)}
                      className="ml-2 text-[#DFDDCE] hover:text-[#3D2F2A]"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </h2>
              )}
              
              <div className="flex items-center">
                {section.isCustom && (
                  <button
                    onClick={() => section.id && deleteCustomShelf(section.id)}
                    className="mr-2 text-[#DFDDCE] hover:text-[#3D2F2A]"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => toggleEditMode(section.type)}
                  className="text-[#DFDDCE] px-4 py-2 rounded-lg hover:bg-[#3D2F2A] transition-colors"
                >
                  {editModes[section.type] ? 'Done' : 'Edit'}
                </button>
              </div>
            </div>
            <div 
              className={`relative bg-[#847266] border-t-8 border-b-8 border-[#3D2F2A] h-44 flex items-center transition-colors
                ${section.type !== 'favorites' ? 'droppable' : ''}`}
              onDragOver={(e) => handleDragOver(e, section.type)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => section.isCustom
                ? handleDrop(section.type, e, true, section.id)
                : handleDrop(section.type, e)
              }
            >
              <div className="flex space-x-4 overflow-x-auto px-4 w-full">
                {section.books.length > 0 ? (
                  section.books.map((book) => (
                    <div
                      key={book.id}
                      className="flex-shrink-0 cursor-pointer relative group"
                      draggable={true}
                      onDragStart={(e) => handleDragStart(book, e, section.isCustom, section.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => !editModes[section.type] && router.push(`/books/${book.bookId}`)}
                    >
                      <Image
                        src={book.coverUrl}
                        alt={book.title}
                        width={128}
                        height={144}
                        className="w-32 h-36 rounded-lg object-cover bg-[#3D2F2A]"
                      />
                      {editModes[section.type] && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBook(book.id, section.type, section.isCustom, section.id);
                          }}
                          className="absolute top-2 right-2 p-2 rounded-full bg-[#3D2F2A] text-[#DFDDCE] hover:bg-[#847266] transition-colors opacity-100"
                          aria-label="Delete book"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-[#DFDDCE] text-lg italic">
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