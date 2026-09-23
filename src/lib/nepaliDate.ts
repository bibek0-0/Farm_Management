import NepaliDate from 'nepali-date-converter';

export const NEPALI_MONTHS_NP = [
  'बैशाख',
  'जेठ',
  'असार',
  'साउन',
  'भदौ',
  'असोज',
  'कात्तिक',
  'मंसिर',
  'पुस',
  'माघ',
  'फागुन',
  'चैत',
];

export const NEPALI_MONTHS_EN = [
  'Baisakh',
  'Jestha',
  'Asar',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
];

export const NEPALI_DAYS_NP = [
  'आइतबार',
  'सोमबार',
  'मंगलबार',
  'बुधबार',
  'बिहीबार',
  'शुक्रबार',
  'शनिबार',
];

export const NEPALI_DAYS_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Converts Western digits (0-9) to Nepali Devanagari numerals (०-९)
 */
export function toNepaliDigits(num: number | string): string {
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return String(num).replace(/\d/g, (d) => nepaliDigits[parseInt(d, 10)]);
}

/**
 * Converts Nepali Devanagari numerals (०-९) to Western digits (0-9)
 */
export function toEnglishDigits(str: string): string {
  const nepaliDigits: Record<string, string> = {
    '०': '0',
    '१': '1',
    '२': '2',
    '३': '3',
    '४': '4',
    '५': '5',
    '६': '6',
    '७': '7',
    '८': '8',
    '९': '9',
  };
  return str.replace(/[०-९]/g, (d) => nepaliDigits[d] || d);
}

/**
 * Returns today's date in Bikram Sambat (BS) format YYYY-MM-DD
 * e.g. "2083-06-06"
 */
export function getTodayBS(): string {
  try {
    const nd = new NepaliDate(new Date());
    return nd.format('YYYY-MM-DD');
  } catch {
    return '2083-06-06';
  }
}

/**
 * Converts any Date (AD Date or BS string or AD string) into BS YYYY-MM-DD format
 */
export function toBSString(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return getTodayBS();
  try {
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      const year = parseInt(dateInput.substring(0, 4), 10);
      if (year >= 2000) {
        // Already BS date
        return dateInput.substring(0, 10);
      }
      // AD string
      const nd = new NepaliDate(new Date(dateInput.substring(0, 10) + 'T00:00:00'));
      return nd.format('YYYY-MM-DD');
    }
    const nd = new NepaliDate(new Date(dateInput));
    return nd.format('YYYY-MM-DD');
  } catch {
    return String(dateInput);
  }
}

/**
 * Subtracts days from a BS date string
 */
export function subtractDaysBS(bsDateStr: string, days: number): string {
  try {
    const nd = new NepaliDate(bsDateStr);
    const jsDate = nd.toJsDate();
    jsDate.setDate(jsDate.getDate() - days);
    const resultNd = new NepaliDate(jsDate);
    return resultNd.format('YYYY-MM-DD');
  } catch {
    return bsDateStr;
  }
}

/**
 * Formats any date into a human-readable Nepali BS date string
 */
export function formatNepaliDate(
  dateInput: string | Date | undefined | null,
  format: 'short' | 'medium' | 'devanagari' | 'full' = 'devanagari'
): string {
  if (!dateInput) return '—';
  try {
    let nd: NepaliDate;
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      const year = parseInt(dateInput.substring(0, 4), 10);
      if (year >= 2000) {
        nd = new NepaliDate(dateInput.substring(0, 10));
      } else {
        nd = new NepaliDate(new Date(dateInput.substring(0, 10) + 'T00:00:00'));
      }
    } else {
      nd = new NepaliDate(new Date(dateInput));
    }

    const day = nd.getDate();
    const monthIdx = nd.getMonth();
    const year = nd.getYear();
    const dayOfWeek = nd.getDay();

    if (format === 'short') {
      // 2083-06-06
      return nd.format('YYYY-MM-DD');
    }

    if (format === 'devanagari') {
      // २०८३ असोज ०६
      return `${toNepaliDigits(year)} ${NEPALI_MONTHS_NP[monthIdx]} ${toNepaliDigits(String(day).padStart(2, '0'))}`;
    }

    if (format === 'full') {
      // २०८३ असोज ०६, मंगलबार
      return `${toNepaliDigits(year)} ${NEPALI_MONTHS_NP[monthIdx]} ${toNepaliDigits(String(day).padStart(2, '0'))}, ${NEPALI_DAYS_NP[dayOfWeek]}`;
    }

    // medium: 2083 Ashwin 06 (२०८३ असोज ०६)
    return `${year} ${NEPALI_MONTHS_EN[monthIdx]} ${String(day).padStart(2, '0')} (${toNepaliDigits(year)} ${NEPALI_MONTHS_NP[monthIdx]} ${toNepaliDigits(day)})`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Gets total days in a BS year & month (month is 0-indexed: 0=Baisakh, 5=Ashwin)
 */
export function getDaysInBSMonth(year: number, monthIndex: number): number {
  try {
    for (let d = 32; d >= 28; d--) {
      const t = new NepaliDate(year, monthIndex, d);
      if (t.getMonth() === monthIndex) return d;
    }
    return 30;
  } catch {
    return 30;
  }
}

/**
 * Returns date range for 1st to 15th of the current Bikram Sambat month
 * e.g. { startDate: "2083-06-01", endDate: "2083-06-15" }
 */
export function getCurrentBSMonth15DaysRange(referenceDate?: string): { startDate: string; endDate: string } {
  try {
    const nd = referenceDate ? new NepaliDate(referenceDate) : new NepaliDate(new Date());
    const year = nd.getYear();
    const month = nd.getMonth();
    const start = new NepaliDate(year, month, 1).format('YYYY-MM-DD');
    const end = new NepaliDate(year, month, 15).format('YYYY-MM-DD');
    return { startDate: start, endDate: end };
  } catch {
    const today = getTodayBS();
    return { startDate: today.substring(0, 8) + '01', endDate: today.substring(0, 8) + '15' };
  }
}

/**
 * Returns date range for full current Bikram Sambat month (1st to total days e.g. 29, 30, 31, or 32)
 * e.g. { startDate: "2083-06-01", endDate: "2083-06-31" }
 */
export function getCurrentBSMonthFullRange(referenceDate?: string): { startDate: string; endDate: string } {
  try {
    const nd = referenceDate ? new NepaliDate(referenceDate) : new NepaliDate(new Date());
    const year = nd.getYear();
    const month = nd.getMonth();
    const totalDays = getDaysInBSMonth(year, month);
    const start = new NepaliDate(year, month, 1).format('YYYY-MM-DD');
    const end = new NepaliDate(year, month, totalDays).format('YYYY-MM-DD');
    return { startDate: start, endDate: end };
  } catch {
    const today = getTodayBS();
    return { startDate: today.substring(0, 8) + '01', endDate: today.substring(0, 8) + '30' };
  }
}
