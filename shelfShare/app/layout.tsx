// app/layout.tsx
import './globals.css';
import Navbar from "@/components/Navbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>ShelfShare</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" />
      </head>
      <body>
        <Navbar /> 
        <main>{children}</main>
      </body>
    </html>
  );
}