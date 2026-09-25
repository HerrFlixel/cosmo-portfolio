"use client";

import { useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Category } from "@/lib/categories";
import { processImage } from "@/lib/image/process";
import { uploadVariants } from "@/lib/image/upload";
import type { PortfolioImage } from "@/lib/portfolio/repo";
import { ImageCard } from "./image-card";
import { portfolioApi, type CardPatch } from "./portfolio-api";
import { UploadZone } from "@/components/admin/upload-zone";

export function PortfolioManager({ category, initialImages }: { category: Category; initialImages: PortfolioImage[] }) {
  const [images, setImages] = useState(initialImages);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function attempt(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unbekannter Fehler.");
    }
  }

  async function upload(file: File) {
    const processed = await processImage(file);
    const id = await uploadVariants("portfolio", processed);
    const created = await portfolioApi.create({ id, category, width: processed.width, height: processed.height, color: processed.color });
    setImages((current) => [...current, created]);
  }

  /** Nach einem Fehler gilt der Server-Stand (parallele Uploads, gelöschte Bilder …); nur wenn auch das scheitert, zurück zum alten Stand. */
  async function resync(previous: PortfolioImage[]) {
    try {
      setImages(await portfolioApi.list(category));
    } catch {
      setImages(previous);
    }
  }

  function saveOrder(next: PortfolioImage[]) {
    const previous = images;
    setImages(next);
    void attempt(async () => {
      try {
        await portfolioApi.reorder(category, next.map((image) => image.id));
      } catch (cause) {
        await resync(previous);
        throw cause;
      }
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = images.findIndex((image) => image.id === active.id);
    const to = images.findIndex((image) => image.id === over.id);
    saveOrder(arrayMove(images, from, to));
  }

  function patch(id: string, change: CardPatch) {
    // Sofort anzeigen, bei Fehler zurückspringen.
    const previous = images;
    setImages((current) => current.map((image) => (image.id === id ? { ...image, ...change } : image)));
    void attempt(async () => {
      try {
        const updated = await portfolioApi.update(id, change);
        setImages((current) =>
          current.map((image) => {
            if (image.id === id) return updated;
            // Nur ein Kapitel-Bild pro Kategorie: der Server hat das alte zurückgesetzt.
            if (change.role === "chapter" && image.role === "chapter") return { ...image, role: null };
            return image;
          }),
        );
      } catch (cause) {
        await resync(previous);
        throw cause;
      }
    });
  }

  function remove(id: string) {
    if (!window.confirm("Bild endgültig löschen?")) return;
    void attempt(async () => {
      await portfolioApi.remove(id);
      setImages((current) => current.filter((image) => image.id !== id));
    });
  }

  return (
    <div className="space-y-8">
      <UploadZone onUpload={upload} />
      {error && (
        <p role="alert" className="text-signal">
          {error}
        </p>
      )}
      {images.length === 0 ? (
        <p className="text-stone">Noch keine Bilder in dieser Kategorie.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={images.map((image) => image.id)} strategy={rectSortingStrategy}>
            <ol className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              {images.map((image, index) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  position={index}
                  total={images.length}
                  onPatch={(change) => patch(image.id, change)}
                  onMove={(delta) => saveOrder(arrayMove(images, index, index + delta))}
                  onDelete={() => remove(image.id)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
