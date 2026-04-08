import { Hero } from '@/components/home/Hero'
import { TrustStrip } from '@/components/home/TrustStrip'
import { Pillars } from '@/components/home/Pillars'
import { EbooksTeaser } from '@/components/home/EbooksTeaser'
import { BlogTeaser } from '@/components/home/BlogTeaser'
import { NewsletterCTA } from '@/components/home/NewsletterCTA'
import { FounderBlock } from '@/components/home/FounderBlock'
import { FinalCTA } from '@/components/home/FinalCTA'

export default function Home() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <Pillars />
      <EbooksTeaser />
      <BlogTeaser />
      <NewsletterCTA />
      <FounderBlock />
      <FinalCTA />
    </>
  )
}
