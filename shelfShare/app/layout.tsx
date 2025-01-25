// app/layout.tsx
import './globals.css';
import NavbarWrapper from "@/components/NavbarWrapper";

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
        <NavbarWrapper /> 
        <main>{children}</main>
      </body>
    </html>
  );
}