type Props = {
  href: string
  size?: 'sm' | 'lg'
  label?: string
  fullWidth?: boolean
}

export function EbookBuyButton({ href, size = 'sm', label = 'Acheter maintenant', fullWidth }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`btn btn-gold ${size === 'lg' ? 'btn-lg' : ''}`}
      style={fullWidth ? { width: '100%', justifyContent: 'center' } : undefined}
    >
      {label}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12h14M13 5l7 7-7 7" />
      </svg>
    </a>
  )
}
