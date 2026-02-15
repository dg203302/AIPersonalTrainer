import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.94.1/+esm";

const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_secret_8pOt21ZHhoru6-VbtV6sEQ_TYL8DivC";
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
};

const sanitizeApiKey = (raw) => {
    let s = String(raw ?? "").trim();
    s = s.replace(/^["']/, "").replace(/["']$/, "");
    s = s.replace(/\s+/g, "");
    s = s.replace(/[^\x21-\x7E]/g, "");
    return s;
};

export default async function handler(request, _context) {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    try {
        const { data, error } = await supabase
            .from("claves_sensibles")
            .select("gemini")
            .eq("id", 1)
            .single();

        if (error) throw new Error(error.message);

        const cleaned = sanitizeApiKey(data?.gemini);
        if (!cleaned) {
            return new Response(JSON.stringify({ error: "Gemini apiKey inválida" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ apiKey: cleaned }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e?.message || String(e) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
}
