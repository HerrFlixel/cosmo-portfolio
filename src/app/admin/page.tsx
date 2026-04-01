import { db } from "@/lib/db";
import { images, downloadCodes } from "@/lib/db/schema";

export default async function AdminDashboard() {
  const allImages = await db.select().from(images);
  const visibleCount = allImages.filter((img) => img.visible).length;
  const codes = await db.select().from(downloadCodes);
  const activeCodes = codes.filter((c) => c.active).length;

  const stats = [
    { label: "Bilder gesamt", value: allImages.length },
    { label: "Bilder sichtbar", value: visibleCount },
    { label: "Download-Codes", value: codes.length },
    { label: "Codes aktiv", value: activeCodes },
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
