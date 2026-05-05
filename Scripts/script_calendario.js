import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.94.1/+esm";
const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_publishable_oLC8LcDLa3jR72Hpd_jJsA_eXjMlP3-";
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: true, autoRefreshToken: false, storage: localStorage } });

const username = localStorage.getItem("username_usuario");
const avatar = localStorage.getItem("avatar_usuario");

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

const escapeHtml = (value) => {
    const text = String(value ?? "");
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
};

const canUseBottomSheet = () => !!globalThis.PTBottomSheet && typeof globalThis.PTBottomSheet.open === "function";

const openConfirmSheet = async ({
    title,
    message,
    okText,
    cancelText,
}) => {
    const safeTitle = title || tLang("Confirmar", "Confirm");
    const safeMessage = message || "";
    const safeOkText = okText || tLang("Confirmar", "Confirm");
    const safeCancelText = cancelText || tLang("Cancelar", "Cancel");

    if (!canUseBottomSheet()) {
        return confirm(`${safeTitle}\n\n${safeMessage}`);
    }

    return new Promise((resolve) => {
        let settled = false;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            resolve(Boolean(value));
        };

        void globalThis.PTBottomSheet.open({
            title: safeTitle,
            subtitle: "",
            ariaLabel: safeTitle,
            showClose: false,
            showHandle: true,
            allowOutsideClose: true,
            allowEscapeClose: true,
            allowDragClose: true,
            html: `
                <div class="pt-status">
                    <div class="pt-status-row" style="align-items:flex-start;">
                        <div class="pt-status-text">${escapeHtml(safeMessage)}</div>
                    </div>
                    <div class="pt-status-actions" style="margin-top:14px; display:flex; gap:8px; justify-content:flex-end;">
                        <button type="button" class="btn-secondary" data-pt-cancel>${escapeHtml(safeCancelText)}</button>
                        <button type="button" class="btn-primary" data-pt-confirm>${escapeHtml(safeOkText)}</button>
                    </div>
                </div>
            `,
            didOpen: (sheet) => {
                try { globalThis.UIIdioma?.translatePage?.(sheet); } catch { }
                const btnCancel = sheet.querySelector("[data-pt-cancel]");
                const btnConfirm = sheet.querySelector("[data-pt-confirm]");

                btnCancel?.addEventListener("click", () => {
                    finish(false);
                    try { globalThis.PTBottomSheet?.close?.(); } catch { }
                });

                btnConfirm?.addEventListener("click", () => {
                    finish(true);
                    try { globalThis.PTBottomSheet?.close?.(); } catch { }
                });
            },
            willClose: () => {
                if (!settled) finish(false);
            },
        });
    });
};

const normalizarDiasEntrenados = (value) => {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    if (typeof value === "string") {
        const text = value.trim();
        if (!text) return [];
        try {
            const parsed = JSON.parse(text);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    if (typeof value === "object") {
        const maybeArray = value.Dias_cale ?? value.Dias_entrenados;
        return Array.isArray(maybeArray) ? maybeArray : [];
    }
    return [];
};

const leerRegistrosLocales = () => {
    try {
        return normalizarDiasEntrenados(localStorage.getItem("Dias_cale"));
    } catch {
        return [];
    }
};

const obtenerRegistrosEntreno = async () => {
    const fromLocal = leerRegistrosLocales();
    try {
        const { data, error } = await supabase
            .from("Planes")
            .select("Dias_entrenados")
            .eq("ID_user", localStorage.getItem("id_usuario"))
            .limit(1)
            .single();

        if (error) throw new Error(error.message);

        const fromDb = normalizarDiasEntrenados(data?.Dias_entrenados);
        return fromDb.length ? fromDb : fromLocal;
    } catch (err) {
        console.error("Error al recuperar el registro de entreno:", err);
        return fromLocal;
    }
};

const guardarRegistrosEntreno = async (registros) => {
    const res = await fetch("/guardar_registro_entreno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id_usuario: localStorage.getItem("id_usuario"),
            registro_entreno: registros,
        }),
    });
    return res;
};

const getRegistroId = (registro, index) => {
    const start = String(registro?.start ?? registro?.fecha ?? "sin-fecha").trim();
    return String(registro?.id_registro ?? registro?.id ?? `${start}-${index}`);
};

const formatearFechaLarga = (fechaIso) => {
    const date = new Date(`${fechaIso}T00:00:00`);
    if (Number.isNaN(date.getTime())) return fechaIso;
    return new Intl.DateTimeFormat(getIdiomaPreferido(), {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(date);
};

const getGreetingByHour = (hour) => {
    const h = Number.isFinite(Number(hour)) ? Number(hour) : new Date().getHours();
    const isMorning = h >= 5 && h < 12;
    const isAfternoon = h >= 12 && h < 20;

    if (isEnglish()) {
        if (isMorning) return "Good morning";
        if (isAfternoon) return "Good afternoon";
        return "Good evening";
    }

    if (isMorning) return "Buenos días";
    if (isAfternoon) return "Buenas tardes";
    return "Buenas noches";
};

const getNextGreetingChangeDelayMs = () => {
    const now = new Date();
    const h = now.getHours();
    const next = new Date(now);
    const setTo = (hour) => {
        next.setHours(hour, 0, 5, 0);
    };

    if (h < 5) setTo(5);
    else if (h < 12) setTo(12);
    else if (h < 20) setTo(20);
    else {
        next.setDate(next.getDate() + 1);
        setTo(5);
    }
    return Math.max(5_000, next.getTime() - now.getTime());
};

const initDynamicGreeting = () => {
    const welcomeEl = document.getElementById("welcome_msg");
    if (!welcomeEl) return;

    const sync = () => {
        welcomeEl.textContent = getGreetingByHour(new Date().getHours());
    };

    sync();
    window.setTimeout(function tick() {
        sync();
        window.setTimeout(tick, getNextGreetingChangeDelayMs());
    }, getNextGreetingChangeDelayMs());
};

const buildRegistroMeta = (registro, index) => {
    const start = String(registro?.start ?? registro?.fecha ?? "").trim();
    const title = String(registro?.title ?? registro?.titulo_entreno ?? registro?.dia ?? registro?.descripcion ?? `Entreno ${index + 1}`).trim();
    const extendedProps = registro?.extendedProps && typeof registro.extendedProps === "object" ? registro.extendedProps : {};
    return {
        id: getRegistroId(registro, index),
        title,
        start,
        allDay: true,
        extendedProps: {
            status: extendedProps.status ?? registro?.status ?? "completado",
            calories_burnt: extendedProps.calories_burnt ?? registro?.calorias_quemadas ?? registro?.caloriasQuemadas ?? null,
            tiempo_total_min: extendedProps.tiempo_total_min ?? registro?.tiempo_total_min ?? registro?.tiempoTotalMin ?? null,
            hora_confirmacion: extendedProps.hora_confirmacion ?? registro?.hora_confirmacion ?? null,
            confirmado_en: extendedProps.confirmado_en ?? registro?.confirmado_en ?? null,
            descripcion: extendedProps.descripcion ?? registro?.descripcion ?? "",
        },
    };
};

const renderDetalleEntreno = async (fechaIso, registrosDelDia, onDeleteRegistro, getRegistrosByFecha) => {
    const fechaLarga = formatearFechaLarga(fechaIso);
    const itemsHtml = registrosDelDia.length
        ? registrosDelDia.map((registro, index) => {
            const props = registro.extendedProps || {};
            const titulo = escapeHtml(registro.title || `Entreno ${index + 1}`);
            const calorias = props.calories_burnt ?? "-";
            const tiempo = props.tiempo_total_min ?? "-";
            const hora = props.hora_confirmacion ?? "-";
            const status = props.status ?? "completado";
            const descripcion = props.descripcion
                ? `<div class="pt-cal-registro-desc">${escapeHtml(props.descripcion)}</div>`
                : "";
            return `
                <div class="pt-status-row pt-cal-registro-row">
                    <div class="pt-status-text pt-cal-registro-card">
                        <div class="pt-cal-registro-title">${titulo}</div>
                        <div class="pt-cal-registro-meta">
                            <div><span class="pt-cal-k">${escapeHtml(tLang("Estado", "Status"))}</span><span class="pt-cal-v">${escapeHtml(status)}</span></div>
                            <div><span class="pt-cal-k">${escapeHtml(tLang("Calorías", "Calories"))}</span><span class="pt-cal-v">${escapeHtml(calorias)}</span></div>
                            <div><span class="pt-cal-k">${escapeHtml(tLang("Tiempo", "Time"))}</span><span class="pt-cal-v">${escapeHtml(tiempo)} min</span></div>
                            <div><span class="pt-cal-k">${escapeHtml(tLang("Hora", "Time"))}</span><span class="pt-cal-v">${escapeHtml(hora)}</span></div>
                        </div>
                        ${descripcion}
                        <div class="pt-cal-registro-actions">
                            <button
                                type="button"
                                data-limpiar-registro
                                data-reg-id="${escapeHtml(registro.id)}"
                                class="pt-cal-clear-btn"
                            >
                                ${escapeHtml(tLang("Limpiar registro", "Clear record"))}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join("")
        : `<div class="pt-status-row"><div class="pt-status-text">${escapeHtml(tLang("No hay entrenos registrados para este día.", "No workouts recorded for this day."))}</div></div>`;

    const html = `
        <div class="pt-status pt-cal-detalle-sheet">
            <div class="pt-status-row pt-cal-header-row">
                <div class="pt-status-text pt-cal-header-text">
                    <strong class="pt-cal-header-title">${escapeHtml(fechaLarga)}</strong>
                    <div class="pt-cal-header-sub">${escapeHtml(fechaIso)}</div>
                </div>
            </div>
            ${itemsHtml}
        </div>
    `;

    if (!canUseBottomSheet()) {
        alert(`${fechaLarga}\n\n${registrosDelDia.map((r) => `${r.title || "Entreno"} - ${r.extendedProps?.calories_burnt ?? "-"} kcal`).join("\n")}`);
        return;
    }

    await globalThis.PTBottomSheet.open({
        title: tLang("Detalle del día", "Day detail"),
        subtitle: fechaLarga,
        ariaLabel: tLang("Detalle del día", "Day detail"),
        html,
        showClose: false,
        showHandle: true,
        allowOutsideClose: true,
        allowEscapeClose: true,
        allowDragClose: true,
        didOpen: (sheet) => {
            try { globalThis.UIIdioma?.translatePage?.(sheet); } catch { }

            const botonesLimpiar = Array.from(sheet.querySelectorAll("[data-limpiar-registro]"));
            botonesLimpiar.forEach((btn) => {
                btn.addEventListener("click", async () => {
                    const regId = String(btn.getAttribute("data-reg-id") ?? "").trim();
                    if (!regId) return;

                    const ok = await openConfirmSheet({
                        title: tLang("Confirmar eliminación", "Confirm deletion"),
                        message: tLang("¿Eliminar este registro de entreno?", "Delete this workout record?"),
                        okText: tLang("Eliminar", "Delete"),
                        cancelText: tLang("Cancelar", "Cancel"),
                    });
                    if (!ok) return;

                    const deleted = await onDeleteRegistro(regId);
                    if (!deleted) return;

                    try { globalThis.PTBottomSheet?.close?.(); } catch { }

                    const nuevosRegistrosDia = getRegistrosByFecha(fechaIso);
                    await renderDetalleEntreno(fechaIso, nuevosRegistrosDia, onDeleteRegistro, getRegistrosByFecha);
                });
            });
        },
    });
};

async function initCalendario() {
    const calendarEl = document.getElementById("calendario");
    if (!calendarEl) return;

    let registros = await obtenerRegistrosEntreno();
    let eventos = [];
    let recordsByDate = new Map();

    const rebuildCalendarData = () => {
        eventos = registros
            .map(buildRegistroMeta)
            .filter((event) => !!event.start);

        recordsByDate = eventos.reduce((acc, event) => {
            if (!acc.has(event.start)) acc.set(event.start, []);
            acc.get(event.start).push(event);
            return acc;
        }, new Map());
    };

    const getRegistrosByFecha = (fechaIso) => recordsByDate.get(fechaIso) || [];

    const onDeleteRegistro = async (registroId) => {
        const prev = Array.isArray(registros) ? registros.slice() : [];
        const next = prev.filter((registro, index) => getRegistroId(registro, index) !== registroId);
        if (next.length === prev.length) return false;

        registros = next;
        localStorage.setItem("Dias_cale", JSON.stringify(registros));

        try {
            const res = await guardarRegistrosEntreno(registros);
            if (!res.ok) {
                const txt = await res.text().catch(() => null);
                console.warn("No se pudo actualizar /guardar_registro_entreno:", res.status, txt);
                throw new Error("No se pudo guardar");
            }
        } catch (err) {
            registros = prev;
            localStorage.setItem("Dias_cale", JSON.stringify(registros));
            rebuildCalendarData();
            calendar.removeAllEvents();
            calendar.addEventSource(eventos);
            alert(tLang("No se pudo eliminar el registro. Intenta de nuevo.", "Could not delete the record. Please try again."));
            return false;
        }

        rebuildCalendarData();
        calendar.removeAllEvents();
        calendar.addEventSource(eventos);
        return true;
    };

    rebuildCalendarData();

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        locale: getIdiomaPreferido(),
        firstDay: 1,
        dayMaxEvents: true,
        height: "auto",
        events: eventos,
        eventDisplay: "block",
        eventContent: (arg) => {
            const status = arg.event.extendedProps?.status;
            const calories = arg.event.extendedProps?.calories_burnt;
            const label = calories != null ? `${calories} kcal` : arg.event.title;
            return {
                html: `
                    <div style="display:flex;align-items:center;gap:6px;padding:2px 4px;border-radius:10px;background:rgba(188,228,255,.16);border:1px solid rgba(188,228,255,.24);color:#fff;font-size:11px;line-height:1.2;">
                        <span style="width:7px;height:7px;border-radius:999px;background:${status === "completado" ? "#8bd18b" : "#bce4ff"};flex:0 0 auto;"></span>
                        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(label)}</span>
                    </div>
                `,
            };
        },
        dateClick: async (info) => {
            const fechaIso = info.dateStr;
            const registrosDelDia = getRegistrosByFecha(fechaIso);
            await renderDetalleEntreno(fechaIso, registrosDelDia, onDeleteRegistro, getRegistrosByFecha);
        },
        eventClick: async (info) => {
            info.jsEvent?.preventDefault?.();
            const fechaIso = info.event.startStr || info.event.start?.toISOString?.().slice(0, 10);
            if (!fechaIso) return;
            const registrosDelDia = getRegistrosByFecha(fechaIso) || [buildRegistroMeta({
                id_registro: info.event.id,
                title: info.event.title,
                start: fechaIso,
                extendedProps: info.event.extendedProps,
            }, 0)];
            await renderDetalleEntreno(fechaIso, registrosDelDia, onDeleteRegistro, getRegistrosByFecha);
        },
    });

    calendar.render();
}

window.onload = async () => {
    initDynamicGreeting();
    const userEl = document.getElementById("username");
    const avatarEl = document.getElementById("icono_usuario");
    if (userEl) userEl.textContent = username || "";
    if (avatarEl && avatar) avatarEl.src = avatar;
    
    const userSidebarEl = document.getElementById("username_sidebar");
    const avatarSidebarEl = document.getElementById("icono_usuario_sidebar");
    if (userSidebarEl) userSidebarEl.textContent = username || "";
    if (avatarSidebarEl && avatar) avatarSidebarEl.src = avatar;
    initCalendario();
    //initDetallePorDiaCalendario();
};