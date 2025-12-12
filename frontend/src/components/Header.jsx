// components/Header.jsx
import React from 'react';
import ShapeShifterBackground from './ShapeShifterBackground';

function Header() {
  return (
    <div className="relative h-48">
      {/* ShapeShifter Background - Fixed canvas */}
      <ShapeShifterBackground />
      
      {/* Header content has been moved to MainContent.jsx */}
    </div>
  );
}

export default Header;