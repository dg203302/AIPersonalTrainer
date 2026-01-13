import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_publishable_oLC8LcDLa3jR72Hpd_jJsA_eXjMlP3-";
const supabase = createClient(supabaseUrl, supabaseKey, {auth: {persistSession: true,autoRefreshToken: false, storage: localStorage}});

document.getElementById("boton_google").addEventListener("click",async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `https://aipersonaltr.netlify.app//Templates/Inicio/Dashboard.html` },
    });

    if (error) {
        alert("Error al iniciar sesión con Google: " + error.message);
        return;
    }
    if (data?.url) {
        window.location.href = data.url;
    } else {
        alert("Error al iniciar sesión con Google: oauth_url_generation_failed"); //poner swal
    }
});