import { getUser } from "@/actions/auth"
import WorkerAppLayout from "@/components/app-layout/WorkerLayout"
import { redirect } from "next/navigation"

const WorkerLayout = async ({ children }: { children: React.ReactNode }) => {

    const user = await getUser();


    if (!user) {
        redirect('/login');
    }

    if (user.isAdmin) {
        redirect('/dashboard');
    }

    return (
        <WorkerAppLayout companyName={user.company?.name} userName={user.name}>
            {children}
        </WorkerAppLayout>
    )
}

export default WorkerLayout
