export const COUNTRIES = [
  { code: 'BJ', label: 'Bénin' },
  { code: 'CI', label: "Côte d'Ivoire" },
  { code: 'SN', label: 'Sénégal' },
  { code: 'BF', label: 'Burkina Faso' },
  { code: 'ML', label: 'Mali' },
  { code: 'NE', label: 'Niger' },
  { code: 'TG', label: 'Togo' },
  { code: 'GW', label: 'Guinée-Bissau' },
  { code: 'OTHER', label: 'Autre' },
] as const

export function countryLabel(code: string | null | undefined): string {
  if (!code) return ''
  return COUNTRIES.find((c) => c.code === code)?.label ?? code
}
