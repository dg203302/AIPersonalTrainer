import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_publishable_oLC8LcDLa3jR72Hpd_jJsA_eXjMlP3-";
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: true, autoRefreshToken: false, storage: localStorage } });

const updateFixedChromeHeights = () => {
    const header = document.querySelector("header");
    const footer = document.querySelector("footer");
    const root = document.documentElement;
    if (header) root.style.setProperty("--header-fixed", `${header.offsetHeight}px`);
    if (footer) root.style.setProperty("--footer-fixed", `${footer.offsetHeight}px`);
};

const initFixedChromeObservers = () => {
    updateFixedChromeHeights();
    if ("ResizeObserver" in window) {
        const ro = new ResizeObserver(() => updateFixedChromeHeights());
        const header = document.querySelector("header");
        const footer = document.querySelector("footer");
        if (header) ro.observe(header);
        if (footer) ro.observe(footer);
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

const renderListaEjerciciosSelectable = () => {
    const parts = [];
    for (const [grupo, items] of Object.entries(EJERCICIOS_INDICE)) {
        const checks = items
            .map((e) => {
                const safe = escapeHtml(e);
                return `
                    <label class="swal-check">
                        <input type="checkbox" name="ejercicios" value="${safe}">
                        <span>${safe}</span>
                    </label>
                `;
            })
            .join("");

        parts.push(`
            <details class="swal-details" data-grupo="${escapeHtml(grupo)}">
                <summary>${escapeHtml(grupo)} <span class="swal-chip">${items.length}</span></summary>
                <div class="swal-checklist">
                    ${checks}
                </div>
            </details>
        `);
    }
    return parts.join("\n");
};

const DIAS_SEMANA = [
    { code: "L", label: "L", name: "lunes" },
    { code: "M", label: "M", name: "martes" },
    { code: "X", label: "X", name: "miercoles" },
    { code: "J", label: "J", name: "jueves" },
    { code: "V", label: "V", name: "viernes" },
    { code: "S", label: "S", name: "sabado" },
    { code: "D", label: "D", name: "domingo" },
];

const normalizeDiasSeleccionados = (value) => {
    if (!value) return null;
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        if (!Array.isArray(parsed)) return null;
        const allowed = new Set(DIAS_SEMANA.map((d) => d.code));
        const uniq = [];
        for (const item of parsed) {
            const code = String(item ?? "").toUpperCase();
            if (allowed.has(code) && !uniq.includes(code)) uniq.push(code);
        }
        return uniq;
    } catch {
        return null;
    }
};

const renderDiasSelector = () => {
    const buttons = DIAS_SEMANA.map(
        (d) => `<button type="button" class="swal-dia-btn" data-dia="${escapeHtml(d.code)}" aria-pressed="false">${escapeHtml(d.label)}</button>`
    ).join("");
    return `
        <div class="swal-dias" role="group" aria-label="Días de entrenamiento">
            ${buttons}
        </div>
        <p class="swal-helper">Tocá para seleccionar los días en los que vas a entrenar.</p>
    `;
};

const renderSelectorIntensidad = () => {
    return `
        <section class="swal-section" aria-label="Intensidad de entrenamiento">
            <h3>Intensidad</h3>
            <div class="swal-grid">
                <div class="swal-field">
                    <p class="swal-label">Elige la intensidad</p>
                    <label class="swal-radio"><input type="radio" name="intensidad" value="baja"> Intensidad baja</label>
                    <label class="swal-radio"><input type="radio" name="intensidad" value="media"> Intensidad media</label>
                    <label class="swal-radio"><input type="radio" name="intensidad" value="alta"> Intensidad alta</label>
                    <p class="swal-helper">La intensidad afecta la cantidad de ejercicios por día (baja: 4, media: 6, alta: 8).</p>
                </div>
            </div>
        </section>
    `;
}

const openGenerarPlanModal = async (planPrevioRaw = null) => {
    const baseLugar = localStorage.getItem("plan_lugar") || "casa";
    const baseObjetivo = localStorage.getItem("plan_objetivo") || "musculo";
    const baseIntensidad = localStorage.getItem("plan_intensidad") || "media";
    const baseDias =
        normalizeDiasSeleccionados(localStorage.getItem("plan_dias")) ||
        ["L", "M", "X", "J", "V"]; // default: lunes a viernes
    const baseEjEnabled = (localStorage.getItem("plan_ejercicios_enabled") || "0") === "1";
    const baseEjSeleccionados = (() => {
        const raw = localStorage.getItem("plan_ejercicios_selected");
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
        } catch {
            return [];
        }
    })();

    const stripAccents = (text) => String(text ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const extractLikelyJson = (text) => {
        const s = String(text ?? "");
        const unfenced = s
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/i, "")
            .trim();

        const firstObj = unfenced.indexOf("{");
        const firstArr = unfenced.indexOf("[");
        if (firstObj === -1 && firstArr === -1) return unfenced;
        const start = firstArr === -1 ? firstObj : (firstObj === -1 ? firstArr : Math.min(firstObj, firstArr));
        const lastObj = unfenced.lastIndexOf("}");
        const lastArr = unfenced.lastIndexOf("]");
        const end = Math.max(lastObj, lastArr);
        if (end <= start) return unfenced;
        return unfenced.slice(start, end + 1);
    };

    const tryParseJson = (value) => {
        if (value == null) return null;
        if (typeof value === "object") return value;
        try {
            return JSON.parse(String(value));
        } catch {
            return null;
        }
    };

    const mapEntornoToLugar = (entorno) => {
        const v = stripAccents(entorno).trim().toLowerCase();
        if (!v) return null;
        if (v.includes("gim")) return "gimnasio";
        if (v.includes("casa") || v.includes("hogar")) return "casa";
        return null;
    };

    const mapObjetivoToCode = (obj) => {
        const v = stripAccents(obj).trim().toLowerCase();
        if (!v) return null;
        if (v.includes("grasa") || v.includes("perdida") || v.includes("defin")) return "grasa";
        if (v.includes("mus") || v.includes("hipert") || v.includes("ganancia")) return "musculo";
        return null;
    };

    const mapDiaToCode = (dia) => {
        const v = stripAccents(dia).trim().toLowerCase();
        if (!v) return null;
        const found = DIAS_SEMANA.find((d) => stripAccents(d.name).toLowerCase() === v);
        return found?.code ?? null;
    };

    const mapIntensidadToCode = (value) => {
        const v = stripAccents(value).trim().toLowerCase();
        if (!v) return null;
        if (v.includes("baj")) return "baja";
        if (v.includes("alt")) return "alta";
        if (v.includes("med")) return "media";
        return null;
    };

    const buildPrefillFromPlanPrevio = (raw) => {
        if (!raw) return null;
        const parsed = tryParseJson(extractLikelyJson(raw)) ?? tryParseJson(raw);
        if (!parsed || typeof parsed !== "object") return null;

        const root =
            parsed.plan_entrenamiento_hipertrofia ??
            parsed.plan_entrenamiento ??
            parsed.plan ??
            parsed;

        const usuario = (root && typeof root === "object") ? (root.usuario ?? root.user ?? null) : null;
        const entorno = usuario?.entorno;
        const objetivo = usuario?.objetivo;
        const intensidadCode = mapIntensidadToCode(usuario?.intensidad);

        const ejerciciosPorDia = Number(usuario?.ejercicios_por_dia);
        const intensidadFromN = Number.isFinite(ejerciciosPorDia)
            ? (ejerciciosPorDia <= 4 ? "baja" : (ejerciciosPorDia <= 6 ? "media" : "alta"))
            : null;

        const lugar = mapEntornoToLugar(entorno);
        const objetivoCode = mapObjetivoToCode(objetivo);

        const config = root?.configuracion_semanal;
        const diasConEjercicios = Array.isArray(config)
            ? config
                .filter((d) => Array.isArray(d?.ejercicios) && d.ejercicios.length > 0)
                .map((d) => mapDiaToCode(d?.dia))
                .filter(Boolean)
            : [];
        const dias = diasConEjercicios.length ? diasConEjercicios : null;

        const ejercicios = Array.isArray(config)
            ? Array.from(
                new Set(
                    config
                        .flatMap((d) => Array.isArray(d?.ejercicios) ? d.ejercicios : [])
                        .map((e) => String(e?.nombre ?? e?.ejercicio ?? e?.exercise ?? e?.name ?? "").trim())
                        .filter(Boolean)
                )
            )
            : null;

        return {
            lugar: lugar || null,
            objetivo: objetivoCode || null,
            intensidad: intensidadCode || intensidadFromN || null,
            dias,
            ejercicios,
        };
    };

    const prefillPlan = buildPrefillFromPlanPrevio(planPrevioRaw);
    const lastLugar = prefillPlan?.lugar || baseLugar;
    const lastObjetivo = prefillPlan?.objetivo || baseObjetivo;
    const lastDias = prefillPlan?.dias || baseDias;
    const lastEjSeleccionados = Array.isArray(prefillPlan?.ejercicios) ? prefillPlan.ejercicios : baseEjSeleccionados;
    const lastEjEnabled = Array.isArray(prefillPlan?.ejercicios) ? true : baseEjEnabled;
    const lastIntensidad = prefillPlan?.intensidad || baseIntensidad;

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
                
                ${renderSelectorIntensidad()}

                <section class="swal-section" aria-label="Días de entrenamiento">
                    <h3>Días de la semana</h3>
                    ${renderDiasSelector()}
                </section>

                <section class="swal-section" aria-label="Ejercicios disponibles">
                    <h3>Ejercicios disponibles (índice)</h3>
                    <p class="swal-helper">Opcional: si querés, marcá ejercicios preferidos. Si no seleccionás nada, la IA elige automáticamente.</p>
                    <label class="swal-toggle">
                        <input type="checkbox" id="swal_ej_toggle">
                        <span>Quiero elegir ejercicios</span>
                    </label>
                    <div class="swal-ejercicios">
                        ${renderListaEjerciciosSelectable()}
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
            popup?.querySelector(`input[name="intensidad"][value="${lastIntensidad}"]`)?.click();

            const diasSet = new Set(lastDias);
            popup?.querySelectorAll(".swal-dia-btn")?.forEach((btn) => {
                const code = btn.getAttribute("data-dia");
                const isOn = diasSet.has(String(code ?? "").toUpperCase());
                btn.classList.toggle("is-selected", isOn);
                btn.setAttribute("aria-pressed", isOn ? "true" : "false");
            });

            // toggle con delegación
            popup?.querySelector(".swal-dias")?.addEventListener("click", (ev) => {
                const target = ev.target;
                if (!(target instanceof HTMLElement)) return;
                const btn = target.closest(".swal-dia-btn");
                if (!(btn instanceof HTMLButtonElement)) return;
                const pressed = btn.getAttribute("aria-pressed") === "true";
                const next = !pressed;
                btn.classList.toggle("is-selected", next);
                btn.setAttribute("aria-pressed", next ? "true" : "false");
            });

            // ejercicios (opcional)
            const toggle = popup?.querySelector("#swal_ej_toggle");
            if (toggle instanceof HTMLInputElement) {
                toggle.checked = lastEjEnabled;
            }

            const selectedSet = new Set(lastEjSeleccionados.map((x) => String(x)));
            popup?.querySelectorAll('input[name="ejercicios"]')?.forEach((el) => {
                if (!(el instanceof HTMLInputElement)) return;
                el.checked = selectedSet.has(el.value);
            });

            const setEjEnabled = (enabled) => {
                popup?.classList.toggle("is-ej-disabled", !enabled);
                popup?.querySelectorAll('input[name="ejercicios"]')?.forEach((el) => {
                    if (!(el instanceof HTMLInputElement)) return;
                    el.disabled = !enabled;
                });
            };

            setEjEnabled(lastEjEnabled);
            toggle?.addEventListener("change", () => {
                const enabled = toggle instanceof HTMLInputElement ? toggle.checked : false;
                setEjEnabled(enabled);
            });
        },
        preConfirm: () => {
            const popup = (typeof sweetalert.getPopup === "function" && sweetalert.getPopup()) || document.querySelector(".swal2-popup");
            const lugar = popup?.querySelector('input[name="lugar"]:checked')?.value;
            const objetivo = popup?.querySelector('input[name="objetivo"]:checked')?.value;
            const dias = Array.from(popup?.querySelectorAll('.swal-dia-btn[aria-pressed="true"]') ?? []).map((b) => String(b.getAttribute("data-dia") ?? "").toUpperCase());
            const intensidad = popup?.querySelector('input[name="intensidad"]:checked')?.value || null;
            const ejEnabled = !!(popup?.querySelector("#swal_ej_toggle") instanceof HTMLInputElement)
                ? popup.querySelector("#swal_ej_toggle").checked
                : false;
            const ejercicios = ejEnabled
                ? Array.from(popup?.querySelectorAll('input[name="ejercicios"]:checked') ?? []).map((el) => {
                    if (el instanceof HTMLInputElement) return String(el.value);
                    return "";
                }).filter(Boolean)
                : null;

            if (!lugar || !objetivo) {
                if (typeof sweetalert.showValidationMessage === "function") {
                    sweetalert.showValidationMessage("Elegí dónde entrenás y qué priorizás");
                }
                return false;
            }

            if (!dias.length) {
                if (typeof sweetalert.showValidationMessage === "function") {
                    sweetalert.showValidationMessage("Seleccioná al menos un día de la semana");
                }
                return false;
            }

            return { lugar, objetivo, dias, ejEnabled, ejercicios, intensidad };
        },
    });

    if (!result.isConfirmed) return;
    const { lugar, objetivo, dias, ejEnabled, ejercicios, intensidad } = result.value;


    await crearPlanEntreno(lugar, objetivo, dias, ejercicios, intensidad);
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

    initDetallePorDiaPlan();
}

function verificacion_plan_entrenamiento() {
    const desc = document.getElementById("descripcion_previa");
    const plan_entrenamiento = localStorage.getItem("plan_entreno_usuario");
    const boton_ejercicios = document.getElementById("boton_ejercicios");
    const boton_eliminar_plan_eje = document.getElementById("boton_eliminar");
    const boton_regenerar = document.getElementById("boton_regenerar");
    if (plan_entrenamiento != "Ninguno" && plan_entrenamiento != null) {
        desc.style.display = "none";
        if (boton_regenerar) {
            boton_regenerar.style.display = "inline-block";
            boton_regenerar.onclick = () => Regen_plan();
        }
        boton_eliminar_plan_eje.style.display = "inline-block";
        const contenedor_ejercicios = document.getElementById("Plan_ejercicio");
        contenedor_ejercicios.style.display = "block";
        contenedor_ejercicios.innerHTML = mapear_plan(plan_entrenamiento)
        boton_ejercicios.innerHTML = '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXJlZnJlc2gtY2N3LWljb24gbHVjaWRlLXJlZnJlc2gtY2N3Ij48cGF0aCBkPSJNMjEgMTJhOSA5IDAgMCAwLTktOSA5Ljc1IDkuNzUgMCAwIDAtNi43NCAyLjc0TDMgOCIvPjxwYXRoIGQ9Ik0zIDN2NWg1Ii8+PHBhdGggZD0iTTMgMTJhOSA5IDAgMCAwIDkgOSA5Ljc1IDkuNzUgMCAwIDAgNi43NC0yLjc0TDIxIDE2Ii8+PHBhdGggZD0iTTE2IDE2aDV2NSIvPjwvc3ZnPg==">';
        boton_ejercicios.style.width = "50px";
        boton_ejercicios.style.height = "50px";
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
        if (desc) desc.style.display = "block";
        boton_eliminar_plan_eje.style.display = "none";
        boton_ejercicios.innerHTML = "generar plan de entrenamiento";
        boton_ejercicios.style.width = "auto";
        boton_ejercicios.style.height = "auto";
        boton_ejercicios.onclick = async () => {
            await openGenerarPlanModal();
        }
    }
}
async function crearPlanEntreno(lugar, objetivo, diasSeleccionados, ejerciciosSeleccionados, intensidad = 'media') {

    const diasCodes = Array.isArray(diasSeleccionados) ? diasSeleccionados : [];
    const diasSem = diasCodes
        .map((code) => DIAS_SEMANA.find((d) => d.code === String(code ?? "").toUpperCase())?.name)
        .filter(Boolean);
    const ejerciciosPorDiaMap = { baja: 4, media: 6, alta: 8 };
    const ejerciciosPorDia = ejerciciosPorDiaMap[intensidad] ?? ejerciciosPorDiaMap.media;
    // persist user choice for next time
    try { localStorage.setItem("plan_intensidad", intensidad); } catch (e) { }

    sweetalert.fire({
        title: "Generando tu plan...",
        html: `
            <div style="display:flex; flex-direction:column; align-items:center; gap:15px; margin-top:10px;">
                <div class="loader-mark">
                    <svg class="ring" viewBox="0 0 120 120" width="80" height="80" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" stroke-width="8" opacity="0.25"></circle>
                        <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" stroke-width="8"></circle>
                    </svg>
                </div>
                <p style="color:var(--muted); font-size:14px; text-align:center;">
                    Analizando perfil (${lugar}, ${objetivo})...<br>
                    Esto puede tomar unos segundos.
                </p>
            </div>
        `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        customClass: {
            popup: 'dashboard-swal'
        }
    });

    try {
        const response = await fetch('/generar_plan_entreno', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_usuario: localStorage.getItem("id_usuario"),
                lugar: lugar,
                objetivo: objetivo,
                intensidad: intensidad,
                ejercicios_por_dia: ejerciciosPorDia,
                dias: diasCodes,
                dias_semana: diasSem,
                ejercicios_seleccionados: Array.isArray(ejerciciosSeleccionados) ? ejerciciosSeleccionados : null,
                Altura: localStorage.getItem("altura_usuario"),
                Peso_actual: localStorage.getItem("peso_actual_usuario"),
                Peso_objetivo: localStorage.getItem("peso_objetivo_usuario"),
                Edad: localStorage.getItem("edad_usuario"),
            }),
        });

        if (!response.ok) {
            throw new Error("Error en la respuesta del servidor");
        }

        const { data, error } = await supabase
            .from("Planes")
            .select("*")
            .eq("ID_user", localStorage.getItem("id_usuario"))
            .limit(1);

        if (error) throw new Error(error.message);

        localStorage.setItem("plan_entreno_usuario", data.length === 0 ? "Ninguno" : data[0].Plan_entreno ?? "Ninguno");
        localStorage.setItem("plan_dieta_usuario", data.length === 0 ? "Ninguno" : data[0].Plan_alimenta ?? "Ninguno");
        await recuperar_planes();
        verificacion_plan_entrenamiento();

        // Close loading and show success
        sweetalert.fire({
            title: "¡Plan listo!",
            text: "Tu plan de entrenamiento se ha generado correctamente.",
            icon: 'success',
            timer: 3000,
            showConfirmButton: false,
            customClass: {
                popup: 'dashboard-swal'
            }
        });

    } catch (err) {
        sweetalert.fire({
            title: "Error",
            text: "Hubo un problema al generar el plan. " + err.message,
            icon: "error",
            confirmButtonText: "Entendido",
            customClass: {
                popup: 'dashboard-swal',
                confirmButton: 'dashboard-swal-confirm'
            }
        });
    }
}

function verificacion_plan_alimentacion() {
    // wip: evitar ReferenceError mientras se implementa el plan de alimentación
}

async function recuperar_planes() {
    const { user } = await supabase.auth.getUser().then(({ data: { user } }) => user);
    if (user) {
        const { datos2, error2 } = await supabase
            .from("Planes").select("Plan_entreno, Plan_alimenta").eq("ID_user", user.id).single();
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
        const plan_entreno = datos2.Plan_entreno;
        const plan_alimenta = datos2.Plan_alimenta;
        localStorage.setItem("plan_entreno_usuario", plan_entreno);
        localStorage.setItem("plan_dieta_usuario", plan_alimenta);
    }
}

function mapear_plan(plan_entrenamiento_json) {
    const raw = plan_entrenamiento_json;
    if (raw == null) {
        return "<div class=\"plan-vacio\">No hay plan cargado.</div>";
    }

    const asString = typeof raw === "string" ? raw.trim() : JSON.stringify(raw);
    if (!asString || asString === "Ninguno") {
        return "<div class=\"plan-vacio\">No hay plan cargado.</div>";
    }

    const extractLikelyJson = (text) => {
        const s = String(text ?? "");
        // strip code fences if present
        const unfenced = s
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/i, "")
            .trim();

        const firstObj = unfenced.indexOf("{");
        const firstArr = unfenced.indexOf("[");
        if (firstObj === -1 && firstArr === -1) return unfenced;
        const start = firstArr === -1 ? firstObj : (firstObj === -1 ? firstArr : Math.min(firstObj, firstArr));
        const lastObj = unfenced.lastIndexOf("}");
        const lastArr = unfenced.lastIndexOf("]");
        const end = Math.max(lastObj, lastArr);
        if (end <= start) return unfenced;
        return unfenced.slice(start, end + 1);
    };

    const tryParseJson = (text) => {
        try {
            return JSON.parse(text);
        } catch {
            return null;
        }
    };

    const normalizeExercise = (ex) => {
        if (!ex || typeof ex !== "object") return null;
        const nombre = ex.nombre ?? ex.ejercicio ?? ex.exercise ?? ex.name ?? ex.titulo ?? ex.title;
        const descripcion = ex.descripcion ?? ex.description ?? ex.detalle ?? ex.detalles ?? ex.instrucciones ?? ex.instruccion;
        const series = ex.series ?? ex.series_por_ejercicio ?? ex.sets ?? ex.set ?? ex.seriesTotales;
        const repeticiones = ex.repeticiones ?? ex.reps ?? ex.repetitions ?? ex.rep ?? ex.repeticion;
        if (!nombre && !series && !repeticiones) return null;
        return {
            nombre: nombre ?? "Ejercicio",
            descripcion: descripcion ?? "",
            series: series ?? "-",
            repeticiones: repeticiones ?? "-",
        };
    };

    const diasOrden = [
        "lunes",
        "martes",
        "miércoles",
        "miercoles",
        "jueves",
        "viernes",
        "sábado",
        "sabado",
        "domingo",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    ];

    const parse = () => {
        const extracted = extractLikelyJson(asString);
        const parsed = tryParseJson(extracted);
        if (parsed != null) return parsed;

        // fallback: sometimes it's JSON but with text around it
        const parsed2 = tryParseJson(asString);
        if (parsed2 != null) return parsed2;
        return null;
    };

    const parsed = parse();
    if (parsed == null) {
        return `
            <div class="plan-container">
                <div class="plan-aviso">No pude interpretar el plan como JSON. Mostrando texto.</div>
                <pre class="plan-raw">${escapeHtml(asString)}</pre>
            </div>
        `;
    }

    const isPlainArray = Array.isArray(parsed);
    let root = isPlainArray ? { ejercicios: parsed } : parsed;

    // Soportar estructura guardada: { plan_entrenamiento_hipertrofia: { configuracion_semanal: [...] } }
    if (root && typeof root === "object") {
        root =
            root.plan_entrenamiento_hipertrofia ??
            root.plan_entrenamiento ??
            root.plan ??
            root;
    }

    // Detect common shapes
    const maybeDiasArray =
        root.configuracion_semanal ??
        root.configuracionSemanal ??
        root.dias ??
        root.semana ??
        root.plan_semanal ??
        root.planSemanal;
    const hasDiasArray = Array.isArray(maybeDiasArray);

    const weekdayKeys = Object.keys(root || {}).filter((k) => diasOrden.includes(String(k).toLowerCase()));
    const hasWeekdayObject = weekdayKeys.length > 0;

    const renderExerciseCard = (exNorm, idx) => {
        const nombre = escapeHtml(exNorm.nombre);
        const descripcion = escapeHtml(exNorm.descripcion || "");
        const series = escapeHtml(exNorm.series);
        const reps = escapeHtml(exNorm.repeticiones);
        return `
            <article class="plan-card" data-idx="${idx}">
                <h3 class="plan-nombre">${nombre}</h3>
                ${descripcion ? `<p class="plan-desc">${descripcion}</p>` : ""}
                <div class="plan-meta">
                    <span class="plan-chip">Series: <strong>${series}</strong></span>
                    <span class="plan-chip">Reps: <strong>${reps}</strong></span>
                </div>
            </article>
        `;
    };

    const renderDaySection = (diaLabel, ejerciciosList, enfoque, dayIdx) => {
        const normalized = (Array.isArray(ejerciciosList) ? ejerciciosList : [])
            .map(normalizeExercise)
            .filter(Boolean);

        const cards = normalized.length
            ? normalized.map(renderExerciseCard).join("")
            : `<div class="plan-vacio">No hay ejercicios para este día.</div>`;

        return `
            <section class="plan-dia">
                <div class="plan-dia-header" role="button" tabindex="0" data-day-idx="${escapeHtml(dayIdx)}" aria-label="Ver detalle de ${escapeHtml(diaLabel)}">
                    <div class="plan-dia-titulos">
                        <h2 class="plan-dia-titulo">${escapeHtml(diaLabel)}</h2>
                        ${enfoque ? `<div class="plan-dia-subtitle">${escapeHtml(enfoque)}</div>` : ""}
                    </div>
                    <span class="plan-dia-chip">${normalized.length} ejercicios</span>
                </div>
                <div class="plan-grid">${cards}</div>
            </section>
        `;
    };

    let html = "";

    if (hasDiasArray) {
        const sections = maybeDiasArray
            .map((d, i) => {
                const dia = d.dia ?? d.nombre ?? d.day ?? `Día ${i + 1}`;
                const enfoque = d.enfoque ?? d.focus ?? d.objetivo ?? d.titulo ?? d.title;
                const ejercicios = d.ejercicios ?? d.entrenamiento ?? d.exercises ?? d.rutina ?? d.items ?? [];
                return renderDaySection(dia, ejercicios, enfoque, i);
            })
            .join("");
        html = sections;
    } else if (hasWeekdayObject) {
        const orderedKeys = [...weekdayKeys].sort((a, b) => {
            const ia = diasOrden.indexOf(String(a).toLowerCase());
            const ib = diasOrden.indexOf(String(b).toLowerCase());
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
        html = orderedKeys.map((k, i) => renderDaySection(k, root[k], null, i)).join("");
    } else {
        const ejercicios = root.ejercicios ?? root.plan ?? root.entrenamiento ?? root.exercises ?? root.rutina ?? [];
        const normalized = (Array.isArray(ejercicios) ? ejercicios : [])
            .map(normalizeExercise)
            .filter(Boolean);
        const cards = normalized.length
            ? normalized.map(renderExerciseCard).join("")
            : `<div class="plan-vacio">No pude encontrar ejercicios en el JSON.</div>`;
        html = `<div class="plan-grid">${cards}</div>`;
    }

    return `<div class="plan-container">${html}</div>`;
}

function parsePlanDiasDetallados(planRaw) {
    if (planRaw == null) return null;
    const asString = typeof planRaw === "string" ? planRaw.trim() : JSON.stringify(planRaw);
    if (!asString || asString === "Ninguno") return null;

    const extractLikelyJsonText = (text) => {
        const s = String(text ?? "");
        const unfenced = s
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/i, "")
            .trim();

        const firstObj = unfenced.indexOf("{");
        const firstArr = unfenced.indexOf("[");
        if (firstObj === -1 && firstArr === -1) return unfenced;
        const start = firstArr === -1 ? firstObj : (firstObj === -1 ? firstArr : Math.min(firstObj, firstArr));
        const lastObj = unfenced.lastIndexOf("}");
        const lastArr = unfenced.lastIndexOf("]");
        const end = Math.max(lastObj, lastArr);
        if (end <= start) return unfenced;
        return unfenced.slice(start, end + 1);
    };

    const safeJsonParse = (text) => {
        try {
            return JSON.parse(text);
        } catch {
            return null;
        }
    };

    const parsed = safeJsonParse(extractLikelyJsonText(asString)) ?? safeJsonParse(asString);
    if (!parsed || typeof parsed !== "object") return null;

    let root = Array.isArray(parsed) ? { ejercicios: parsed } : parsed;
    if (root && typeof root === "object") {
        root = root.plan_entrenamiento_hipertrofia ?? root.plan_entrenamiento ?? root.plan ?? root;
    }

    const diasOrden = [
        "lunes",
        "martes",
        "miércoles",
        "miercoles",
        "jueves",
        "viernes",
        "sábado",
        "sabado",
        "domingo",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    ];

    const normalizeExDet = (ex) => {
        if (!ex || typeof ex !== "object") return null;
        const nombre = ex.nombre ?? ex.ejercicio ?? ex.exercise ?? ex.name ?? ex.titulo ?? ex.title;
        const descripcion = ex.descripcion ?? ex.description ?? ex.detalle ?? ex.detalles ?? ex.instrucciones ?? ex.instruccion;
        const series = ex.series ?? ex.series_por_ejercicio ?? ex.sets ?? ex.set ?? ex.seriesTotales;
        const repeticiones = ex.repeticiones ?? ex.reps ?? ex.repetitions ?? ex.rep ?? ex.repeticion;
        const descanso_segundos = ex.descanso_segundos ?? ex.descanso ?? ex.rest ?? ex.rest_seconds ?? ex.restSeconds;
        if (!nombre && !series && !repeticiones && !descripcion) return null;
        return {
            nombre: String(nombre ?? "Ejercicio"),
            descripcion: String(descripcion ?? ""),
            series: series ?? "-",
            repeticiones: repeticiones ?? "-",
            descanso_segundos: descanso_segundos ?? "-",
        };
    };

    const maybeDiasArray =
        root?.configuracion_semanal ??
        root?.configuracionSemanal ??
        root?.dias ??
        root?.semana ??
        root?.plan_semanal ??
        root?.planSemanal;

    if (Array.isArray(maybeDiasArray)) {
        return maybeDiasArray.map((d, i) => {
            const dia = d?.dia ?? d?.nombre ?? d?.day ?? `Día ${i + 1}`;
            const enfoque = d?.enfoque ?? d?.focus ?? d?.objetivo ?? d?.titulo ?? d?.title ?? "";
            const ejercicios = Array.isArray(d?.ejercicios)
                ? d.ejercicios.map(normalizeExDet).filter(Boolean)
                : [];
            return { dia, enfoque, ejercicios };
        });
    }

    const weekdayKeys = Object.keys(root || {}).filter((k) => diasOrden.includes(String(k).toLowerCase()));
    if (weekdayKeys.length > 0) {
        const orderedKeys = [...weekdayKeys].sort((a, b) => {
            const ia = diasOrden.indexOf(String(a).toLowerCase());
            const ib = diasOrden.indexOf(String(b).toLowerCase());
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
        return orderedKeys.map((k) => {
            const ejercicios = Array.isArray(root[k]) ? root[k].map(normalizeExDet).filter(Boolean) : [];
            return { dia: k, enfoque: "", ejercicios };
        });
    }

    return null;
}

function initDetallePorDiaPlan() {
    const contenedor = document.getElementById("Plan_ejercicio");
    if (!contenedor) return;
    if (contenedor.dataset.detalleDiaInit === "1") return;
    contenedor.dataset.detalleDiaInit = "1";

    const openDetalle = async (headerEl) => {
        const idx = Number(headerEl?.getAttribute?.("data-day-idx"));
        if (!Number.isFinite(idx)) return;

        const planRaw = localStorage.getItem("plan_entreno_usuario");
        const dias = parsePlanDiasDetallados(planRaw);
        if (!Array.isArray(dias) || !dias[idx]) return;

        const diaInfo = dias[idx];
        const ejercicios = Array.isArray(diaInfo.ejercicios) ? diaInfo.ejercicios : [];

        const cards = ejercicios.length
            ? ejercicios.map((ex) => {
                const nombre = escapeHtml(ex.nombre);
                const descripcion = escapeHtml(ex.descripcion || "");
                const series = escapeHtml(ex.series);
                const reps = escapeHtml(ex.repeticiones);
                const descanso = escapeHtml(ex.descanso_segundos);
                return `
                    <article class="plan-card">
                        <h3 class="plan-nombre">${nombre}</h3>
                        ${descripcion ? `<p class="plan-desc">${descripcion}</p>` : ""}
                        <div class="plan-meta">
                            <span class="plan-chip">Series: <strong>${series}</strong></span>
                            <span class="plan-chip">Reps: <strong>${reps}</strong></span>
                            <span class="plan-chip">Descanso: <strong>${descanso}</strong></span>
                        </div>
                    </article>
                `;
            }).join("")
            : `<div class="plan-vacio">No hay ejercicios cargados para este día.</div>`;

        const html = `
            <div style="max-height: 62vh; overflow: auto; padding-right: 2px;">
                <div class="plan-container">
                    <section class="plan-dia">
                        <div class="plan-dia-header" style="cursor: default;" aria-hidden="true">
                            <div class="plan-dia-titulos">
                                <h2 class="plan-dia-titulo">${escapeHtml(diaInfo.dia)}</h2>
                                ${diaInfo.enfoque ? `<div class="plan-dia-subtitle">${escapeHtml(diaInfo.enfoque)}</div>` : ""}
                            </div>
                            <span class="plan-dia-chip">${escapeHtml(ejercicios.length)} ejercicios</span>
                        </div>
                        <div class="plan-grid">${cards}</div>
                    </section>
                </div>
            </div>
        `;

        await sweetalert.fire({
            title: `Detalle: ${String(diaInfo.dia ?? "Día")}`,
            html,
            showCancelButton: false,
            confirmButtonText: "Cerrar",
            customClass: {
                popup: "dashboard-swal",
                confirmButton: "dashboard-swal-confirm",
            },
        });
    };

    contenedor.addEventListener("click", async (ev) => {
        const target = ev.target;
        if (!(target instanceof HTMLElement)) return;
        const headerEl = target.closest(".plan-dia-header");
        if (!(headerEl instanceof HTMLElement)) return;
        await openDetalle(headerEl);
    });

    contenedor.addEventListener("keydown", async (ev) => {
        const target = ev.target;
        if (!(target instanceof HTMLElement)) return;
        if (ev.key !== "Enter" && ev.key !== " ") return;
        const headerEl = target.closest(".plan-dia-header");
        if (!(headerEl instanceof HTMLElement)) return;
        ev.preventDefault();
        await openDetalle(headerEl);
    });
}
document.getElementById("boton_eliminar")?.addEventListener("click", async () => {
    const confirmResult = await sweetalert.fire({
        title: "¿Estás seguro?",
        text: "Esta acción eliminará tu plan de entrenamiento actual.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
    });

    if (!confirmResult.isConfirmed) return;

    localStorage.setItem("plan_entreno_usuario", "Ninguno");
    await actualizar_cambios_plan_entreno();
    document.getElementById("Plan_ejercicio").innerHTML = "";
    document.getElementById("Plan_ejercicio").style.display = "none";
    document.getElementById("boton_regenerar").style.display = "none";
    verificacion_plan_entrenamiento();

    sweetalert.fire({
        title: "Plan eliminado",
        text: "Tu plan de entrenamiento ha sido eliminado.",
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
    });
});
async function actualizar_cambios_plan_entreno() {
    const res = await fetch('/actualizar_cambios_plan', {
        method: 'POST',
        body: JSON.stringify({ plan_entreno: localStorage.getItem("plan_entreno_usuario"), id_usuario: localStorage.getItem("id_usuario") }),
    })
    if (!res.ok) {
        console.error("Error al actualizar el plan de entrenamiento en el servidor.");
    }
}

async function Regen_plan() {
    const plan_entreno_actual = localStorage.getItem("plan_entreno_usuario");

    const detectIntensidadFromPlan = (raw) => {
        if (raw == null) return null;
        const asString = typeof raw === "string" ? raw.trim() : JSON.stringify(raw);
        if (!asString || asString === "Ninguno") return null;

        const extractLikelyJson = (text) => {
            const s = String(text ?? "");
            const unfenced = s
                .replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```\s*$/i, "")
                .trim();

            const firstObj = unfenced.indexOf("{");
            const firstArr = unfenced.indexOf("[");
            if (firstObj === -1 && firstArr === -1) return unfenced;
            const start = firstArr === -1 ? firstObj : (firstObj === -1 ? firstArr : Math.min(firstObj, firstArr));
            const lastObj = unfenced.lastIndexOf("}");
            const lastArr = unfenced.lastIndexOf("]");
            const end = Math.max(lastObj, lastArr);
            if (end <= start) return unfenced;
            return unfenced.slice(start, end + 1);
        };

        const safeJsonParse = (text) => {
            try {
                return JSON.parse(text);
            } catch {
                return null;
            }
        };

        const stripAccents = (text) => String(text ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        const mapIntensidad = (value) => {
            const v = stripAccents(value).trim().toLowerCase();
            if (!v) return null;
            if (v.includes("baj")) return "baja";
            if (v.includes("alt")) return "alta";
            if (v.includes("med")) return "media";
            return null;
        };

        const parsed = safeJsonParse(extractLikelyJson(asString)) ?? safeJsonParse(asString);
        if (!parsed || typeof parsed !== "object") return null;

        const root = parsed?.plan_entrenamiento_hipertrofia ?? parsed?.plan_entrenamiento ?? parsed?.plan ?? parsed;
        const usuario = (root && typeof root === "object") ? (root.usuario ?? root.user ?? null) : null;
        const fromText = mapIntensidad(usuario?.intensidad);
        if (fromText) return fromText;

        const n = Number(usuario?.ejercicios_por_dia);
        if (Number.isFinite(n)) {
            if (n <= 4) return "baja";
            if (n <= 6) return "media";
            return "alta";
        }
        return null;
    };

    const intensidadDetectada =
        detectIntensidadFromPlan(plan_entreno_actual) ||
        localStorage.getItem("plan_intensidad") ||
        "media";

    const ejerciciosPorDiaMap = { baja: 4, media: 6, alta: 8 };
    const ejerciciosPorDiaDetectados = ejerciciosPorDiaMap[intensidadDetectada] ?? 6;

    const result = await swal.fire({
        title: "Regenerando plan de entrenamiento",
        text: `Se eliminará el plan actual y se generará uno nuevo basado en la configuración previa. Intensidad detectada: ${intensidadDetectada} (${ejerciciosPorDiaDetectados} ejercicios por día).`,
        icon: "info",

        showCancelButton: true,
        confirmButtonText: "Sí, regenerar",
        cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) {
        swal.fire({
            title: "Regeneración cancelada",
            text: "El plan de entrenamiento actual se mantiene sin cambios.",
            icon: "info",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 3000,
        });
        return;
    }

    if (plan_entreno_actual == null || plan_entreno_actual === "Ninguno") {
        sweetalert.fire({
            title: "No hay plan para regenerar",
            text: "Primero debés generar un plan de entrenamiento.",
            icon: "error",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 3000,
        });
        return;
    }

    localStorage.setItem("plan_entreno_usuario", "Ninguno");
    await actualizar_cambios_plan_entreno();

    document.getElementById("Plan_ejercicio").innerHTML = "";
    document.getElementById("Plan_ejercicio").style.display = "none";
    verificacion_plan_entrenamiento();

    const botonRegenerar = document.getElementById("boton_regenerar");
    if (botonRegenerar) botonRegenerar.style.display = "none";
    await openGenerarPlanModal(plan_entreno_actual);
}
//temporal

//aca falta poner el script para los botones que tendran los planes de entreno, editar, eliminar (por ejercicio) y el boton para eliminar el plan. todo esto estara en el html del plan mismo