import { Logout } from "@/components/logout";

export default function Page() {
    return (
        <div className="px-10 py-8 flex items-center justify-between">
            <h1>Dashboard</h1>
            <Logout />
        </div>
    )
}