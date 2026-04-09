import { redirect } from 'next/navigation'
import { createCampaign } from '@/lib/admin/campaign-actions'

export default function NewCampaignPage() {
  async function action(formData: FormData) {
    'use server'
    const result = await createCampaign(formData)
    if (result.ok && result.id) redirect(`/admin/campagnes/${result.id}`)
  }

  const labelStyle = { display: 'block', marginBottom: '4px', fontSize: 'var(--text-xs)', color: '#C5A028', fontWeight: 600 as const, textTransform: 'uppercase' as const, letterSpacing: '.1em' }
  const inputStyle = { width: '100%', padding: 'var(--s3) var(--s4)', background: '#1B2A4A', color: '#E0E6EF', border: '1px solid rgba(255,255,255,.12)', borderRadius: 'var(--r8)', fontFamily: 'var(--fb)', fontSize: 'var(--text-sm)' }

  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', color: '#fff', marginBottom: 'var(--s8)' }}>
        Nouvelle campagne
      </h1>

      <form action={action} style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
        <div>
          <label style={labelStyle}>Nom de la campagne</label>
          <input name="name" required style={inputStyle} placeholder="Ex : Bienvenue IA" />
        </div>

        <div>
          <label style={labelStyle}>Type</label>
          <select name="type" style={inputStyle}>
            <option value="welcome_sequence">Séquence de bienvenue</option>
            <option value="promo">Promotion</option>
            <option value="weekly">Hebdomadaire</option>
            <option value="custom">Personnalisé</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Tags cibles (séparés par des virgules, vide = tout le monde)</label>
          <input name="target_tags" style={inputStyle} placeholder="Ex : ia, brvm" />
        </div>

        <button
          type="submit"
          style={{ alignSelf: 'flex-start', background: '#C5A028', color: '#fff', padding: 'var(--s3) var(--s6)', borderRadius: 'var(--r8)', border: 'none', cursor: 'pointer', fontFamily: 'var(--fb)', fontSize: 'var(--text-sm)', fontWeight: 600 }}
        >
          Créer la campagne
        </button>
      </form>
    </>
  )
}
