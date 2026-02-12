import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.94.1/+esm";

const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_secret_8pOt21ZHhoru6-VbtV6sEQ_TYL8DivC";
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

    const plan_json = payload?.plan_alimenta;
    const id_usuario = payload?.id_usuario;

    if (plan_json == null) {
        return new Response(JSON.stringify({ message: "Falta 'plan_alimenta' en el JSON" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    if (!id_usuario) {
        return new Response(JSON.stringify({ message: "Falta 'id_usuario' en el JSON" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const { data, error } = await supabase
        .from('Planes')
        .update({ Plan_alimenta: plan_json })
        .eq('ID_user', id_usuario);

    if (error) {
        return new Response(JSON.stringify({ message: "Error al actualizar el plan", error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    return new Response(JSON.stringify({ message: "Plan actualizado exitosamente", data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}
