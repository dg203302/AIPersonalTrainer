import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
function getSupabaseClient() {
    const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
    const supabaseKey = "sb_publishable_oLC8LcDLa3jR72Hpd_jJsA_eXjMlP3-";
    return createClient(supabaseUrl, supabaseKey);
}
window.onload = async () => {
    const supabase = getSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
    if (error) {
        console.error("Error getting session from URL:", error.message);
        return;
    }
    if (session && session.user) {
        const userId = session.user.id;
        localStorage.setItem("ID_usuario", userId);
        document.getElementById("datos_persistencia").innerText = `Usuario ID guardado: ${userId}`;
        //await fetch('/insert_user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }), });
    } else {
        console.error("No session or user found in URL.");
    }
}