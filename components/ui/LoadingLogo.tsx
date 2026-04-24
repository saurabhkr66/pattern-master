"use client";

import React from 'react';

/**
 * LoadingLogo component that uses CSS variables for theme-aware colors.
 * This prevents flashes of the wrong theme during initial load/reload.
 */
export default function LoadingLogo() {
  return (
    <div 
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center transition-opacity duration-500"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-[500px] px-10 animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 150" width="100%" height="100%">
          <defs>
            <style>
              {`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,600;0,800;1,600;1,800&display=swap');
                .text-battle { 
                  font-family: 'Poppins', system-ui, sans-serif; 
                  font-weight: 800; 
                  font-style: italic; 
                  fill: var(--text-primary); 
                }
                .text-exam { 
                  font-family: 'Poppins', system-ui, sans-serif; 
                  font-weight: 600; 
                  font-style: italic; 
                  fill: #FF8F00; /* Matching the vivid amber from theme.ts */
                }
                .text-tagline { 
                  font-family: 'Poppins', system-ui, sans-serif; 
                  font-weight: 600; 
                  font-style: italic; 
                  fill: var(--text-secondary); 
                  letter-spacing: 2px; 
                }
              `}
            </style>
          </defs>
          
          <g transform="translate(15, 15) scale(0.95)">
            {/* Logo Shield - Navy/Light to Amber/Dark */}
            <path d="M 50 2 C 22 8 8 25 8 45 L 8 75 C 8 98 30 112 50 120 L 50 2 Z" fill="var(--text-primary)"/>
            <path d="M 50 2 C 78 8 92 25 92 45 L 92 75 C 92 98 70 112 50 120" fill="none" stroke="#FF8F00" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round"/>
            
            {/* White parts of the logo - using bg-surface to ensure they contrast correctly */}
            <path d="M 50 12 L 38 48 L 45 66 L 32 66 L 32 72 L 44 72 L 44 94 L 36 102 L 50 108 Z" fill="var(--bg-surface)"/>
            <path d="M 50 12 L 62 48 L 55 66 L 68 66 L 68 72 L 56 72 L 56 94 L 64 102 L 50 108 Z" fill="var(--text-primary)"/>
            
            {/* Small details */}
            <path d="M 50 40 A 4 4 0 0 0 50 48 Z" fill="var(--text-primary)"/>
            <rect x="49" y="22" width="1" height="18" fill="var(--text-primary)"/>
            <path d="M 50 40 A 4 4 0 0 1 50 48 Z" fill="var(--bg-surface)"/>
            <rect x="50" y="22" width="1" height="18" fill="var(--bg-surface)"/>
          </g>

          <text x="130" y="90" fontSize="76" className="text-battle">Battle<tspan className="text-exam">Exam</tspan></text>
          
          <g transform="translate(0, 125)">
            <line x1="135" y1="0" x2="185" y2="0" stroke="var(--text-muted)" strokeWidth="2"/>
            <text x="200" y="5" fontSize="16" className="text-tagline">PRACTICE TODAY, ACE TOMORROW</text>
            <line x1="535" y1="0" x2="585" y2="0" stroke="#FF8F00" strokeWidth="2"/>
          </g>
        </svg>
      </div>
    </div>
  );
}
