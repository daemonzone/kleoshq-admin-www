import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { isAdmin } from "@/lib/guard";
import { card } from "@/lib/ui";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/");
  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="mb-6 text-center text-xl font-semibold">SiteWitness <span className="text-blue-600">admin</span></h1>
      <div className={card}><LoginForm /></div>
    </div>
  );
}
