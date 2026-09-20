import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { ServiceForm } from "@/components/services/service-form";

export default async function NewServicePage() {
  await requirePermission("services:manage");
  const therapists = await prisma.therapist.findMany({
    where: { active: true },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-fg">New Service</h1>
      <ServiceForm therapists={therapists.map((t) => ({ id: t.id, name: t.user.name }))} />
    </div>
  );
}
