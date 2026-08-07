import { getUser } from "@/actions/auth"
import AdminAppLayout from "@/components/app-layout/AdminLayout"
import { redirect } from "next/navigation"

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {

  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  if (!user.isAdmin) {
    redirect('/time');
  }

  return (
    <AdminAppLayout companyName={user.company?.name} userName={user.name}>
      {children}
    </AdminAppLayout>
  )
}

export default AdminLayout
