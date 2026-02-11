import Swal from "https://esm.sh/sweetalert2@11";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.94.1/+esm";
const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_publishable_oLC8LcDLa3jR72Hpd_jJsA_eXjMlP3-";
const supabase = createClient(supabaseUrl, supabaseKey, {auth: {persistSession: true,autoRefreshToken: false, storage: localStorage}});

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

const WHEEL_ITEM_HEIGHT = 44;

const buildWheel = ({ field, values, format }) => {
    const wheelEl = document.querySelector(`.wheel[data-field="${field}"]`);
    const inputEl = document.getElementById(field);
    if (!wheelEl || !inputEl) return;

    wheelEl.innerHTML = "";
    wheelEl.dataset.index = "0";
    wheelEl.dataset.length = String(values.length);

    const frag = document.createDocumentFragment();
    for (let i = 0; i < values.length; i++) {
        const item = document.createElement("div");
        item.className = "wheel-item";
        item.dataset.value = String(values[i]);
        item.textContent = format ? format(values[i]) : String(values[i]);
        frag.appendChild(item);
    }
    wheelEl.appendChild(frag);

    const setActive = (index) => {
        const clamped = Math.max(0, Math.min(values.length - 1, index));
        wheelEl.dataset.index = String(clamped);
        inputEl.value = String(values[clamped]);
        const items = wheelEl.querySelectorAll(".wheel-item");
        items.forEach((node, idx) => node.classList.toggle("is-active", idx === clamped));
    };

    let scrollTimer = null;
    const onScroll = () => {
        const idx = Math.round((wheelEl.scrollTop + 0.0001) / WHEEL_ITEM_HEIGHT);
        setActive(idx);
        if (scrollTimer) window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(() => {
            wheelEl.scrollTo({ top: Number(wheelEl.dataset.index) * WHEEL_ITEM_HEIGHT, behavior: "smooth" });
        }, 80);
    };

    wheelEl.addEventListener("scroll", onScroll, { passive: true });
    wheelEl.addEventListener("click", (e) => {
        const item = e.target.closest(".wheel-item");
        if (!item) return;
        const items = Array.from(wheelEl.querySelectorAll(".wheel-item"));
        const idx = items.indexOf(item);
        setActive(idx);
        wheelEl.scrollTo({ top: idx * WHEEL_ITEM_HEIGHT, behavior: "smooth" });
    });

    wheelEl.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        e.preventDefault();
        const delta = e.key === "ArrowDown" ? 1 : -1;
        const idx = Number(wheelEl.dataset.index || "0") + delta;
        setActive(idx);
        wheelEl.scrollTo({ top: Number(wheelEl.dataset.index) * WHEEL_ITEM_HEIGHT, behavior: "smooth" });
    });

    // Initialize
    setActive(0);
    wheelEl.scrollTop = 0;
};

const initWheels = () => {
    const weights = [];
    for (let kg = 40; kg <= 200; kg++) weights.push(kg);

    buildWheel({ field: "peso_act", values: weights, format: (kg) => `${kg} kg` });
    buildWheel({ field: "peso_desea", values: weights, format: (kg) => `${kg} kg` });

    const actWheel = document.querySelector('.wheel[data-field="peso_act"]');
    const desWheel = document.querySelector('.wheel[data-field="peso_desea"]');
    const idx70 = Math.max(0, Math.min(weights.length - 1, 70 - 40));
    const idx75 = Math.max(0, Math.min(weights.length - 1, 75 - 40));

    if (actWheel) {
        actWheel.scrollTo({ top: idx70 * WHEEL_ITEM_HEIGHT, behavior: "auto" });
        actWheel.dispatchEvent(new Event("scroll"));
    }
    if (desWheel) {
        desWheel.scrollTo({ top: idx75 * WHEEL_ITEM_HEIGHT, behavior: "auto" });
        desWheel.dispatchEvent(new Event("scroll"));
    }

    // Ensure hidden inputs are set even if scroll event doesn't fire
    document.getElementById("peso_act").value ||= "70";
    document.getElementById("peso_desea").value ||= "75";
};

const initHeaderText = () => {
    const t = document.getElementById("datos_previos");
    if (!t) return;
    const edad = sessionStorage.getItem("edad_temp");
    const alt = sessionStorage.getItem("alt_temp");
    if (edad && alt) t.textContent = `Tu edad: ${edad}, Tu altura: ${alt}`;
    else if (edad) t.textContent = `Tu edad: ${edad}`;
    else t.textContent = "Completá tus datos";
};

const init = () => {
    initHeaderText();
    initFixedChromeObservers();
    initWheels();
    updateFixedChromeHeights();

    const form = document.getElementById("Ingreso_Pesos");
    if (!form) return;

    form.addEventListener("submit", async function (event){
        event.preventDefault();
        const peso_act_temp = parseFloat(document.getElementById("peso_act").value);
        const peso_desea_temp = parseFloat(document.getElementById("peso_desea").value);

        if (!Number.isFinite(peso_act_temp) || peso_act_temp < 40 || peso_act_temp > 200) {
            showError("Peso actual inválido");
            return;
        }
        if (!Number.isFinite(peso_desea_temp) || peso_desea_temp < 40 || peso_desea_temp > 200) {
            showError("Peso objetivo inválido");
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        const id_usuario = user?.id;
        if (!id_usuario) {
            showError("No hay sesión iniciada");
            return;
        }

        if (await registrar_datos(id_usuario, sessionStorage.getItem("edad_temp"), sessionStorage.getItem("alt_temp"), peso_act_temp, peso_desea_temp)) {
            window.location.href = "/";
        }
    });
};


if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
    init();
}

async function registrar_datos(id,edad, altura, peso_act, peso_desea){
    const NETLIFY_EDGE_UNCAUGHT = "uncaught exception during edge function invocation";
    const isNetlifyEdgeUncaughtInvocation = (text) =>
        String(text ?? "")
            .toLowerCase()
            .includes(NETLIFY_EDGE_UNCAUGHT);

    const escapeHtml = (value) => String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

    const showNetlifyHostingErrorAlert = async ({ endpoint, status, statusText, bodyText }) => {
        const safeEndpoint = String(endpoint ?? "").trim() || "(desconocido)";
        const safeStatus = Number.isFinite(Number(status)) ? Number(status) : "-";
        const safeStatusText = String(statusText ?? "").trim() || "";
        const safeBody = String(bodyText ?? "").trim();

        await Swal.fire({
            icon: "error",
            title: "Error del servidor",
            html: `
                <div class="server-error">
                    <div class="server-error__hero">${escapeHtml(NETLIFY_EDGE_UNCAUGHT)}</div>
                    <div class="server-error__meta">
                        <div><strong>Endpoint:</strong> ${escapeHtml(safeEndpoint)}</div>
                        <div><strong>HTTP:</strong> ${escapeHtml(safeStatus)}${safeStatusText ? ` (${escapeHtml(safeStatusText)})` : ""}</div>
                    </div>
                    ${safeBody ? `<pre class="server-error__body">${escapeHtml(safeBody.slice(0, 1200))}</pre>` : ""}
                    <p class="server-error__note">
                        Este es un error del servidor de hosting (<strong>Netlify</strong>). Por favor, aguardá unos minutos e intentá nuevamente cuando se restaure el servicio.
                    </p>
                </div>
            `,
            allowOutsideClick: false,
            allowEscapeKey: true,
            confirmButtonText: "Entendido",
            customClass: {
                popup: "server-error-swal",
            },
        });
    };

    let response;
    try {
        response = await fetch('/registrar_usuario_nuevo', {
            method: 'POST',
            body: JSON.stringify({ id_usuario: id, edad, altura, peso_act, peso_desea })
        });
    } catch (e) {
        console.log("[EdgeFunction:/registrar_usuario_nuevo] Error de red:", e);
        await showError("No se pudo conectar con el servidor. Intentá nuevamente.");
        return false;
    }

    const bodyText = await response.text().catch(() => "");
    let result = {};
    try { result = JSON.parse(bodyText || "{}"); } catch { result = {}; }

    if (!response.ok) {
        console.log("[EdgeFunction:/registrar_usuario_nuevo] Error:", {
            status: response.status,
            statusText: response.statusText,
            body: bodyText,
        });
        if (isNetlifyEdgeUncaughtInvocation(bodyText)) {
            await showNetlifyHostingErrorAlert({
                endpoint: "/registrar_usuario_nuevo",
                status: response.status,
                statusText: response.statusText,
                bodyText,
            });
            return false;
        }
        showError("Error al registrar los datos: " + (result?.error ?? result?.message ?? response.statusText));
        return false;
    }
    return true;
}

async function showError(message) {
    await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
    });
}
globalThis.showError = showError;