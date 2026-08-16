/**
 * Curated Bangladesh Government holiday dataset.
 *
 * This supplements the automatic sync from date.nager.at, which only carries
 * fixed-date national holidays and omits moon-dependent Islamic/Hindu/Buddhist
 * observances that the Bangladesh government announces separately each year.
 *
 * NOTE ON RELIGIOUS DATES: Eid, Shab-e-Barat, Ashura, Miladunnabi, Durga Puja
 * and Buddha Purnima depend on moon sightings / lunar calendars. The dates
 * below follow the announced/expected calendars and are refreshed in this file
 * when the government publishes updates. Admins can also edit any government
 * holiday date from the Holidays panel (edits persist until the entry is
 * re-synced with new official data).
 */

export interface CuratedHoliday {
  date: string; // YYYY-MM-DD
  title: string;
  type: 'national' | 'religious';
}

export const CURATED_BD_HOLIDAYS: CuratedHoliday[] = [
  // --- 2025 ---
  { date: '2025-01-13', title: 'Shab-e-Barat', type: 'religious' },
  { date: '2025-02-21', title: 'Shaheed Day & International Mother Language Day', type: 'national' },
  { date: '2025-03-26', title: 'Independence and National Day', type: 'national' },
  { date: '2025-03-31', title: 'Eid-ul-Fitr', type: 'religious' },
  { date: '2025-04-01', title: 'Eid-ul-Fitr (Day 2)', type: 'religious' },
  { date: '2025-04-02', title: 'Eid-ul-Fitr (Day 3)', type: 'religious' },
  { date: '2025-04-14', title: 'Bengali New Year (Pahela Baishakh)', type: 'national' },
  { date: '2025-05-01', title: 'May Day (Labour Day)', type: 'national' },
  { date: '2025-05-11', title: 'Buddha Purnima (Vesak)', type: 'religious' },
  { date: '2025-06-06', title: 'Eid-ul-Azha', type: 'religious' },
  { date: '2025-06-07', title: 'Eid-ul-Azha (Day 2)', type: 'religious' },
  { date: '2025-06-27', title: 'Ashura', type: 'religious' },
  { date: '2025-08-05', title: 'July Mass Uprising Day', type: 'national' },
  { date: '2025-08-15', title: 'National Mourning Day', type: 'national' },
  { date: '2025-09-04', title: 'Eid-e-Miladunnabi (SAW)', type: 'religious' },
  { date: '2025-10-02', title: 'Durga Puja (Bijoya Dashami)', type: 'religious' },
  { date: '2025-12-16', title: 'Victory Day', type: 'national' },
  { date: '2025-12-25', title: 'Christmas Day', type: 'religious' },

  // --- 2026 ---
  { date: '2026-01-24', title: 'Shab-e-Barat', type: 'religious' },
  { date: '2026-02-21', title: 'Shaheed Day & International Mother Language Day', type: 'national' },
  { date: '2026-03-20', title: 'Eid-ul-Fitr', type: 'religious' },
  { date: '2026-03-21', title: 'Eid-ul-Fitr (Day 2)', type: 'religious' },
  { date: '2026-03-22', title: 'Eid-ul-Fitr (Day 3)', type: 'religious' },
  { date: '2026-03-26', title: 'Independence and National Day', type: 'national' },
  { date: '2026-04-14', title: 'Bengali New Year (Pahela Baishakh)', type: 'national' },
  { date: '2026-05-01', title: 'May Day (Labour Day)', type: 'national' },
  { date: '2026-05-27', title: 'Eid-ul-Azha', type: 'religious' },
  { date: '2026-05-28', title: 'Eid-ul-Azha (Day 2)', type: 'religious' },
  { date: '2026-06-25', title: 'Ashura', type: 'religious' },
  { date: '2026-08-05', title: 'July Mass Uprising Day', type: 'national' },
  { date: '2026-08-15', title: 'National Mourning Day', type: 'national' },
  { date: '2026-08-25', title: 'Eid-e-Miladunnabi (SAW)', type: 'religious' },
  { date: '2026-10-20', title: 'Durga Puja (Bijoya Dashami)', type: 'religious' },
  { date: '2026-12-16', title: 'Victory Day', type: 'national' },
  { date: '2026-12-25', title: 'Christmas Day', type: 'religious' },

  // --- 2027 (fixed national dates only; religious dates announced later) ---
  { date: '2027-02-21', title: 'Shaheed Day & International Mother Language Day', type: 'national' },
  { date: '2027-03-26', title: 'Independence and National Day', type: 'national' },
  { date: '2027-04-14', title: 'Bengali New Year (Pahela Baishakh)', type: 'national' },
  { date: '2027-05-01', title: 'May Day (Labour Day)', type: 'national' },
  { date: '2027-08-05', title: 'July Mass Uprising Day', type: 'national' },
  { date: '2027-12-16', title: 'Victory Day', type: 'national' },
  { date: '2027-12-25', title: 'Christmas Day', type: 'religious' },
];

/**
 * Build the stable external_id for a curated government holiday.
 * One id per date keeps re-syncs idempotent even when titles are reworded.
 */
export const curatedExternalId = (date: string): string => `bdgov-${date}`;
