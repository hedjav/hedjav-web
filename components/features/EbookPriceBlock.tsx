import { discountPercent, formatPriceFcfa } from '@/lib/ebooks/queries'

type Props = {
  price: number
  originalPrice: number
  size?: 'sm' | 'lg'
}

export function EbookPriceBlock({ price, originalPrice, size = 'sm' }: Props) {
  const discount = discountPercent(price, originalPrice)
  const isLg = size === 'lg'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s2)', flexWrap: 'wrap' }}>
        <span
          className="price"
          style={{
            fontSize: isLg ? 'var(--text-4xl)' : 'var(--text-2xl)',
            color: 'var(--g700)',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {formatPriceFcfa(price)}
        </span>
        {discount > 0 && (
          <span className="badge badge-gold">−{discount} %</span>
        )}
      </div>
      {originalPrice > price && (
        <span
          className="price"
          style={{
            fontSize: isLg ? 'var(--text-base)' : 'var(--text-xs)',
            color: 'var(--muted)',
            textDecoration: 'line-through',
            lineHeight: 1,
          }}
        >
          {formatPriceFcfa(originalPrice)}
        </span>
      )}
    </div>
  )
}
