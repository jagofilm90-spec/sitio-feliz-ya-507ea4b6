import { CSSProperties } from 'react';

interface Props {
  size?: number;
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export const AlmasaLoading = ({ 
  size = 64, 
  text, 
  fullScreen = false,
  className = '' 
}: Props) => {
  const containerStyle: CSSProperties = fullScreen ? {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(8px)',
    zIndex: 9999,
    gap: '24px'
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    gap: '24px'
  };

  return (
    <div style={containerStyle} className={className}>
      <svg
        width={size}
        height={size * 0.9}
        viewBox="0 0 200 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g stroke="#c41e3a" strokeWidth="9" strokeLinecap="round" fill="none">
          <path d="M 20 160 C 35 5, 165 5, 180 160" className="loading-arc-1" />
          <path d="M 50 160 C 62 38, 138 38, 150 160" className="loading-arc-2" />
          <path d="M 80 160 C 88 75, 112 75, 120 160" className="loading-arc-3" />
        </g>
        <circle cx="100" cy="125" r="6" fill="#c41e3a" className="loading-dot" />
      </svg>
      {text && (
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: '15px',
          fontStyle: 'italic',
          color: '#6a6a6a',
          letterSpacing: '0.02em'
        }}>
          {text}
        </p>
      )}
    </div>
  );
};
