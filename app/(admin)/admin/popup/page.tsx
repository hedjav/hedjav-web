import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getPopupConfig } from '@/lib/popup/queries'

export default async function AdminPopupPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>
}) {
  const { saved } = await searchParams
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
    redirect('/admin/popup?saved=1')
  }

  async function toggleActive() {
    'use server'
    if (!config) return
    const db2 = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    await db2.from('popup_config').update({ is_active: !config.is_active }).eq('id', config.id)
    revalidatePath('/admin/popup')
    redirect('/admin/popup?saved=1')
  }

  const isActive = config?.is_active ?? false

  const labelStyle = { display: 'block', marginBottom: '4px', fontSize: 'var(--text-xs)', color: 'var(--admin-accent)', fontWeight: 600 as const, textTransform: 'uppercase' as const, letterSpacing: '.1em' }
  const inputStyle = { width: '100%', padding: 'var(--s3) var(--s4)', background: 'var(--admin-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)', borderRadius: 'var(--r8)', fontFamily: 'var(--fb)', fontSize: 'var(--text-sm)' }

  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', color: 'var(--admin-text)', marginBottom: 'var(--s4)' }}>Pop-up Lead Magnet</h1>

      {/* Status banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--s4)',
        marginBottom: 'var(--s6)',
        padding: 'var(--s3) var(--s5)',
        background: isActive ? 'rgba(34,197,94,.08)' : 'rgba(255,255,255,.04)',
        border: `1px solid ${isActive ? 'rgba(34,197,94,.3)' : 'var(--admin-border)'}`,
        borderRadius: 'var(--r8)',
      }}>
        <span style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: isActive ? '#22c55e' : '#6B7280',
          display: 'inline-block',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: isActive ? '#22c55e' : 'var(--admin-text-muted)' }}>
          {isActive ? 'Pop-up ACTIF' : 'Pop-up INACTIF'}
        </span>
        {config && (
          <form action={toggleActive} style={{ marginLeft: 'auto' }}>
            <button
              type="submit"
              style={{
                padding: '6px 16px',
                background: isActive ? 'rgba(239,68,68,.12)' : 'rgba(34,197,94,.12)',
                color: isActive ? '#ff9b9b' : '#22c55e',
                border: `1px solid ${isActive ? 'rgba(239,68,68,.3)' : 'rgba(34,197,94,.3)'}`,
                borderRadius: 'var(--r8)',
                fontFamily: 'var(--fb)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isActive ? 'Desactiver' : 'Activer'}
            </button>
          </form>
        )}
      </div>

      {/* Success message */}
      {saved === '1' && (
        <div style={{
          background: 'rgba(34,197,94,.1)',
          border: '1px solid rgba(34,197,94,.3)',
          color: '#22c55e',
          padding: 'var(--s3) var(--s5)',
          borderRadius: 'var(--r8)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          marginBottom: 'var(--s6)',
        }}>
          Configuration sauvegardee !
        </div>
      )}

      {/* Stats */}
      {config && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s4)', marginBottom: 'var(--s8)' }}>
          {[
            { label: 'Affichages', value: config.stats_shown },
            { label: 'Inscriptions', value: config.stats_submitted },
            { label: 'Conversion', value: `${convRate}%` },
          ].map((s) => (
            <div key={s.label} style={{ background: 'var(--admin-surface)', borderRadius: 'var(--r12)', padding: 'var(--s4) var(--s5)', textAlign: 'center', border: '1px solid var(--admin-border)' }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--admin-accent)' }}>{s.value}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <form action={save} style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        <div>
          <label style={labelStyle}>Ebook associe</label>
          <select name="ebook_id" defaultValue={config?.ebook_id ?? ''} style={inputStyle}>
            <option value="">-- Aucun --</option>
            {(ebooks ?? []).map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--admin-text)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
          <input type="checkbox" name="is_active" defaultChecked={config?.is_active ?? false} style={{ accentColor: '#C5A028', width: 18, height: 18 }} />
          Pop-up actif
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
          <div>
            <label style={labelStyle}>Delai (secondes)</label>
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
          style={{ alignSelf: 'flex-start', background: 'var(--admin-accent)', color: '#0F1117', padding: 'var(--s3) var(--s6)', borderRadius: 'var(--r8)', border: 'none', cursor: 'pointer', fontFamily: 'var(--fb)', fontSize: 'var(--text-sm)', fontWeight: 600 }}
        >
          Sauvegarder
        </button>
      </form>
    </>
  )
}
