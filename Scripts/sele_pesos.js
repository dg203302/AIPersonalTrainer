import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_publishable_oLC8LcDLa3jR72Hpd_jJsA_eXjMlP3-";
const supabase = createClient(supabaseUrl, supabaseKey, {auth: {persistSession: true,autoRefreshToken: false, storage: localStorage}});

window.onload = () =>{
    const t = document.getElementById("datos_previos")
    t.textContent = "Tu edad: " + sessionStorage.getItem("edad_temp") + ", Tu altura: " + sessionStorage.getItem("alt_temp")

    const form = document.getElementById("Ingreso_Pesos");
    if (!form) return;

    form.addEventListener("submit", async function (event){
        event.preventDefault()
        const peso_act_temp = parseFloat(document.getElementById("peso_act").value);
        const peso_desea_temp = parseFloat(document.getElementById("peso_desea").value);

        const { data: { user } } = await supabase.auth.getUser();
        const id_usuario = user?.id;
        if (!id_usuario) {
            alert("No hay sesión iniciada");
            return;
        }

        if (await registrar_datos(id_usuario, sessionStorage.getItem("edad_temp"), sessionStorage.getItem("alt_temp"), peso_act_temp, peso_desea_temp)) {
            window.location.href = "/Templates/Inicio/Dashboard.html"
        }
        return 
    })
}
async function registrar_datos(id,edad, altura, peso_act, peso_desea){
    const response = await fetch('/registrar_usuario_nuevo', {
        method: 'POST',
        body: JSON.stringify({ id_usuario: id, edad, altura, peso_act, peso_desea })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        alert("Error al registrar los datos: " + (result?.error ?? result?.message ?? response.statusText));
        return false;
    }

    alert("Datos registrados con exito!");
    return true;
}