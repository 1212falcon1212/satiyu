interface MountainDividerProps {
  className?: string;
  flip?: boolean;
}

export function MountainDivider({ className = '', flip = false }: MountainDividerProps) {
  return (
    <svg
      viewBox="0 0 1440 60"
      preserveAspectRatio="none"
      className={`w-full ${flip ? 'rotate-180' : ''} ${className}`}
      fill="currentColor"
    >
      <path d="M0,60 L0,30 Q120,0 240,25 T480,15 T720,30 T960,10 T1200,25 T1440,20 L1440,60 Z" />
    </svg>
  );
}

export function TreeLine({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 120"
      preserveAspectRatio="xMidYMax meet"
      className={`absolute bottom-0 left-0 w-full opacity-[0.03] pointer-events-none ${className}`}
      fill="currentColor"
    >
      {/* Scattered pine trees */}
      <polygon points="50,120 65,40 80,120" />
      <polygon points="58,80 65,30 72,80" />
      <polygon points="140,120 160,50 180,120" />
      <polygon points="150,90 160,35 170,90" />
      <polygon points="280,120 295,55 310,120" />
      <polygon points="287,85 295,40 303,85" />
      <polygon points="400,120 420,45 440,120" />
      <polygon points="410,85 420,30 430,85" />
      <polygon points="520,120 535,60 550,120" />
      <polygon points="527,90 535,45 543,90" />
      <polygon points="650,120 670,50 690,120" />
      <polygon points="660,85 670,35 680,85" />
      <polygon points="750,120 765,55 780,120" />
      <polygon points="757,85 765,40 773,85" />
    </svg>
  );
}

export function CompassIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 ${className}`}
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" fill="currentColor" opacity="0.2" />
      <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" />
    </svg>
  );
}
