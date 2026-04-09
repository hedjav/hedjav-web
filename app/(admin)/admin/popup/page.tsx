import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getPopupConfig } from '@/lib/popup/queries'

export default async function AdminPopupPage() {
  const config = await getPopupConfig()

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data: ebooks } = await db
    .from('ebooks')
    .select('id, title')
    .eq('is_published', true)
    .order('title')

  const convRate = config && config.stats_shown > 0
    ? Math.round((config.stats_submitted / config.stats_shown) * 100)
    : 0

  async function save(formData: FormData) {
    'use server'
    const db2 = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const data = {
      ebook_id: String(formData.get('ebook_id') ?? '') || null,
      is_active: formData.get('is_active') === 'on',
      display_delay_seconds: Number(formData.get('display_delay_seconds') ?? 30),
      scroll_threshold_percent: Number(formData.get('scroll_threshold_percent') ?? 60),
      headline: String(formData.get('headline') ?? ''),
      subheadline: String(formData.get('subheadline') ?? ''),
      cta_text: String(formData.get('cta_text') ?? ''),
      disclaimer: String(formData.get('disclaimer') ?? ''),
    }

    if (config) {
      await db2.from('popup_config').update(data).eq('id', config.id)
    } else {
      await db2.from('popup_config').insert(data)
    }
    revalidatePath('/admin/popup')
  }

  const labelStyle = { display: 'block', marginBottom: '4px', fontSize: 'var(--text-xs)', color: '#C5A028', fontWeight: 600 as const, textTransform: 'uppercase' as const, letterSpacing: '.1em' }
  const inputStyle = { width: '100%', padding: 'var(--s3) var(--s4)', background: '#1B2A4A', color: '#E0E6EF', border: '1px solid rgba(255,255,255,.12)', borderRadius: 'var(--r8)', fontFamily: 'var(--fb)', fontSize: 'var(--text-sm)' }

  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', color: '#fff', marginBottom: 'var(--s8)' }}>Pop-up Lead Magnet</h1>

      {/* Stats */}
      {config && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s4)', marginBottom: 'var(--s8)' }}>
          {[
            { label: 'Affichages', value: config.stats_shown },
            { label: 'Inscriptions', value: config.stats_submitted },
            { label: 'Conversion', value: `${convRate}%` },
          ].map((s) => (
            <div key={s.label} style={{ background: '#1B2A4A', borderRadius: 'var(--r12)', padding: 'var(--s4) var(--s5)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: '#C5A028' }}>{s.value}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <form action={save} style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        <div>
          <label style={labelStyle}>Ebook associé</label>
          <select name="ebook_id" defaultValue={config?.ebook_id ?? ''} style={inputStyle}>
            <option value="">— Aucun —</option>
            {(ebooks ?? []).map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#E0E6EF', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
          <input type="checkbox" name="is_active" defaultChecked={config?.is_active ?? false} style={{ accentColor: '#C5A028' }} />
          Pop-up actif
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
          <div>
            <label style={labelStyle}>Délai (secondes)</label>
            <input name="display_delay_seconds" type="number" min="0" defaultValue={config?.display_delay_seconds ?? 30} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Seuil scroll (%)</label>
            <input name="scroll_threshold_percent" type="number" min="0" max="100" defaultValue={config?.scroll_threshold_percent ?? 60} style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Titre</label>
          <input name="headline" defaultValue={config?.headline ?? ''} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Sous-titre</label>
          <input name="subheadline" defaultValue={config?.subheadline ?? ''} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Texte du bouton CTA</label>
          <input name="cta_text" defaultValue={config?.cta_text ?? ''} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Disclaimer</label>
          <input name="disclaimer" defaultValue={config?.disclaimer ?? ''} style={inputStyle} />
        </div>

        <button
          type="submit"
          style={{ alignSelf: 'flex-start', background: '#C5A028', color: '#fff', padding: 'var(--s3) var(--s6)', borderRadius: 'var(--r8)', border: 'none', cursor: 'pointer', fontFamily: 'var(--fb)', fontSize: 'var(--text-sm)', fontWeight: 600 }}
        >
          Sauvegarder
        </button>
      </form>
    </>
  )
}
