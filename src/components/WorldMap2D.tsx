import { motion } from 'framer-motion';
import { useMemo, memo } from 'react';

interface WorldMap2DProps {
  destinations?: { name: string; lat?: number; lng?: number }[];
}

// Simplified Lat/Lng to XY for a standard Equirectangular projection
const project = (lat: number, lng: number, width: number, height: number) => {
  const x = (lng + 180) * (width / 360);
  const y = (90 - lat) * (height / 180);
  return { x, y };
};

// Common city coordinates for markers
const CITY_COORDS: Record<string, { lat: number, lng: number }> = {
  'PARIS': { lat: 48.8566, lng: 2.3522 },
  'LONDON': { lat: 51.5074, lng: -0.1278 },
  'NEW YORK': { lat: 40.7128, lng: -74.0060 },
  'TOKYO': { lat: 35.6762, lng: 139.6503 },
  'SYDNEY': { lat: -33.8688, lng: 151.2093 },
  'DUBAI': { lat: 25.2048, lng: 55.2708 },
};

function WorldMap2D({ destinations = [] }: WorldMap2DProps) {
  const width = 1000;
  const height = 500;

  const markers = useMemo(() => {
    return destinations.map((d) => {
      const coords = CITY_COORDS[d.name.toUpperCase()] || { 
        lat: (Math.random() - 0.5) * 120, 
        lng: (Math.random() - 0.5) * 240 
      };
      const { x, y } = project(d.lat ?? coords.lat, d.lng ?? coords.lng, width, height);
      return { ...d, x, y };
    });
  }, [destinations]);

  return (
    <div className="w-full h-full relative flex items-center justify-center p-8 select-none">
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-auto opacity-40 filter drop-shadow-[0_0_10px_rgba(90,200,250,0.2)]"
      >
        <defs>
          <pattern id="dotPattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="currentColor" className="text-atlas-cyan/40" />
          </pattern>
          
          <mask id="mapMask">
             <rect width={width} height={height} fill="white" fillOpacity="0.1" />
          </mask>
        </defs>

        <g className="stroke-atlas-border" strokeWidth="0.5" fill="none">
           {[...Array(5)].map((_, i) => (
             <circle key={i} cx={width/2} cy={height/2} r={(i+1) * 100} opacity={0.3 - i*0.05} />
           ))}
           <line x1="0" y1={height/2} x2={width} y2={height/2} opacity="0.2" />
           <line x1={width/2} y1="0" x2={width/2} y2={height} opacity="0.2" />
        </g>

        <rect width={width} height={height} fill="url(#dotPattern)" mask="url(#mapMask)" />

        {markers.map((m, i) => (
          <motion.g 
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            <motion.circle 
              cx={m.x} 
              cy={m.y} 
              r="8" 
              className="fill-atlas-amber/20"
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            
            <circle cx={m.x} cy={m.y} r="2.5" className="fill-atlas-amber" />
            
            <text 
              x={m.x + 8} 
              y={m.y - 8} 
              className="dot-matrix fill-atlas-amber text-[9px] font-bold"
            >
              {m.name.toUpperCase()}
            </text>
          </motion.g>
        ))}
      </svg>
      
      <div className="absolute bottom-8 right-8 text-right space-y-1 opacity-40">
         <div className="dot-matrix text-[8px] text-atlas-amber">RADAR_SWEEP_ACTIVE</div>
         <div className="w-12 h-[1px] bg-atlas-amber ml-auto opacity-50" />
      </div>
    </div>
  );
}

export default memo(WorldMap2D);
