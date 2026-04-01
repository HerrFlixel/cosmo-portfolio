import HeroSection from "@/components/portfolio/HeroSection";
import PortfolioGrid from "@/components/portfolio/PortfolioGrid";
import { getVisibleImages } from "@/lib/db/queries";

export default async function HomePage() {
  const images = await getVisibleImages();

  return (
    <main className="-mt-20">
      <HeroSection />
      <section id="portfolio" className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-center gap-6 mb-16">
          <h2 className="font-heading text-5xl tracking-wide">PORTFOLIO</h2>
          <div className="flex-1 h-0.5 bg-primary" />
        </div>
        {images.length > 0 ? (
          <PortfolioGrid images={images} />
        ) : (
          <p className="text-muted text-center py-24 text-sm tracking-label uppercase">
            Noch keine Bilder vorhanden
          </p>
        )}
      </section>
    </main>
  );
}
