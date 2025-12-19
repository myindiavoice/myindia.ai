import { getSupabaseServer } from "@/lib/supabase/server";
import { SignatureForm } from "@/components/petition/signature-form";
import { formatNumber, formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    confirmed?: string;
  }>;
}

export default async function PetitionDetailPage(props: PageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  const supabase = getSupabaseServer();

  const { data: petition, error } = await supabase
    .from("petitions")
    .select("*")
    .eq("slug", params.slug)
    .eq("status", "public")
    .single();

  if (error || !petition) {
    notFound();
  }

  const progress = (petition.signature_count / petition.goal) * 100;

  return (
    <div className="container mx-auto px-4 py-16">
      {searchParams.confirmed === "1" && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg text-green-900">
          ✓ Thank you! Your signature has been confirmed.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">
            {petition.title}
          </h1>

          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-lg font-semibold text-gray-900">
              <span>{formatNumber(petition.signature_count)} signatures</span>
              <span>Goal: {formatNumber(petition.goal)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-black h-3 rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          <div className="prose max-w-none mb-8">
            <p className="text-xl text-gray-700 mb-6">{petition.summary}</p>
            <div className="whitespace-pre-wrap text-gray-800">
              {petition.body}
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Created on {formatDate(petition.created_at)}
          </div>
        </div>

        {/* Sidebar - Sign Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <SignatureForm
              petitionId={petition.id}
              petitionTitle={petition.title}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
