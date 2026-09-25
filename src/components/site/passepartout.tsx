import { mediaUrl, type MediaKind } from "@/lib/media/keys";
import { imageSources } from "@/lib/public/images";
import { Photo } from "./photo";

export type FrameImage = { id: string; width: number; height: number; color: string };

type Props = { image: FrameImage; alt: string; sizes: string; priority?: boolean; className?: string; kind?: MediaKind };

// Nur <span>-Elemente: Passepartouts stehen auch in Buttons (Kategorieseite).

/** Abzug im Passepartout (Spec §4.3): weißer Rand ≈ 6 % der Breite, weicher Schatten, Hover hebt ihn an. */
export function Passepartout({ image, alt, sizes, priority = false, className = "", kind = "portfolio" }: Props) {
  const { src, srcSet } = imageSources(kind, image);
  return (
    <span className={`passepartout ${className}`}>
      <span className="passepartout-mat">
        <span className="passepartout-window" style={{ backgroundColor: image.color, aspectRatio: `${image.width} / ${image.height}` }}>
          <Photo src={src} srcSet={srcSet} sizes={sizes} alt={alt} width={image.width} height={image.height} priority={priority} />
        </span>
      </span>
    </span>
  );
}

/** Porträt aus den Einstellungen: dort steht nur die ID, deshalb festes Format 4:5 und die 1600er-Größe. */
export function PortraitFrame({ id, alt, className = "" }: { id: string; alt: string; className?: string }) {
  return (
    <span className={`passepartout ${className}`}>
      <span className="passepartout-mat">
        <span className="passepartout-window aspect-[4/5] bg-stone/20">
          <Photo src={mediaUrl("site", id, 1600)} alt={alt} />
        </span>
      </span>
    </span>
  );
}
