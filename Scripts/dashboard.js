import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_publishable_oLC8LcDLa3jR72Hpd_jJsA_eXjMlP3-";
const supabase = createClient(supabaseUrl, supabaseKey, {auth: {persistSession: true,autoRefreshToken: false, storage: localStorage}});

window.onload = () =>{
    const user = supabase.auth.getUser().then(async ({data: {user}}) => {
        if (user) {
            const { data, error } = await supabase
                .from("Datos Fitness")
                .select("*")
                .eq("ID_user", user.id)
                .limit(1);

            const datos = data ?? [];
            if (error) {
                alert("Error al obtener los datos del usuario: " + error.message);
                return;
            }
            if (datos.length === 0) {
                window.location.href = "/Templates/Creacion_cuenta/Edad.html";
                return;
            }
            else{
                sessionStorage.clear();
                document.getElementById("datos_persistencia").textContent = "Sesión iniciada como: " + user.id + " con " + datos[0].Edad + " años, " + datos[0].Altura + " cm de altura, peso actual: " + datos[0].Peso + " kg, peso objetivo: " + datos[0].Peso_Obj + " kg.";
                localStorage.setItem("altura_usuario", datos[0].Altura);
                localStorage.setItem("edad_usuario", datos[0].Edad);
                localStorage.setItem("peso_usuario", datos[0].Peso);
                localStorage.setItem("peso_objetivo_usuario", datos[0].Peso_Obj);
                return
            }
        } else {
            return
        }
    });
}
document.getElementById("logout_button").addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert("Error al cerrar sesión: " + error.message);
    } else {
        localStorage.removeItem("supabase.auth.token");
        localStorage.clear();
        sessionStorage.clear();
        //window.location.href = "https://aipersonaltr.netlify.app"; ESTO PARA PRODUCCION
        window.location.href = "http://localhost:8888";
    }
});