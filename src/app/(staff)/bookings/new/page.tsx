import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { NewBookingForm } from "@/components/bookings/new-booking-form";

export default async function NewBookingPage() {
  await requirePermission("bookings:create");
  const [services, clients] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, take: 200 }),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-fg">New Booking</h1>
      <NewBookingForm
        services={services.map((s) => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes, price: Number(s.price) }))}
        clients={clients.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))}
      />
    </div>
  );
}
