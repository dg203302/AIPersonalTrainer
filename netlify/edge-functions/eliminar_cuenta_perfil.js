import { createClient } from "@supabase/supabase-js";

const envGet = (key) => {
    try {
        return globalThis?.Deno?.env?.get?.(key);
    } catch {
        return undefined;
    }
};

const supabaseUrl = envGet("SUPABASE_URL") ?? "https://lhecmoeilmhzgxpcetto.supabase.co";
// OJO: para borrar usuarios se necesita la SERVICE ROLE KEY.
const supabaseKey = envGet("SUPABASE_SERVICE_ROLE_KEY")
    ?? envGet("SUPABASE_ANON_KEY")
    ?? "sb_secret_8pOt21ZHhoru6-VbtV6sEQ_TYL8DivC";

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
};

const jsonResponse = (body, init = {}) => {
    const headers = new Headers(init.headers ?? {});
    headers.set("Content-Type", "application/json");
    for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
    return new Response(JSON.stringify(body), { ...init, headers });
};

export default async function handler(request, _context){
    try {
        if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
        if (request.method !== "POST") return jsonResponse({ message: "Method Not Allowed" }, { status: 405 });

        let payload;
        try {
            payload = await request.json();
        } catch {
            return jsonResponse({ message: "Body inválido: se esperaba JSON" }, { status: 400 });
        }

        const id_usuario = payload?.id_usuario;
        if (!id_usuario) return jsonResponse({ message: "Falta 'id_usuario' en el JSON" }, { status: 400 });

        const { error } = await supabase.auth.admin.deleteUser(id_usuario);
        if (error) {
            const msg = String(error.message ?? "");
            const status = Number(error.status) || 500;
            if (status === 404 || msg.toLowerCase().includes("not found")) {
                return jsonResponse({ message: "User already deleted" }, { status: 200 });
            }
            return jsonResponse({ message: "Error deleting user", error: msg }, { status });
        }

        return jsonResponse({ message: "User deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("eliminar_cuenta_perfil uncaught:", error);
        return jsonResponse({ message: "Internal Server Error" }, { status: 500 });
    }
}