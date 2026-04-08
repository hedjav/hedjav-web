import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

type Props = { markdown: string }

export function ArticleBody({ markdown }: Props) {
  return (
    <div
      style={{
        fontSize: 'var(--text-lg)',
        lineHeight: 1.8,
        color: 'var(--text)',
        fontFamily: 'var(--fb)',
      }}
      className="hedjav-article-body"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h2: ({ children }) => (
            <h2
              style={{
                fontFamily: 'var(--fd)',
                fontSize: 'var(--text-3xl)',
                fontWeight: 600,
                marginTop: 'var(--s10)',
                marginBottom: 'var(--s4)',
                color: 'var(--text)',
                lineHeight: 1.2,
              }}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              style={{
                fontFamily: 'var(--fd)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 600,
                marginTop: 'var(--s8)',
                marginBottom: 'var(--s3)',
                color: 'var(--text)',
              }}
            >
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p style={{ marginBottom: 'var(--s5)' }}>{children}</p>
          ),
          ul: ({ children }) => (
            <ul style={{ marginBottom: 'var(--s5)', paddingLeft: 'var(--s6)' }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol style={{ marginBottom: 'var(--s5)', paddingLeft: 'var(--s6)' }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: 'var(--s2)' }}>{children}</li>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              style={{
                color: 'var(--g700)',
                textDecoration: 'underline',
                textDecorationColor: 'var(--g500)',
                textUnderlineOffset: 3,
              }}
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: '4px solid var(--g500)',
                paddingLeft: 'var(--s5)',
                marginBlock: 'var(--s6)',
                fontStyle: 'italic',
                color: 'var(--muted)',
              }}
            >
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code
              style={{
                fontFamily: 'var(--fm)',
                fontSize: '0.9em',
                background: 'var(--n50)',
                padding: '2px 6px',
                borderRadius: 'var(--r4)',
                color: 'var(--n900)',
              }}
            >
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre
              style={{
                fontFamily: 'var(--fm)',
                background: 'var(--n950)',
                color: '#E0E6EF',
                padding: 'var(--s5)',
                borderRadius: 'var(--r12)',
                overflow: 'auto',
                marginBlock: 'var(--s6)',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.6,
              }}
            >
              {children}
            </pre>
          ),
          hr: () => (
            <hr
              style={{
                border: 0,
                borderTop: '1px solid var(--border)',
                marginBlock: 'var(--s10)',
              }}
            />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
