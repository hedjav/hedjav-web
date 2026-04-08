const items = [
  {
    label: 'Conseil indépendant',
    path: 'M12 2 4 6v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V6l-8-4z',
  },
  {
    label: 'Expertise BRVM',
    path: 'M3 3v18h18M7 14l4-4 4 4 5-5',
  },
  {
    label: 'Ancrage Afrique francophone',
    path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0v20M2 12h20',
  },
  {
    label: 'Approche fiscale OHADA',
    path: 'M9 12h6m-6 4h6m-7 4h8a2 2 0 0 0 2-2V6l-4-4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z',
  },
]

export function TrustStrip() {
  return (
    <section
      style={{
        background: 'var(--surface)',
        borderBlock: '1px solid var(--border)',
        paddingBlock: 'var(--s8)',
      }}
    >
      <div className="hedjav-container">
        <ul className="hedjav-trust-strip">
          {items.map((item) => (
            <li
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--s3)',
                color: 'var(--muted)',
                flex: '1 1 220px',
                justifyContent: 'center',
                minWidth: 0,
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--g500)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                style={{ flexShrink: 0 }}
              >
                <path d={item.path} />
              </svg>
              <span
                style={{
                  fontFamily: 'var(--fb)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  letterSpacing: '.02em',
                  color: 'var(--text)',
                  lineHeight: 1.3,
                }}
              >
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
