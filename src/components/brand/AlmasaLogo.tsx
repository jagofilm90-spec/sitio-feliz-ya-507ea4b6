import { SVGProps } from 'react';

interface AlmasaLogoProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export const AlmasaLogo = ({ size = 32, ...props }: AlmasaLogoProps) => (
  <svg
    width={size}
    height={size * 0.9}
    viewBox="0 0 200 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g stroke="#c41e3a" strokeWidth="7" strokeLinecap="round" fill="none">
      <path d="M 20 160 C 35 5, 165 5, 180 160" />
      <path d="M 50 160 C 62 38, 138 38, 150 160" />
      <path d="M 80 160 C 88 75, 112 75, 120 160" />
    </g>
    <circle cx="100" cy="125" r="5.5" fill="#c41e3a" />
  </svg>
);
