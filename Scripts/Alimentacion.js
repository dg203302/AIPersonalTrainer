import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.94.1/+esm";
const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_publishable_oLC8LcDLa3jR72Hpd_jJsA_eXjMlP3-";
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: true, autoRefreshToken: false, storage: localStorage } });


const sweetalert = window.swal;
const username = localStorage.getItem("username_usuario")
const avatar = localStorage.getItem("avatar_usuario")
window.onload = async () => {
    sweetalert.fire({
        title: `Bienvenido de nuevo, ${username}!`,
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
    });

    //await recuperar_planes();

    document.getElementById("username").textContent = username;
    document.getElementById("icono_usuario").src = avatar;

    //verificacion_plan_entrenamiento();
    //verificacion_plan_alimentacion();

    //initDetallePorDiaPlan();
    //initPlanDiaPager();
}