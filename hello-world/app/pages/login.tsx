import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { signIn } = useAuth();
  return (
    <div>
      <img
        src="Book.png"
        alt="books"
        width="80%"
        className="book-location1"
      />
      <img
        src="Book.png"
        alt="books"
        width="80%"
        className="book-location2"
      />
      <div id="rectangle-login1"> </div>
      <div id="rectangle-login2"> </div>
      <div id="rectangle-login3"> </div>
      <img src="/logo.svg" alt="book" width="40%" className="logo-login"/> 
      <div style={{
        position: "absolute",
        top: "36%",
        left: "55%",
        transform: "translate(-50%, -50%)",
        color: "#DFDDCE",
        fontSize: "3rem",
        fontWeight: "bold"
      }}>
        ShelfShare
      </div>
      <button onClick={signIn}
      type="button"
      style={{
        position: "absolute", // Change to relative, fixed, or static as needed
        top: "46%",           // Adjust vertical location
        left: "45%"      // Adjust horizontal location
      //   transform: "translate(-50%, -50%)", // Center alignment
      //   padding: "10px 25px", // Adjust button size
      //   border: "none",       // Optional: remove border
      //   backgroundColor: "transparent", // Optional: transparent background
      //   cursor: "pointer",    // Optional: pointer for better UX
      }}
    >
        <img src="google-logo-.png"/>
        {/* Continue With Google */}
        </button>

    </div>
  );
}