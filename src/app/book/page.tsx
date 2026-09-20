import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/brand/logo";
import { BookingWizard } from "@/components/booking-portal/booking-wizard";

export default async function BookPage() {
  const services = await prisma.service.findMany({
    where: { active: true },
    select: { id: true, name: true, description: true, durationMinutes: true, price: true },
    orderBy: { price: "asc" },
  });

  return (
    <div className="min-h-dvh bg-bg px-4 py-8 sm:px-8">
      <div className="mx-auto mb-8 max-w-xl">
        <Link href="/">
          <Logo tone="dark" />
        </Link>
      </div>
      <BookingWizard services={services.map((s) => ({ ...s, price: s.price.toString() }))} />
    </div>
  );
}
