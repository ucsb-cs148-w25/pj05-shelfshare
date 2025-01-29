'use client';

import { useAuth } from '../context/AuthContext';



export default function Login() {
  const { signIn } = useAuth();
  return (
    <div style={{ height: "100vh", width: "100vw", backgroundColor: "#5A7463" }}>
      <img
        src="Book.png"
        alt="books"
        width="80%"
        style={{top: "75%",
          position: "absolute"}}/>
      <img
        src="Book.png"
        alt="books2"
        width="80%"
        style={{top: "75%", left: "75%", position: "absolute"}}/>
      <div style={{width: "100%", top: "24%", height: "40%",backgroundColor: "#847266", position: "absolute"}}> </div>
      <div style={{width: "100%", top: "24%", height: "3%", backgroundColor: "#3D2F2A", position: "absolute"}}> </div>
      <div style={{width: "100%", top: "62%", height: "3%", backgroundColor: "#3D2F2A", position: "absolute"}}> </div>
      <img src="/Logo.svg" alt="book" width="40%" style={{top: "31%", left: "35%", width: "12%", position: "absolute"}}/>
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
      style={{
        position: "absolute", // Change to relative, fixed, or static as needed
        top: "46%",           // Adjust vertical location
        left: "43%",
        width: "12%",
              // Adjust horizontal location
      }}
    >
        <img src="google-logo-.png"/>
        {/* Continue With Google */}
        </button>
 
 
    </div>
  );
 }
 