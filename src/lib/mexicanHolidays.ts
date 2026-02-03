/**
 * Mexican Holidays Utility
 * 
 * Calculates all official Mexican holidays according to the Federal Labor Law (LFT)
 * including Easter-dependent dates (Semana Santa) using the Computus algorithm.
 * 
 * Official holidays in Mexico:
 * - January 1: New Year's Day
 * - First Monday of February: Constitution Day
 * - Third Monday of March: Benito Juárez's Birthday
 * - Holy Thursday (3 days before Easter)
 * - Good Friday (2 days before Easter)
 * - May 1: Labor Day
 * - September 16: Independence Day
 * - Third Monday of November: Revolution Day
 * - December 25: Christmas
 */

export interface MexicanHoliday {
  date: string;       // "2026-02-02"
  name: string;       // "Día de la Constitución"
  shortName: string;  // "Constitución"
}

/**
 * Computus algorithm to calculate Easter Sunday for any year
 * Based on the Anonymous Gregorian algorithm
 */
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Get the Nth Monday of a given month
 * @param year - The year
 * @param month - The month (0-indexed: 0=January, 1=February, etc.)
 * @param n - Which Monday (1=first, 2=second, 3=third)
 */
function getNthMonday(year: number, month: number, n: number): Date {
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay();
  // Calculate days until first Monday
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
  const firstMonday = new Date(year, month, 1 + daysUntilMonday);
  // Add (n-1) weeks to get the Nth Monday
  firstMonday.setDate(firstMonday.getDate() + (n - 1) * 7);
  return firstMonday;
}

/**
 * Format a Date object to "YYYY-MM-DD" string
 */
function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get all official Mexican holidays for a given year
 * @param year - The year to calculate holidays for
 * @returns Array of MexicanHoliday objects sorted by date
 */
export function getMexicanHolidays(year: number): MexicanHoliday[] {
  const holidays: MexicanHoliday[] = [];

  // Fixed holidays
  holidays.push({ 
    date: `${year}-01-01`, 
    name: "Año Nuevo", 
    shortName: "Año Nuevo" 
  });
  holidays.push({ 
    date: `${year}-05-01`, 
    name: "Día del Trabajo", 
    shortName: "Trabajo" 
  });
  holidays.push({ 
    date: `${year}-09-16`, 
    name: "Día de la Independencia", 
    shortName: "Independencia" 
  });
  holidays.push({ 
    date: `${year}-12-25`, 
    name: "Navidad", 
    shortName: "Navidad" 
  });

  // First Monday of February (Constitution Day)
  const constitutionDay = getNthMonday(year, 1, 1); // month 1 = February
  holidays.push({ 
    date: formatDateISO(constitutionDay), 
    name: "Día de la Constitución", 
    shortName: "Constitución" 
  });

  // Third Monday of March (Benito Juárez's Birthday)
  const juarezDay = getNthMonday(year, 2, 3); // month 2 = March
  holidays.push({ 
    date: formatDateISO(juarezDay), 
    name: "Natalicio de Benito Juárez", 
    shortName: "B. Juárez" 
  });

  // Third Monday of November (Revolution Day)
  const revolutionDay = getNthMonday(year, 10, 3); // month 10 = November
  holidays.push({ 
    date: formatDateISO(revolutionDay), 
    name: "Día de la Revolución Mexicana", 
    shortName: "Revolución" 
  });

  // Holy Week (based on Easter)
  const easter = calculateEaster(year);
  
  // Holy Thursday (3 days before Easter)
  const holyThursday = new Date(easter);
  holyThursday.setDate(easter.getDate() - 3);
  holidays.push({ 
    date: formatDateISO(holyThursday), 
    name: "Jueves Santo", 
    shortName: "Jue. Santo" 
  });

  // Good Friday (2 days before Easter)
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.push({ 
    date: formatDateISO(goodFriday), 
    name: "Viernes Santo", 
    shortName: "Vie. Santo" 
  });

  // Sort by date
  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Check if a specific date is a Mexican holiday
 * @param dateStr - Date string in "YYYY-MM-DD" format
 * @returns The holiday object if it's a holiday, null otherwise
 */
export function isHoliday(dateStr: string): MexicanHoliday | null {
  if (!dateStr) return null;
  const year = parseInt(dateStr.split('-')[0]);
  if (isNaN(year)) return null;
  const holidays = getMexicanHolidays(year);
  return holidays.find(h => h.date === dateStr) || null;
}

/**
 * Get only the date strings of Mexican holidays for a given year
 * Useful for checking if a date is a holiday
 * @param year - The year to get holiday dates for
 * @returns Array of date strings in "YYYY-MM-DD" format
 */
export function getMexicanHolidayDates(year: number): string[] {
  return getMexicanHolidays(year).map(h => h.date);
}

/**
 * Check if a date is a Sunday
 * @param dateStr - Date string in "YYYY-MM-DD" format
 * @returns true if the date is a Sunday
 */
export function isSunday(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getDay() === 0;
}

/**
 * Check if a date is a business day (not Sunday and not a holiday)
 * Note: Saturday (6) IS a working day for this company
 * @param dateStr - Date string in "YYYY-MM-DD" format
 * @returns true if the date is a business day
 */
export function isBusinessDay(dateStr: string): boolean {
  return !isSunday(dateStr) && !isHoliday(dateStr);
}
