"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function NavbarWrapper() {
  const pathname = usePathname();
  const showNavbar = pathname !== "/"; // Hide navbar on login page

  return showNavbar ? <Navbar /> : null;
}
