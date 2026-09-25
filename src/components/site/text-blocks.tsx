import { Fragment } from "react";
import { linkParts, textBlocks } from "@/lib/public/text";

/** Gepflegte Texte als Absätze, Zwischenüberschriften und klickbare Adressen (Spec §6.3). */
export function TextBlocks({ text }: { text: string }) {
  return (
    <>
      {textBlocks(text).map((block, index) =>
        block.kind === "heading" ? (
          <h2 key={index} className="font-display pt-6 text-2xl">
            {block.lines[0]}
          </h2>
        ) : (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                {linkParts(line).map((part, partIndex) =>
                  part.href ? (
                    <a key={partIndex} href={part.href} className="underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
                      {part.text}
                    </a>
                  ) : (
                    <Fragment key={partIndex}>{part.text}</Fragment>
                  ),
                )}
              </Fragment>
            ))}
          </p>
        ),
      )}
    </>
  );
}
