import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { neon } from "https://esm.sh/@neondatabase/serverless";


export default function conectar_supabase() {
    const Id_bd = neon(Deno.env.get("Supabase_Api_Key"));
    const Url_bd = Deno.env.get("Supabase_Project_Url");
    const supabase = createClient(Url_bd, Id_bd);
    return { supabase };
}