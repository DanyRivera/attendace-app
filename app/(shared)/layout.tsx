import { getUser } from "@/actions/auth";
import AdminAppLayout from "@/components/app-layout/AdminLayout";
import WorkerAppLayout from "@/components/app-layout/WorkerLayout";
import { redirect } from "next/navigation";

export default async function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.isAdmin) {
    return (
      <AdminAppLayout companyName={user.company?.name}  userName={user.name}>{children}</AdminAppLayout>
    );
  }

  return <WorkerAppLayout companyName={user.company?.name}  userName={user.name}>{children}</WorkerAppLayout>;
}
