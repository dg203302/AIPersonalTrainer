import conectar_supabase from "./Conexion_supabase.js";
export default async function oauth_login(
    { provider = "google", redirectTo } = {},
) {
    const { supabase } = conectar_supabase();
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: redirectTo ? { redirectTo } : undefined,
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