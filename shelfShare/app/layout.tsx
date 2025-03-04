import './globals.css'; // Importing global styles
//import { Inter } from "next/font/google";
import { AuthProvider } from "./context/AuthContext";
import NavbarWrapper from "./components/NavbarWrapper";

//const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "ShelfShare",
  description: "Generated by create next app",
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {  
  return (
    <html lang="en">
      <AuthProvider>
      <head>
        <title>ShelfShare</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" />
      </head>
      <body>
        <NavbarWrapper /> 
        <main>{children}</main>
      </body>
      </AuthProvider>
      
    </html>
  );
}