// pages/music.tsx
'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import React from 'react'

const Music = () => {
    const { user } = useAuth();
      const router = useRouter();
    
      // Redirect to login page if user is not authenticated
      useEffect(() => {
        if (!user) {
          router.push('/');
        }
      }, [user, router]);
    
      if (!user) {
        return null; // Avoid rendering anything while redirecting
      }

    return (
            <div className="container mt-2">
                This is a music page
            </div>
    )
}

export default Music