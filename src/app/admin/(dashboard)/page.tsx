import { db } from "@/lib/db";
import { projects, albums } from "@/lib/db/schema";

export default async function AdminDashboard() {
  const allProjects = await db.select().from(projects);
  const visibleProjects = allProjects.filter((p) => p.visible).length;
  const allAlbums = await db.select().from(albums);
  const activeAlbums = allAlbums.filter((a) => a.active).length;

  const stats = [
    { label: "Projekte gesamt", value: allProjects.length },
    { label: "Projekte sichtbar", value: visibleProjects },
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
