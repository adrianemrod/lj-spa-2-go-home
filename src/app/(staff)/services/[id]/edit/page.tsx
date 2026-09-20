import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { ServiceForm } from "@/components/services/service-form";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("services:manage");
  const { id } = await params;

  const [service, therapists] = await Promise.all([
    prisma.service.findUniqueOrThrow({ where: { id }, include: { therapists: true } }),
    prisma.therapist.findMany({
      where: { active: true },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-fg">Edit Service</h1>
      <ServiceForm
        initial={{
          id: service.id,
          name: service.name,
          description: service.description ?? "",
          durationMinutes: service.durationMinutes,
          price: Number(service.price),
          commissionType: service.commissionType,
          commissionValue: Number(service.commissionValue),
          bufferMinutes: service.bufferMinutes,
          active: service.active,
          therapistIds: service.therapists.map((t) => t.therapistId),
        }}
        therapists={therapists.map((t) => ({ id: t.id, name: t.user.name }))}
      />
    </div>
  );
}
