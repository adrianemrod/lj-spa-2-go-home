import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { TherapistCreateForm } from "@/components/therapists/therapist-create-form";

export default async function NewTherapistPage() {
  await requirePermission("therapists:manage");
  const services = await prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-fg">New Therapist</h1>
      <TherapistCreateForm services={services.map((s) => ({ id: s.id, name: s.name }))} />
    </div>
  );
}
