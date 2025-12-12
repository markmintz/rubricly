/* components/Footer.jsx */
import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background text-text mt-8 py-2 border-t border-primary/20 relative z-10">
      <div className="max-w-6xl mx-auto px-4 text-center">
        
        {/* Logo and App Info */}
        <div className="flex flex-col items-center"> 
          <img
            src="/Northern.png" 
            alt="Ohio Northern University Logo"
            className="h-20 w-auto filter brightness-200"
          />
          <p className="text-sm mt-1 font-medium text-primary tracking-wider"> 
            Rubricly: PRB Parser
          </p>
        </div>

        {/* Team and Course Information */}
        <div className="text-sm space-y-0.5 text-secondary mt-2"> 
          <p>
            Developed by: <span className="text-text font-semibold">Syntax Sorcerers</span>
          </p>
          <p>
            Designed for: Ohio Northern University, Software Development Project (ECCS 3421)
          </p>
        </div>

        {/* Copyright */}
        <p className="mt-2 text-sm text-secondary/80">
          &copy; {currentYear} All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;