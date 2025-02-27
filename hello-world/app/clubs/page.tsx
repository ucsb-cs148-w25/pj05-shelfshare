'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface Club {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  imageUrl: string;
}

export default function BookClubs() {
  const { user } = useAuth();
  const router = useRouter();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch clubs from Firestore
  const fetchClubs = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'clubs'));
      const clubsData: Club[] = [];
      querySnapshot.forEach((doc) => {
        clubsData.push({ id: doc.id, ...doc.data() } as Club);
      });
      setClubs(clubsData);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    fetchClubs();
  }, []);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="bg-[#5A7463] min-h-screen p-8">
      {/* Search and Create Club Section */}
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search clubs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 rounded-[15px] shadow-md bg-[#DFDDCE] text-[#3D2F2A]"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          />
          <button
            onClick={() => router.push('/create-club')}
            className="px-4 py-2 rounded-[15px] shadow-md bg-[#3D2F2A] text-[#DFDDCE]"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Create Club
          </button>
        </div>
      </div>

      {/* Club List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {clubs
          .filter((club) =>
            club.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((club) => (
            <Link key={club.id} href={`/clubs/${club.id}`} passHref>
              <div className="bg-[#92A48A] p-4 rounded-lg shadow-lg cursor-pointer transition transform hover:scale-105 h-[300px] flex flex-col">
                <div className="w-full h-40 bg-[#3D2F2A] rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  <Image
                    src={club.imageUrl}
                    alt={club.name}
                    width={150}
                    height={150}
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col flex-grow">
                  <h2 className="text-xl font-semibold text-[#3D2F2A] mt-4 line-clamp-2 overflow-hidden">
                    {club.name}
                  </h2>
                  <p className="text-md mt-1 text-[#3D2F2A] line-clamp-2 overflow-hidden">
                    {club.description}
                  </p>
                  <div className="mt-auto">
                    <p className="text-md text-[#3D2F2A]">
                      Members: {club.memberCount}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}