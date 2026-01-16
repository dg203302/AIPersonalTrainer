import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_publishable_oLC8LcDLa3jR72Hpd_jJsA_eXjMlP3-";
const supabase = createClient(supabaseUrl, supabaseKey, {auth: {persistSession: true,autoRefreshToken: false, storage: localStorage}});

const updateFixedChromeHeights = () => {
    const header = document.querySelector("header");
    const root = document.documentElement;
    if (header) root.style.setProperty("--header-fixed", `${header.offsetHeight}px`);
};

const initFixedChromeObservers = () => {
    updateFixedChromeHeights();
    if ("ResizeObserver" in window) {
        const ro = new ResizeObserver(() => updateFixedChromeHeights());
        const header = document.querySelector("header");
        if (header) ro.observe(header);
    } else {
        window.addEventListener("resize", updateFixedChromeHeights, { passive: true });
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFixedChromeObservers, { once: true });
} else {
    initFixedChromeObservers();
}


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

    await recuperar_planes();

    document.getElementById("username").textContent = username;
    document.getElementById("icono_usuario").src = avatar;

    verificacion_plan_entrenamiento();
    verificacion_plan_alimentacion();
}

function verificacion_plan_entrenamiento() {
    const plan_entrenamiento = localStorage.getItem("plan_entrenamiento_usuario");
    const boton_ejercicios = document.getElementById("boton_ejercicios");
    if (plan_entrenamiento != "Ninguno" && plan_entrenamiento != null) {
        contenedor_ejercicios = document.getElementById("Plan_ejercicio");
        contenedor_ejercicios.style.display = "flex";
        contenedor_ejercicios.innerHTML = plan_entrenamiento;

        boton_ejercicios.textContent = "refrescar plan de entrenamiento";
        boton_ejercicios.onclick = async () => {
            await recuperar_planes();
            sweetalert.fire({
                title: "Plan de entrenamiento actualizado",
                text: "Tu plan de entrenamiento ha sido refrescado correctamente.",
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        }


    }
    else if (plan_entrenamiento == "Ninguno" || plan_entrenamiento == null) {
        boton_ejercicios.textContent = "generar plan de entrenamiento";
        boton_ejercicios.onclick = async () => {
            //wip
        }
    }
}

async function recuperar_planes() {
    const {user} = await supabase.auth.getUser().then(({data: {user}}) => user);
    if (user){
        const {datos2, error2 } = await supabase
        .from("Planes").select("*").eq("ID_user", user.id).limit(1);
        if (error2) {
            swal.fire({
                title: "Error",
                text: "Error al obtener los datos del usuario: " + error2.message,
                toast: true,
                position: 'top-end',
                icon: 'error',
                timer: 5000
            })
            return;
        }
        localStorage.setItem("plan_entreno_usuario", datos2.length === 0 ? "Ninguno" : datos2[0].Plan_entreno ?? "Ninguno");
        localStorage.setItem("plan_dieta_usuario", datos2.length === 0 ? "Ninguno" : datos2[0].Plan_alimenta ?? "Ninguno");
    }
}

//aca falta poner el script para los botones que tendran los planes de entreno, editar, eliminar (por ejercicio) y el boton para eliminar el plan. todo esto estara en el html del plan mismo