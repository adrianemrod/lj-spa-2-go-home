import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "LJSpa2026!";

// Fictional development data only — Metro Manila coordinates are
// approximate neighborhood centers, not real addresses.
const AREAS = {
  quezonCity: { area: "Quezon City", lat: 14.676, lng: 121.0437 },
  makati: { area: "Makati", lat: 14.5547, lng: 121.0244 },
  pasig: { area: "Pasig", lat: 14.5764, lng: 121.0851 },
  mandaluyong: { area: "Mandaluyong", lat: 14.5794, lng: 121.0359 },
  manila: { area: "Manila", lat: 14.5995, lng: 120.9842 },
  taguig: { area: "Taguig (BGC)", lat: 14.5507, lng: 121.0508 },
  marikina: { area: "Marikina", lat: 14.6507, lng: 121.1029 },
  pasay: { area: "Pasay", lat: 14.5378, lng: 121.0014 },
};

async function main() {
  console.log("Seeding L&J Spa 2 Go Home…");
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // ---- Staff users, one per role ----
  const staff = await Promise.all([
    prisma.user.upsert({
      where: { email: "superadmin@ljspa2go.ph" },
      update: {},
      create: { email: "superadmin@ljspa2go.ph", name: "Lourdes J. (Super Admin)", phone: "09170000001", role: "SUPER_ADMIN", passwordHash },
    }),
    prisma.user.upsert({
      where: { email: "owner@ljspa2go.ph" },
      update: {},
      create: { email: "owner@ljspa2go.ph", name: "Jonas Reyes (Owner)", phone: "09170000002", role: "OWNER", passwordHash },
    }),
    prisma.user.upsert({
      where: { email: "manager@ljspa2go.ph" },
      update: {},
      create: { email: "manager@ljspa2go.ph", name: "Carla Mendoza (Manager)", phone: "09170000003", role: "MANAGER", passwordHash },
    }),
    prisma.user.upsert({
      where: { email: "dispatch@ljspa2go.ph" },
      update: {},
      create: { email: "dispatch@ljspa2go.ph", name: "Ronnel Cruz (Dispatcher)", phone: "09170000004", role: "DISPATCHER", passwordHash },
    }),
    prisma.user.upsert({
      where: { email: "accounting@ljspa2go.ph" },
      update: {},
      create: { email: "accounting@ljspa2go.ph", name: "Divine Santos (Accounting)", phone: "09170000005", role: "ACCOUNTING", passwordHash },
    }),
  ]);

  // ---- Service categories & services ----
  const category = await prisma.serviceCategory.upsert({
    where: { name: "Massage" },
    update: {},
    create: { name: "Massage", sortOrder: 0 },
  });

  const serviceDefs = [
    { name: "Swedish Massage", durationMinutes: 60, price: 1200, commissionValue: 30, bufferMinutes: 15 },
    { name: "Deep Tissue Massage", durationMinutes: 90, price: 1800, commissionValue: 35, bufferMinutes: 15 },
    { name: "Combination Massage", durationMinutes: 120, price: 2400, commissionValue: 35, bufferMinutes: 20 },
    { name: "Shiatsu Massage", durationMinutes: 60, price: 1300, commissionValue: 30, bufferMinutes: 15 },
    { name: "Hot Stone Massage", durationMinutes: 90, price: 2000, commissionValue: 35, bufferMinutes: 20 },
  ];
  const services = [];
  for (const def of serviceDefs) {
    let service = await prisma.service.findFirst({ where: { name: def.name } });
    if (!service) {
      service = await prisma.service.create({
        data: { ...def, categoryId: category.id, commissionType: "PERCENTAGE", description: `${def.name} — professional, home-service massage.` },
      });
    }
    services.push(service);
  }

  // ---- Expense categories ----
  const expenseCategoryNames = [
    "Transportation",
    "Fuel",
    "Supplies",
    "Marketing",
    "Equipment",
    "Maintenance",
    "Utilities",
    "Communication",
    "Salaries",
    "Commissions",
    "Other",
  ];
  for (const name of expenseCategoryNames) {
    await prisma.expenseCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  // ---- Therapists ----
  const therapistDefs = [
    { name: "Maria Santos", email: "maria.santos@ljspa2go.ph", phone: "09171110001", base: AREAS.quezonCity, radius: 18 },
    { name: "Anna Cruz", email: "anna.cruz@ljspa2go.ph", phone: "09171110002", base: AREAS.makati, radius: 15 },
    { name: "Sarah Villanueva", email: "sarah.villanueva@ljspa2go.ph", phone: "09171110003", base: AREAS.pasig, radius: 15 },
    { name: "Jenny Ramos", email: "jenny.ramos@ljspa2go.ph", phone: "09171110004", base: AREAS.manila, radius: 15 },
    { name: "Liza Torres", email: "liza.torres@ljspa2go.ph", phone: "09171110005", base: AREAS.taguig, radius: 15 },
  ];

  const therapists = [];
  for (const def of therapistDefs) {
    const user = await prisma.user.upsert({
      where: { email: def.email },
      update: {},
      create: { email: def.email, name: def.name, phone: def.phone, role: "THERAPIST", passwordHash },
    });

    let therapist = await prisma.therapist.findUnique({ where: { userId: user.id } });
    if (!therapist) {
      therapist = await prisma.therapist.create({
        data: {
          userId: user.id,
          employmentStatus: "ACTIVE",
          hireDate: new Date("2023-01-15"),
          bio: `Licensed massage therapist serving the ${def.base.area} area and nearby.`,
          areasServed: [def.base.area],
          maxTravelRadiusKm: def.radius,
          homeLat: def.base.lat,
          homeLng: def.base.lng,
          active: true,
          status: "AVAILABLE",
          services: { create: services.map((s) => ({ serviceId: s.id })) },
          workingHours: {
            create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
              dayOfWeek,
              isActive: dayOfWeek !== 0,
              startMinutes: 9 * 60,
              endMinutes: 19 * 60,
              breakStartMinutes: 13 * 60,
              breakEndMinutes: 13 * 60 + 30,
            })),
          },
        },
      });
    }
    therapists.push(therapist);
  }

  // ---- Clients ----
  const clientDefs = [
    { name: "John Santos", phone: "09181110001", email: "john.santos@example.com", area: AREAS.makati },
    { name: "Grace Lim", phone: "09181110002", email: "grace.lim@example.com", area: AREAS.quezonCity },
    { name: "Ramon Dela Cruz", phone: "09181110003", email: "ramon.delacruz@example.com", area: AREAS.pasig },
    { name: "Kim Aquino", phone: "09181110004", email: "kim.aquino@example.com", area: AREAS.taguig },
    { name: "Patricia Uy", phone: "09181110005", email: "patricia.uy@example.com", area: AREAS.mandaluyong },
    { name: "Miguel Bautista", phone: "09181110006", email: "miguel.bautista@example.com", area: AREAS.manila },
    { name: "Divine Reyes", phone: "09181110007", email: "divine.reyes@example.com", area: AREAS.pasay },
    { name: "Carlo Mercado", phone: "09181110008", email: "carlo.mercado@example.com", area: AREAS.marikina },
  ];

  const clients = [];
  for (const def of clientDefs) {
    let client = await prisma.client.findFirst({ where: { phone: def.phone } });
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: def.name,
          phone: def.phone,
          email: def.email,
          addresses: {
            create: {
              label: "Home",
              addressLine: `${Math.floor(Math.random() * 900) + 100} Sample St., ${def.area.area}`,
              area: def.area.area,
              lat: def.area.lat + (Math.random() - 0.5) * 0.01,
              lng: def.area.lng + (Math.random() - 0.5) * 0.01,
              isDefault: true,
            },
          },
        },
      });
    }
    clients.push(client);
  }

  // ---- A few sample bookings across statuses (today) ----
  const dispatcher = staff.find((u) => u.role === "DISPATCHER")!;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function atManilaTime(hour: number, minute = 0): Date {
    const d = new Date(today);
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  const clientAddresses = await prisma.clientAddress.findMany({ where: { clientId: { in: clients.map((c) => c.id) } } });

  const sampleBookings: { clientIdx: number; therapistIdx: number; serviceIdx: number; start: Date; status: "COMPLETED" | "IN_SERVICE" | "ASSIGNED" | "CANCELLED" }[] = [
    { clientIdx: 0, therapistIdx: 1, serviceIdx: 1, start: atManilaTime(10, 0), status: "COMPLETED" },
    { clientIdx: 1, therapistIdx: 0, serviceIdx: 0, start: atManilaTime(11, 0), status: "COMPLETED" },
    { clientIdx: 2, therapistIdx: 2, serviceIdx: 2, start: atManilaTime(14, 0), status: "IN_SERVICE" },
    { clientIdx: 3, therapistIdx: 4, serviceIdx: 1, start: atManilaTime(16, 30), status: "ASSIGNED" },
    { clientIdx: 4, therapistIdx: 3, serviceIdx: 0, start: atManilaTime(13, 0), status: "CANCELLED" },
  ];

  let bookingSeq = 1;
  for (const b of sampleBookings) {
    const client = clients[b.clientIdx];
    const therapist = therapists[b.therapistIdx];
    const service = services[b.serviceIdx];
    const address = clientAddresses.find((a) => a.clientId === client.id);
    if (!address) continue;

    const bookingNumber = `LJ-${today.getFullYear()}-${String(bookingSeq++).padStart(6, "0")}`;
    const existing = await prisma.booking.findUnique({ where: { bookingNumber } });
    if (existing) continue;

    const end = new Date(b.start.getTime() + service.durationMinutes * 60_000);
    await prisma.booking.create({
      data: {
        bookingNumber,
        clientId: client.id,
        therapistId: therapist.id,
        serviceId: service.id,
        addressId: address.id,
        clientAddressLine: address.addressLine,
        landmark: address.area,
        latitude: address.lat,
        longitude: address.lng,
        date: today,
        scheduledStart: b.start,
        scheduledEnd: end,
        actualStart: b.status === "COMPLETED" || b.status === "IN_SERVICE" ? b.start : undefined,
        actualEnd: b.status === "COMPLETED" ? end : undefined,
        status: b.status,
        travelMinutes: 25,
        distanceKm: 8.4,
        travelBufferMinutes: service.bufferMinutes,
        estimatedArrival: b.start,
        amount: service.price,
        paymentStatus: b.status === "COMPLETED" ? "PAID" : "UNPAID",
        paymentMethod: b.status === "COMPLETED" ? "CASH" : undefined,
        cancelReason: b.status === "CANCELLED" ? "Client requested reschedule" : undefined,
        cancelledAt: b.status === "CANCELLED" ? new Date() : undefined,
        createdById: dispatcher.id,
      },
    });
  }

  console.log("Seed complete.");
  console.log(`All staff logins use password: ${PASSWORD}`);
  console.log(staff.map((u) => `  ${u.role.padEnd(12)} ${u.email}`).join("\n"));
  console.log(therapistDefs.map((t) => `  THERAPIST    ${t.email}`).join("\n"));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
