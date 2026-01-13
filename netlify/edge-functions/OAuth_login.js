import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getSupabaseClient() {
    const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
    const supabaseAnonKey = "sb_secret_8pOt21ZHhoru6-VbtV6sEQ_TYL8DivC";
    //const supabaseUrl = Deno.env.get("Supabase_Project_Url");
    //const supabaseAnonKey = Deno.env.get("Supabase_Api_Key");
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase_Project_Url or Supabase_Api_Key environment variable");
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

export default async function handler(_request, _context) {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: "https://aipersonaltr.netlify.app/Templates/Inicio/Dashboard.html" }
        });

        if (error || !data?.url) {
            return new Response(
                JSON.stringify({ error: error?.message ?? "oauth_url_generation_failed" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ redirectUrl: data.url }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ error: err.message ?? "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}