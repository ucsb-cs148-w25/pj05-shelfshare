export default function Profile() {
    return (
      <div className="bg-[#5A7463] h-screen flex flex-col items-center justify-center">
      <div style={{position: "relative", color: "#DFDDCE", , left: "215px", fontSize: "40px", fontWeight: "bold" }}>
          Profile
        </div>
        <img src="/profile-pic.svg" style={{position: "absolute", top: "320px", left: "180px", width: "200px", height: "auto", borderRadius: "50%"}} />
        <div style={{position: "relative", color: "#DFDDCE", top: "550px", left: "230px", fontSize: "20px"}}>
          UserName 
        </div>
        <div style={{position: "relative", color: "#DFDDCE", top: "230px", left: "600px", fontSize: "25px", fontWeight: "bold" }}>
          Preferred Genre: 
        </div>
        <div style={{position: "relative", backgroundColor: "#DFDDCE", top: "290px", left: "615px", height: "200px", width: "500px", color: "#3D2F2A", borderRadius: "10px", padding: "10px"}}>
          #mystery #romance #fantasy 
        </div>
        <div style={{position: "relative", color: "#DFDDCE", top: "550px", left: "600px", fontSize: "25px", fontWeight: "bold" }}>
          About Me: 
        </div>
        <div style={{position: "relative", backgroundColor: "#DFDDCE", top: "610px", left: "615px", height: "200px", width: "500px", color: "#3D2F2A", borderRadius: "10px", padding: "10px"}}>
          A blurb about the reader and whatever they want to put up.
        </div>

      </div>
    );
  }