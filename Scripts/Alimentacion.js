import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.94.1/+esm";
import { generatePlanAlimenta } from "./generacion_planes/gen_plan_alimenta.js";

const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_publishable_oLC8LcDLa3jR72Hpd_jJsA_eXjMlP3-";
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: false, storage: localStorage },
});

const sweetalert = window.swal;

const username = localStorage.getItem("username_usuario");
const avatar = localStorage.getItem("avatar_usuario");

const isEnglish = () => (globalThis.UIIdioma?.getIdioma?.() || "es") === "en";
const tLang = (es, en) => (isEnglish() ? en : es);

const NETLIFY_EDGE_UNCAUGHT = "uncaught exception during edge function invocation";

const isPlanAlimentacionVacio = (value) => {
    const v = String(value ?? "").trim();
    if (!v) return true;
    const lower = v.toLowerCase();
    return lower === "ninguno" || lower === "proximamente";
};

const escapeHtml = (value) =>
    String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

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
        : "Este es un error del servidor de hosting (<strong>Netlify</strong>). Por favor, aguardá unos minutos e intentá nuevamente.";

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

// Mantener alturas de header/footer para layout fijo (CSS usa --header-fixed/--footer-fixed)
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

const focusPlanAlimentacionContainer = ({ behavior = "auto" } = {}) => {
    const plan = document.getElementById("Plan_alimentacion");
    const section = document.getElementById("Alimentacion");
    const visiblePlan = plan && plan.style.display !== "none";
    const target = visiblePlan ? plan : (section || plan);
    if (!target) return;
    scrollToWithFixedHeader(target, { behavior });
    if (typeof target.focus === "function") target.focus({ preventScroll: true });
};

const autofocusPlanAlimentacionOncePerSession = () => {
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    try {
        const key = "autofocus_plan_aliment_done";
        if (sessionStorage.getItem(key) === "1") return;
        sessionStorage.setItem(key, "1");
        focusPlanAlimentacionContainer({ behavior });
    } catch {
        focusPlanAlimentacionContainer({ behavior });
    }
};

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

const DIAS_ORDEN = [
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

const normalizeDayLabel = (value, fallback = tLang("Día", "Day")) => {
    const s = String(value ?? "").trim();
    if (!s) return fallback;
    // Capitalizar primera letra
    return s.charAt(0).toUpperCase() + s.slice(1);
};

const normalizeMacros = (macros) => {
    if (!macros || typeof macros !== "object") return null;
    const c = macros.carbohidratos ?? macros.carbos ?? macros.carbs;
    const p = macros.proteinas ?? macros.proteínas ?? macros.protein;
    const g = macros.grasas ?? macros.fats ?? macros.grasa;
    const toNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    };
    const out = {
        carbohidratos: toNum(c),
        proteinas: toNum(p),
        grasas: toNum(g),
    };
    if (out.carbohidratos == null && out.proteinas == null && out.grasas == null) return null;
    return out;
};

const normalizeMeals = (comidas) => {
    if (!Array.isArray(comidas)) return [];
    const out = [];
    const defaultMealName = tLang("Comida", "Meal");
    for (const c of comidas) {
        if (!c || typeof c !== "object") continue;
        const nombre = c.nombre ?? c.name ?? c.titulo ?? c.title;
        const descripcion = c.descripcion ?? c.description ?? c.detalle ?? c.detalles;
        const calorias_aprox = c.calorias_aprox ?? c.calorias ?? c.kcal;
        if (!nombre && !descripcion) continue;
        out.push({
            nombre: String(nombre ?? defaultMealName).trim() || defaultMealName,
            descripcion: String(descripcion ?? "").trim() || "-",
            calorias_aprox: Number.isFinite(Number(calorias_aprox)) ? Number(calorias_aprox) : null,
        });
    }
    return out;
};

const parsePlanDiasDetalladosAliment = (planRaw) => {
    if (planRaw == null) return null;
    const asString = typeof planRaw === "string" ? planRaw.trim() : JSON.stringify(planRaw);
    if (isPlanAlimentacionVacio(asString)) return null;

    const extracted = extractLikelyJson(asString);
    const parsed = tryParseJson(extracted) ?? tryParseJson(asString);
    if (!parsed || typeof parsed !== "object") return null;

    const root = parsed.plan_alimentacion ?? parsed.planAlimentacion ?? parsed;

    const maybeDiasArray =
        root.configuracion_semanal ??
        root.configuracionSemanal ??
        root.dias ??
        root.semana ??
        root.plan_semanal ??
        root.planSemanal;

    if (Array.isArray(maybeDiasArray)) {
        return maybeDiasArray
            .map((d) => {
                if (!d || typeof d !== "object") return null;
                return {
                    dia: normalizeDayLabel(d.dia ?? d.day ?? d.nombre_dia ?? d.nombreDia, tLang("Día", "Day")),
                    calorias_objetivo: Number.isFinite(Number(d.calorias_objetivo ?? d.caloriasObjetivo ?? d.calorias ?? d.kcal))
                        ? Number(d.calorias_objetivo ?? d.caloriasObjetivo ?? d.calorias ?? d.kcal)
                        : null,
                    comidas: normalizeMeals(d.comidas ?? d.meals),
                    macros: normalizeMacros(d.macros_porcentaje ?? d.macrosPorcentaje ?? d.macros),
                    recomendaciones: Array.isArray(d.recomendaciones_alimentos ?? d.recomendaciones ?? d.foods)
                        ? (d.recomendaciones_alimentos ?? d.recomendaciones ?? d.foods).map((x) => String(x)).filter(Boolean)
                        : [],
                    tips: Array.isArray(d.tips ?? d.consejos)
                        ? (d.tips ?? d.consejos).map((x) => String(x)).filter(Boolean)
                        : [],
                };
            })
            .filter(Boolean);
    }

    // Alternativa: objeto con keys de días
    const weekdayKeys = Object.keys(root || {}).filter((k) => DIAS_ORDEN.includes(String(k).toLowerCase()));
    if (weekdayKeys.length > 0) {
        const ordered = [...weekdayKeys].sort((a, b) => DIAS_ORDEN.indexOf(a.toLowerCase()) - DIAS_ORDEN.indexOf(b.toLowerCase()));
        return ordered
            .map((k) => {
                const d = root[k];
                if (!d || typeof d !== "object") return null;
                return {
                    dia: normalizeDayLabel(k),
                    calorias_objetivo: Number.isFinite(Number(d.calorias_objetivo ?? d.calorias ?? d.kcal))
                        ? Number(d.calorias_objetivo ?? d.calorias ?? d.kcal)
                        : null,
                    comidas: normalizeMeals(d.comidas ?? d.meals),
                    macros: normalizeMacros(d.macros_porcentaje ?? d.macros),
                    recomendaciones: Array.isArray(d.recomendaciones_alimentos ?? d.recomendaciones)
                        ? (d.recomendaciones_alimentos ?? d.recomendaciones).map((x) => String(x)).filter(Boolean)
                        : [],
                    tips: Array.isArray(d.tips ?? d.consejos)
                        ? (d.tips ?? d.consejos).map((x) => String(x)).filter(Boolean)
                        : [],
                };
            })
            .filter(Boolean);
    }

    return null;
};

const renderMealCard = (meal) => {
    const kcal = meal.calorias_aprox != null ? `${Math.round(meal.calorias_aprox)} kcal` : null;
    return `
        <article class="plan-card">
            <h3 class="plan-nombre">${escapeHtml(meal.nombre)}</h3>
            <p class="plan-desc">${escapeHtml(meal.descripcion)}</p>
            ${kcal ? `<div class="plan-meta"><span class="plan-chip"><strong>${escapeHtml(kcal)}</strong></span></div>` : ""}
        </article>
    `;
};

const renderDaySection = (dia, dayIdx) => {
    const kcal = dia.calorias_objetivo != null ? `${Math.round(dia.calorias_objetivo)} kcal` : "-";
    const comidasCount = dia.comidas?.length ?? 0;
    const subtitleEs = `${kcal} · ${comidasCount} comida${comidasCount === 1 ? "" : "s"}`;
    const subtitleEn = `${kcal} · ${comidasCount} meal${comidasCount === 1 ? "" : "s"}`;

    const mealsHtml =
        (dia.comidas || []).map(renderMealCard).join("\n") ||
        `<div class="plan-aviso" data-i18n-en="No meals defined.">No hay comidas definidas.</div>`;

    return `
        <section class="plan-dia" data-day-index="${dayIdx}">
            <header class="plan-dia-header" role="button" tabindex="0" aria-label="Ver detalle del día ${escapeHtml(dia.dia)}" data-i18n-en-aria-label="View details for ${escapeHtml(dia.dia)}">
                <div class="plan-dia-titulos">
                    <h2 class="plan-dia-titulo">${escapeHtml(dia.dia)}</h2>
                    <div class="plan-dia-subtitle" data-i18n-en="${escapeHtml(subtitleEn)}">${escapeHtml(subtitleEs)}</div>
                </div>
                <span class="plan-dia-chip" data-i18n-en="Details">Detalle</span>
            </header>
            <div class="plan-grid">${mealsHtml}</div>
        </section>
    `;
};

const mapear_plan_alimentacion = (planRaw) => {
    if (planRaw == null) return `<div class="plan-vacio" data-i18n-en="No plan loaded.">No hay plan cargado.</div>`;
    const asString = typeof planRaw === "string" ? planRaw.trim() : JSON.stringify(planRaw);
    if (isPlanAlimentacionVacio(asString)) return `<div class="plan-vacio" data-i18n-en="No plan loaded.">No hay plan cargado.</div>`;

    const dias = parsePlanDiasDetalladosAliment(planRaw);
    if (!dias || dias.length === 0) {
        return `
            <div class="plan-aviso" data-i18n-en="Could not parse the plan as structured JSON. Showing raw content:">No se pudo interpretar el plan como JSON estructurado. Mostrando contenido crudo:</div>
            <pre class="plan-raw">${escapeHtml(String(planRaw).slice(0, 9000))}</pre>
        `;
    }

    const html = dias.map((d, idx) => renderDaySection(d, idx)).join("\n");
    return `<div class="plan-container plan-snap">${html}</div>`;
};

const initDetallePorDiaPlanAliment = () => {
    const contenedor = document.getElementById("Plan_alimentacion");
    if (!contenedor) return;
    if (contenedor.dataset.detalleDiaInit === "1") return;
    contenedor.dataset.detalleDiaInit = "1";

    const openDetalle = async (headerEl) => {
        const planRaw = localStorage.getItem("plan_dieta_usuario");
        const dias = parsePlanDiasDetalladosAliment(planRaw);
        if (!dias || dias.length === 0) return;

        const dayEl = headerEl.closest(".plan-dia");
        const idx = dayEl ? Number(dayEl.getAttribute("data-day-index")) : NaN;
        const dia = Number.isFinite(idx) ? dias[idx] : null;
        if (!dia) return;

        const macros = dia.macros;
        const macrosHtml = macros
            ? `
                <div class="plan-meta" style="margin-top:10px;">
                    <span class="plan-chip plan-chip--vertical"><span class="plan-chip-label">${tLang("Carbohidratos", "Carbs")}</span><span class="plan-chip-value">${escapeHtml(String(macros.carbohidratos ?? "-"))}%</span></span>
                    <span class="plan-chip plan-chip--vertical"><span class="plan-chip-label">${tLang("Proteínas", "Protein")}</span><span class="plan-chip-value">${escapeHtml(String(macros.proteinas ?? "-"))}%</span></span>
                    <span class="plan-chip plan-chip--vertical"><span class="plan-chip-label">${tLang("Grasas", "Fats")}</span><span class="plan-chip-value">${escapeHtml(String(macros.grasas ?? "-"))}%</span></span>
                </div>
            `
            : "";

        const recHtml = (dia.recomendaciones || []).length
            ? `<h4 style="margin:14px 0 8px;">Recomendaciones</h4><ul class="plan-detailed-list">${dia.recomendaciones
                  .slice(0, 12)
                  .map((t) => `<li>${escapeHtml(t)}</li>`)
                  .join("")}</ul>`
            : "";

        const tipsHtml = (dia.tips || []).length
            ? `<h4 style="margin:14px 0 8px;">Tips</h4><ul class="plan-detailed-list">${dia.tips
                  .slice(0, 12)
                  .map((t) => `<li>${escapeHtml(t)}</li>`)
                  .join("")}</ul>`
            : "";

        const recHeading = tLang("Recomendaciones", "Recommendations");
        const tipsHeading = tLang("Tips", "Tips");

        const comidas = Array.isArray(dia.comidas) ? dia.comidas : [];
        const comidasHtml = comidas.length
            ? `<h4 style="margin:14px 0 8px;">${tLang("Comidas del día", "Meals of the day")}</h4>
               <div class="plan-grid">${comidas
                   .map((c) => {
                       const kcalComida = c.calorias_aprox != null ? `${Math.round(c.calorias_aprox)} kcal` : "";
                       return `
                           <article class="plan-card">
                               <h3 class="plan-nombre">${escapeHtml(c.nombre)}</h3>
                               <p class="plan-desc">${escapeHtml(c.descripcion)}</p>
                               ${kcalComida ? `<div class="plan-meta"><span class="plan-chip"><strong>${escapeHtml(kcalComida)}</strong></span></div>` : ""}
                           </article>
                       `;
                   })
                   .join("")}</div>`
            : `<h4 style="margin:14px 0 8px;">${tLang("Comidas del día", "Meals of the day")}</h4><div class="plan-aviso">${tLang(
                "No hay comidas definidas.",
                "No meals defined."
            )}</div>`;

        const kcal = dia.calorias_objetivo != null ? `${Math.round(dia.calorias_objetivo)} kcal` : "-";

        await sweetalert.fire({
            title: `${tLang("Detalle", "Details")}: ${escapeHtml(dia.dia)}`,
            html: `
                <div class="plan-detalle-scroll">
                    <div class="plan-card">
                        <h3 class="plan-nombre">${tLang("Ingesta del día", "Daily intake")}</h3>
                        <p class="plan-desc">${tLang("Objetivo calórico", "Calorie target")}: <strong>${escapeHtml(kcal)}</strong></p>
                        ${macrosHtml}
                        ${comidasHtml}
                        ${recHtml ? recHtml.replace("Recomendaciones", recHeading) : ""}
                        ${tipsHtml ? tipsHtml.replace("Tips", tipsHeading) : ""}
                    </div>
                </div>
            `,
            confirmButtonText: tLang("Cerrar", "Close"),
            customClass: {
                popup: "dashboard-swal",
                confirmButton: "dashboard-swal-confirm",
            },
        });
    };

    contenedor.addEventListener("click", async (ev) => {
        const header = ev.target && ev.target.closest ? ev.target.closest(".plan-dia-header") : null;
        if (!header) return;
        await openDetalle(header);
    });

    contenedor.addEventListener("keydown", async (ev) => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        const header = ev.target && ev.target.closest ? ev.target.closest(".plan-dia-header") : null;
        if (!header) return;
        ev.preventDefault();
        await openDetalle(header);
    });
};

const initPlanDiaPagerAliment = () => {
    const scroller = document.getElementById("Plan_alimentacion");
    if (!scroller) return;
    if (scroller.dataset.diaPagerInit === "1") return;
    scroller.dataset.diaPagerInit = "1";

    // Copiado del patrón del dashboard: calcular por scrollTop + offsetTop,
    // y scrollear SOLO el contenedor (no usar scrollIntoView, que puede mover el body).
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

    scroller.addEventListener(
        "wheel",
        (e) => {
            const days = getDays();
            if (days.length <= 1) return;
            if (e.ctrlKey) return; // pinch zoom

            const deltaY = e.deltaY;
            const target = e.target;
            const grid = target instanceof Element ? target.closest(".plan-grid") : null;
            if (grid && canScrollInnerGrid(grid, deltaY)) return;

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
        },
        { passive: false }
    );

    let touchStartY = 0;
    let touchStartX = 0;
    let touchArmed = false;
    let touchFromGrid = false;
    const TOUCH_THRESHOLD = 44;

    scroller.addEventListener(
        "touchstart",
        (e) => {
            const days = getDays();
            if (days.length <= 1) return;
            if (!e.touches || e.touches.length !== 1) return;

            const t = e.touches[0];
            touchStartY = t.clientY;
            touchStartX = t.clientX;
            touchArmed = true;

            const target = e.target;
            const grid = target instanceof Element ? target.closest(".plan-grid") : null;
            touchFromGrid = !!grid;
        },
        { passive: true }
    );

    scroller.addEventListener(
        "touchend",
        (e) => {
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
        },
        { passive: true }
    );
};

const openGenerarPlanAlimentModal = async (planPrevioRaw = null) => {
    const baseObjetivo = localStorage.getItem("dieta_objetivo") || "mantener";
    const baseIntensidad = localStorage.getItem("dieta_intensidad") || "media";

    const result = await sweetalert.fire({
        title: tLang("Generar Plan de Alimentación con IA", "Generate Meal Plan with AI"),
        html: `
            <div class="swal-gen">
                <p class="swal-helper">${tLang(
                    "Elegí tu objetivo y la intensidad del plan. Esto define el enfoque y la cantidad de comidas por día.",
                    "Choose your goal and the plan intensity. This defines the approach and the number of meals per day."
                )}</p>

                <section class="swal-section" aria-label="${tLang("Opciones de plan de alimentación", "Meal plan options")}">
                    <h3>${tLang("Objetivo", "Goal")}</h3>
                    <div class="swal-grid">
                        <div class="swal-field">
                            <label class="swal-radio"><input type="radio" name="objetivo" value="grasa"><span>${tLang("Perder grasa", "Lose fat")}</span></label>
                            <label class="swal-radio"><input type="radio" name="objetivo" value="musculo"><span>${tLang("Ganar masa muscular", "Gain muscle")}</span></label>
                            <label class="swal-radio"><input type="radio" name="objetivo" value="mantener"><span>${tLang("Mantener peso", "Maintain weight")}</span></label>
                        </div>
                    </div>
                </section>

                <section class="swal-section" aria-label="${tLang("Intensidad de plan de alimentación", "Meal plan intensity")}">
                    <h3>${tLang("Intensidad", "Intensity")}</h3>
                    <div class="swal-grid">
                        <div class="swal-field">
                            <label class="swal-radio"><input type="radio" name="intensidad" value="baja"><span>${tLang("Intensidad baja", "Low intensity")}</span></label>
                            <label class="swal-radio"><input type="radio" name="intensidad" value="media"><span>${tLang("Intensidad media", "Medium intensity")}</span></label>
                            <label class="swal-radio"><input type="radio" name="intensidad" value="alta"><span>${tLang("Intensidad alta", "High intensity")}</span></label>
                            <p class="swal-helper">${tLang(
                                "La intensidad ajusta la cantidad de comidas por día (baja: 3, media: 4, alta: 5).",
                                "Intensity adjusts the number of meals per day (low: 3, medium: 4, high: 5)."
                            )}</p>
                        </div>
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
            const popup = sweetalert.getPopup();
            const obj = popup?.querySelector(`input[name="objetivo"][value="${CSS.escape(baseObjetivo)}"]`);
            const inten = popup?.querySelector(`input[name="intensidad"][value="${CSS.escape(baseIntensidad)}"]`);
            if (obj) obj.checked = true;
            if (inten) inten.checked = true;
        },
        preConfirm: () => {
            const popup = sweetalert.getPopup();
            const objetivo = popup?.querySelector('input[name="objetivo"]:checked')?.value;
            const intensidad = popup?.querySelector('input[name="intensidad"]:checked')?.value;
            if (!objetivo) {
                sweetalert.showValidationMessage(tLang("Seleccioná un objetivo", "Select a goal"));
                return;
            }
            if (!intensidad) {
                sweetalert.showValidationMessage(tLang("Seleccioná una intensidad", "Select an intensity"));
                return;
            }
            return { objetivo, intensidad };
        },
    });

    if (!result.isConfirmed) return;
    const { objetivo, intensidad } = result.value;

    // Persistir para regenerar con prefill
    try {
        localStorage.setItem("dieta_objetivo", objetivo);
        localStorage.setItem("dieta_intensidad", intensidad);
    } catch {
        // ignore
    }

    await crearPlanAlimentacion(objetivo, intensidad);
};

const obtenerPerfilBasico = () => {
    const readFirstNonEmpty = (...keys) => {
        for (const k of keys) {
            const v = localStorage.getItem(k);
            if (v != null && String(v).trim() !== "") return v;
        }
        return null;
    };

    const normalizeStoredNumber = (v) => {
        if (v == null) return null;
        const s = String(v).trim();
        if (!s) return null;
        // Permite valores tipo "75", "75.5", "75,5" o incluso "75 kg"
        const cleaned = s.replaceAll(",", ".").replace(/[^0-9.\-]/g, "");
        return cleaned.trim() || null;
    };

    const altura = normalizeStoredNumber(readFirstNonEmpty("altura_usuario"));
    const edad = normalizeStoredNumber(readFirstNonEmpty("edad_usuario"));
    // Compatibilidad: en el perfil se guarda como "peso_usuario" (no "peso_actual_usuario")
    const pesoActual = normalizeStoredNumber(readFirstNonEmpty("peso_actual_usuario", "peso_usuario"));
    const pesoObjetivo = normalizeStoredNumber(readFirstNonEmpty("peso_objetivo_usuario"));

    // Si existe el peso actual pero falta la key vieja, la rellenamos para consistencia futura
    try {
        if (pesoActual && !localStorage.getItem("peso_actual_usuario") && localStorage.getItem("peso_usuario")) {
            localStorage.setItem("peso_actual_usuario", pesoActual);
        }
    } catch {
        // ignore
    }

    return {
        Altura: altura,
        Peso_actual: pesoActual,
        Peso_objetivo: pesoObjetivo,
        Edad: edad,
    };
};

async function recuperar_planes() {
    const { data, error } = await supabase.auth.getUser();
    if (error) return;
    const user = data?.user;
    if (!user) return;

    const { data: planes, error: err2 } = await supabase
        .from("Planes")
        .select("Plan_alimenta")
        .eq("ID_user", user.id)
        .maybeSingle();

    if (err2) {
        await sweetalert.fire({
            title: "Error",
            text: (isEnglish() ? "Error fetching your plan: " : "Error al obtener tu plan: ") + err2.message,
            toast: true,
            position: "top-end",
            icon: "error",
            timer: 5000,
            showConfirmButton: false,
        });
        return;
    }

    const plan = planes?.Plan_alimenta ?? "Ninguno";
    localStorage.setItem("plan_dieta_usuario", isPlanAlimentacionVacio(plan) ? "Ninguno" : plan);
}

function verificacion_plan_alimentacion() {
    const planRaw = localStorage.getItem("plan_dieta_usuario");
    const boton = document.getElementById("boton_alimentacion");
    const botonEliminar = document.getElementById("boton_eliminar");
    const botonRegenerar = document.getElementById("boton_regenerar");
    const cont = document.getElementById("Plan_alimentacion");
    const desc = document.getElementById("descripcion_previa");

    const hasPlan = !isPlanAlimentacionVacio(planRaw);

    if (hasPlan) {
        if (desc) desc.style.display = "none";
        boton?.classList.remove("btn-primary");
        if (boton) {
            boton.removeAttribute("data-i18n-en");
            delete boton.dataset.i18nEs;
        }
        if (botonRegenerar) botonRegenerar.style.display = "inline-block";
        if (botonEliminar) botonEliminar.style.display = "inline-block";

        if (boton) {
            boton.innerHTML = '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXJlZnJlc2gtY2N3LWljb24gbHVjaWRlLXJlZnJlc2gtY2N3Ij48cGF0aCBkPSJNMjEgMTJhOSA5IDAgMCAwLTktOSA5Ljc1IDkuNzUgMCAwIDAtNi43NCAyLjc0TDMgOCIvPjxwYXRoIGQ9Ik0zIDN2NWg1Ii8+PHBhdGggZD0iTTMgMTJhOSA5IDAgMCAwIDkgOSA5Ljc1IDkuNzUgMCAwIDAgNi43NC0yLjc0TDIxIDE2Ii8+PHBhdGggZD0iTTE2IDE2aDV2NSIvPjwvc3ZnPg==">';
            boton.style.width = "50px";
            boton.style.height = "50px";
            boton.setAttribute("aria-label", "Refrescar plan de alimentación");
            boton.setAttribute("data-i18n-en-aria-label", "Refresh meal plan");
            try { globalThis.UIIdioma?.translatePage?.(boton); } catch { }
            boton.onclick = async () => {
                await recuperar_planes();
                sweetalert.fire({
                    title: tLang("Plan de alimentación actualizado", "Meal plan updated"),
                    text: tLang("Tu plan de alimentación ha sido refrescado correctamente.", "Your meal plan has been refreshed successfully."),
                    icon: 'success',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            };
        }
    } else {
        if (desc) desc.style.display = "block";
        if (botonEliminar) botonEliminar.style.display = "none";
        if (botonRegenerar) botonRegenerar.style.display = "none";

        if (boton) {
            boton?.classList.add("btn-primary");
            boton.textContent = "Generar plan";
            boton.setAttribute("data-i18n-en", "Generate plan");
            boton.setAttribute("aria-label", "Generar plan de alimentación");
            boton.setAttribute("data-i18n-en-aria-label", "Generate meal plan");
            try { globalThis.UIIdioma?.translatePage?.(boton); } catch { }
            boton.style.width = "auto";
            boton.style.height = "auto";
            boton.onclick = async () => {
                await openGenerarPlanAlimentModal();
            };
        }
    }

    if (cont) {
        if (hasPlan) {
            cont.innerHTML = mapear_plan_alimentacion(planRaw);
            try { globalThis.UIIdioma?.translatePage?.(cont); } catch { }
            cont.style.display = "block";
            initDetallePorDiaPlanAliment();
            initPlanDiaPagerAliment();
        } else {
            cont.innerHTML = "";
            cont.style.display = "none";
        }
    }
}

async function crearPlanAlimentacion(objetivo, intensidad) {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
        await sweetalert.fire({
            title: tLang("Sesión requerida", "Session required"),
            text: tLang("Tenés que iniciar sesión para generar tu plan.", "You must be logged in to generate your plan."),
            icon: "info",
        });
        return;
    }
    const user = data.user;

    const perfil = obtenerPerfilBasico();
    if (!perfil.Altura || !perfil.Peso_actual || !perfil.Peso_objetivo || !perfil.Edad) {
        await sweetalert.fire({
            title: tLang("Perfil incompleto", "Incomplete profile"),
            text: tLang(
                "Completá tu perfil (edad, altura, peso actual y objetivo) para generar el plan.",
                "Complete your profile (age, height, current weight, and goal) to generate the plan."
            ),
            icon: "warning",
        });
        return;
    }

    sweetalert.fire({
        title: tLang("Generando Plan", "Generating plan"),
        text: isEnglish()
            ? `Goal: ${objetivo} | Intensity: ${intensidad}. Please wait...`
            : `Objetivo: ${objetivo} | Intensidad: ${intensidad}. Por favor, esperá...`,
        icon: "info",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => sweetalert.showLoading(),
    });

    let planAlimentaObj;
    try {
        planAlimentaObj = await generatePlanAlimenta({
            idioma: isEnglish() ? "en" : "es",
            objetivo,
            intensidad,
            ...perfil,
        });
    } catch (err) {
        await sweetalert.fire({
            title: "Error",
            text:
                (isEnglish() ? "Could not generate the plan with AI: " : "No se pudo generar el plan con IA: ") +
                (err?.message || String(err)),
            icon: "error",
        });
        return;
    }

    const planAlimentaToStore = JSON.stringify(planAlimentaObj);

    let response;
    let bodyText = "";
    try {
        response = await fetch("/generar_plan_alimentacion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id_usuario: user.id,
                idioma: isEnglish() ? "en" : "es",
                plan_alimenta: planAlimentaToStore,
            }),
        });
        bodyText = await response.text();
    } catch (err) {
        await sweetalert.fire({
            title: "Error",
            text: (isEnglish() ? "Could not contact the server: " : "No se pudo contactar al servidor: ") + (err?.message || String(err)),
            icon: "error",
        });
        return;
    }

    if (!response.ok) {
        if (isNetlifyEdgeUncaughtInvocation(bodyText)) {
            await showNetlifyHostingErrorAlert({
                endpoint: "/generar_plan_alimentacion",
                status: response.status,
                statusText: response.statusText,
                bodyText,
            });
            return;
        }

        let msg = bodyText;
        try {
            const parsed = JSON.parse(bodyText);
            msg = parsed?.error || parsed?.message || msg;
        } catch {
            // ignore
        }

        await sweetalert.fire({
            title: "Error",
            text: (isEnglish() ? "Could not generate the plan: " : "No se pudo generar el plan: ") + String(msg).slice(0, 240),
            icon: "error",
        });
        return;
    }

    let dataJson;
    try {
        dataJson = JSON.parse(bodyText);
    } catch {
        dataJson = null;
    }

    const plan = dataJson?.plan_alimenta;
    if (!plan) {
        await sweetalert.fire({
            title: "Error",
            text: tLang("El servidor respondió sin plan.", "The server responded without a plan."),
            icon: "error",
        });
        return;
    }

    localStorage.setItem("plan_dieta_usuario", plan);
    await recuperar_planes();
    verificacion_plan_alimentacion();

    await sweetalert.fire({
        title: tLang("¡Plan Generado!", "Plan generated!"),
        text: tLang("Tu plan de alimentación se creó correctamente.", "Your meal plan was created successfully."),
        icon: "success",
        timer: 3500,
        showConfirmButton: false,
    });
}

async function actualizar_cambios_plan_alimentacion(planValue) {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) throw new Error(tLang("Sesión inválida", "Invalid session"));
    const user = data.user;

    const payload = JSON.stringify({ id_usuario: user.id, plan_alimenta: planValue });

    // Igual que en dashboard: no seteamos Content-Type para evitar preflight CORS en algunos contextos.
    const tryRequest = async (url) => {
        let res;
        try {
            res = await fetch(url, { method: "POST", body: payload });
        } catch (e) {
            throw new Error(
                isEnglish()
                    ? `Network error while updating the plan: ${e?.message || String(e)}`
                    : `Error de red al actualizar el plan: ${e?.message || String(e)}`
            );
        }
        const txt = await res.text();
        return { res, txt };
    };

    // 1) Ruta mapeada por netlify.toml
    let { res, txt } = await tryRequest("/actualizar_cambios_plan_alimentacion");

    // 2) Fallback: ruta directa a Edge Function (útil si el mapping no está disponible)
    if (!res.ok && (res.status === 404 || res.status === 405)) {
        ({ res, txt } = await tryRequest("/.netlify/edge-functions/actualizar_cambios_plan_aliment"));
    }

    if (!res.ok) {
        if (isNetlifyEdgeUncaughtInvocation(txt)) {
            await showNetlifyHostingErrorAlert({
                endpoint:
                    res.url?.includes("/.netlify/edge-functions/")
                        ? "/.netlify/edge-functions/actualizar_cambios_plan_aliment"
                        : "/actualizar_cambios_plan_alimentacion",
                status: res.status,
                statusText: res.statusText,
                bodyText: txt,
            });
            throw new Error(tLang("Error del servidor de hosting", "Hosting server error"));
        }

        let msg = txt;
        try {
            const j = JSON.parse(txt);
            msg = j?.message || j?.error || msg;
        } catch {
            // ignore
        }
        throw new Error(String(msg).slice(0, 240));
    }
}

const bindUiHandlers = () => {
    document.getElementById("boton_eliminar")?.addEventListener("click", async () => {
        const confirmResult = await sweetalert.fire({
            title: tLang("¿Estás seguro?", "Are you sure?"),
            text: tLang("Esta acción eliminará tu plan de alimentación actual.", "This action will delete your current meal plan."),
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: tLang("Sí, eliminar", "Yes, delete"),
            cancelButtonText: tLang("Cancelar", "Cancel"),
            customClass: {
                popup: "dashboard-swal",
                confirmButton: "dashboard-swal-confirm",
                cancelButton: "dashboard-swal-cancel",
            },
        });
        if (!confirmResult.isConfirmed) return;

        try {
            localStorage.setItem("plan_dieta_usuario", "Ninguno");
            await actualizar_cambios_plan_alimentacion("Ninguno");
            verificacion_plan_alimentacion();
            await sweetalert.fire({
                title: tLang("Plan eliminado", "Plan deleted"),
                text: tLang("Tu plan de alimentación ha sido eliminado.", "Your meal plan has been deleted."),
                icon: "success",
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 3000,
            });
        } catch (e) {
            await sweetalert.fire({
                title: "Error",
                text: (isEnglish() ? "Could not delete: " : "No se pudo eliminar: ") + (e?.message || String(e)),
                icon: "error",
            });
        }
    });

    document.getElementById("boton_regenerar")?.addEventListener("click", async () => {
        const result = await sweetalert.fire({
            title: tLang("Regenerar plan de alimentación", "Regenerate meal plan"),
            text: tLang(
                "Se eliminará el plan actual y se generará uno nuevo basado en tu configuración previa.",
                "The current plan will be deleted and a new one will be generated based on your previous settings."
            ),
            icon: "info",
            showCancelButton: true,
            confirmButtonText: tLang("Sí, regenerar", "Yes, regenerate"),
            cancelButtonText: tLang("Cancelar", "Cancel"),
            customClass: {
                popup: "dashboard-swal",
                confirmButton: "dashboard-swal-confirm",
                cancelButton: "dashboard-swal-cancel",
            },
        });
        if (!result.isConfirmed) return;

        try {
            localStorage.setItem("plan_dieta_usuario", "Ninguno");
            await actualizar_cambios_plan_alimentacion("Ninguno");
            verificacion_plan_alimentacion();
            await openGenerarPlanAlimentModal(null);
        } catch (e) {
            await sweetalert.fire({
                title: "Error",
                text: (isEnglish() ? "Could not regenerate: " : "No se pudo regenerar: ") + (e?.message || String(e)),
                icon: "error",
            });
        }
    });
};

// Boot
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFixedChromeObservers, { once: true });
} else {
    initFixedChromeObservers();
}

window.onload = async () => {
    if (username) {
        sweetalert.fire({
            title: isEnglish() ? `Welcome back, ${username}!` : `Bienvenido de nuevo, ${username}!`,
            icon: "success",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 3000,
        });
    }

    const userEl = document.getElementById("username");
    const avatarEl = document.getElementById("icono_usuario");
    if (userEl) userEl.textContent = username || "";
    if (avatarEl && avatar) avatarEl.src = avatar;

    bindUiHandlers();
    await recuperar_planes();
    verificacion_plan_alimentacion();

    // Al cargar: llevar el foco al contenedor del plan de alimentación.
    autofocusPlanAlimentacionOncePerSession();
};
