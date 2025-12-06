import React, { useState, useRef, useEffect } from 'react';
import Scene from './components/Scene';
// @ts-ignore
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { InteractionState } from './types';

const App: React.FC = () => {
  const [isUnleashed, setIsUnleashed] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<any>(null);
  const requestRef = useRef<number>(null);
  
  // Shared state for 60fps animations (Rotation/Scale)
  // We pass this ref to the Scene to avoid React re-renders on every frame
  const interactionRef = useRef<InteractionState>({
    rotation: 0,
    scale: 1,
    isHovering: false
  });

  // Initialize MediaPipe
  useEffect(() => {
    const loadModel = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        setModelLoaded(true);
        console.log("HandLandmarker loaded");
      } catch (error) {
        console.error("Error loading MediaPipe:", error);
      }
    };
    
    loadModel();
  }, []);

  // Camera handling and prediction loop
  useEffect(() => {
    let lastVideoTime = -1;

    const predict = () => {
      if (
        cameraEnabled && 
        videoRef.current && 
        landmarkerRef.current && 
        videoRef.current.readyState >= 2
      ) {
        let startTimeMs = performance.now();
        if (videoRef.current.currentTime !== lastVideoTime) {
          lastVideoTime = videoRef.current.currentTime;
          
          const result = landmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
          
          if (result.landmarks && result.landmarks.length > 0) {
            const landmarks = result.landmarks[0];
            interactionRef.current.isHovering = true;
            
            // --- 1. Gesture Detection: Open (Unleash) vs Closed (Form) ---
            const wrist = landmarks[0];
            const middleFingerMCP = landmarks[9]; // Base of middle finger
            const tips = [4, 8, 12, 16, 20];
            
            // Calculate Palm Size (Reference for Scale/Zoom)
            // Distance between Wrist(0) and Middle Finger MCP(9)
            const palmSize = Math.sqrt(
                Math.pow(wrist.x - middleFingerMCP.x, 2) + 
                Math.pow(wrist.y - middleFingerMCP.y, 2)
            );

            let extendedCount = 0;
            tips.forEach((tipIdx) => {
                const tip = landmarks[tipIdx];
                const dist = Math.sqrt(
                    Math.pow(tip.x - wrist.x, 2) + 
                    Math.pow(tip.y - wrist.y, 2)
                );
                // If tip is further than 1.5x palm size, it's open
                if (dist > palmSize * 1.5) {
                    extendedCount++;
                }
            });

            if (extendedCount >= 4) {
                setIsUnleashed(true);
            } else if (extendedCount <= 2) {
                setIsUnleashed(false);
            }

            // --- 2. Rotation Control (Hand X Position) ---
            const centroidX = middleFingerMCP.x; 
            // Map 0..1 to -PI..PI (Full rotation range)
            // Invert because webcam is mirrored
            // Smooth clamping can be handled in Scene via Lerp
            const targetRotation = (0.5 - centroidX) * 4.0; // Multiplier 4 for sensitivity
            interactionRef.current.rotation = targetRotation;

            // --- 3. Zoom/Scale Control (Palm Size / Z-Depth approximation) ---
            // Typical palmSize ranges from 0.05 (far) to 0.3 (close)
            // We want to map this to Scale 0.5 to 1.5
            // Normalize: (val - min) / (max - min)
            const minPalm = 0.05;
            const maxPalm = 0.25;
            const normalizedZoom = (Math.max(minPalm, Math.min(palmSize, maxPalm)) - minPalm) / (maxPalm - minPalm);
            const targetScale = 0.8 + (normalizedZoom * 0.7); // Result: 0.8 to 1.5
            
            interactionRef.current.scale = targetScale;

          } else {
            interactionRef.current.isHovering = false;
          }
        }
      }
      requestRef.current = requestAnimationFrame(predict);
    };

    if (cameraEnabled) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener('loadeddata', predict);
          }
        })
        .catch((err) => {
            console.error("Camera access denied:", err);
            setCameraEnabled(false);
        });
    } else {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }
        // Reset interaction state
        interactionRef.current = { rotation: 0, scale: 1, isHovering: false };
    }

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [cameraEnabled]);

  return (
    <div className="relative w-full h-full overflow-hidden font-serif text-lux-gold selection:bg-lux-gold selection:text-lux-emerald bg-[#00100d]">
      
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Scene isUnleashed={isUnleashed} interactionRef={interactionRef} />
      </div>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 flex flex-col justify-between p-8">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter drop-shadow-lg" style={{textShadow: '0 0 30px rgba(212, 175, 55, 0.6)'}}>
              THE GRAND TREE
            </h1>
            <p className="text-xl md:text-2xl mt-2 italic text-gray-300 font-light tracking-wide">
              Luxury. Interactive. Magnificent.
            </p>
          </div>
          
          <div className="pointer-events-auto flex flex-col items-end gap-4">
              <button 
                  onClick={() => setCameraEnabled(!cameraEnabled)}
                  disabled={!modelLoaded}
                  className={`px-4 py-2 border border-lux-gold/50 rounded-sm text-sm uppercase tracking-widest transition-all ${
                      cameraEnabled ? 'bg-lux-gold text-lux-emerald' : 'hover:bg-lux-gold/10 backdrop-blur-md'
                  } ${!modelLoaded ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                  {!modelLoaded ? 'Loading Model...' : cameraEnabled ? 'Disable Gesture' : 'Enable Gesture'}
              </button>
              
              {cameraEnabled && (
                  <div className="w-48 h-36 bg-black border-2 border-lux-gold rounded-lg overflow-hidden relative shadow-2xl transition-all duration-500">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80 scale-x-[-1]" />
                      <div className="absolute bottom-0 w-full bg-black/60 text-[10px] text-center p-1 text-white font-sans uppercase tracking-wider backdrop-blur-sm flex flex-col gap-1">
                          <span>{isUnleashed ? 'STATUS: UNLEASHED' : 'STATUS: FORMED'}</span>
                          <span className="text-[8px] opacity-70">MOVE X: ROTATE | MOVE Z: ZOOM</span>
                      </div>
                      
                      {/* Detection Visualizer Overlay */}
                      <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${isUnleashed ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-green-500 shadow-[0_0_10px_green]'}`}></div>
                  </div>
              )}
          </div>
        </div>

        {/* Footer / Trigger */}
        <div className="w-full flex justify-center pb-8">
          <button
              onMouseDown={() => setIsUnleashed(true)}
              onMouseUp={() => setIsUnleashed(false)}
              onTouchStart={() => setIsUnleashed(true)}
              onTouchEnd={() => setIsUnleashed(false)}
              className="group relative px-16 py-6 pointer-events-auto transition-transform active:scale-95"
          >
              <div className="absolute inset-0 border-2 border-lux-gold transform skew-x-12 bg-black/40 backdrop-blur-md group-hover:bg-lux-gold/20 transition-all duration-300 box-shadow-xl"></div>
              <span className="relative text-3xl tracking-[0.25em] font-bold uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-lux-gold group-hover:text-white transition-colors">
                  {isUnleashed ? 'RELEASE TO FORM' : 'HOLD TO UNLEASH'}
              </span>
          </button>
        </div>
      </div>

      {/* Decorative Borders */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-lux-gold opacity-50 pointer-events-none z-20"></div>
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-lux-gold opacity-50 pointer-events-none z-20"></div>
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-lux-gold opacity-50 pointer-events-none z-20"></div>
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-lux-gold opacity-50 pointer-events-none z-20"></div>
    </div>
  );
};

export default App;