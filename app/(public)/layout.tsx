import { getUser } from "@/actions/auth";
import { redirect } from "next/navigation";

export default async function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getUser();

    if (user?.isAdmin) {
        redirect("/dashboard");
    }

    if (user && !user.isAdmin) {
        redirect("/time");
    }

    return children;
}