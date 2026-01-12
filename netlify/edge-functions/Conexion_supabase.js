import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default function conectar_supabase() {
    const Id_bd = Deno.env.Supabase_Api_Key;
    const Url_bd = Deno.env.Supabase_Project_Url;
    const supabase = createClient(Url_bd, Id_bd);
    return { supabase };
}