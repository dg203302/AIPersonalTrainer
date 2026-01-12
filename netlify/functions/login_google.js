import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default async function handler(request, context) {
    try {
        const Id_bd = Deno.env.Supabase_Api_Key;
        const Url_bd = Deno.env.Supabase_Project_Url;
        const supabase = createClient(Url_bd, Id_bd);

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: "https://aipersonaltr.netlify.app/Templates/Dashboard.html" }
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
        console.error("Error en login_google:", err);
        return new Response(
            JSON.stringify({ error: err.message ?? "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
