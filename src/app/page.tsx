import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency, minutesToDurationLabel } from "@/lib/format";

export default async function HomePage() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { price: "asc" },
    take: 6,
  });

  return (
    <div className="min-h-dvh bg-bg">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Logo />
        <Link href="/login" className="text-sm text-fg-muted hover:text-fg">
          Staff Login
        </Link>
      </header>

      <section className="px-6 pb-16 pt-10 text-center sm:px-10 sm:pt-20">
        <h1 className="mx-auto max-w-2xl font-serif text-4xl leading-tight text-fg sm:text-5xl">
          Professional massage.
          <br />
          Delivered to your door.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-fg-muted">
          Licensed therapists, real availability, no waiting rooms. Book in minutes.
        </p>
        <Link href="/book">
          <Button size="lg" className="mt-8">
            Book Now
          </Button>
        </Link>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24 sm:px-10">
        <h2 className="mb-6 text-center font-serif text-2xl text-fg">Our Services</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Card key={s.id} className="p-5">
              <p className="font-medium text-fg">{s.name}</p>
              <p className="mt-1 text-sm text-fg-muted">{minutesToDurationLabel(s.durationMinutes)}</p>
              <p className="mt-3 font-serif text-lg text-accent">{formatCurrency(s.price.toString())}</p>
            </Card>
          ))}
          {services.length === 0 && (
            <p className="col-span-full text-center text-fg-muted">Services coming soon.</p>
          )}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-fg-muted sm:px-10">
        L&amp;J Spa 2 Go Home · Home-service massage · Metro Manila
      </footer>
    </div>
  );
}
