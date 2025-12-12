// components/ShapeShifterBackground.jsx
import React, { useEffect, useRef } from 'react';
import S from '../utils/shapeShifterLogic'; // Import the new logic file

const ShapeShifterBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    
    // Initialize the Shape Shifter canvas logic
    if (canvas) {
      S.init(canvas);
    }
    
    // Cleanup is complex in the original code, but we ensure init is only run once
  }, []);

  return (
    // Canvas must be fixed and full-screen, positioned in front of content
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full block z-10 pointer-events-none"
      style={{ transform: 'scale(0.5)', transformOrigin: 'top' }}
    />
  );
};

export default ShapeShifterBackground;