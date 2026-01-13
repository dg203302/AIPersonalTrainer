import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_publishable_oLC8LcDLa3jR72Hpd_jJsA_eXjMlP3-";
const supabase = createClient(supabaseUrl, supabaseKey, {auth: {persistSession: true,autoRefreshToken: false, storage: localStorage}});

window.onload = () =>{
    const user = supabase.auth.getUser().then(({data: {user}}) => {
        if (user) {
            document.getElementById("datos_persistencia").innerText = "ID_usuario guardado: " + user.id;
        } else {
            alert("No se encontró un usuario autenticado.");
        }
    });
}
document.getElementById("logout_button").addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert("Error al cerrar sesión: " + error.message);
    } else {
        localStorage.removeItem("supabase.auth.token");
        window.location.href = "https://aipersonaltr.netlify.app/";
    }
});