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

const EJERCICIOS_INDICE = {
    "Pecho": [
        "Press de banca plano con barra",
        "Press de banca inclinado con mancuernas",
        "Flexiones de brazos (peso corporal)",
        "Aperturas con mancuernas",
        "Fondos en paralelas (pecho bajo/tríceps)",
        "Cruce de poleas",
    ],
    "Espalda": [
        "Dominadas (peso corporal)",
        "Jalón al pecho en polea",
        "Remo con barra",
        "Remo unilateral con mancuerna",
        "Remo sentado en polea",
        "Hiperextensiones lumbares",
    ],
    "Piernas": [
        "Sentadilla libre",
        "Prensa de piernas",
        "Zancadas / estocadas",
        "Peso muerto rumano",
        "Hip thrust (empuje de cadera)",
        "Extensión de cuádriceps en máquina",
        "Curl femoral tumbado o sentado",
        "Elevación de talones",
        "Sentadilla búlgara",
    ],
    "Hombros": [
        "Press militar con barra o mancuernas",
        "Elevaciones laterales con mancuernas",
        "Pájaros / vuelos posteriores",
        "Elevaciones frontales",
        "Face pull (salud del hombro)",
    ],
    "Brazos": [
        "Curl de bíceps con barra",
        "Curl martillo con mancuernas",
        "Curl predicador",
        "Press francés",
        "Extensión de tríceps en polea alta",
        "Fondos entre bancos",
    ],
    "Abdomen / core": [
        "Plancha abdominal",
        "Crunch abdominal clásico",
        "Elevación de piernas colgado o en suelo",
        "Giros rusos",
        "Rueda abdominal",
    ],
    "Cardio / acondicionamiento": [
        "Burpees",
        "Saltos de tijera",
        "Salto a la cuerda",
    ],
};

const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const renderListaEjerciciosBreve = () => {
    const parts = [];
    for (const [grupo, items] of Object.entries(EJERCICIOS_INDICE)) {
        const li = items.map((e) => `<li>${escapeHtml(e)}</li>`).join("");
        parts.push(`
            <details class="swal-details">
                <summary>${escapeHtml(grupo)} <span class="swal-chip">${items.length}</span></summary>
                <ul class="swal-lista">${li}</ul>
            </details>
        `);
    }
    return parts.join("\n");
};

const openGenerarPlanModal = async () => {
    const lastLugar = localStorage.getItem("plan_lugar") || "casa";
    const lastObjetivo = localStorage.getItem("plan_objetivo") || "musculo";

    const result = await sweetalert.fire({
        title: "Generar Plan de Entrenamiento con IA",
        html: `
            <div class="swal-gen">
                <p class="swal-helper">
                    Elegí tu contexto y prioridad. Esto nos ayuda a seleccionar ejercicios y armar una progresión coherente.
                </p>

                <section class="swal-section" aria-label="Opciones de plan">
                    <h3>Opciones</h3>
                    <div class="swal-grid">
                        <div class="swal-field">
                            <p class="swal-label">¿Dónde entrenás?</p>
                            <label class="swal-radio"><input type="radio" name="lugar" value="casa"> Entreno en casa</label>
                            <label class="swal-radio"><input type="radio" name="lugar" value="gimnasio"> Entreno en gimnasio</label>
                        </div>
                        <div class="swal-field">
                            <p class="swal-label">¿Qué priorizás?</p>
                            <label class="swal-radio"><input type="radio" name="objetivo" value="grasa"> Priorizar pérdida de grasa</label>
                            <label class="swal-radio"><input type="radio" name="objetivo" value="musculo"> Priorizar ganancia muscular</label>
                        </div>
                    </div>
                </section>

                <section class="swal-section" aria-label="Ejercicios disponibles">
                    <h3>Ejercicios disponibles (índice)</h3>
                    <p class="swal-helper">Lista breve de ejercicios que la IA usa como base para armar el plan.</p>
                    <div class="swal-ejercicios">
                        ${renderListaEjerciciosBreve()}
                    </div>
                </section>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Generar",
        cancelButtonText: "Cancelar",
        customClass: {
            popup: "dashboard-swal",
            confirmButton: "dashboard-swal-confirm",
            cancelButton: "dashboard-swal-cancel",
        },
        didOpen: () => {
            const popup = (typeof sweetalert.getPopup === "function" && sweetalert.getPopup()) || document.querySelector(".swal2-popup");
            popup?.querySelector(`input[name="lugar"][value="${lastLugar}"]`)?.click();
            popup?.querySelector(`input[name="objetivo"][value="${lastObjetivo}"]`)?.click();
        },
        preConfirm: () => {
            const popup = (typeof sweetalert.getPopup === "function" && sweetalert.getPopup()) || document.querySelector(".swal2-popup");
            const lugar = popup?.querySelector('input[name="lugar"]:checked')?.value;
            const objetivo = popup?.querySelector('input[name="objetivo"]:checked')?.value;
            if (!lugar || !objetivo) {
                if (typeof sweetalert.showValidationMessage === "function") {
                    sweetalert.showValidationMessage("Elegí dónde entrenás y qué priorizás");
                }
                return false;
            }
            return { lugar, objetivo };
        },
    });

    if (!result.isConfirmed) return;
    const { lugar, objetivo } = result.value;

    await crearPlanEntreno(lugar, objetivo);
};
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
    const plan_entrenamiento = localStorage.getItem("plan_entreno_usuario");
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
        const desc = document.getElementById("descripcion_previa");
        if (desc) desc.style.display = "block";
        boton_ejercicios.textContent = "generar plan de entrenamiento";
        boton_ejercicios.onclick = async () => {
            await openGenerarPlanModal();
        }
    }
}
async function crearPlanEntreno(lugar, objetivo){
    const response = await fetch('/generar_plan_entreno', {
        method: 'POST',
        body: JSON.stringify({ lugar: lugar, objetivo: objetivo, Altura: localStorage.getItem("altura_usuario"), Peso_actual: localStorage.getItem("peso_actual_usuario"), Peso_objetivo: localStorage.getItem("peso_objetivo_usuario"), Edad: localStorage.getItem("edad_usuario")}),
    })
    if (!response.ok) {
        sweetalert.fire({
            title: "Error",
            text: "Error al generar el plan de entrenamiento. Por favor, intentá nuevamente más tarde.",
            icon: "error",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 5000,
        });
        return;
    }
    else {
        const data = await response.json();
        const planEntrenamiento = data.plan;

        await sweetalert.fire({
            title: "Configuración guardada",
            text: `Lugar: ${lugar ?? "-"} | Objetivo: ${objetivo ?? "-"}. Próximamente se generará el plan automáticamente.`,
            icon: "info",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 3500,
        });

        console.log("Plan de entrenamiento generado correctamente." + planEntrenamiento);

        await recuperar_planes();
        verificacion_plan_entrenamiento();
    }
}

function verificacion_plan_alimentacion() {
    // wip: evitar ReferenceError mientras se implementa el plan de alimentación
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

async function actualizar_cambios_plan_entreno(){
    const res = await fetch('/actualizar_cambios_plan', {
        method: 'POST',
        body: JSON.stringify({ plan_entreno: localStorage.getItem("plan_entreno_usuario")}),
    })
    if (!res.ok) {
        console.error("Error al actualizar el plan de entrenamiento en el servidor.");
    }
}

//temporal

//aca falta poner el script para los botones que tendran los planes de entreno, editar, eliminar (por ejercicio) y el boton para eliminar el plan. todo esto estara en el html del plan mismo