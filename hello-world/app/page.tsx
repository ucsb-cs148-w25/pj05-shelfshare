'use client';

import { useAuth } from './context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSignIn = async () => {
    await signIn(); // Ensure signIn resolves before navigation
    router.push('/home'); // Redirect to home page
  };

  return (
    <div>
     <img
        src="/Books.png"
        alt="books"
        width="67%"
        style={{top: "81%", position: "absolute"}}
      />
      <img
        src="/Books.png"
        alt="books2"
        width="67%"
        style={{top: "81%", position: "absolute", left: "65%"}}
      />
     <div style={{width: "100%", top: "24%", height: "40%",backgroundColor: "#847266", position: "absolute"}}> </div>
     <div style={{width: "100%", top: "24%", height: "3%", backgroundColor: "#3D2F2A", position: "absolute"}}> </div>
     <div style={{width: "100%", top: "62%", height: "3%", backgroundColor: "#3D2F2A", position: "absolute"}}> </div>
     <img src="/login-logo.png" alt="book" width="40%" style={{top: "31%", left: "42%", width: "14%", position: "absolute"}}/>
     {/* <div style={{
       position: "absolute",
       top: "36%",
       left: "55%",
       transform: "translate(-50%, -50%)",
       color: "#DFDDCE",
       fontSize: "3rem",
       fontWeight: "bold"
     }}>
       ShelfShare
     </div> */}
     <button onClick={handleSignIn}
     className="px-6 py-3 bg-custom-green text-white text-xl font-normal rounded-full transform transition-all hover:scale-110 hover:bg-blue-600"
     style={{
       position: "absolute", // Change to relative, fixed, or static as needed
       top: "50%",           // Adjust vertical location
       left: "43%",
       width: "12%",
             // Adjust horizontal location
     }}
   >
       <span className="mr-1" ></span>Sign in with Google
       </button>
   </div>
  );
}