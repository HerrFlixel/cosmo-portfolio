import { db } from "@/lib/db";
import { images, albums } from "@/lib/db/schema";

export default async function AdminDashboard() {
  const allImages = await db.select().from(images);
  const visibleCount = allImages.filter((img) => img.visible).length;
  const allAlbums = await db.select().from(albums);
  const activeAlbums = allAlbums.filter((a) => a.active).length;

  const stats = [
    { label: "Bilder gesamt", value: allImages.length },
    { label: "Bilder sichtbar", value: visibleCount },
    { label: "Alben", value: allAlbums.length },
    { label: "Alben aktiv", value: activeAlbums },
  ];

  return (
    <div>
      <h1 className="font-heading text-4xl tracking-wide mb-8">DASHBOARD</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-border p-6">
            <p className="font-heading text-3xl">{stat.value}</p>
            <p className="text-xs tracking-label uppercase text-muted mt-2">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
