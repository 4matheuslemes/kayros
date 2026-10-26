import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const schema = z.object({
  full_name: z.string().min(1, "Preencha seu nome"),
  monthly_goal_hours: z.number().int().min(1).max(200).optional(),
  working_days: z.array(z.number().int().min(1).max(7)).optional(),
});

export async function POST(req: Request) {
  try {
    const serverSupabase = await createServerClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify user is authorized (linked member or admin)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, member_id, is_admin, hours_access")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.member_id && !profile?.is_admin) {
      return NextResponse.json(
        { error: "Conta não vinculada à congregação." },
        { status: 403 }
      );
    }

    const { full_name, monthly_goal_hours, working_days } = parsed.data;

    const updateData: Record<string, unknown> = {
      full_name,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };

    if (profile.hours_access) {
      if (monthly_goal_hours !== undefined) updateData.monthly_goal_hours = monthly_goal_hours;
      if (working_days !== undefined) updateData.working_days = working_days;
    }

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (updateError) {
      console.error("Erro ao completar onboarding:", updateError.message);
      return NextResponse.json(
        { error: "Erro ao salvar dados de configuração inicial." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Erro em POST /api/onboarding/complete:", err);
    return NextResponse.json(
      { error: "Erro interno ao processar requisição." },
      { status: 500 }
    );
  }
}
