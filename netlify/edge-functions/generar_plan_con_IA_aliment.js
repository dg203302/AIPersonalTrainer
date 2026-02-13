import { GoogleGenAI } from "https://esm.sh/@google/genai@1.38.0";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.94.1/+esm";

const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_secret_8pOt21ZHhoru6-VbtV6sEQ_TYL8DivC";
const supabase = createClient(supabaseUrl, supabaseKey);

let aiClientPromise;
const getAiClient = () => {
    if (!aiClientPromise) {
        aiClientPromise = (async () => {
            const { data, error } = await supabase
                .from("claves_sensibles")
                .select("gemini")
                .eq("id", 1)
                .single();

            if (error) throw new Error(`No se pudo obtener la apiKey de Gemini: ${error.message}`);
            const apiKey = data?.gemini;
            if (!apiKey || typeof apiKey !== "string") throw new Error("apiKey de Gemini inválida");
            return new GoogleGenAI({ apiKey });
        })();
    }
    return aiClientPromise;
};

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

const normalizeObjetivo = (value) => {
    const v = stripAccents(value).toLowerCase();
    if (v.includes("perd") || v.includes("grasa") || v.includes("defin")) return "perder grasa";
    if (v.includes("masa") || v.includes("mus") || v.includes("gan")) return "ganar masa muscular";
    if (v.includes("mant")) return "mantener peso";
    return "mantener peso";
};

const normalizeIntensidad = (value) => {
    const v = stripAccents(value).toLowerCase();
    if (v.includes("baj")) return "baja";
    if (v.includes("alt")) return "alta";
    if (v.includes("med")) return "media";
    return "media";
};

const mealsFromIntensidad = (intensidad) => {
    return ({ baja: 3, media: 4, alta: 5 })[intensidad] ?? 4;
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
    
    const {
        id_usuario,
        idioma,
        objetivo,
        intensidad,
        Altura,
        Peso_actual,
        Peso_objetivo,
        Edad,
    } = payload;
    if (!id_usuario) {
        return new Response(JSON.stringify({ error: "Missing id_usuario" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    const objetivoNorm = normalizeObjetivo(objetivo);
    const intensidadNorm = normalizeIntensidad(intensidad);
    const mealsPerDay = mealsFromIntensidad(intensidadNorm);

    const idiomaNorm = String(idioma ?? "").trim().toLowerCase() === "en" ? "en" : "es";
    const idiomaLabel = idiomaNorm === "en" ? "English" : "Español";
    const t = (es, en) => (idiomaNorm === "en" ? en : es);

    const ALL_DIAS_ES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const ALL_DIAS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const ALL_DIAS = idiomaNorm === "en" ? ALL_DIAS_EN : ALL_DIAS_ES;

    const objetivoPrompt = (() => {
        if (objetivoNorm === "perder grasa") return t("Perder grasa", "Lose fat");
        if (objetivoNorm === "ganar masa muscular") return t("Ganar masa muscular", "Gain muscle");
        return t("Mantener peso", "Maintain weight");
    })();

    const intensidadPrompt = (() => {
        if (intensidadNorm === "baja") return t("baja", "low");
        if (intensidadNorm === "alta") return t("alta", "high");
        return t("media", "medium");
    })();

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

        // Persistir en el JSON final la configuración usada (en el idioma de salida)
        root.usuario = (root.usuario && typeof root.usuario === "object") ? root.usuario : {};
        root.usuario.objetivo = objetivoPrompt;
        root.usuario.intensidad = intensidadPrompt;
        return parsed;
    };

    const schemaDays = ALL_DIAS.map((d) =>
        `        {"dia":"${d}","calorias_objetivo":2000,"comidas":[{"nombre":"<string>","descripcion":"<string>","calorias_aprox":500}],"macros_porcentaje":{"carbohidratos":40,"proteinas":30,"grasas":30},"recomendaciones_alimentos":["<string>"],"tips":["<string>"]}`
    ).join(",\n");

		const prompt = idiomaNorm === "en" ? `Return ONLY valid JSON (RFC 8259).
FORBIDDEN: extra text, markdown, code blocks, comments, trailing commas.

Generate a 7-day weekly meal plan in strict JSON.
Requirements:
- Language for ALL TEXT VALUES: English.
- Keep ALL JSON KEYS exactly as the schema (do not translate keys).
- Person data: edad=${Edad}, estatura_cm=${Altura}, peso_actual_kg=${Peso_actual}, peso_objetivo_kg=${Peso_objetivo}.
- Goal: "${objetivoPrompt}".
- Intensity: "${intensidadPrompt}". This defines meals per day: ${mealsPerDay}.
- For each weekday (use EXACTLY these names and in this order): ${ALL_DIAS.join(", ")}
    include:
    - calorias_objetivo (integer)
    - comidas: array of ${mealsPerDay} meals. Each meal: nombre, descripcion, calorias_aprox (optional integer).
    - macros_porcentaje: { carbohidratos: number, proteinas: number, grasas: number } (sum to 100).
    - recomendaciones_alimentos: array of strings
    - tips: array of strings

Return exactly this root structure:
{
    "plan_alimentacion": {
        "usuario": {
            "edad": number,
            "estatura_cm": number,
            "peso_actual_kg": number,
            "peso_objetivo_kg": number,
            "objetivo": string,
            "intensidad": string
        },
        "configuracion_semanal": [
${schemaDays}
        ],
        "nota_general": string
    }
}
Do not add any text outside the JSON.`
:
`Devuelve UNICAMENTE un JSON válido (RFC 8259).
PROHIBIDO: texto extra, markdown, bloques de código, comentarios, comas finales.

Generá un plan de alimentación semanal (7 días) en formato JSON estricto.
Requisitos:
- Idioma de los VALORES de texto: ${idiomaLabel}.
- Mantén las CLAVES JSON exactamente como el esquema (no traduzcas claves).
- Debe estar pensado para una persona con estos datos: edad=${Edad}, estatura_cm=${Altura}, peso_actual_kg=${Peso_actual}, peso_objetivo_kg=${Peso_objetivo}.
- Objetivo del plan: "${objetivoPrompt}".
- Intensidad del plan: "${intensidadPrompt}". Esto define la cantidad de comidas por día: ${mealsPerDay}.
- Para cada día de la semana (usa EXACTAMENTE estos nombres y en este orden): ${ALL_DIAS.join(", ")}
    (en el idioma seleccionado), incluir:
    - calorias_objetivo (número entero)
    - comidas: array de ${mealsPerDay} comidas. Cada comida con: nombre, descripcion, calorias_aprox (número entero opcional).
    - macros_porcentaje: { carbohidratos: number, proteinas: number, grasas: number } (porcentajes que sumen 100).
    - recomendaciones_alimentos: array de strings (recomendaciones acordes a la cantidad de comidas del día).
    - tips: array de strings (tips prácticos del día).

Devolver exactamente con esta estructura raíz:
{
    "plan_alimentacion": {
        "usuario": {
            "edad": number,
            "estatura_cm": number,
            "peso_actual_kg": number,
            "peso_objetivo_kg": number,
            "objetivo": string,
            "intensidad": string
        },
        "configuracion_semanal": [
${schemaDays}
        ],
        "nota_general": string
    }
}
No agregues texto fuera del JSON.`;
	try {
		const ai = await getAiClient();
		const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        });

        const text = response?.text ?? response?.choices?.[0]?.content?.parts?.[0]?.text ?? response?.choices?.[0]?.content?.parts?.[0] ?? "";
        const extracted = extractLikelyJson(text);
        let parsed = safeJsonParse(extracted);
        parsed = normalizePlanDays(parsed);
        const validationError = validatePlanShape(parsed);
        if (validationError) {
            return new Response(JSON.stringify({ error: `Respuesta IA inválida: ${validationError}`, raw: String(text ?? "").slice(0, 4000) }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 502,
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