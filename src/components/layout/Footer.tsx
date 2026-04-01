import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t-2 border-primary bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="font-heading text-xl tracking-wider">COSMO PHOTOS</span>

          <div className="flex gap-6">
            <a href="#" className="text-muted hover:text-primary transition-colors text-sm tracking-nav uppercase">
              Instagram
            </a>
            <a href="#" className="text-muted hover:text-primary transition-colors text-sm tracking-nav uppercase">
              LinkedIn
            </a>
          </div>

          <p className="text-muted text-xs tracking-label uppercase">
            &copy; {year} Cosmo Photos. {t("rights")}.
          </p>
        </div>
      </div>
    </footer>
  );
}
