import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, ImageOverlay, Polyline, Marker, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import createGraph from 'ngraph.graph';
import { aStar } from 'ngraph.path';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { mapConfigs } from './mapConfigs';
import './App.css';

const locationsDB = [
  { id: 'khaadi', name: 'Khaadi', category: 'Clothing', image: 'https://picsum.photos/400/300?random=1', tags: ['clothes', 'fashion', 'apparel'] },
  { id: 'outfitters', name: 'Outfitters', category: 'Clothing', image: 'https://picsum.photos/400/300?random=2', tags: ['clothes', 'fashion', 'apparel'] },
  { id: 'sapphire', name: 'Sapphire', category: 'Clothing', image: 'https://picsum.photos/400/300?random=3', tags: ['clothes', 'fashion', 'apparel'] },
  { id: 'howdy', name: 'Howdy', category: 'Food', image: 'https://picsum.photos/400/300?random=4', tags: ['food', 'burger', 'dine'] },
  { id: 'kfc', name: 'KFC', category: 'Food', image: 'https://picsum.photos/400/300?random=5', tags: ['food', 'burger', 'dine'] },
  { id: 'saltnpepper', name: 'Salt n Pepper', category: 'Food', image: 'https://picsum.photos/400/300?random=6', tags: ['food', 'burger', 'dine'] },
  { id: 'jfragrances', name: 'J. Fragrances', category: 'Perfume', image: 'https://picsum.photos/400/300?random=7', tags: ['perfume', 'scent', 'beauty'] },
  { id: 'saeedghani', name: 'Saeed Ghani', category: 'Perfume', image: 'https://picsum.photos/400/300?random=8', tags: ['perfume', 'scent', 'beauty'] }
];

function MapController({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const fitMap = () => {
      setTimeout(() => {
        map.invalidateSize();
        map.fitBounds(bounds, { padding: [10, 10], animate: false });
      }, 100);
    };
    fitMap();
    window.addEventListener('resize', fitMap);
    return () => window.removeEventListener('resize', fitMap);
  }, [map, bounds]);
  return null;
}

function App() {
  const [activeMap, setActiveMap] = useState('ground_floor');
  const currentMap = mapConfigs[activeMap] || mapConfigs['ground_floor'] || Object.values(mapConfigs)[0];
  
  const [startNode, setStartNode] = useState(null);
  const [endNode, setEndNode] = useState('');
  const [pathCoords, setPathCoords] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  
  const [activeTab, setActiveTab] = useState('home'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [commuteTab, setCommuteTab] = useState('CAR');
  const [toastMessage, setToastMessage] = useState(null);
  
  const [heading, setHeading] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTrackingSteps, setIsTrackingSteps] = useState(false);
  
  const scannerRef = useRef(null);

  useEffect(() => {
    setStartNode(null);
    setEndNode('');
    setPathCoords([]);
    setCurrentPosition(null);
    setCurrentStepIndex(0);
    setIsTrackingSteps(false);
  }, [activeMap, currentMap]);

  const { graph, pathfinder } = useMemo(() => {
    const g = createGraph();
    if (currentMap?.nodes) currentMap.nodes.forEach((node) => g.addNode(node.id, { x: node.x, y: node.y }));
    if (currentMap?.links) currentMap.links.forEach((edge) => g.addLink(edge.source, edge.target));

    const pf = aStar(g, {
      distance(fromNode, toNode) {
        const dx = fromNode.data.x - toNode.data.x;
        const dy = fromNode.data.y - toNode.data.y;
        return Math.sqrt(dx * dx + dy * dy);
      },
      heuristic(fromNode, toNode) {
        const dx = fromNode.data.x - toNode.data.x;
        const dy = fromNode.data.y - toNode.data.y;
        return Math.sqrt(dx * dx + dy * dy);
      }
    });

    return { graph: g, pathfinder: pf };
  }, [currentMap]);

  useEffect(() => {
    const handleOrientation = (e) => {
      let compassHeading = 0;
      if (e.webkitCompassHeading) compassHeading = e.webkitCompassHeading;
      else if (e.alpha !== null) compassHeading = 360 - e.alpha; 
      setHeading(compassHeading);
    };
    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => window.removeEventListener("deviceorientation", handleOrientation, true);
  }, []);

  useEffect(() => {
    if (!startNode || !endNode) {
      setPathCoords([]);
      setCurrentPosition(null);
      setCurrentStepIndex(0);
      setIsTrackingSteps(false);
      return;
    }
    try {
      const foundPath = pathfinder.find(startNode, endNode);
      if (foundPath && foundPath.length > 0) {
        const coords = foundPath.map((node) => [1000 - node.data.y, node.data.x]);
        setPathCoords(coords);
        setCurrentPosition(coords[0]);
        setCurrentStepIndex(0);
        setIsTrackingSteps(false);
      } else {
        setPathCoords([]);
        setCurrentPosition(null);
      }
    } catch (error) {
      console.error("Error finding path:", error);
    }
  }, [startNode, endNode, pathfinder]);

  const handleLocationSelect = (nodeId) => {
    if (!startNode) {
      setToastMessage('Please scan a nearby QR code to establish your starting location');
      setActiveTab('navigate');
      setIsScanning(true);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setEndNode(nodeId);
    setActiveTab('navigate');
  };

  const handleStartScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scannerRef.current = scanner;
      scanner.render((decodedText) => {
        const scannedId = decodedText.trim();
        const node = currentMap?.nodes?.find(n => n.id === scannedId);
        if (node) {
          setStartNode(scannedId);
          scanner.clear();
          setIsScanning(false);
        } else {
          alert('Invalid location QR code for this map.');
        }
      }, () => {});
    }, 100);
  };

  const handleCancelScan = () => {
    if (scannerRef.current) scannerRef.current.clear();
    setIsScanning(false);
  };

  const userIcon = L.divIcon({
    className: 'custom-user-marker',
    html: `<div class="pulsing-marker"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const mapRef = useRef(null);

  const filteredLocations = searchQuery.length > 0 
    ? locationsDB.filter(loc => loc.name.toLowerCase().includes(searchQuery.toLowerCase()) || loc.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
    : [];

  return (
    <div className="app-wrapper">
      {activeTab !== 'navigate' && (
        <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderBottom: '1px solid #eee', zIndex: 3000, paddingTop: 'env(safe-area-inset-top)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', alignItems: 'center' }}>
            <svg width="24" height="24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <div style={{ fontFamily: 'Georgia, serif', fontWeight: 'bold', fontSize: '18px', letterSpacing: '2px', color: '#111' }}>PACKAGES MALL</div>
            <svg width="24" height="24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </div>
          <input 
            type="text" 
            placeholder="Search stores, dining, and facilities..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value); 
              if(e.target.value && activeTab !== 'explore') setActiveTab('home');
            }} 
            style={{
              background: '#f4f4f5', 
              borderRadius: '20px', 
              padding: '10px 15px', 
              border: 'none', 
              outline: 'none', 
              width: '90%', 
              margin: '10px auto', 
              display: 'block', 
              fontSize: '14px'
            }} 
          />
          <div style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 0', borderTop: '1px solid #f5f5f5', fontSize: '12px', fontWeight: 'bold', color: '#555' }}>
            <span style={{ cursor: 'pointer' }}>SHOP</span>
            <span style={{ cursor: 'pointer' }}>DINE</span>
            <span style={{ cursor: 'pointer' }}>ENTERTAIN</span>
          </div>
        </div>
      )}

      {/* Toast Message */}
      {toastMessage && (
        <div style={{
          position: 'absolute', top: '140px', left: '10%', width: '80%', zIndex: 4000,
          backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', padding: '12px 20px',
          borderRadius: '24px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', animation: 'fadeIn 0.3s'
        }}>
          {toastMessage}
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'navigate' ? (
        <div style={{ flex: 1, minHeight: 0, position: 'relative', height: '100%' }}>
          
          {/* Map Selector */}
          <div style={{ 
            position: 'absolute', top: '20px', right: '20px', zIndex: 1000, 
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', 
            borderRadius: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', 
            padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px' 
          }}>
            <select value={activeMap} onChange={(e) => setActiveMap(e.target.value)} style={{ border: 'none', background: 'transparent', fontWeight: 'bold', color: '#333', fontSize: '14px', outline: 'none' }}>
              <option value="ground_floor">Ground Floor</option>
              <option value="second_floor">Second Floor</option>
            </select>
          </div>

          {/* Bottom Floating Buttons (Map specific) */}
          <div style={{ position: 'absolute', bottom: '90px', left: '20px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
              <div onClick={() => handleLocationSelect('washroom')} style={{ width: '45px', height: '45px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderRadius: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px', cursor: 'pointer' }}>🚽</div>
              <div onClick={() => setActiveTab('commute')} style={{ width: '45px', height: '45px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderRadius: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px', cursor: 'pointer' }}>🚕</div>
              <div onClick={handleStartScan} style={{ width: '45px', height: '45px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderRadius: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px', cursor: 'pointer' }}>📷</div>
            </div>
          </div>

          <MapContainer ref={mapRef} crs={L.CRS.Simple} bounds={currentMap?.bounds || [[0,0],[1000,1000]]} minZoom={-2} zoomSnap={0.1} maxZoom={3} zoomControl={false} style={{ height: '100%', width: '100%', backgroundColor: '#fafafa' }}>
            <MapController bounds={currentMap?.bounds || [[0,0],[1000,1000]]} />
            <ZoomControl position="topleft" />
            <ImageOverlay url={currentMap?.imageUrl} bounds={currentMap?.bounds || [[0,0],[1000,1000]]} />
            {pathCoords.length > 0 && <Polyline positions={pathCoords} color="#007AFF" weight={5} dashArray="10, 15" className="flowing-route" />}
            {currentPosition && <Marker position={currentPosition} icon={userIcon} />}
          </MapContainer>
        </div>
      ) : (
        <div style={{ flex: 1, padding: '20px', paddingBottom: '80px', overflowY: 'auto' }}>
          
          {/* Global Search Results override content if searching */}
          {searchQuery ? (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#111' }}>Search Results</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {filteredLocations.map(loc => (
                  <div key={loc.id} onClick={() => handleLocationSelect(loc.id)} style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', background: '#fff' }}>
                    <div style={{ height: '100px', background: `url(${loc.image}) center/cover` }}></div>
                    <div style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#111' }}>{loc.name}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{loc.category}</div>
                    </div>
                  </div>
                ))}
                {filteredLocations.length === 0 && (
                  <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px', color: '#888' }}>No locations found.</div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Tab Content Router */}
              {activeTab === 'home' && (
                <div>
                  <div style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1519567281794-66f9b6144627?auto=format&fit=crop&w=800&q=80)', backgroundSize: 'cover', backgroundPosition: 'center', height: '200px', borderRadius: '16px', margin: '15px', position: 'relative' }}>
                    <div style={{ position: 'absolute', bottom: '20px', left: '20px' }}>
                      <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 'bold', margin: 0, lineHeight: '1.2' }}>Winter Collection<br/>Now Live</h1>
                    </div>
                  </div>
                  
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', marginLeft: '15px', color: '#111' }}>Trending Now</h2>
                  <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '20px', paddingLeft: '15px', paddingRight: '15px' }}>
                    {locationsDB.map(loc => (
                      <div key={loc.id} onClick={() => handleLocationSelect(loc.id)} style={{ minWidth: '140px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0', background: '#fff' }}>
                        <div style={{ height: '120px', background: `url(${loc.image}) center/cover` }}></div>
                        <div style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#111' }}>{loc.name}</div>
                          <div style={{ fontSize: '13px', color: '#888' }}>{loc.category}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'explore' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '32px' }}>
                    {['Offers', 'Events', 'Cinema', 'Parking'].map((item, i) => (
                      <div key={item} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px' }}>
                          {['🎁', '🎉', '🍿', '🅿️'][i]}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#555' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#111' }}>Explore Categories</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {['Men', 'Women', 'Kids', 'Electronics', 'Beauty', 'Home'].map((cat, i) => (
                      <div key={cat} style={{ height: '100px', borderRadius: '16px', background: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url("https://picsum.photos/400/300?random=${i+10}") center/cover`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '18px', letterSpacing: '1px' }}>{cat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'commute' && (
                <div>
                  <div style={{ display: 'flex', background: '#eef0f2', borderRadius: '20px', padding: '4px', marginBottom: '24px' }}>
                    <div onClick={() => setCommuteTab('CAR')} style={{ flex: 1, textAlign: 'center', padding: '12px', borderRadius: '16px', background: commuteTab === 'CAR' ? '#fff' : 'transparent', fontWeight: 'bold', color: commuteTab === 'CAR' ? '#111' : '#888', boxShadow: commuteTab === 'CAR' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}>CAR</div>
                    <div onClick={() => setCommuteTab('TAXI')} style={{ flex: 1, textAlign: 'center', padding: '12px', borderRadius: '16px', background: commuteTab === 'TAXI' ? '#fff' : 'transparent', fontWeight: 'bold', color: commuteTab === 'TAXI' ? '#111' : '#888', boxShadow: commuteTab === 'TAXI' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}>TAXI</div>
                  </div>
                  
                  {commuteTab === 'TAXI' && (
                    <>
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                        <div style={{ flex: 1, padding: '24px', background: '#fff', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', border: '1px solid #f0f0f0' }}>
                          <img src="https://logo.clearbit.com/indrive.com" alt="inDrive" style={{ height: '40px', objectFit: 'contain' }} onError={(e)=>{e.target.style.display='none'}} />
                          <div style={{ fontSize: '20px', color: '#111', fontWeight: 'bold' }}>inDrive</div>
                          <button style={{ width: '100%', padding: '12px', borderRadius: '20px', background: '#A4C639', color: '#fff', fontWeight: 'bold', border: 'none' }}>Book</button>
                        </div>
                        <div style={{ flex: 1, padding: '24px', background: '#fff', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', border: '1px solid #f0f0f0' }}>
                          <img src="https://logo.clearbit.com/yandex.com" alt="Yango" style={{ height: '40px', objectFit: 'contain', borderRadius: '8px' }} onError={(e)=>{e.target.style.display='none'}} />
                          <div style={{ fontSize: '20px', color: '#111', fontWeight: 'bold' }}>Yango</div>
                          <button style={{ width: '100%', padding: '12px', borderRadius: '20px', background: '#E32636', color: '#fff', fontWeight: 'bold', border: 'none' }}>Book</button>
                        </div>
                      </div>
                      <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#111' }}>Pick-up Points</h2>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {['Gate 1 - Main Entrance', 'Gate 2 - Carrefour', 'Gate 3 - Cinema'].map(pt => (
                          <div key={pt} style={{ padding: '16px', background: '#fff', borderRadius: '16px', fontWeight: 'bold', color: '#444', border: '1px solid #f0f0f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>{pt}</div>
                        ))}
                      </div>
                    </>
                  )}
                  {commuteTab === 'CAR' && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🅿️</div>
                      <h2 style={{ color: '#111' }}>Remember Parking</h2>
                      <p>Tap here to save your parking spot.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'more' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {['Login / Register', 'My Favourites', 'Wanderlist', 'Chat on WhatsApp', 'Privacy Policy'].map(item => (
                    <div key={item} style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', background: '#fff', borderRadius: '16px', fontWeight: 'bold', color: '#333', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f0f0f0' }}>
                      {item}
                      <svg width="20" height="20" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Fixed Premium Bottom Navigation */}
      <div style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0,
        right: 0,
        margin: '0 auto',
        maxWidth: '430px',
        width: '100%', 
        height: '70px', 
        background: 'white', 
        borderTop: '1px solid #eaeaea', 
        boxShadow: '0 -4px 15px rgba(0,0,0,0.03)', 
        zIndex: 9999, 
        display: 'flex', 
        justifyContent: 'space-around', 
        alignItems: 'center', 
        paddingBottom: 'env(safe-area-inset-bottom)' 
      }}>
        {[
          { id: 'home', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>, label: 'Home' },
          { id: 'navigate', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>, label: 'Navigate' },
          { id: 'explore', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>, label: 'Explore' },
          { id: 'commute', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>, label: 'Commute' },
          { id: 'more', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>, label: 'More' }
        ].map(tab => (
          <div key={tab.id} onClick={() => {setActiveTab(tab.id); if (tab.id !== 'home' && tab.id !== 'explore') setSearchQuery('');}} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === tab.id ? '#007AFF' : '#aaa', cursor: 'pointer' }}>
            {tab.icon}
            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{tab.label}</span>
          </div>
        ))}
      </div>
      
      {/* Full Screen Scanner Overlay */}
      {isScanning && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', zIndex: 10000, backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
          <button onClick={handleCancelScan} style={{ position: 'absolute', top: '40px', right: '20px', zIndex: 10001, padding: '10px 20px', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 'bold' }}>Close</button>
          <div id="qr-reader" style={{ width: '100%', margin: 'auto' }}></div>
        </div>
      )}

    </div>
  );
}

export default App;
