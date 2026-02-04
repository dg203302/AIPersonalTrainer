import { createClient } from "@supabase/supabase-js";

const envGet = (key) => {
    try {
        return globalThis?.Deno?.env?.get?.(key);
    } catch {
        return undefined;
    }
};

const supabaseUrl = envGet("SUPABASE_URL") ?? "https://lhecmoeilmhzgxpcetto.supabase.co";
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

    const plan_json = payload?.plan_entreno;
    const id_usuario = payload?.id_usuario;
    
        if (!plan_json) {
            return jsonResponse({ message: "Falta 'Plan_entreno' en el JSON" }, { status: 400 });
        }
        if (!id_usuario) {
            return jsonResponse({ message: "Falta 'id_usuario' en el JSON" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('Planes')
            .update({ Plan_entreno: plan_json })
            .eq('ID_user', id_usuario);
        if (error) {
            return jsonResponse({ message: 'Error al actualizar el plan', error: error.message }, { status: 500 });
        }
        return jsonResponse({ message: 'Plan actualizado exitosamente', data }, { status: 200 });
    } catch (error) {
        console.error("actualizar_cambios_plan uncaught:", error);
        return jsonResponse({ message: "Internal Server Error" }, { status: 500 });
    }
}