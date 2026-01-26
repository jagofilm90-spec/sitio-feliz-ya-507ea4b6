import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/**
 * Genera un color de fondo consistente basado en el email
 */
export const generateAvatarColor = (email: string): string => {
  const colors = [
    '#1a73e8', // Google Blue
    '#ea4335', // Google Red
    '#34a853', // Google Green
    '#fbbc04', // Google Yellow
    '#673ab7', // Purple
    '#e91e63', // Pink
    '#00bcd4', // Cyan
    '#ff5722', // Deep Orange
    '#3f51b5', // Indigo
    '#009688', // Teal
  ];
  
  const hash = email.split('').reduce((acc, char) => {
    acc = ((acc << 5) - acc) + char.charCodeAt(0);
    return acc & acc;
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Extrae las iniciales del nombre del remitente
 */
export const getInitials = (name: string): string => {
  const cleanName = name.trim().replace(/"/g, '');
  const words = cleanName.split(' ').filter(w => w.length > 0);
  
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  
  if (cleanName.length >= 2) {
    return cleanName.slice(0, 2).toUpperCase();
  }
  
  return cleanName.slice(0, 1).toUpperCase() || '?';
};

/**
 * Extrae el nombre del campo "from" del email
 */
export const extractSenderName = (from: string): string => {
  // Intentar extraer nombre antes del email
  const match = from.match(/^([^<]+)/);
  if (match) {
    const name = match[1].trim().replace(/"/g, "");
    if (name.length > 0) return name;
  }
  // Fallback: usar parte antes del @
  const emailMatch = from.match(/<([^>]+)>/) || [null, from];
  const email = emailMatch[1] || from;
  return email.split("@")[0];
};

/**
 * Extrae el email del campo "from"
 */
export const extractSenderEmail = (from: string): string => {
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1];
  if (from.includes('@')) return from.trim();
  return from;
};

interface EmailAvatarMobileProps {
  from: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-11 w-11 text-sm font-medium',
};

const EmailAvatarMobile = ({ from, size = 'lg', className = '' }: EmailAvatarMobileProps) => {
  const email = extractSenderEmail(from);
  const name = extractSenderName(from);
  const initials = getInitials(name);
  const bgColor = generateAvatarColor(email);

  return (
    <Avatar className={`${sizeClasses[size]} shrink-0 ${className}`}>
      <AvatarFallback
        style={{ backgroundColor: bgColor }}
        className="text-white font-medium"
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};

export default EmailAvatarMobile;
