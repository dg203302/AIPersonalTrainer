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
                localStorage.setItem("username_usuario", user.user_metadata.full_name ?? "Usuario sin nombre");
                localStorage.setItem("avatar_usuario", user.user_metadata.avatar_url ?? "/Assets/Imagenes/Avatares/avatar_default.png");
                localStorage.setItem("id_usuario", user.id);
                localStorage.setItem("altura_usuario", datos[0].Altura);
                localStorage.setItem("edad_usuario", datos[0].Edad);
                localStorage.setItem("peso_usuario", datos[0].Peso);
                localStorage.setItem("peso_objetivo_usuario", datos[0].Peso_Obj);
                const {data, error} = await supabase
                    .from("Planes")
                    .select("*")
                    .eq("ID_user", user.id)
                    .limit(1);
                const planes = data ?? [];
                if (error) {
                    alert("Error al obtener el plan de entrenamiento del usuario: " + error.message);
                    return;
                }
                if (planes.length === 0) {
                    localStorage.setItem("plan_entreno_usuario", "Ninguno");
                    localStorage.setItem("plan_dieta_usuario", "Ninguno");
                } else {
                    localStorage.setItem("plan_entreno_usuario", planes[0].Plan_entreno);
                    localStorage.setItem("plan_dieta_usuario", planes[0].Plan_alimenta);
                }
                window.location.href = "/Templates/Inicio/Dashboard.html";
                return
            }
        } else {
            return
        }
    });
}