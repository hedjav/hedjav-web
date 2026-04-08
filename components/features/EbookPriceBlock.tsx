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
        alignItems: 'baseline',
        gap: 'var(--s3)',
        flexWrap: 'wrap',
      }}
    >
      <span
        className="price"
        style={{
          fontSize: isLg ? 'var(--text-4xl)' : 'var(--text-2xl)',
          color: 'var(--g700)',
          fontWeight: 600,
        }}
      >
        {formatPriceFcfa(price)}
      </span>
      {originalPrice > price && (
        <span
          className="price"
          style={{
            fontSize: isLg ? 'var(--text-lg)' : 'var(--text-sm)',
            color: 'var(--muted)',
            textDecoration: 'line-through',
          }}
        >
          {formatPriceFcfa(originalPrice)}
        </span>
      )}
      {discount > 0 && (
        <span className="badge badge-gold" style={{ marginLeft: 'var(--s1)' }}>
          −{discount} %
        </span>
      )}
    </div>
  )
}
