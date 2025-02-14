import { render, fireEvent } from "@testing-library/react";
import Navbar from "../Navbar";
import { useRouter, usePathname } from "next/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} onClick={(e) => {
      e.preventDefault();
      const router = useRouter();
      router.push(href);
    }}>
      {children}
    </a>
  ),
}));

describe("Navbar", () => {
  it("navigates to home when logo is clicked", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    (usePathname as jest.Mock).mockReturnValue("/");

    const { getByAltText } = render(<Navbar />);
    
    const logo = getByAltText("ShelfShare Logo");
    fireEvent.click(logo.closest('a')!); 
    expect(push).toHaveBeenCalledWith("/home");
  });
});