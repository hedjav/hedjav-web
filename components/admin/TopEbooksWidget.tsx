'use client'

type EbookSale = {
  title: string
  slug: string
  sales: number
  revenue: number
}

export function TopEbooksWidget({ data }: { data: EbookSale[] }) {
  const maxSales = data.length > 0 ? data[0].sales : 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {data.length === 0 && (
        <div
          style={{
            color: 'var(--admin-text-muted)',
            fontSize: 13,
            padding: '20px 0',
            textAlign: 'center',
          }}
        >
          Aucune vente enregistrée
        </div>
      )}
      {data.map((item, i) => (
        <div
          key={item.slug}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 0',
            borderTop: i > 0 ? '1px solid rgba(255,255,255,.04)' : 'none',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--fm)',
              fontSize: 12,
              color: 'var(--admin-text-muted)',
              width: 24,
              textAlign: 'right',
              flexShrink: 0,
            }}
          >
            #{i + 1}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                color: 'var(--admin-text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginBottom: 4,
              }}
            >
              {item.title}
            </div>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: 'rgba(255,255,255,.06)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 2,
                  background: 'var(--admin-accent)',
                  width: `${Math.round((item.sales / maxSales) * 100)}%`,
                  transition: 'width .3s ease',
                }}
              />
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontFamily: 'var(--fm)', color: 'var(--admin-text)' }}>
              {item.sales} vente{item.sales > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--admin-text-muted)' }}>
              {item.revenue.toLocaleString('fr-FR')} F
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
