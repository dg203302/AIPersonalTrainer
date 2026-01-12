import conectar_supabase from "./Conexion_supabase.js";

export default async function handler(request, context) {
    try {
        const { supabase } = conectar_supabase();
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
        return new Response(
            JSON.stringify({ error: err.message ?? "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}