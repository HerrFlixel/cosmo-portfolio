import { LOCKUP, WORDMARK } from "./logo-paths";

type LogoData = { readonly viewBox: string; readonly paths: readonly string[] };
type Props = { className?: string; decorative?: boolean };

function LogoSvg({ data, className, decorative = false }: Props & { data: LogoData }) {
  const label = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": "Cosmo Photos" };
  return (
    <svg viewBox={data.viewBox} className={className} fill="currentColor" {...label}>
      {data.paths.map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}

/** COSMO mit Ring (Kopf). Die Pfade bleiben einzeln, damit Plan 5 Ring und Buchstaben animieren kann. */
export function Wordmark(props: Props) {
  return <LogoSvg data={WORDMARK} {...props} />;
}

/** Voller Lockup mit PHOTOS (Fußzeile, später Intro). */
export function Lockup(props: Props) {
  return <LogoSvg data={LOCKUP} {...props} />;
}
