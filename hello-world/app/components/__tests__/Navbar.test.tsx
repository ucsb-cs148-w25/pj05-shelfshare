import { render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "../Navbar";
import { useRouter, usePathname } from "next/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

describe("Navbar Component", () => {
  const mockPush = jest.fn();
  const mockPathname = "/books/browse";

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
    });
    (usePathname as jest.Mock).mockReturnValue(mockPathname);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renders navbar with initial elements", () => {
    render(<Navbar />);

    expect(screen.getByAltText("ShelfShare Logo")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();
    expect(screen.getByText("Browse")).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText("My Shelf")).toBeInTheDocument();
    expect(screen.getByText("For You")).toBeInTheDocument();
  });

  test("dropdown opens when media type button is clicked", async () => {
    render(<Navbar />);

    const mediaButton = screen.getByText("Books");
    userEvent.click(mediaButton);

    expect(await screen.findByText("Movies")).toBeVisible();
    expect(await screen.findByText("Music")).toBeVisible();
  });

  test("opens profile dropdown when profile button is clicked", async () => {
    render(<Navbar />);
  
    // Click on profile button
    userEvent.click(screen.getByText("account_circle"));
  
    // Check if profile options appear
    expect(await screen.findByText("Profile")).toBeVisible();
    expect(screen.getByText("Friends")).toBeVisible();
    expect(screen.getByText("Settings")).toBeVisible();
    expect(screen.getByText("Logout")).toBeVisible();
  });
  
  test("displays default navigation state correctly", () => {
    render(<Navbar />);
  
    // Ensure "Books" is selected by default
    expect(screen.getByText("Books")).toBeInTheDocument();
  
    // Check that main navigation links exist
    expect(screen.getByText("Browse")).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText("My Shelf")).toBeInTheDocument();
    expect(screen.getByText("For You")).toBeInTheDocument();
  });

  
});
