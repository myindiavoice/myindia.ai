"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PetitionForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    body: "",
    goal: "1000",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/petitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          summary: formData.summary,
          body: formData.body,
          goal: parseInt(formData.goal),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create petition");
      }

      router.push(`/petitions/${data.slug}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2">
          Petition Title *
        </label>
        <input
          id="title"
          type="text"
          required
          maxLength={200}
          className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-black focus:outline-none"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Save Our Local Park"
        />
      </div>

      <div>
        <label htmlFor="summary" className="block text-sm font-medium mb-2">
          Brief Summary *
        </label>
        <textarea
          id="summary"
          required
          maxLength={500}
          rows={3}
          className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-black focus:outline-none"
          value={formData.summary}
          onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
          placeholder="A short description (max 500 characters)"
        />
      </div>

      <div>
        <label htmlFor="body" className="block text-sm font-medium mb-2">
          Full Description *
        </label>
        <textarea
          id="body"
          required
          rows={10}
          className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-black focus:outline-none"
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          placeholder="Explain your petition in detail..."
        />
      </div>

      <div>
        <label htmlFor="goal" className="block text-sm font-medium mb-2">
          Signature Goal *
        </label>
        <input
          id="goal"
          type="number"
          required
          min={100}
          max={10000000}
          className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-black focus:outline-none"
          value={formData.goal}
          onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {loading ? "Creating..." : "Create Petition"}
      </button>
    </form>
  );
}
