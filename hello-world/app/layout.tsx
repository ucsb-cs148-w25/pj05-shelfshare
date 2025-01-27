import './globals.css'; // Importing global styles
import { ReactNode } from 'react';
import { Inter } from "next/font/google";
import { AuthProvider } from "./context/AuthContext";


const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({ children }: { children: ReactNode }) { // Explicitly typing 'children'
  return (
    <html lang="en">
        <AuthProvider>
          <body className={inter.className}>{children}</body>
        </AuthProvider>
    </html>
  );
}