import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RegisterServiceWorker } from "@/components/therapist-app/register-sw";

export default async function TherapistLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "THERAPIST") redirect("/dashboard");

  return (
    <div data-theme="ops" className="min-h-dvh bg-bg text-fg">
      <RegisterServiceWorker />
      <div className="mx-auto max-w-md px-4 pb-10 pt-6">{children}</div>
    </div>
  );
}
