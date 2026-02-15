import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.94.1/+esm";

const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_secret_8pOt21ZHhoru6-VbtV6sEQ_TYL8DivC";
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
};

const stripAccents = (s) => String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

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

const safeJsonParse = (value) => {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const validatePlanShape = (obj) => {
    if (!obj || typeof obj !== "object") return "Root debe ser un objeto";
    const root = obj.plan_alimentacion;
    if (!root || typeof root !== "object") return "Falta plan_alimentacion";

    const usuario = root.usuario;
    if (!usuario || typeof usuario !== "object") return "Falta usuario";
    const requiredUsuario = ["edad", "estatura_cm", "peso_actual_kg", "peso_objetivo_kg", "objetivo", "intensidad"];
    for (const k of requiredUsuario) {
        if (!(k in usuario)) return `Falta usuario.${k}`;
    }

    const semanal = root.configuracion_semanal;
    if (!Array.isArray(semanal)) return "Falta configuracion_semanal (array)";
    if (semanal.length !== 7) return "configuracion_semanal debe tener 7 días";

    for (const dia of semanal) {
        if (!dia || typeof dia !== "object") return "Cada día debe ser un objeto";
        if (typeof dia.dia !== "string" || !dia.dia.trim()) return "Cada día debe tener dia (string)";
        if (typeof dia.calorias_objetivo !== "number" || Number.isNaN(dia.calorias_objetivo)) return "Cada día debe tener calorias_objetivo (number)";
        if (!Array.isArray(dia.comidas) || dia.comidas.length < 1) return "Cada día debe tener comidas (array)";
        for (const c of dia.comidas) {
            if (!c || typeof c !== "object") return "Cada comida debe ser un objeto";
            if (typeof c.nombre !== "string" || !c.nombre.trim()) return "Cada comida debe tener nombre (string)";
            if (typeof c.descripcion !== "string" || !c.descripcion.trim()) return "Cada comida debe tener descripcion (string)";
        }
        const macros = dia.macros_porcentaje;
        if (!macros || typeof macros !== "object") return "Cada día debe tener macros_porcentaje (object)";
        const keys = ["carbohidratos", "proteinas", "grasas"];
        for (const k of keys) {
            if (typeof macros[k] !== "number" || Number.isNaN(macros[k])) return `macros_porcentaje.${k} debe ser number`;
        }
        if (!Array.isArray(dia.recomendaciones_alimentos)) return "Cada día debe tener recomendaciones_alimentos (array)";
        if (!Array.isArray(dia.tips)) return "Cada día debe tener tips (array)";
    }

    return null;
};

export default async function handler(request, _context){
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    let payload;
    try {
        payload = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    
    const { id_usuario, plan_alimenta, idioma } = payload;
    if (!id_usuario) {
        return new Response(JSON.stringify({ error: "Missing id_usuario" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    if (plan_alimenta == null) {
        return new Response(
            JSON.stringify({ error: "Missing plan_alimenta (expected a JSON string or object)" }),
            {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }

    const idiomaNorm = String(idioma ?? "").trim().toLowerCase() === "en" ? "en" : "es";
    const ALL_DIAS_ES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const ALL_DIAS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const ALL_DIAS = idiomaNorm === "en" ? ALL_DIAS_EN : ALL_DIAS_ES;

    const DAY_INDEX_BY_NAME = {
        // Spanish (stripAccents)
        lunes: 0,
        martes: 1,
        miercoles: 2,
        jueves: 3,
        viernes: 4,
        sabado: 5,
        domingo: 6,
        // English
        monday: 0,
        tuesday: 1,
        wednesday: 2,
        thursday: 3,
        friday: 4,
        saturday: 5,
        sunday: 6,
        // Common abbreviations
        mon: 0,
        tue: 1,
        tues: 1,
        wed: 2,
        thu: 3,
        thur: 3,
        thurs: 3,
        fri: 4,
        sat: 5,
        sun: 6,
    };

    const getDayIndexFromName = (value) => {
        const key = stripAccents(value)
            .toLowerCase()
            .replace(/[^a-z\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        if (!key) return null;
        return Object.prototype.hasOwnProperty.call(DAY_INDEX_BY_NAME, key) ? DAY_INDEX_BY_NAME[key] : null;
    };

    const normalizePlanDays = (parsed) => {
        if (!parsed || typeof parsed !== "object") return parsed;
        const root = parsed.plan_alimentacion;
        if (!root || typeof root !== "object") return parsed;
        const semanal = Array.isArray(root.configuracion_semanal) ? root.configuracion_semanal : null;
        if (!semanal) return parsed;

        if (semanal.length !== 7) return parsed;

        const byIdx = new Map();
        for (const d of semanal) {
            if (!d || typeof d !== "object") continue;
            const idx = getDayIndexFromName(d.dia);
            if (idx == null) continue;
            byIdx.set(idx, d);
        }

        if (byIdx.size === 7) {
            // Reordenar + renombrar por nombre de día.
            root.configuracion_semanal = ALL_DIAS.map((label, idx) => {
                const d = byIdx.get(idx);
                return { ...d, dia: label };
            });
        } else {
            // Fallback: mantener el orden, pero forzar etiquetas de día en el idioma correcto.
            root.configuracion_semanal = semanal.map((d, idx) => ({ ...d, dia: ALL_DIAS[idx] }));
        }

        return parsed;
    };
    try {
        let parsed;
        if (typeof plan_alimenta === "object" && plan_alimenta) {
            parsed = plan_alimenta;
        } else {
            const extracted = extractLikelyJson(plan_alimenta);
            parsed = safeJsonParse(extracted) ?? safeJsonParse(String(plan_alimenta ?? "").trim());
        }

        parsed = normalizePlanDays(parsed);
        const validationError = validatePlanShape(parsed);
        if (validationError) {
            return new Response(JSON.stringify({ error: `Plan inválido: ${validationError}` }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        const plan_alimenta_to_store = JSON.stringify(parsed);

        const { data: existing, error: selErr } = await supabase
            .from("Planes")
            .select("ID_user")
            .eq("ID_user", id_usuario)
            .maybeSingle();
        if (selErr) throw new Error(selErr.message);

        let writeErr;
        if (existing?.ID_user) {
            const { error } = await supabase
                .from("Planes")
                .update({ Plan_alimenta: plan_alimenta_to_store })
                .eq("ID_user", id_usuario);
            writeErr = error;
        } else {
            const { error } = await supabase
                .from("Planes")
                .insert({ ID_user: id_usuario, Plan_entreno: "Ninguno", Plan_alimenta: plan_alimenta_to_store });
            writeErr = error;
        }

        if (writeErr) throw new Error(writeErr.message);

        return new Response(JSON.stringify({ plan_alimenta: plan_alimenta_to_store }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        console.log(error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
}