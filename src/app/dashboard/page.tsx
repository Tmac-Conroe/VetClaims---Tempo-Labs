import { InfoIcon, UserCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Header Section */}
      <header className="w-full bg-gray-100 py-4 shadow-sm">
        <h1 className="text-2xl font-bold text-center">
          VetClaims CoPilot Dashboard
        </h1>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4">
        <div className="container mx-auto">
          {/* Authentication Info */}
          <div className="bg-secondary/50 text-sm p-3 px-4 rounded-lg text-muted-foreground flex gap-2 items-center mb-6">
            <InfoIcon size="14" />
            <span>
              This is a protected page only visible to authenticated users
            </span>
          </div>

          {/* User Profile Section */}
          <section className="bg-card rounded-xl p-6 border shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <UserCircle size={48} className="text-primary" />
              <div>
                <h2 className="font-semibold text-xl">User Profile</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 overflow-hidden">
              <pre className="text-xs font-mono max-h-48 overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
