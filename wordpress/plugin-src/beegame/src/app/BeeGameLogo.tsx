// src/app/BeeGameLogo.tsx
import React from 'react'; 

const BeeGameLogo: React.FC = () => {
  return (
    <svg
      id="logo"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 160"
      aria-label="BeeLab"
    >
      <rect width="100%" height="100%" fill="none" />

      <g id="wordmark" transform="translate(256,70)">
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Noto Sans', Arial"
          fontSize="64"
          fontWeight="800"
          letterSpacing="1.5"
        >
          <tspan className="line1">Bee</tspan>
          <tspan className="line2">Game</tspan>
        </text>
      </g>

      <g id="tagline" transform="translate(256,120)">
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="28"
          fontWeight="600"
          letterSpacing="1"
        >
          <tspan className="powered">Wordpress Plugin</tspan>
        </text>
      </g>
    </svg>
  );
};

export default BeeGameLogo;
