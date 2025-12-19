import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { PetitionCard } from "@/components/petition/petition-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = getSupabaseServer();

  const { data: featuredPetitions } = await supabase
    .from("petitions")
    .select("*")
    .eq("status", "public")
    .order("signature_count", { ascending: false })
    .limit(3);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6 text-gray-900">
            The Power of Change is in Your Hands
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Start petitions, gather support, and make your voice heard on issues
            that matter to you and your community.
          </p>
          <Link
            href="/start"
            className="inline-block bg-black text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-800"
          >
            Start a Petition
          </Link>
        </div>
      </section>

      {/* Featured Petitions */}
      {featuredPetitions && featuredPetitions.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-gray-900">
              Featured Petitions
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {featuredPetitions.map((petition) => (
                <PetitionCard key={petition.id} petition={petition} />
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                href="/petitions"
                className="text-black hover:underline font-medium"
              >
                View All Petitions →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center text-gray-900">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
1
</div>
<h3 className="text-xl font-semibold mb-2">Start a Petition</h3>
<p className="text-gray-600">
Create a petition on an issue you care about
</p>
</div>
<div className="text-center">
<div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
2
</div>
<h3 className="text-xl font-semibold mb-2">Gather Support</h3>
<p className="text-gray-600">
Share your petition and collect signatures
</p>
</div>
<div className="text-center">
<div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
3
</div>
<h3 className="text-xl font-semibold mb-2">Make an Impact</h3>
<p className="text-gray-600">
Deliver your petition and create change
</p>
</div>
</div>
</div>
</section>
</div>
);
}
