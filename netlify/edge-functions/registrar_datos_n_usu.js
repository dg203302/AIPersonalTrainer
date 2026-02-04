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

        const id_usuario = payload?.id_usuario ?? payload?.ID_user;
        if (!id_usuario) {
            return jsonResponse({ message: "Falta 'id_usuario' en el JSON" }, { status: 400 });
        }

    const toNumberOrNull = (value) => {
        if (value === null || value === undefined || value === "") return null;
        const asNumber = typeof value === "number" ? value : Number(value);
        return Number.isFinite(asNumber) ? asNumber : null;
    };

    const edad = toNumberOrNull(payload?.edad ?? payload?.Edad);
    const altura = toNumberOrNull(payload?.altura ?? payload?.Altura);
    const peso = toNumberOrNull(payload?.peso ?? payload?.Peso ?? payload?.peso_act);
    const peso_obj = toNumberOrNull(payload?.peso_obj ?? payload?.Peso_Obj ?? payload?.peso_desea);

        const { data, error } = await supabase
            .from('Datos Fitness')
            .insert([
                {
                    ID_user: id_usuario,
                    Altura: altura,
                    Peso: peso,
                    Edad: edad,
                    Peso_Obj: peso_obj,
                },
            ]);
        if (error) {
            return jsonResponse({ message: 'Error al registrar el usuario', error: error.message }, { status: 500 });
        }
        return jsonResponse({ message: 'Usuario registrado exitosamente', data }, { status: 200 });
    } catch (error) {
        console.error("registrar_datos_n_usu uncaught:", error);
        return jsonResponse({ message: "Internal Server Error" }, { status: 500 });
    }
}