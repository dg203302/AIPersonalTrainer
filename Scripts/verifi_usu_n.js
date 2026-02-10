import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.94.1/+esm";
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
                    .select("Plan_entreno, Plan_alimenta")
                    .eq("ID_user", user.id)
                    .single();
                if (data){
                    const plane_entreno = data?.Plan_entreno ?? "Ninguno";
                    const plane_alimenta = data?.Plan_alimenta ?? "Proximamente";
                    localStorage.setItem("plan_entreno_usuario", plane_entreno );
                    localStorage.setItem("plan_dieta_usuario", plane_alimenta);
                }
                else{
                    localStorage.setItem("plan_entreno_usuario", "Ninguno" );
                    localStorage.setItem("plan_dieta_usuario", "Proximamente");
                    window.location.href = "/Templates/Inicio/Dashboard.html";
                    return
                }
                if (error) {
                    alert("Error al obtener el plan de entrenamiento del usuario: " + error.message);
                    return;
                }

                window.location.href = "/Templates/Inicio/Dashboard.html";

                return
            }
        } else {
            localStorage.clear();
            sessionStorage.clear();

            return window.location.href = "/Templates/Inicio/inicio_indice.html";
        
        }
    });
}
