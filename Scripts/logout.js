import { createClient } from '@supabase/supabase-js';
const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_publishable_oLC8LcDLa3jR72Hpd_jJsA_eXjMlP3-";
const supabase = createClient(supabaseUrl, supabaseKey, {auth: {persistSession: true,autoRefreshToken: false, storage: localStorage}});
export async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert("Error al cerrar sesión: " + error.message);
    } else {
        localStorage.removeItem("supabase.auth.token");
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "https://aipersonaltr.netlify.app";
        //window.location.href = "http://localhost:8888";
    }
}
document.getElementById("logout_button").addEventListener("click", async () => {
    await logout();
});