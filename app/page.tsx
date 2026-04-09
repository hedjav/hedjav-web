import { getHomepageConfig } from '@/lib/config/homepage'
import { Hero } from '@/components/home/Hero'
import { TrustStrip } from '@/components/home/TrustStrip'
import { Pillars } from '@/components/home/Pillars'
import { EbooksTeaser } from '@/components/home/EbooksTeaser'
import { BlogTeaser } from '@/components/home/BlogTeaser'
import { NewsletterCTA } from '@/components/home/NewsletterCTA'
import { FounderBlock } from '@/components/home/FounderBlock'
import { FinalCTA } from '@/components/home/FinalCTA'

export default async function Home() {
  const config = await getHomepageConfig()

  return (
    <>
      <Hero
        tagline={config.hero_tagline}
        badges={[config.hero_badge_1, config.hero_badge_2, config.hero_badge_3, config.hero_badge_4].filter(Boolean)}
      />
      <TrustStrip />
      <Pillars
        title={config.approche_title}
        subtitle={config.approche_subtitle}
        piliers={[
          { title: config.approche_pilier_1_title, desc: config.approche_pilier_1_desc },
          { title: config.approche_pilier_2_title, desc: config.approche_pilier_2_desc },
          { title: config.approche_pilier_3_title, desc: config.approche_pilier_3_desc },
        ].filter((p) => p.title)}
      />
      <EbooksTeaser />
      <BlogTeaser />
      <NewsletterCTA
        title={config.newsletter_title}
        subtitle={config.newsletter_subtitle}
      />
      <FounderBlock
        bio={config.founder_bio}
        bullets={config.founder_bullets ? config.founder_bullets.split('|') : undefined}
      />
      <FinalCTA
        title={config.cta_title}
        subtitle={config.cta_subtitle}
      />
    </>
  )
}
