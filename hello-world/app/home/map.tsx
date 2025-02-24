import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';

const customMarker = new L.Icon({
    iconUrl: "/map1.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [30, 37],
    iconAnchor: [10, 41],
    popupAnchor: [1, -34],
  });

interface Library {
    name: string;
    lat: number;
    lng: number;
    distance?: number;
  }


const LibraryMap = ({ libraries, mapCenterCoord }: { libraries: Library[], mapCenter: [number, number] }) => {

  const [isClient, setIsClient] = useState(false);
  const [mapCenterE, setMapCenterE] = useState<[number, number] | null>(null);

  useEffect(() => {
    console.log("Libraries passed to map:", libraries);
    setIsClient(true);
    setMapCenterE(mapCenterCoord);
  }, [mapCenterCoord]);

  if (!isClient) return null; // ⛔ Prevent SSR from running Leaflet

  return (
    <MapContainer center={mapCenterE} zoom={13} style={{ height: "500px", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {libraries.map((library, index) => (
        <Marker key={index} position={[library.lat, library.lng]} icon={customMarker}>
          <Popup>
            <strong>{library.name}</strong>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default LibraryMap;