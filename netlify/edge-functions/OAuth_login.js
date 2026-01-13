import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getSupabaseClient() {
    const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
    const supabaseAnonKey = "sb_secret_8pOt21ZHhoru6-VbtV6sEQ_TYL8DivC";
    //esto para produccion
    //const supabaseUrl = Deno.env.get("Supabase_Project_Url");
    //const supabaseAnonKey = Deno.env.get("Supabase_Api_Key");
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase_Project_Url or Supabase_Api_Key environment variable");
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: { 
            persistSession: true, 
            autoRefreshToken: false,
            storage: globalThis.localStorage
        },
    });
}

export default async function handler(_request, _context) {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            redirectUrl : "/Templates/Inicio/Dashboard.html",
        });

        if (error || !data?.url) {
            return new Response(
                JSON.stringify({ error: error?.message ?? "oauth_url_generation_failed" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
        await guardarInfo(supabase, data.user.id);
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
async function guardarInfo(cliente, id){
    localStorage.setItem("ID_usuario", id);
    const {data, error} = await cliente
        .from("Datos_Fitness")
        .insert([{Altura: 0, Peso: 0, Peso_Obj: 0, ID_user: id}]);
    if(error){
        console.error("Error al guardar la información del usuario:", error.message);
    } else {
        console.log("Información del usuario guardada correctamente:", data);
    }
}