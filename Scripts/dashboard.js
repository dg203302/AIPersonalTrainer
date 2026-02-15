import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.94.1/+esm";
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

// Wake Lock (evita que la pantalla se bloquee mientras se está viendo el plan)
// Nota: requiere HTTPS y soporte del navegador (Chromium/Android suele soportarlo).
const wakeLockManager = (() => {
    /** @type {any|null} */
    let sentinel = null;
    /** @type {Set<string>} */
    const reasons = new Set();

    const supported = () => {
        try {
            return typeof navigator !== "undefined" && !!navigator.wakeLock && typeof navigator.wakeLock.request === "function";
        } catch {
            return false;
        }
    };

    const wanted = () => reasons.size > 0;

    const requestIfNeeded = async () => {
        if (!supported()) return;
        if (!wanted()) return;
        if (document.visibilityState !== "visible") return;
        if (sentinel) return;

        try {
            sentinel = await navigator.wakeLock.request("screen");
            // Si el sistema lo libera, intentamos recuperarlo cuando corresponda.
            if (sentinel && typeof sentinel.addEventListener === "function") {
                sentinel.addEventListener("release", () => {
                    sentinel = null;
                });
            }
        } catch (e) {
            // Puede fallar por falta de gesto del usuario, contexto inseguro, etc.
            sentinel = null;
        }
    };

    const releaseIfPossible = async () => {
        if (!sentinel) return;
        try {
            await sentinel.release();
        } catch {
            // ignore
        } finally {
            sentinel = null;
        }
    };

    const setReason = (reason, isActive, { tryRequest = false } = {}) => {
        const key = String(reason || "").trim() || "default";
        if (isActive) reasons.add(key);
        else reasons.delete(key);

        if (!wanted()) {
            void releaseIfPossible();
            return;
        }
        if (tryRequest) void requestIfNeeded();
    };

    // Re-adquirir al volver a primer plano.
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            void requestIfNeeded();
        } else {
            // En segundo plano liberamos para evitar errores en algunos navegadores.
            void releaseIfPossible();
        }
    });

    return {
        supported,
        setReason,
        requestIfNeeded,
        releaseIfPossible,
    };
})();

const initWakeLockForPlanViews = () => {
    const planEl = document.getElementById("Plan_ejercicio");
    if (!planEl) return;
    if (planEl.dataset.wakeLockInit === "1") return;
    planEl.dataset.wakeLockInit = "1";

    const isPlanVisible = () => {
        // Consideramos visible si no está display:none y está en layout.
        if (planEl.style.display === "none") return false;
        return !!planEl.offsetParent;
    };

    const syncPlanReason = ({ tryRequest = false } = {}) => {
        const visible = isPlanVisible();
        wakeLockManager.setReason("plan", visible, { tryRequest });
    };

    // Estado inicial
    syncPlanReason({ tryRequest: false });

    // Si cambia el display del contenedor (por generar/eliminar plan), sincronizamos.
    if ("MutationObserver" in window) {
        const mo = new MutationObserver(() => syncPlanReason({ tryRequest: false }));
        mo.observe(planEl, { attributes: true, attributeFilter: ["style", "class"] });
    }

    // Primer gesto del usuario dentro del plan: intentar adquirir.
    const tryAcquireOnGesture = () => {
        if (!isPlanVisible()) return;
        syncPlanReason({ tryRequest: true });
        void wakeLockManager.requestIfNeeded();
    };

    planEl.addEventListener("pointerdown", tryAcquireOnGesture, { passive: true });
    planEl.addEventListener("touchstart", tryAcquireOnGesture, { passive: true });
    planEl.addEventListener("wheel", tryAcquireOnGesture, { passive: true });
    planEl.addEventListener("scroll", tryAcquireOnGesture, { passive: true });
    planEl.addEventListener("keydown", tryAcquireOnGesture);
};

const prefersReducedMotion = () => {
    try {
        return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
        return false;
    }
};

const getFixedHeaderOffset = () => {
    const header = document.querySelector("header");
    const headerH = header ? header.offsetHeight : 0;
    return Math.max(0, headerH + 12);
};

const scrollToWithFixedHeader = (el, { behavior = "auto" } = {}) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const top = rect.top + window.scrollY - getFixedHeaderOffset();
    window.scrollTo({ top: Math.max(0, top), behavior });
};

const focusPlanEntrenoContainer = ({ behavior = "auto" } = {}) => {
    const plan = document.getElementById("Plan_ejercicio");
    const section = document.getElementById("Ejercicios");
    const visiblePlan = plan && plan.style.display !== "none";

    const target = visiblePlan ? plan : (section || plan);
    if (!target) return;

    scrollToWithFixedHeader(target, { behavior });
    if (typeof target.focus === "function") {
        target.focus({ preventScroll: true });
    }
};

const autofocusPlanEntrenoOncePerSession = () => {
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    try {
        const key = "autofocus_plan_entreno_done";
        if (sessionStorage.getItem(key) === "1") return;
        sessionStorage.setItem(key, "1");
        focusPlanEntrenoContainer({ behavior });
    } catch {
        focusPlanEntrenoContainer({ behavior });
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFixedChromeObservers, { once: true });
} else {
    initFixedChromeObservers();
}


const sweetalert = window.swal;

const getIdiomaPreferido = () => {
    try {
        const v = globalThis.UIIdioma?.getIdioma?.();
        if (v) return String(v);
    } catch {
        // ignore
    }
    try {
        const stored = localStorage.getItem("ui_idioma");
        if (stored) return String(stored);
    } catch {
        // ignore
    }
    return "es";
};

const isEnglish = () => getIdiomaPreferido() === "en";
const tLang = (es, en) => (isEnglish() ? en : es);

const formatPlanLugar = (code) => {
    const v = String(code ?? "").toLowerCase();
    if (isEnglish()) {
        if (v === "casa") return "Home";
        if (v === "gimnasio") return "Gym";
        return code ?? "-";
    }
    if (v === "casa") return "Casa";
    if (v === "gimnasio") return "Gimnasio";
    return code ?? "-";
};

const formatPlanObjetivo = (code) => {
    const v = String(code ?? "").toLowerCase();
    if (isEnglish()) {
        if (v === "grasa") return "Fat loss";
        if (v === "musculo") return "Muscle gain";
        return code ?? "-";
    }
    if (v === "grasa") return "Pérdida de grasa";
    if (v === "musculo") return "Ganancia muscular";
    return code ?? "-";
};

const formatPlanIntensidad = (code) => {
    const v = String(code ?? "").toLowerCase();
    if (isEnglish()) {
        if (v === "baja") return "Low";
        if (v === "media") return "Medium";
        if (v === "alta") return "High";
        return code ?? "-";
    }
    if (v === "baja") return "Baja";
    if (v === "media") return "Media";
    if (v === "alta") return "Alta";
    return code ?? "-";
};

const stripAccents = (s) =>
    String(s ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

const normalizeExerciseKey = (name) =>
    stripAccents(name)
        .toLowerCase()
        .replace(/[_.,;:!?¡¿"'`()\[\]{}]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const titleCaseEn = (s) => {
    const small = new Set(["and", "or", "with", "to", "of", "the", "a", "an", "in", "on", "at", "by"]);
    const words = String(s ?? "")
        .split(/\s+/)
        .filter(Boolean);
    return words
        .map((w, i) => {
            const low = w.toLowerCase();
            if (i !== 0 && small.has(low)) return low;
            return low.charAt(0).toUpperCase() + low.slice(1);
        })
        .join(" ");
};

const EXERCISE_NAME_MAP_ES_EN = {
    // Pierna / lower
    "sentadilla": "Squat",
    "sentadilla goblet": "Goblet Squat",
    "sentadilla frontal": "Front Squat",
    "sentadilla hack": "Hack Squat",
    "sentadilla bulgara": "Bulgarian Split Squat",
    "zancadas": "Lunges",
    "prensa de piernas": "Leg Press",
    "extension de piernas": "Leg Extension",
    "curl femoral": "Leg Curl",
    "peso muerto": "Deadlift",
    "peso muerto rumano": "Romanian Deadlift",

    // Índice (frases completas) / index (full phrases)
    // Pecho
    "press de banca plano con barra": "Barbell Bench Press",
    "press de banca inclinado con mancuernas": "Incline Dumbbell Bench Press",
    "flexiones de brazos peso corporal": "Push-Ups (Bodyweight)",
    "aperturas con mancuernas": "Dumbbell Flyes",
    "fondos en paralelas": "Parallel Bar Dips",
    "fondos en paralelas pecho bajo triceps": "Parallel Bar Dips",
    "cruce de poleas": "Cable Crossover",

    // Espalda
    "dominadas peso corporal": "Pull-Ups (Bodyweight)",
    "jalon al pecho en polea": "Lat Pulldown",
    "remo con barra": "Barbell Row",
    "remo unilateral con mancuerna": "One-Arm Dumbbell Row",
    "remo sentado en polea": "Seated Cable Row",
    "hiperextensiones lumbares": "Back Extensions",

    // Piernas
    "sentadilla libre": "Back Squat",
    "zancadas estocadas": "Lunges",
    "hip thrust empuje de cadera": "Hip Thrust",
    "extension de cuadriceps en maquina": "Leg Extension Machine",
    "curl femoral tumbado o sentado": "Leg Curl (Lying or Seated)",
    "elevacion de talones": "Calf Raises",

    // Hombros
    "press militar con barra o mancuernas": "Overhead Press (Barbell or Dumbbells)",
    "elevaciones laterales con mancuernas": "Dumbbell Lateral Raises",
    "pajaros vuelos posteriores": "Rear Delt Flyes",
    "elevaciones frontales": "Front Raises",
    "face pull salud del hombro": "Face Pull",

    // Brazos / tríceps
    "curl de biceps con barra": "Barbell Biceps Curl",
    "curl martillo con mancuernas": "Dumbbell Hammer Curl",
    "curl predicador": "Preacher Curl",
    "press frances": "French Press (Skull Crushers)",
    "extension de triceps en polea alta": "Triceps Pushdown (High Cable)",
    "extension de triceps con mancuerna sobre la cabeza": "Overhead Dumbbell Triceps Extension",
    "patada de triceps con mancuerna": "Dumbbell Triceps Kickback",
    "fondos entre bancos": "Bench Dips",

    // Antebrazos
    "curl de muneca con barra": "Barbell Wrist Curl",
    "curl de muneca con mancuerna": "Dumbbell Wrist Curl",
    "curl invertido con barra": "Barbell Reverse Curl",
    "farmers walk caminata del granjero": "Farmer's Walk",

    // Abdomen / core
    "plancha abdominal": "Plank",
    "crunch abdominal clasico": "Crunch",
    "elevacion de piernas colgado o en suelo": "Leg Raises (Hanging or Floor)",
    "giros rusos": "Russian Twists",
    "rueda abdominal": "Ab Wheel Rollout",

    // Cardio
    "saltos de tijera": "Jumping Jacks",
    "salto a la cuerda": "Jump Rope",

    // Empuje / push
    "press de banca": "Bench Press",
    "press banca": "Bench Press",
    "press inclinado": "Incline Press",
    "press militar": "Overhead Press",
    "fondos": "Dips",

    // Tirón / pull
    "dominadas": "Pull-Ups",
    "jalon al pecho": "Lat Pulldown",
    "remo": "Row",
    "remo con barra": "Barbell Row",
    "remo con mancuernas": "Dumbbell Row",

    // Brazos
    "curl de biceps": "Biceps Curl",
    "curl biceps": "Biceps Curl",
    "extension de triceps": "Triceps Extension",

    // Core
    "plancha": "Plank",
    "abdominales": "Abs",
};

const translateExerciseNameToEnglish = (nameEs) => {
    const original = String(nameEs ?? "").trim();
    if (!original) return original;

    const key = normalizeExerciseKey(original);
    if (EXERCISE_NAME_MAP_ES_EN[key]) return EXERCISE_NAME_MAP_ES_EN[key];

    // Best-effort replacements for common patterns.
    let s = stripAccents(original).toLowerCase();
    s = s.replace(/\s+/g, " ").trim();

    const replacements = [
        [/peso muerto rumano/g, "Romanian deadlift"],
        [/peso muerto/g, "deadlift"],
        [/sentadilla bulgara/g, "Bulgarian split squat"],
        [/sentadilla frontal/g, "front squat"],
        [/sentadilla goblet/g, "goblet squat"],
        [/sentadilla hack/g, "hack squat"],
        [/sentadilla/g, "squat"],
        [/prensa de piernas/g, "leg press"],
        [/extension(?:es)? de piernas/g, "leg extension"],
        [/curl femoral/g, "leg curl"],
        [/press de banca/g, "bench press"],
        [/press banca/g, "bench press"],
        [/press militar/g, "overhead press"],
        [/press inclinado/g, "incline press"],
        [/fondos/g, "dips"],
        [/dominadas?/g, "pull-ups"],
        [/jalon(?:es)?(?: al pecho)?/g, "pulldown"],
        [/remo/g, "row"],
        [/elevaciones laterales/g, "lateral raises"],
        [/curl de biceps/g, "biceps curl"],
        [/curl biceps/g, "biceps curl"],
        [/extensiones? de triceps/g, "triceps extensions"],
        [/plancha/g, "plank"],

        // Modifiers / equipment
        [/con mancuernas/g, "with dumbbells"],
        [/con barra/g, "with barbell"],
        [/en maquina/g, "machine"],
        [/en polea/g, "cable"],
        [/inclinado/g, "incline"],
        [/declinado/g, "decline"],
        [/plano/g, "flat"],
    ];

    for (const [re, rep] of replacements) {
        s = s.replace(re, rep);
    }

    s = s.replace(/\s+/g, " ").trim();
    if (!s) return original;
    return titleCaseEn(s);
};

const NETLIFY_EDGE_UNCAUGHT = "uncaught exception during edge function invocation";

const isNetlifyEdgeUncaughtInvocation = (text) =>
    String(text ?? "")
        .toLowerCase()
        .includes(NETLIFY_EDGE_UNCAUGHT);

const showNetlifyHostingErrorAlert = async ({ endpoint, status, statusText, bodyText }) => {
    const safeEndpoint = String(endpoint ?? "").trim() || tLang("(desconocido)", "(unknown)");
    const safeStatus = Number.isFinite(Number(status)) ? Number(status) : "-";
    const safeStatusText = String(statusText ?? "").trim() || "";
    const safeBody = String(bodyText ?? "").trim();

    const hostingNote = isEnglish()
        ? "This is a hosting server error (<strong>Netlify</strong>). Please wait a few minutes and try again."
        : "Este es un error del servidor de hosting (<strong>Netlify</strong>). Por favor, aguardá unos minutos e intentá nuevamente cuando se restaure el servicio.";

    await sweetalert.fire({
        icon: "error",
        title: tLang("Error del servidor", "Server error"),
        html: `
            <div class="server-error">
                <div class="server-error__hero">${escapeHtml(NETLIFY_EDGE_UNCAUGHT)}</div>
                <div class="server-error__meta">
                    <div><strong>Endpoint:</strong> ${escapeHtml(safeEndpoint)}</div>
                    <div><strong>HTTP:</strong> ${escapeHtml(safeStatus)}${safeStatusText ? ` (${escapeHtml(safeStatusText)})` : ""}</div>
                </div>
                ${safeBody ? `<pre class="server-error__body">${escapeHtml(safeBody.slice(0, 1200))}</pre>` : ""}
                <p class="server-error__note">
                    ${hostingNote}
                </p>
            </div>
        `,
        allowOutsideClick: false,
        allowEscapeKey: true,
        confirmButtonText: tLang("Entendido", "OK"),
        customClass: {
            popup: "dashboard-swal server-error-swal",
            confirmButton: "dashboard-swal-confirm",
        },
    });
};

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
    "Tríceps": [
        "Press francés",
        "Extensión de tríceps en polea alta",
        "Fondos entre bancos",
        "Extensión de tríceps con mancuerna sobre la cabeza",
        "Patada de tríceps con mancuerna",
    ],
    "Antebrazos": [
        "Curl de muñeca con barra",
        "Curl de muñeca con mancuerna",
        "Curl invertido con barra",
        "Farmer's walk (caminata del granjero)",
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

const formatReps = (value) => {
    if (value == null) return "-";
    const s = String(value).trim();
    if (!s) return "-";

    // Detect ranges or single values given in seconds (segundos, s, sec)
    const secRange = s.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)[\s]*?(s|seg|segs|segundos|sec|secs)\b/i);
    if (secRange) {
        return `${secRange[1]}-${secRange[2]}S`;
    }
    const secSingle = s.match(/^(\d+(?:\.\d+)?)[\s]*?(s|seg|segs|segundos|sec|secs)\b/i);
    if (secSingle) {
        return `${secSingle[1]}S`;
    }

    // Also normalize common phrasing like '20 - 30 segundos' with spaces
    const secRange2 = s.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
    if (secRange2 && /seg|s|segundos|sec/i.test(s)) {
        return `${secRange2[1]}-${secRange2[2]}S`;
    }

    // Fallback: return as-is
    return s;
};

const renderListaEjerciciosSelectable = () => {
    const grupoLabelMapEn = {
        "Pecho": "Chest",
        "Espalda": "Back",
        "Piernas": "Legs",
        "Hombros": "Shoulders",
        "Brazos": "Arms",
        "Tríceps": "Triceps",
        "Antebrazos": "Forearms",
        "Abdomen / core": "Abs / core",
        "Cardio / acondicionamiento": "Cardio / conditioning",
    };

    const parts = [];
    for (const [grupo, items] of Object.entries(EJERCICIOS_INDICE)) {
        const grupoLabel = isEnglish() ? (grupoLabelMapEn[grupo] || grupo) : grupo;
        const checks = items
            .map((e) => {
                const original = String(e ?? "");
                const label = isEnglish() ? translateExerciseNameToEnglish(original) : original;
                // Mantener el value en español para compatibilidad con selecciones guardadas.
                const safeValue = escapeHtml(original);
                const safeLabel = escapeHtml(label);
                return `
                    <label class="swal-check">
                        <input type="checkbox" name="ejercicios" value="${safeValue}">
                        <span>${safeLabel}</span>
                    </label>
                `;
            })
            .join("");

        parts.push(`
            <details class="swal-details" data-grupo="${escapeHtml(grupo)}">
                <summary>${escapeHtml(grupoLabel)} <span class="swal-chip">${items.length}</span></summary>
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
        <div class="swal-dias" role="group" aria-label="${escapeHtml(tLang("Días de entrenamiento", "Training days"))}">
            ${buttons}
        </div>
        <p class="swal-helper">${escapeHtml(tLang("Tocá para seleccionar los días en los que vas a entrenar.", "Tap to select the days you plan to train."))}</p>
    `;
};

const renderSelectorIntensidad = () => {
    return `
        <section class="swal-section" aria-label="${escapeHtml(tLang("Intensidad de entrenamiento", "Training intensity"))}">
            <h3>${escapeHtml(tLang("Intensidad", "Intensity"))}</h3>
            <div class="swal-grid">
                <div class="swal-field">
                    <p class="swal-label">${escapeHtml(tLang("Elegí la intensidad", "Choose the intensity"))}</p>
                    <label class="swal-radio"><input type="radio" name="intensidad" value="baja"><span>${escapeHtml(tLang("Intensidad baja", "Low intensity"))}</span></label>
                    <label class="swal-radio"><input type="radio" name="intensidad" value="media"><span>${escapeHtml(tLang("Intensidad media", "Medium intensity"))}</span></label>
                    <label class="swal-radio"><input type="radio" name="intensidad" value="alta"><span>${escapeHtml(tLang("Intensidad alta", "High intensity"))}</span></label>
                    <p class="swal-helper">${escapeHtml(tLang("La intensidad afecta la cantidad de ejercicios por día (baja: 4, media: 6, alta: 8).", "Intensity affects how many exercises you get per day (low: 4, medium: 6, high: 8)."))}</p>
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
        title: tLang("Generar Plan de Entrenamiento con IA", "Generate Training Plan with AI"),
        html: `
            <div class="swal-gen">
                <p class="swal-helper">
                    ${escapeHtml(tLang(
                        "Elegí tu contexto y prioridad. Esto nos ayuda a seleccionar ejercicios y armar una progresión coherente.",
                        "Choose your context and priority. This helps us select exercises and build a coherent progression."
                    ))}
                </p>

                <section class="swal-section" aria-label="${escapeHtml(tLang("Opciones de plan", "Plan options"))}">
                    <h3>${escapeHtml(tLang("Opciones", "Options"))}</h3>
                    <div class="swal-grid">
                        <div class="swal-field">
                            <p class="swal-label">${escapeHtml(tLang("¿Dónde entrenás?", "Where do you train?"))}</p>
                            <label class="swal-radio"><input type="radio" name="lugar" value="casa"><span>${escapeHtml(tLang("Entreno en casa", "I train at home"))}</span></label>
                            <label class="swal-radio"><input type="radio" name="lugar" value="gimnasio"><span>${escapeHtml(tLang("Entreno en gimnasio", "I train at the gym"))}</span></label>
                        </div>
                        <div class="swal-field">
                            <p class="swal-label">${escapeHtml(tLang("¿Qué priorizás?", "What do you prioritize?"))}</p>
                            <label class="swal-radio"><input type="radio" name="objetivo" value="grasa"><span>${escapeHtml(tLang("Priorizar pérdida de grasa", "Prioritize fat loss"))}</span></label>
                            <label class="swal-radio"><input type="radio" name="objetivo" value="musculo"><span>${escapeHtml(tLang("Priorizar ganancia muscular", "Prioritize muscle gain"))}</span></label>
                        </div>
                    </div>
                </section>
                
                ${renderSelectorIntensidad()}

                <section class="swal-section" aria-label="${escapeHtml(tLang("Días de entrenamiento", "Training days"))}">
                    <h3>${escapeHtml(tLang("Días de la semana", "Days of the week"))}</h3>
                    ${renderDiasSelector()}
                </section>

                <section class="swal-section" aria-label="${escapeHtml(tLang("Ejercicios disponibles", "Available exercises"))}">
                    <h3>${escapeHtml(tLang("Ejercicios disponibles (índice)", "Available exercises (index)"))}</h3>
                    <p class="swal-helper">${escapeHtml(tLang(
                        "Opcional: si querés, marcá ejercicios preferidos. Si no seleccionás nada, la IA elige automáticamente.",
                        "Optional: pick preferred exercises. If you don't select any, the AI will choose automatically."
                    ))}</p>
                    <label class="swal-toggle">
                        <input type="checkbox" id="swal_ej_toggle">
                        <span>${escapeHtml(tLang("Quiero elegir ejercicios", "I want to choose exercises"))}</span>
                    </label>
                    <div class="swal-ejercicios">
                        ${renderListaEjerciciosSelectable()}
                    </div>
                </section>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: tLang("Generar", "Generate"),
        cancelButtonText: tLang("Cancelar", "Cancel"),
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
                    sweetalert.showValidationMessage(tLang(
                        "Elegí dónde entrenás y qué priorizás",
                        "Choose where you train and what you prioritize"
                    ));
                }
                return false;
            }

            if (!dias.length) {
                if (typeof sweetalert.showValidationMessage === "function") {
                    sweetalert.showValidationMessage(tLang(
                        "Seleccioná al menos un día de la semana",
                        "Select at least one day of the week"
                    ));
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
        title: isEnglish() ? `Welcome back, ${username}!` : `Bienvenido de nuevo, ${username}!`,
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

    // Al cargar: llevar el foco al contenedor del plan de entreno.
    autofocusPlanEntrenoOncePerSession();

    initWakeLockForPlanViews();

    initDetallePorDiaPlan();
    initPlanDiaPager();
}

function verificacion_plan_entrenamiento() {
    const desc = document.getElementById("descripcion_previa");
    const plan_entrenamiento = localStorage.getItem("plan_entreno_usuario");
    const boton_ejercicios = document.getElementById("boton_ejercicios");
    const boton_eliminar_plan_eje = document.getElementById("boton_eliminar");
    const boton_regenerar = document.getElementById("boton_regenerar");
    if (plan_entrenamiento != "Ninguno" && plan_entrenamiento != null) {
        desc.style.display = "none";
        boton_ejercicios?.classList.remove("btn-primary");
        if (boton_ejercicios) {
            boton_ejercicios.removeAttribute("data-i18n-en");
            delete boton_ejercicios.dataset.i18nEs;
        }
        if (boton_regenerar) {
            boton_regenerar.style.display = "inline-block";
            boton_regenerar.onclick = () => Regen_plan();
        }
        boton_eliminar_plan_eje.style.display = "inline-block";
        const contenedor_ejercicios = document.getElementById("Plan_ejercicio");
        contenedor_ejercicios.style.display = "block";
        contenedor_ejercicios.innerHTML = mapear_plan(plan_entrenamiento)
        try { globalThis.UIIdioma?.translatePage?.(contenedor_ejercicios); } catch { }
        initPlanDiaPager();
        boton_ejercicios.innerHTML = '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXJlZnJlc2gtY2N3LWljb24gbHVjaWRlLXJlZnJlc2gtY2N3Ij48cGF0aCBkPSJNMjEgMTJhOSA5IDAgMCAwLTktOSA5Ljc1IDkuNzUgMCAwIDAtNi43NCAyLjc0TDMgOCIvPjxwYXRoIGQ9Ik0zIDN2NWg1Ii8+PHBhdGggZD0iTTMgMTJhOSA5IDAgMCAwIDkgOSA5Ljc1IDkuNzUgMCAwIDAgNi43NC0yLjc0TDIxIDE2Ii8+PHBhdGggZD0iTTE2IDE2aDV2NSIvPjwvc3ZnPg==">';
        boton_ejercicios.style.width = "50px";
        boton_ejercicios.style.height = "50px";
        boton_ejercicios.setAttribute("aria-label", "Refrescar plan de entrenamiento");
        boton_ejercicios.setAttribute("data-i18n-en-aria-label", "Refresh training plan");
        try { globalThis.UIIdioma?.translatePage?.(boton_ejercicios); } catch { }
        boton_ejercicios.onclick = async () => {
            await recuperar_planes();
            sweetalert.fire({
                title: tLang("Plan de entrenamiento actualizado", "Training plan updated"),
                text: tLang(
                    "Tu plan de entrenamiento ha sido refrescado correctamente.",
                    "Your training plan was refreshed successfully."
                ),
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
        boton_ejercicios?.classList.add("btn-primary");
        if (boton_ejercicios) {
            boton_ejercicios.textContent = "Generar plan";
            boton_ejercicios.setAttribute("data-i18n-en", "Generate plan");
            boton_ejercicios.setAttribute("aria-label", "Generar plan de entrenamiento");
            boton_ejercicios.setAttribute("data-i18n-en-aria-label", "Generate training plan");
            try { globalThis.UIIdioma?.translatePage?.(boton_ejercicios); } catch { }
        }
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
        title: tLang("Generando Plan", "Generating plan"),
        text: isEnglish()
            ? `Place: ${formatPlanLugar(lugar)} | Goal: ${formatPlanObjetivo(objetivo)} | Intensity: ${formatPlanIntensidad(intensidad)} | Days: ${(diasCodes || []).join(", ") || "-"}. Please wait...`
            : `Lugar: ${formatPlanLugar(lugar)} | Objetivo: ${formatPlanObjetivo(objetivo)} | Intensidad: ${formatPlanIntensidad(intensidad)} | Días: ${(diasCodes || []).join(", ") || "-"}. Por favor, esperá...`,
        icon: "info",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            sweetalert.showLoading();
        }
    });

    let response;
    try {
        response = await fetch('/generar_plan_entreno', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_usuario: localStorage.getItem("id_usuario"),
                idioma: getIdiomaPreferido(),
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
    } catch (err) {
        console.log("[EdgeFunction:/generar_plan_entreno] Error de red:", err);
        sweetalert.fire({
            title: tLang("Error", "Error"),
            text: tLang(
                "No se pudo contactar al servidor para generar el plan. Revisá tu conexión e intentá de nuevo.",
                "Could not reach the server to generate the plan. Check your connection and try again."
            ),
            icon: "error",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 5000,
        });
        return;
    }

    if (!response.ok) {
        let bodyText = "";
        try { bodyText = await response.text(); } catch { bodyText = ""; }
        console.log("[EdgeFunction:/generar_plan_entreno] Error:", {
            status: response.status,
            statusText: response.statusText,
            body: bodyText,
        });

        if (isNetlifyEdgeUncaughtInvocation(bodyText)) {
            await showNetlifyHostingErrorAlert({
                endpoint: "/generar_plan_entreno",
                status: response.status,
                statusText: response.statusText,
                bodyText,
            });
            return;
        }

        sweetalert.fire({
            title: tLang("Error", "Error"),
            text: tLang(
                "Error al generar el plan de entrenamiento. Por favor, intentá nuevamente más tarde.",
                "Failed to generate the training plan. Please try again later."
            ),
            icon: "error",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 5000,
        });
        return;
    } else {
        try {
            const { data, error } = await supabase.from("Planes").select("*").eq("ID_user", localStorage.getItem("id_usuario")).limit(1);
            if (error) { throw new Error(error.message); }
            localStorage.setItem("plan_entreno_usuario", data.length === 0 ? "Ninguno" : data[0].Plan_entreno ?? "Ninguno");
            localStorage.setItem("plan_dieta_usuario", data.length === 0 ? "Ninguno" : data[0].Plan_alimenta ?? "Ninguno");
            await recuperar_planes();
            verificacion_plan_entrenamiento();
            sweetalert.fire({
                title: tLang("¡Plan Generado!", "Plan generated!"),
                text: tLang("Tu rutina se ha creado correctamente.", "Your routine was created successfully."),
                icon: "success",
                timer: 4000,
                showConfirmButton: false
            });
        } catch (error) {
            sweetalert.fire({
                title: tLang("Error", "Error"),
                text: tLang("Error al guardar la configuración: ", "Failed to save configuration: ") + error.message,
                icon: "error",
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 5000,
            });
            return;
        }
    }
}

function verificacion_plan_alimentacion() {
    // inutil, solo para evitar reference error en el console.log de recuperar_planes() que rompe la ejecución
}

async function recuperar_planes() {
    const { user } = await supabase.auth.getUser().then(({ data: { user } }) => user);
    if (user) {
        const { datos2, error2 } = await supabase
            .from("Planes").select("Plan_entreno, Plan_alimenta").eq("ID_user", user.id).single();
        if (error2) {
            swal.fire({
                title: tLang("Error", "Error"),
                text: tLang("Error al obtener los datos del usuario: ", "Failed to fetch user data: ") + error2.message,
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
        return "<div class=\"plan-vacio\" data-i18n-en=\"No plan loaded.\">No hay plan cargado.</div>";
    }

    const asString = typeof raw === "string" ? raw.trim() : JSON.stringify(raw);
    if (!asString || asString === "Ninguno") {
        return "<div class=\"plan-vacio\" data-i18n-en=\"No plan loaded.\">No hay plan cargado.</div>";
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
        const descripcion_detallada = ex.descripcion_detallada ?? ex.descripcionDetallada ?? ex.detailed_description ?? ex.detailedDescription ?? ex.detalle_detallado ?? ex.instrucciones_detalladas;
        const series = ex.series ?? ex.series_por_ejercicio ?? ex.sets ?? ex.set ?? ex.seriesTotales;
        const repeticiones = ex.repeticiones ?? ex.reps ?? ex.repetitions ?? ex.rep ?? ex.repeticion;
        if (!nombre && !series && !repeticiones) return null;

        const nombreEs = String(nombre ?? tLang("Ejercicio", "Exercise")).trim();
        const nombreEn = translateExerciseNameToEnglish(nombreEs);
        return {
            nombre: nombreEs,
            nombre_en: nombreEn,
            descripcion: descripcion ?? "",
            descripcion_detallada: descripcion_detallada ?? "",
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
                <div class="plan-aviso" data-i18n-en="Couldn't parse the plan as JSON. Showing text.">No pude interpretar el plan como JSON. Mostrando texto.</div>
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
        const nombreEs = escapeHtml(exNorm.nombre);
        const nombreEn = escapeHtml(exNorm.nombre_en ?? exNorm.nombre);
        const descripcion = escapeHtml(exNorm.descripcion || "");
        const series = escapeHtml(exNorm.series);
        const reps = escapeHtml(formatReps(exNorm.repeticiones));
        return `
            <article class="plan-card" data-idx="${idx}">
                <h3 class="plan-nombre" data-i18n-en="${nombreEn}">${nombreEs}</h3>
                ${descripcion ? `<p class="plan-desc">${descripcion}</p>` : ""}
                <div class="plan-meta">
                    <span class="plan-chip"><span data-i18n-en="Sets:">Series:</span> <strong>${series}</strong></span>
                    <span class="plan-chip"><span data-i18n-en="Reps:">Reps:</span> <strong>${reps}</strong></span>
                </div>
            </article>
        `;
    };

    const renderDaySection = (diaLabel, ejerciciosList, enfoque, dayIdx) => {
        const normalized = (Array.isArray(ejerciciosList) ? ejerciciosList : [])
            .map(normalizeExercise)
            .filter(Boolean);

        // No mostrar días sin ejercicios
        if (!normalized.length) return "";

        const cards = normalized.length
            ? normalized.map(renderExerciseCard).join("")
            : `<div class="plan-vacio" data-i18n-en="No exercises for this day.">No hay ejercicios para este día.</div>`;

        return `
            <section class="plan-dia">
                <div class="plan-dia-header" role="button" tabindex="0" data-day-idx="${escapeHtml(dayIdx)}" aria-label="Ver detalle de ${escapeHtml(diaLabel)}" data-i18n-en-aria-label="View details for ${escapeHtml(diaLabel)}">
                    <div class="plan-dia-titulos">
                        <h2 class="plan-dia-titulo">${escapeHtml(diaLabel)}</h2>
                        ${enfoque ? `<div class="plan-dia-subtitle">${escapeHtml(enfoque)}</div>` : ""}
                    </div>
                    <span class="plan-dia-chip"><span>${normalized.length}</span> <span data-i18n-en="exercises">ejercicios</span></span>
                </div>
                <div class="plan-grid">${cards}</div>
            </section>
        `;
    };

    let html = "";

    if (hasDiasArray) {
        const days = (Array.isArray(maybeDiasArray) ? maybeDiasArray : [])
            .map((d, originalIndex) => {
                const dia = d?.dia ?? d?.nombre ?? d?.day ?? tLang(`Día ${originalIndex + 1}`, `Day ${originalIndex + 1}`);
                const enfoque = d?.enfoque ?? d?.focus ?? d?.objetivo ?? d?.titulo ?? d?.title;
                const ejercicios = d?.ejercicios ?? d?.entrenamiento ?? d?.exercises ?? d?.rutina ?? d?.items ?? [];
                const normalized = (Array.isArray(ejercicios) ? ejercicios : [])
                    .map(normalizeExercise)
                    .filter(Boolean);
                return { dia, enfoque, ejercicios, normalized, originalIndex };
            })
            .filter((d) => d.normalized.length > 0);

        if (!days.length) {
            html = `<div class="plan-vacio" data-i18n-en="No days have exercises assigned.">No hay días con ejercicios asignados.</div>`;
        } else {
            html = days
                .map((d, i) => renderDaySection(d.dia, d.ejercicios, d.enfoque, i))
                .filter(Boolean)
                .join("");
        }
    } else if (hasWeekdayObject) {
        const orderedKeys = [...weekdayKeys].sort((a, b) => {
            const ia = diasOrden.indexOf(String(a).toLowerCase());
            const ib = diasOrden.indexOf(String(b).toLowerCase());
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });

        const days = orderedKeys
            .map((k) => {
                const ejercicios = root[k];
                const normalized = (Array.isArray(ejercicios) ? ejercicios : [])
                    .map(normalizeExercise)
                    .filter(Boolean);
                return { key: k, ejercicios, normalized };
            })
            .filter((d) => d.normalized.length > 0);

        if (!days.length) {
            html = `<div class="plan-vacio" data-i18n-en="No days have exercises assigned.">No hay días con ejercicios asignados.</div>`;
        } else {
            html = days.map((d, i) => renderDaySection(d.key, d.ejercicios, null, i)).filter(Boolean).join("");
        }
    } else {
        const ejercicios = root.ejercicios ?? root.plan ?? root.entrenamiento ?? root.exercises ?? root.rutina ?? [];
        const normalized = (Array.isArray(ejercicios) ? ejercicios : [])
            .map(normalizeExercise)
            .filter(Boolean);
        const cards = normalized.length
            ? normalized.map(renderExerciseCard).join("")
            : `<div class="plan-vacio" data-i18n-en="Couldn't find exercises in the JSON.">No pude encontrar ejercicios en el JSON.</div>`;
        html = `<div class="plan-grid">${cards}</div>`;
    }

    return `<div class="plan-container plan-snap">${html}</div>`;
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
        const descripcion_detallada = ex.descripcion_detallada ?? ex.descripcionDetallada ?? ex.detailed_description ?? ex.detailedDescription ?? ex.detalle_detallado ?? ex.instrucciones_detalladas;
        const series = ex.series ?? ex.series_por_ejercicio ?? ex.sets ?? ex.set ?? ex.seriesTotales;
        const repeticiones = ex.repeticiones ?? ex.reps ?? ex.repetitions ?? ex.rep ?? ex.repeticion;
        const descanso_segundos = ex.descanso_segundos ?? ex.descanso ?? ex.rest ?? ex.rest_seconds ?? ex.restSeconds;
        if (!nombre && !series && !repeticiones && !descripcion) return null;

        const nombreEs = String(nombre ?? tLang("Ejercicio", "Exercise")).trim();
        const nombreEn = translateExerciseNameToEnglish(nombreEs);
        return {
            nombre: nombreEs,
            nombre_en: nombreEn,
            descripcion: String(descripcion ?? ""),
            descripcion_detallada: String(descripcion_detallada ?? ""),
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
        const days = maybeDiasArray.map((d, i) => {
            const dia = d?.dia ?? d?.nombre ?? d?.day ?? tLang(`Día ${i + 1}`, `Day ${i + 1}`);
            const enfoque = d?.enfoque ?? d?.focus ?? d?.objetivo ?? d?.titulo ?? d?.title ?? "";
            const ejercicios = Array.isArray(d?.ejercicios)
                ? d.ejercicios.map(normalizeExDet).filter(Boolean)
                : [];
            return { dia, enfoque, ejercicios };
        });
        return days.filter((d) => Array.isArray(d.ejercicios) && d.ejercicios.length > 0);
    }

    const weekdayKeys = Object.keys(root || {}).filter((k) => diasOrden.includes(String(k).toLowerCase()));
    if (weekdayKeys.length > 0) {
        const orderedKeys = [...weekdayKeys].sort((a, b) => {
            const ia = diasOrden.indexOf(String(a).toLowerCase());
            const ib = diasOrden.indexOf(String(b).toLowerCase());
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
        const days = orderedKeys.map((k) => {
            const ejercicios = Array.isArray(root[k]) ? root[k].map(normalizeExDet).filter(Boolean) : [];
            return { dia: k, enfoque: "", ejercicios };
        });
        return days.filter((d) => Array.isArray(d.ejercicios) && d.ejercicios.length > 0);
    }

    return null;
}

function initDetallePorDiaPlan() {
    const contenedor = document.getElementById("Plan_ejercicio");
    if (!contenedor) return;
    if (contenedor.dataset.detalleDiaInit === "1") return;
    contenedor.dataset.detalleDiaInit = "1";

    const fitDetalleTipografia = (rootEl) => {
        if (!rootEl || !(rootEl instanceof HTMLElement)) return;

        const panels = Array.from(rootEl.querySelectorAll(".plan-snap-panel"));
        for (const panel of panels) {
            if (!(panel instanceof HTMLElement)) continue;

            const card = panel.querySelector(".plan-card");
            if (!(card instanceof HTMLElement)) continue;

            const detailed = card.querySelector(".plan-detailed-list");
            if (!(detailed instanceof HTMLElement)) continue;

            // Reset (por si abrimos varias veces o recalculamos)
            detailed.style.fontSize = "";

            // Si no hay overflow, no tocar
            const overflowNow = panel.scrollHeight - panel.clientHeight;
            if (overflowNow <= 1) continue;

            const computed = window.getComputedStyle(detailed);
            const basePx = Number.parseFloat(computed.fontSize) || 0;
            if (!basePx) continue;

            const minPx = 11;
            const maxSteps = 14;
            let currentPx = basePx;
            let steps = 0;

            while (steps < maxSteps && currentPx > minPx) {
                const overflow = panel.scrollHeight - panel.clientHeight;
                if (overflow <= 1) break;
                currentPx -= 1;
                detailed.style.fontSize = `${currentPx}px`;
                steps += 1;
            }
        }
    };

    const openDetalle = async (headerEl) => {
        const idx = Number(headerEl?.getAttribute?.("data-day-idx"));
        if (!Number.isFinite(idx)) return;

        const planRaw = localStorage.getItem("plan_entreno_usuario");
        const dias = parsePlanDiasDetallados(planRaw);
        if (!Array.isArray(dias) || !dias[idx]) return;

        const diaInfo = dias[idx];
        const ejercicios = Array.isArray(diaInfo.ejercicios) ? diaInfo.ejercicios : [];

                const buildDetailedHtml = (descripcionDet, descripcionShort) => {
                    const text = String(descripcionDet || descripcionShort || "").trim();
                    const sentences = text.split(/(?<=[.?!])\s+/).map(s => s.trim()).filter(Boolean);

                    const findSentence = (keywords) => {
                        const low = text.toLowerCase();
                        for (const s of sentences) {
                            for (const k of keywords) {
                                if (s.toLowerCase().includes(k)) return s.replace(/[.?!]$/,'').trim();
                            }
                        }
                        return null;
                    };

                    const tecnica =
                        findSentence(["técnic", "tecnica", "postura", "mantener la espalda", "posición", "mantener", "technique", "form", "posture", "position"]) ||
                        sentences[0] ||
                        tLang(
                            "Ejecutar con técnica correcta: mantener postura y rango adecuado.",
                            "Use proper technique: maintain posture and a controlled range of motion."
                        );
                    const sobrecarga =
                        findSentence(["sobrecarga", "progres", "aument", "carga", "progresión", "progresiva", "overload", "progress", "increase", "load", "progressive"]) ||
                        tLang(
                            "Incrementar progresivamente la carga (p.ej. +2-5% de carga o +1-2 repeticiones cuando completes el rango objetivo durante 1-2 sesiones).",
                            "Progressively increase the load (e.g., +2-5% weight or +1-2 reps once you hit the target range for 1-2 sessions)."
                        );
                    const respiracion =
                        findSentence(["respir", "inhal", "exhal", "inspir", "exhalar", "breath", "breathe", "inhale", "exhale"]) ||
                        tLang("Inhalar al bajar, exhalar al subir.", "Inhale on the way down, exhale on the way up.");

                    return `
                        <ul class="plan-detailed-list">
                            <li><strong>${escapeHtml(tLang("Técnica", "Technique"))}:</strong> ${escapeHtml(tecnica)}</li>
                            <li><strong>${escapeHtml(tLang("Sobrecarga", "Progression"))}:</strong> ${escapeHtml(sobrecarga)}</li>
                            <li><strong>${escapeHtml(tLang("Respiración", "Breathing"))}:</strong> ${escapeHtml(respiracion)}</li>
                        </ul>
                    `;
                };

                const cardHtmls = ejercicios.length
            ? ejercicios.map((ex) => {
                const nombreEs = escapeHtml(ex.nombre);
                const nombreEn = escapeHtml(ex.nombre_en ?? ex.nombre);
                const descripcion = escapeHtml(ex.descripcion || "");
                const descripcionDet = String(ex.descripcion_detallada ?? "").trim();
                const series = escapeHtml(ex.series);
                const reps = escapeHtml(formatReps(ex.repeticiones));
                const descanso = escapeHtml(ex.descanso_segundos);
                        const detailedHtml = buildDetailedHtml(descripcionDet, descripcion);
                        return `
                            <article class="plan-card" style="height:100%;display:flex;flex-direction:column;justify-content:space-between;">
                                <div>
                                    <h3 class="plan-nombre" data-i18n-en="${nombreEn}">${nombreEs}</h3>
                                    ${descripcion ? `<p class="plan-desc">${descripcion}</p>` : ""}
                                    <div class="plan-meta" style="margin-top:6px;">
                                        <span class="plan-chip">${escapeHtml(tLang("Series", "Sets"))}: <strong>${series}</strong></span>
                                        <span class="plan-chip">${escapeHtml(tLang("Reps", "Reps"))}: <strong>${reps}</strong></span>
                                        <span class="plan-chip plan-chip--vertical"><span class="plan-chip-label">${escapeHtml(tLang("Descanso", "Rest"))}</span><span class="plan-chip-value">${descanso}</span></span>
                                    </div>
                                    ${detailedHtml}
                                </div>
                            </article>
                        `;
            })
            : [];

        // Build a vertical snap viewport so each exercise occupies the modal viewport
        const viewportStyle = "overflow-y:auto;scroll-snap-type:y mandatory;-webkit-overflow-scrolling:touch;padding-right:6px;flex:1;";
        const panelStyle = "scroll-snap-align:start;height:100%;width:100%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;padding:18px;";

        const snapPanels = cardHtmls.length
            ? cardHtmls.map((htmlCard) => `<div class="plan-snap-panel" style="${panelStyle}">${htmlCard}</div>`).join("")
            : `<div class="plan-vacio">${escapeHtml(tLang("No hay ejercicios cargados para este día.", "No exercises loaded for this day."))}</div>`;

        // Build content: header (day + small subtitle) + snapping viewport that fills remaining modal space
        const containerStyle = "display:flex;flex-direction:column;gap:12px;height:70vh;max-height:74vh;";
        const headerHtml = `
            <div style="text-align:center;padding:8px 12px;">
                <h2 style="margin:0;font-size:1.6rem;line-height:1.1;font-weight:700;">${escapeHtml(String(diaInfo.dia ?? tLang("Día", "Day")))}</h2>
                ${diaInfo.enfoque ? `<div style=\"margin-top:6px;font-size:0.95rem;color:var(--muted,#b3bac6);\">${escapeHtml(String(diaInfo.enfoque))}</div>` : ""}
            </div>
        `;

        const html = `
            <div style="${containerStyle}">
                ${headerHtml}
                <div class="plan-detalle-viewport" style="${viewportStyle};flex:1;">
                    ${snapPanels}
                </div>
                <div style="text-align:center;margin-top:4px;color:var(--muted,#99a);"><small>${escapeHtml(String(ejercicios.length))} ${escapeHtml(tLang("ejercicios", "exercises"))}</small></div>
            </div>
        `;

        // Al abrir el detalle por día, intentamos evitar que la pantalla se bloquee.
        // En algunos navegadores esto requiere gesto del usuario (este click lo es).
        wakeLockManager.setReason("detalle", true, { tryRequest: true });
        void wakeLockManager.requestIfNeeded();

        let onResize = null;
        await sweetalert.fire({
            html,
            showCancelButton: false,
            confirmButtonText: tLang("Cerrar", "Close"),
            customClass: {
                popup: "dashboard-swal",
                confirmButton: "dashboard-swal-confirm",
            },
            didOpen: (popup) => {
                // Ajuste inmediato + 2 frames para asegurar layout estable
                const root = popup instanceof HTMLElement ? popup : document.body;
                try {
                    globalThis.UIIdioma?.translatePage?.(root);
                } catch {
                    // ignore
                }
                const run = () => fitDetalleTipografia(root);
                run();
                requestAnimationFrame(run);
                requestAnimationFrame(run);

                onResize = () => run();
                window.addEventListener("resize", onResize, { passive: true });
            },
            willClose: () => {
                wakeLockManager.setReason("detalle", false);

                if (typeof onResize === "function") {
                    window.removeEventListener("resize", onResize);
                    onResize = null;
                }
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

function initPlanDiaPager() {
    const scroller = document.getElementById("Plan_ejercicio");
    if (!scroller) return;
    if (scroller.dataset.diaPagerInit === "1") return;
    scroller.dataset.diaPagerInit = "1";

    const getDays = () => Array.from(scroller.querySelectorAll(".plan-container.plan-snap .plan-dia"));

    const findNearestIndex = () => {
        const days = getDays();
        if (!days.length) return 0;
        const top = scroller.scrollTop;
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < days.length; i++) {
            const dist = Math.abs((days[i]?.offsetTop ?? 0) - top);
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
            }
        }
        return bestIdx;
    };

    const scrollToIndex = (index, behavior = "smooth") => {
        const days = getDays();
        if (!days.length) return;
        const clamped = Math.max(0, Math.min(days.length - 1, index));
        const target = days[clamped];
        if (!target) return;
        scroller.scrollTo({ top: target.offsetTop, behavior });
    };

    let gestureLock = false;
    const stepBy = (dir) => {
        const days = getDays();
        if (days.length <= 1) return;
        if (gestureLock) return;
        gestureLock = true;
        const current = findNearestIndex();
        scrollToIndex(current + dir, "smooth");
        window.setTimeout(() => {
            gestureLock = false;
        }, 420);
    };

    const canScrollInnerGrid = (gridEl, deltaY) => {
        if (!(gridEl instanceof HTMLElement)) return false;
        const canScroll = gridEl.scrollHeight > gridEl.clientHeight + 1;
        if (!canScroll) return false;
        if (deltaY > 0) {
            return gridEl.scrollTop < (gridEl.scrollHeight - gridEl.clientHeight - 1);
        }
        if (deltaY < 0) {
            return gridEl.scrollTop > 0;
        }
        return false;
    };

    let wheelAccum = 0;
    let wheelTimer = null;
    const WHEEL_THRESHOLD = 26;

    scroller.addEventListener("wheel", (e) => {
        const days = getDays();
        if (days.length <= 1) return;
        if (e.ctrlKey) return; // pinch zoom

        const deltaY = e.deltaY;
        const target = e.target;
        const grid = (target instanceof Element) ? target.closest(".plan-grid") : null;
        if (grid && canScrollInnerGrid(grid, deltaY)) {
            return;
        }

        e.preventDefault();
        wheelAccum += deltaY;

        if (wheelTimer) window.clearTimeout(wheelTimer);
        wheelTimer = window.setTimeout(() => {
            wheelAccum = 0;
        }, 140);

        if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) return;
        const dir = wheelAccum > 0 ? 1 : -1;
        wheelAccum = 0;
        stepBy(dir);
    }, { passive: false });

    let touchStartY = 0;
    let touchStartX = 0;
    let touchArmed = false;
    let touchFromGrid = false;
    const TOUCH_THRESHOLD = 44;

    scroller.addEventListener("touchstart", (e) => {
        const days = getDays();
        if (days.length <= 1) return;
        if (!e.touches || e.touches.length !== 1) return;

        const t = e.touches[0];
        touchStartY = t.clientY;
        touchStartX = t.clientX;
        touchArmed = true;

        const target = e.target;
        const grid = (target instanceof Element) ? target.closest(".plan-grid") : null;
        touchFromGrid = !!grid;
    }, { passive: true });

    scroller.addEventListener("touchend", (e) => {
        if (!touchArmed) return;
        touchArmed = false;

        const days = getDays();
        if (days.length <= 1) return;
        const t = e.changedTouches && e.changedTouches[0];
        if (!t) return;

        const dy = t.clientY - touchStartY;
        const dx = t.clientX - touchStartX;
        if (Math.abs(dy) < TOUCH_THRESHOLD) return;
        if (Math.abs(dy) < Math.abs(dx)) return;

        if (touchFromGrid) return;

        const dir = dy < 0 ? 1 : -1;
        stepBy(dir);
    }, { passive: true });
}
document.getElementById("boton_eliminar")?.addEventListener("click", async () => {
    const confirmResult = await sweetalert.fire({
        title: tLang("¿Estás seguro?", "Are you sure?"),
        text: tLang(
            "Esta acción eliminará tu plan de entrenamiento actual.",
            "This action will delete your current training plan."
        ),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: tLang("Sí, eliminar", "Yes, delete"),
        cancelButtonText: tLang("Cancelar", "Cancel"),
    });

    if (!confirmResult.isConfirmed) return;

    localStorage.setItem("plan_entreno_usuario", "Ninguno");
    await actualizar_cambios_plan_entreno();
    document.getElementById("Plan_ejercicio").innerHTML = "";
    document.getElementById("Plan_ejercicio").style.display = "none";
    document.getElementById("boton_regenerar").style.display = "none";
    verificacion_plan_entrenamiento();

    sweetalert.fire({
        title: tLang("Plan eliminado", "Plan deleted"),
        text: tLang("Tu plan de entrenamiento ha sido eliminado.", "Your training plan has been deleted."),
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
    });
});
async function actualizar_cambios_plan_entreno() {
    let res;
    try {
        res = await fetch('/actualizar_cambios_plan', {
            method: 'POST',
            body: JSON.stringify({ plan_entreno: localStorage.getItem("plan_entreno_usuario"), id_usuario: localStorage.getItem("id_usuario") }),
        });
    } catch (err) {
        console.log("[EdgeFunction:/actualizar_cambios_plan] Error de red:", err);
        return;
    }

    if (!res.ok) {
        let bodyText = "";
        try { bodyText = await res.text(); } catch { bodyText = ""; }
        console.log("[EdgeFunction:/actualizar_cambios_plan] Error:", {
            status: res.status,
            statusText: res.statusText,
            body: bodyText,
        });

        if (isNetlifyEdgeUncaughtInvocation(bodyText)) {
            await showNetlifyHostingErrorAlert({
                endpoint: "/actualizar_cambios_plan",
                status: res.status,
                statusText: res.statusText,
                bodyText,
            });
        }
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
        title: tLang("Regenerando plan de entrenamiento", "Regenerating training plan"),
        text: isEnglish()
            ? `Your current plan will be deleted and a new one will be generated based on the previous configuration. Detected intensity: ${intensidadDetectada} (${ejerciciosPorDiaDetectados} exercises per day).`
            : `Se eliminará el plan actual y se generará uno nuevo basado en la configuración previa. Intensidad detectada: ${intensidadDetectada} (${ejerciciosPorDiaDetectados} ejercicios por día).`,
        icon: "info",

        showCancelButton: true,
        confirmButtonText: tLang("Sí, regenerar", "Yes, regenerate"),
        cancelButtonText: tLang("Cancelar", "Cancel"),
    });

    if (!result.isConfirmed) {
        swal.fire({
            title: tLang("Regeneración cancelada", "Regeneration cancelled"),
            text: tLang(
                "El plan de entrenamiento actual se mantiene sin cambios.",
                "Your current training plan remains unchanged."
            ),
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
            title: tLang("No hay plan para regenerar", "No plan to regenerate"),
            text: tLang(
                "Primero debés generar un plan de entrenamiento.",
                "You need to generate a training plan first."
            ),
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
