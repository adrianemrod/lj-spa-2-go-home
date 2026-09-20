import { requirePermission } from "@/lib/auth/require-permission";
import { ClientCreateForm } from "@/components/clients/client-create-form";

export default async function NewClientPage() {
  await requirePermission("clients:manage");
  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-fg">New Client</h1>
      <ClientCreateForm />
    </div>
  );
}
