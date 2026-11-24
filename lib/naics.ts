// The ONLY industry (NAICS) codes Cadent can suggest. They match our real SAM.gov data.
// The AI must pick segment codes from this list; anything else is thrown away.

export const ALLOWED_NAICS = [
  { code: '541511', title: 'Custom Computer Programming Services' },
  { code: '541512', title: 'Computer Systems Design Services' },
  { code: '541513', title: 'Computer Facilities Management Services' },
  { code: '541519', title: 'Other Computer Related Services' },
  {
    code: '518210',
    title: 'Computing Infrastructure Providers, Data Processing, Web Hosting, and Related Services',
  },
  {
    code: '541715',
    title:
      'Research and Development in the Physical, Engineering, and Life Sciences (except Nanotechnology and Biotechnology)',
  },
] as const;

export const naicsTitle = (code: string) => ALLOWED_NAICS.find((n) => n.code === code)?.title;
export const isAllowedNaics = (code: string) => ALLOWED_NAICS.some((n) => n.code === code);
