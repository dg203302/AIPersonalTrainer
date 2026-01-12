import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default async function handler(request, context) {
    const Id_bd = Deno.env.Supabse_Api_Key;
    const Url_bd = Deno.env.Supabase_Project_Url;
    const supabase = createClient(Url_bd, Id_bd);
	return { supabase };
}