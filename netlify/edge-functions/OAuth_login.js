import conectar_supabase from "./Conexion_supabase.js";
export default async function handler(request, context) {
    const { supabase } = conectar_supabase();
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: "https://aipersonaltr.netlify.app/Templates/Dashboard.html" }
    });

    if (error || !data?.url) {
        return {
            ok: false,
            status: 500,
            body: { error: error?.message ?? "oauth_url_generation_failed" },
        };
    }

    return {
        ok: true,
        status: 200,
        body: { redirectUrl: data.url },
    };
}