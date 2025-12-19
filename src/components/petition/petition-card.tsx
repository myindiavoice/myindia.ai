import Link from "next/link";
import { formatNumber } from "@/lib/utils";

interface PetitionCardProps {
  petition: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    goal: number;
    signature_count: number;
    created_at: string;
  };
}

export function PetitionCard({ petition }: PetitionCardProps) {
  const progress = (petition.signature_count / petition.goal) * 100;

  return (
    <Link href={`/petitions/${petition.slug}`}>
      <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white">
        <h3 className="text-xl font-semibold mb-2 text-gray-900">
          {petition.title}
        </h3>
        <p className="text-gray-600 mb-4 line-clamp-2">{petition.summary}</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-700">
            <span className="font-medium">
              {formatNumber(petition.signature_count)} signed
            </span>
            <span>Goal: {formatNumber(petition.goal)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-black h-2 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
