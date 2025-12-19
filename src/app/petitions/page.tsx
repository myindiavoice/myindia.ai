import { getSupabaseServer } from "@/lib/supabase/server";
import { PetitionCard } from "@/components/petition/petition-card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PetitionsPage() {
  const supabase = getSupabaseServer();

  const { data: petitions, error } = await supabase
    .from("petitions")
    .select("*")
    .eq("status", "public")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <p className="text-red-600">Failed to load petitions</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8 text-gray-900">All Petitions</h1>

      {!petitions || petitions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 mb-4">No petitions yet</p>
          <Link href="/start" className="text-black hover:underline font-medium">
            Be the first to start one →
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {petitions.map((petition) => (
            <PetitionCard key={petition.id} petition={petition} />
          ))}
        </div>
      )}
    </div>
  );
}
