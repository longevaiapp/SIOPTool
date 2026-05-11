import { redirect } from "next/navigation";

export default function Home() {
    // Redirect to login - user will be sent to overview after login
    redirect("/login");
}
