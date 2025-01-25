// components/NavbarWrapper.tsx
"use client";

import Navbar from "@/components/Navbar";

const NavbarWrapper = () => {
  return <Navbar />;  // Directly render Navbar since it handles client-side checks already
};

export default NavbarWrapper;
