import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, ImageOverlay, Polyline, Marker, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import createGraph from 'ngraph.graph';
import { aStar } from 'ngraph.path';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { mapConfigs } from './mapConfigs';
import './App.css';

function MapController({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const fitMap = () => {
      map.fitBounds(bounds, { padding: [20, 20], animate: false });
    };
    fitMap();
    window.addEventListener('resize', fitMap);
    return () => window.removeEventListener('resize', fitMap);
  }, [map, bounds]);
  return null;
}

function App() {
  const [activeMap, setActiveMap] = useState('hostel');
  const currentMap = mapConfigs[activeMap];
  
  const [startNode, setStartNode] = useState(currentMap.locations[0]?.id || '');
  const [endNode, setEndNode] = useState(currentMap.locations[1]?.id || '');
  const [pathCoords, setPathCoords] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  
  // New state variables for marker and orientation
  const [heading, setHeading] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTrackingSteps, setIsTrackingSteps] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  
  const scannerRef = useRef(null);

  // Reset when map changes
  useEffect(() => {
    setStartNode(currentMap.locations[0]?.id || '');
    setEndNode(currentMap.locations[1]?.id || '');
    setPathCoords([]);
    setCurrentPosition(null);
    setCurrentStepIndex(0);
    setIsTrackingSteps(false);
    setIsSheetExpanded(false);
  }, [activeMap, currentMap]);

  const locations = currentMap.locations;

  const locationsByCategory = useMemo(() => {
    return locations.reduce((acc, loc) => {
      if (!acc[loc.category]) acc[loc.category] = [];
      acc[loc.category].push(loc);
      return acc;
    }, {});
  }, [locations]);

  const { graph, pathfinder } = useMemo(() => {
    // Initialize a graph using ngraph.graph
    const g = createGraph();

    // Populate it with all nodes
    currentMap.nodes.forEach((node) => {
      g.addNode(node.id, { x: node.x, y: node.y });
    });

    // Populate it with all edges
    currentMap.links.forEach((edge) => {
      g.addLink(edge.source, edge.target);
    });

    // Calculate shortest path using A*
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

  // Listen to device orientation for heading
  useEffect(() => {
    const handleOrientation = (e) => {
      let compassHeading = 0;
      if (e.webkitCompassHeading) {
        compassHeading = e.webkitCompassHeading;
      } else if (e.alpha !== null) {
        // Fallback for Android - alpha is counter-clockwise from Earth's poles, approximation needed
        compassHeading = 360 - e.alpha; 
      }
      setHeading(compassHeading);
    };
    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => window.removeEventListener("deviceorientation", handleOrientation, true);
  }, []);

  // Recalculate route whenever startNode or endNode changes
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
        // Extract coordinates and map {x, y} to [1000 - y, x] for Leaflet (Figma top-left origin fix)
        const coords = foundPath.map((node) => [1000 - node.data.y, node.data.x]);
        setPathCoords(coords);
        // Reset current position to the start of the path
        setCurrentPosition(coords[0]);
        setCurrentStepIndex(0);
        setIsTrackingSteps(false);
      } else {
        console.warn('Node not found in graph', startNode, endNode);
        setPathCoords([]);
        setCurrentPosition(null);
        setCurrentStepIndex(0);
        setIsTrackingSteps(false);
      }
    } catch (error) {
      console.error("Error finding path:", error);
      setPathCoords([]);
      setCurrentPosition(null);
      setCurrentStepIndex(0);
      setIsTrackingSteps(false);
    }
  }, [startNode, endNode, pathfinder]);

  const { totalLength, segmentLengths } = useMemo(() => {
    let totalLength = 0;
    const segmentLengths = [];
    if (pathCoords.length > 1) {
      for (let i = 0; i < pathCoords.length - 1; i++) {
        const p1 = pathCoords[i];
        const p2 = pathCoords[i+1];
        const dist = Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
        totalLength += dist;
        segmentLengths.push(dist);
      }
    }
    return { totalLength, segmentLengths };
  }, [pathCoords]);

  // Listen to device motion for step tracking
  useEffect(() => {
    if (!isTrackingSteps || pathCoords.length === 0) return;

    let lastStepTime = 0;

    const handleMotion = (event) => {
      if (!event.accelerationIncludingGravity) return;

      const { x, y, z } = event.accelerationIncludingGravity;
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // Basic peak detection threshold and debounce
      const threshold = 12;
      const now = Date.now();
      const cooldown = 300;

      if (magnitude > threshold && now - lastStepTime > cooldown) {
        lastStepTime = now;
        
        setCurrentStepIndex((prevIndex) => prevIndex + 1);
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isTrackingSteps, pathCoords]);

  // Update currentPosition when currentStepIndex changes during step tracking
  useEffect(() => {
    if (isTrackingSteps && pathCoords.length > 1) {
      const pixelsPerStep = 15;
      const targetDistance = currentStepIndex * pixelsPerStep;

      if (targetDistance >= totalLength) {
        setCurrentPosition(pathCoords[pathCoords.length - 1]);
      } else {
        let walked = 0;
        let currentSegIndex = 0;
        for (let i = 0; i < segmentLengths.length; i++) {
          if (walked + segmentLengths[i] >= targetDistance) {
            currentSegIndex = i;
            break;
          }
          walked += segmentLengths[i];
        }

        const segDist = targetDistance - walked;
        const segRatio = segmentLengths[currentSegIndex] > 0 ? segDist / segmentLengths[currentSegIndex] : 0;
        const p1 = pathCoords[currentSegIndex];
        const p2 = pathCoords[currentSegIndex + 1];
        
        const y = p1[0] + (p2[0] - p1[0]) * segRatio;
        const x = p1[1] + (p2[1] - p1[1]) * segRatio;
        
        setCurrentPosition([y, x]);
      }
    }
  }, [currentStepIndex, isTrackingSteps, pathCoords, totalLength, segmentLengths]);

  const handleStartScan = () => {
    setIsScanning(true);
    // Allow DOM to update and render the qr-reader div before initializing scanner
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scannerRef.current = scanner;

      scanner.render((decodedText) => {
        // Handle successful scan
        const scannedId = decodedText.trim();
        console.log('Scanned QR:', scannedId);
        
        // Validate against currentMap.nodes
        const node = currentMap.nodes.find(n => n.id === scannedId);
        if (node) {
          setStartNode(scannedId);
          scanner.clear();
          setIsScanning(false);
          
          // Update map center to this node's coordinates
          if (mapRef.current) {
            mapRef.current.setView([1000 - node.y, node.x], 1);
          }
        } else {
          console.warn('Invalid QR code scanned: not found in current map', scannedId);
          alert('Invalid location QR code for this map.');
        }
      }, (error) => {
        // Handle scan failure silently, as it triggers on every frame without a QR code
      });
    }, 100);
  };

  const handleCancelScan = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
    }
    setIsScanning(false);
  };

  const handleToggleTracking = async () => {
    if (!isTrackingSteps) {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
          const permissionState = await DeviceMotionEvent.requestPermission();
          if (permissionState === 'granted') {
            setIsTrackingSteps(true);
          } else {
            alert('Permission to access device motion is required for step tracking.');
          }
        } catch (error) {
          console.error("Error requesting device motion permission:", error);
          alert("Error requesting permission.");
        }
      } else {
        setIsTrackingSteps(true);
      }
    } else {
      setIsTrackingSteps(false);
    }
  };

  // Simulate Walk over a 5-second interval
  const handleSimulateWalk = () => {
    if (pathCoords.length < 2) return;
    
    let startTime = null;
    const duration = 5000; // 5 seconds

    // Calculate total path length
    let totalLength = 0;
    const segmentLengths = [];
    for (let i = 0; i < pathCoords.length - 1; i++) {
      const p1 = pathCoords[i];
      const p2 = pathCoords[i+1];
      const dist = Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
      totalLength += dist;
      segmentLengths.push(dist);
    }

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const targetDistance = progress * totalLength;
      
      let walked = 0;
      let currentSegIndex = 0;
      for (let i = 0; i < segmentLengths.length; i++) {
        if (walked + segmentLengths[i] >= targetDistance) {
          currentSegIndex = i;
          break;
        }
        walked += segmentLengths[i];
      }

      if (progress < 1) {
        const segDist = targetDistance - walked;
        const segRatio = segmentLengths[currentSegIndex] > 0 ? segDist / segmentLengths[currentSegIndex] : 0;
        const p1 = pathCoords[currentSegIndex];
        const p2 = pathCoords[currentSegIndex + 1];
        
        const y = p1[0] + (p2[0] - p1[0]) * segRatio;
        const x = p1[1] + (p2[1] - p1[1]) * segRatio;
        
        setCurrentPosition([y, x]);
        requestAnimationFrame(animate);
      } else {
        // Snap to the very end when animation completes
        setCurrentPosition(pathCoords[pathCoords.length - 1]);
      }
    };
    
    requestAnimationFrame(animate);
  };

  // Custom marker icon with dynamic heading
  const userIcon = L.divIcon({
    className: 'custom-user-marker',
    html: `<div class="pulsing-marker"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const mapRef = useRef(null);

  return (
    <div style={{ height: '100dvh', width: '100vw', margin: 0, padding: 0, overflow: 'hidden', position: 'relative' }}>
      
      {/* Map Selector UI */}
      <div className="glass-panel" style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 2000,
        padding: '8px 16px',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <label htmlFor="mapSelect" style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>Map:</label>
        <select
          id="mapSelect"
          value={activeMap}
          onChange={(e) => setActiveMap(e.target.value)}
          style={{
            border: 'none',
            background: 'transparent',
            fontWeight: 'bold',
            color: '#007AFF',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="hostel">Premium Hostel</option>
          <option value="office">Corporate Office</option>
        </select>
      </div>

      {/* Full Screen Scanner Overlay */}
      {isScanning && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          zIndex: 2000,
          backgroundColor: '#000',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <button 
            onClick={handleCancelScan}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              zIndex: 2001,
              padding: '10px 20px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
            }}
          >
            Close
          </button>
          <div id="qr-reader" style={{ width: '100%', margin: 'auto' }}></div>
        </div>
      )}

      {/* Top HUD Banner */}
      <div className="glass-panel" style={{
        position: 'absolute',
        top: '80px',
        left: '5%',
        width: '90%',
        zIndex: 1000,
        padding: '16px',
        borderRadius: '16px',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}>
        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
          {pathCoords.length > 0
            ? `Navigating to: ${locations.find(l => l.id === endNode)?.name || endNode}`
            : 'Select a destination'}
        </span>
      </div>

      {/* Floating Action Buttons */}
      <div style={{
        position: 'absolute',
        bottom: '180px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        alignItems: 'flex-end'
      }}>
        <button 
          className="glass-panel"
          onClick={handleStartScan}
          style={{
            padding: '14px 24px',
            color: '#007AFF',
            border: 'none',
            borderRadius: '30px',
            fontWeight: 'bold',
            fontSize: '15px',
            cursor: 'pointer'
          }}
        >
          Scan QR
        </button>

        <button 
          className="glass-panel"
          onClick={handleSimulateWalk}
          disabled={pathCoords.length < 2 || isTrackingSteps}
          style={{
            padding: '14px 24px',
            color: pathCoords.length < 2 || isTrackingSteps ? '#888' : '#28a745',
            border: 'none',
            borderRadius: '30px',
            fontWeight: 'bold',
            fontSize: '15px',
            cursor: pathCoords.length < 2 || isTrackingSteps ? 'not-allowed' : 'pointer'
          }}
        >
          Simulate Walk
        </button>

      </div>

      {/* Bottom Sheet UI Panel */}
      <div className="glass-panel" style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        zIndex: 1000,
        padding: '20px 24px 32px',
        borderRadius: '24px 24px 0 0',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: isSheetExpanded ? '75vh' : '140px',
        transition: 'max-height 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        overflow: 'hidden'
      }}>
        {/* Header - Always visible */}
        <div 
          onClick={() => setIsSheetExpanded(!isSheetExpanded)}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>Destination</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#222' }}>
              {locations.find(l => l.id === endNode)?.name || 'Select Destination'}
            </div>
          </div>
          {/* Chevron */}
          <div style={{
            transform: isSheetExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
            color: '#007bff'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        {/* Minimal Actions - Always visible right under header */}
        <div style={{ 
          marginTop: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#666' }}>
            From: <span style={{ color: '#007bff', fontWeight: 'bold' }}>{startNode}</span>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleTracking();
            }}
            disabled={pathCoords.length < 2}
            style={{
              padding: '10px 20px',
              backgroundColor: pathCoords.length < 2 ? '#aaa' : (isTrackingSteps ? '#dc3545' : '#17a2b8'),
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              boxShadow: pathCoords.length < 2 ? 'none' : '0 2px 8px rgba(0,0,0,0.2)',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: pathCoords.length < 2 ? 'not-allowed' : 'pointer'
            }}
          >
            {isTrackingSteps ? 'Stop Tracking' : 'Start Live Tracking'}
          </button>
        </div>

        {/* Expanded List */}
        <div style={{ 
          marginTop: '20px', 
          overflowY: 'auto', 
          flex: 1,
          opacity: isSheetExpanded ? 1 : 0,
          pointerEvents: isSheetExpanded ? 'auto' : 'none',
          transition: 'opacity 0.3s 0.1s' 
        }}>
          {Object.entries(locationsByCategory).map(([category, locs]) => (
            <div key={category} style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 'bold', color: '#888', marginBottom: '10px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {category}
              </div>
              {locs.map(loc => (
                <div
                  key={loc.id}
                  onClick={() => {
                    setEndNode(loc.id);
                    setIsSheetExpanded(false);
                  }}
                  style={{
                    padding: '14px 16px',
                    backgroundColor: endNode === loc.id ? 'rgba(0, 122, 255, 0.15)' : 'rgba(255, 255, 255, 0.4)',
                    borderRadius: '12px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    color: endNode === loc.id ? '#007AFF' : '#333',
                    transition: 'background-color 0.2s',
                    border: endNode === loc.id ? '1px solid rgba(0, 122, 255, 0.3)' : '1px solid transparent'
                  }}
                >
                  {loc.name}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <MapContainer
        ref={mapRef}
        crs={L.CRS.Simple}
        bounds={currentMap.bounds}
        zoomSnap={0.1}
        maxZoom={3}
        zoomControl={false}
        style={{ height: '100dvh', width: '100vw', position: 'absolute', top: 0, left: 0, zIndex: 0, backgroundColor: '#F4F9F7' }}
      >
        <MapController bounds={currentMap.bounds} />
        <ZoomControl position="topright" />
        <ImageOverlay url={currentMap.imageUrl} bounds={currentMap.bounds} />
        {pathCoords.length > 0 && (
          <Polyline positions={pathCoords} color="#007AFF" weight={5} dashArray="10, 15" className="flowing-route" />
        )}
        
        {currentPosition && (
          <Marker position={currentPosition} icon={userIcon} />
        )}
      </MapContainer>
    </div>
  );
}

export default App;
