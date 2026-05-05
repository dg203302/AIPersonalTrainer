import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.94.1/+esm";

const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = Deno.env.get('API_Key_Supabase');
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
};

export default async function handler(request, context) {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
        return new Response(JSON.stringify({ message: "Method Not Allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    let payload;
    try {
        payload = await request.json();
    } catch {
        return new Response(JSON.stringify({ message: "Body inválido: se esperaba JSON" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const id_usuario = payload?.id_usuario;
    const registro_json = payload?.registro_entreno;

    if (!id_usuario) {
        return new Response(JSON.stringify({ message: "Falta 'id_usuario' en el JSON" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const { data, error } = await supabase
        .from('Planes')
        .upsert({ ID_user: id_usuario, Dias_entrenados: registro_json }, { onConflict: 'ID_user' });

    if (error) {
        return new Response(JSON.stringify({ message: "Error al actualizar el registro de entreno", error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    return new Response(JSON.stringify({ message: "Registro de entreno actualizado exitosamente", data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}
