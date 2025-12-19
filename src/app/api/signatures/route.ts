import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/utils";
import { signToken } from "@/lib/tokens";
import { sendSignatureConfirmationEmail } from "@/lib/email";
import { z } from "zod";

const createSignatureSchema = z.object({
  petitionId: z.string().uuid(),
  name: z.string().min(2).max(200),
  email: z.string().email(),
  comment: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createSignatureSchema.parse(body);

    const supabase = getSupabaseServer();

    // Verify petition exists and is public
    const { data: petition, error: petitionError } = await supabase
      .from("petitions")
      .select("id, title, status")
      .eq("id", validated.petitionId)
      .single();

    if (petitionError || !petition || petition.status !== "public") {
      return NextResponse.json(
        { error: "Petition not found or unavailable" },
        { status: 404 }
      );
    }

    const emailNormalized = normalizeEmail(validated.email);

    // Check for duplicate signature
    const { data: existing } = await supabase
      .from("signatures")
      .select("id")
      .eq("petition_id", validated.petitionId)
      .eq("email_normalized", emailNormalized)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "You have already signed this petition" },
        { status: 409 }
      );
    }

    // Create unconfirmed signature
    const { data: signature, error: signatureError } = await supabase
      .from("signatures")
      .insert({
        petition_id: validated.petitionId,
        name: validated.name,
        email: validated.email,
        email_normalized: emailNormalized,
        comment: validated.comment,
        ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
        user_agent: req.headers.get("user-agent") || null,
        status: "unconfirmed",
      })
      .select("id")
      .single();

    if (signatureError) {
      console.error("Failed to create signature:", signatureError);
      return NextResponse.json(
        { error: "Failed to create signature" },
        { status: 500 }
      );
    }

    // Generate confirmation token
    const token = signToken({
      signatureId: signature.id,
      petitionId: validated.petitionId,
    });

    // Send confirmation email
    try {
      await sendSignatureConfirmationEmail(
        validated.email,
        petition.title,
        token
      );
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Don't fail the request - signature is created, email will be retried
    }

    return NextResponse.json({
      success: true,
      message: "Please check your email to confirm your signature",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating signature:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

