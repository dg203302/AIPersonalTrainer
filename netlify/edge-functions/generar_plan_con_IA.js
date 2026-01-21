import { GoogleGenAI } from "https://esm.sh/@google/genai@1.38.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ai = new GoogleGenAI({apiKey: "AIzaSyBTr2T_HeTiDnKjABK4eWEnpB11ND_F2nA"});
const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_secret_8pOt21ZHhoru6-VbtV6sEQ_TYL8DivC";
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
};

const extractLikelyJson = (text) => {
    const s = String(text ?? "").trim();
    // Remove ```json fences if present
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

const validatePlanShape = (obj) => {
    if (!obj || typeof obj !== "object") return "Root debe ser un objeto";
    const root = obj.plan_entrenamiento_hipertrofia;
    if (!root || typeof root !== "object") return "Falta plan_entrenamiento_hipertrofia";

    const usuario = root.usuario;
    if (!usuario || typeof usuario !== "object") return "Falta usuario";
    const requiredUsuario = ["edad", "estatura_cm", "peso_objetivo_kg", "entorno", "objetivo"];
    for (const k of requiredUsuario) {
        if (!(k in usuario)) return `Falta usuario.${k}`;
    }

    const semanal = root.configuracion_semanal;
    if (!Array.isArray(semanal)) return "Falta configuracion_semanal (array)";
    if (semanal.length !== 7) return "configuracion_semanal debe tener 7 días";

    for (const dia of semanal) {
        if (!dia || typeof dia !== "object") return "Cada día debe ser un objeto";
        if (typeof dia.dia !== "string" || !dia.dia.trim()) return "Cada día debe tener dia (string)";
        if (typeof dia.enfoque !== "string") return "Cada día debe tener enfoque (string)";
        if (!Array.isArray(dia.ejercicios)) return "Cada día debe tener ejercicios (array)";
        for (const ex of dia.ejercicios) {
            if (!ex || typeof ex !== "object") return "Cada ejercicio debe ser un objeto";
            if (typeof ex.nombre !== "string" || !ex.nombre.trim()) return "Cada ejercicio debe tener nombre (string)";
            if (typeof ex.descripcion !== "string" || !ex.descripcion.trim()) return "Cada ejercicio debe tener descripcion (string)";
            if (typeof ex.series !== "number" || Number.isNaN(ex.series)) return "Cada ejercicio debe tener series (number)";
            if (typeof ex.repeticiones !== "string" || !ex.repeticiones.trim()) return "Cada ejercicio debe tener repeticiones (string)";
            if (typeof ex.descanso_segundos !== "number" || Number.isNaN(ex.descanso_segundos)) {
                return "Cada ejercicio debe tener descanso_segundos (number)";
            }
        }
    }

    const prog = root.progresion_sugerida;
    if (!prog || typeof prog !== "object") return "Falta progresion_sugerida";
    if (typeof prog.metodo !== "string") return "progresion_sugerida.metodo debe ser string";
    if (typeof prog.descripcion !== "string") return "progresion_sugerida.descripcion debe ser string";

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
    
	const { id_usuario, lugar, objetivo, dias, dias_semana, Altura, Peso_actual, Peso_objetivo, Edad} = payload;
    if (!id_usuario) {
        return new Response(JSON.stringify({ error: "Missing id_usuario" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const stripAccents = (s) => String(s ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    const ALL_DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const DIA_BY_CODE = {
        L: "Lunes",
        M: "Martes",
        X: "Miércoles",
        J: "Jueves",
        V: "Viernes",
        S: "Sábado",
        D: "Domingo",
    };

    const DIA_BY_NAME = {
        lunes: "Lunes",
        martes: "Martes",
        miercoles: "Miércoles",
        jueves: "Jueves",
        viernes: "Viernes",
        sabado: "Sábado",
        domingo: "Domingo",
    };

    const normalizeSelectedDays = () => {
        const selected = new Set();

        if (Array.isArray(dias)) {
            for (const item of dias) {
                const code = String(item ?? "").toUpperCase();
                const label = DIA_BY_CODE[code];
                if (label) selected.add(label);
            }
        }

        if (Array.isArray(dias_semana)) {
            for (const item of dias_semana) {
                const key = stripAccents(item).toLowerCase();
                const label = DIA_BY_NAME[key];
                if (label) selected.add(label);
            }
        }

        // fallback: si no vino nada, asumir toda la semana
        if (selected.size === 0) {
            for (const d of ALL_DIAS) selected.add(d);
        }

        return Array.from(selected);
    };

    const diasSeleccionados = normalizeSelectedDays();
    const diasSeleccionadosJson = JSON.stringify(diasSeleccionados);

    const canonicalDayKey = (dayLabel) => stripAccents(dayLabel).toLowerCase();

    const normalizePlanWithSelectedDays = (planObj) => {
        if (!planObj || typeof planObj !== "object") return planObj;
        const root = planObj.plan_entrenamiento_hipertrofia;
        if (!root || typeof root !== "object") return planObj;

        const semanalRaw = root.configuracion_semanal;
        const semanalArr = Array.isArray(semanalRaw) ? semanalRaw : [];

        const byDay = new Map();
        for (const item of semanalArr) {
            if (!item || typeof item !== "object") continue;
            const key = canonicalDayKey(item.dia);
            if (key) byDay.set(key, item);
        }

        const selectedKeys = new Set(diasSeleccionados.map(canonicalDayKey));

        const normalizeExercise = (ex) => {
            if (!ex || typeof ex !== "object") return null;
            const nombre = typeof ex.nombre === "string" ? ex.nombre : String(ex.nombre ?? "").trim();
            if (!nombre) return null;

            const descripcionRaw = (typeof ex.descripcion === "string" && ex.descripcion.trim())
                ? ex.descripcion.trim()
                : (typeof ex.description === "string" && ex.description.trim())
                    ? ex.description.trim()
                    : "Realizá el movimiento controlado, con técnica correcta y rango completo.";

            const seriesNum = Number(ex.series);
            const descansoNum = Number(ex.descanso_segundos);
            const repeticiones = (typeof ex.repeticiones === "string" && ex.repeticiones.trim())
                ? ex.repeticiones.trim()
                : String(ex.repeticiones ?? ex.reps ?? "10-12").trim() || "10-12";

            return {
                nombre,
                descripcion: descripcionRaw,
                series: Number.isFinite(seriesNum) ? seriesNum : 4,
                repeticiones,
                descanso_segundos: Number.isFinite(descansoNum) ? descansoNum : 90,
            };
        };

        const semanalFixed = ALL_DIAS.map((diaCanonical) => {
            const key = canonicalDayKey(diaCanonical);
            const isSelected = selectedKeys.has(key);
            const original = byDay.get(key);

            const base = (original && typeof original === "object") ? original : { dia: diaCanonical };

            // Canonicalizar nombre del día
            base.dia = diaCanonical;

            if (!isSelected) {
                return {
                    dia: diaCanonical,
                    enfoque: "Descanso",
                    ejercicios: [],
                };
            }

            const enfoque = (typeof base.enfoque === "string" && base.enfoque.trim()) ? base.enfoque.trim() : "Entrenamiento";
            const ejerciciosRaw = Array.isArray(base.ejercicios) ? base.ejercicios : [];
            const ejerciciosNorm = ejerciciosRaw.map(normalizeExercise).filter(Boolean);

            return {
                dia: diaCanonical,
                enfoque,
                ejercicios: ejerciciosNorm,
            };
        });

        root.configuracion_semanal = semanalFixed;
        planObj.plan_entrenamiento_hipertrofia = root;
        return planObj;
    };

    const prompt = `Devuelve UNICAMENTE un JSON valido (RFC 8259).
PROHIBIDO: texto extra, markdown, bloques \
\
\
json, comentarios, comas finales.

Usa SIEMPRE este formato EXACTO (mismas claves y tipos):
{
    "plan_entrenamiento_hipertrofia": {
        "usuario": {
            "edad": ${Number(Edad) || 0},
            "estatura_cm": ${Number(Altura) || 0},
            "peso_objetivo_kg": ${Number(Peso_objetivo) || 0},
            "entorno": "${String(lugar ?? "").toLowerCase() === "gimnasio" ? "Gimnasio" : "Casa"}",
            "objetivo": "${String(objetivo ?? "").toLowerCase() === "grasa" ? "grasa" : "musculo"}"
        },
        "configuracion_semanal": [
            {"dia":"Lunes","enfoque":"<string>","ejercicios":[{"nombre":"<string>","descripcion":"<string>","series":4,"repeticiones":"10-12","descanso_segundos":90}]},
            {"dia":"Martes","enfoque":"<string>","ejercicios":[{"nombre":"<string>","descripcion":"<string>","series":4,"repeticiones":"10-12","descanso_segundos":90}]},
            {"dia":"Miércoles","enfoque":"<string>","ejercicios":[{"nombre":"<string>","descripcion":"<string>","series":4,"repeticiones":"10-12","descanso_segundos":90}]},
            {"dia":"Jueves","enfoque":"<string>","ejercicios":[{"nombre":"<string>","descripcion":"<string>","series":4,"repeticiones":"10-12","descanso_segundos":90}]},
            {"dia":"Viernes","enfoque":"<string>","ejercicios":[{"nombre":"<string>","descripcion":"<string>","series":4,"repeticiones":"10-12","descanso_segundos":90}]},
            {"dia":"Sábado","enfoque":"<string>","ejercicios":[{"nombre":"<string>","descripcion":"<string>","series":4,"repeticiones":"10-12","descanso_segundos":90}]},
            {"dia":"Domingo","enfoque":"<string>","ejercicios":[{"nombre":"<string>","descripcion":"<string>","series":4,"repeticiones":"10-12","descanso_segundos":90}]}
        ],
        "progresion_sugerida": {
            "metodo": "Sobrecarga progresiva",
            "descripcion": "<string>"
        }
    }
}

Reglas extra:
- series y descanso_segundos deben ser NUMEROS (no strings).
- repeticiones SIEMPRE string (ej: "10-12" o "45-60 segundos").
- descripcion SIEMPRE string con instrucciones claras y breves.
- configuracion_semanal debe tener exactamente 7 dias (Lunes a Domingo).

Regla de dias seleccionados:
- Si el dia NO esta en la lista de dias seleccionados, entonces ese dia debe ser descanso: enfoque "Descanso" o "Descanso Total" y ejercicios [].
- Si el dia SI esta en la lista de dias seleccionados, entonces debe tener ejercicios (no vacio) y enfoque coherente.

Dias seleccionados para entrenar (SOLO estos dias deben tener ejercicios; los otros dias deben ser descanso con ejercicios []):
${diasSeleccionadosJson}

Ahora genera el plan semanal para:
- entorno: ${lugar}
- objetivo: ${objetivo}
- edad: ${Edad}
- estatura_cm: ${Altura}
- peso_actual_kg: ${Peso_actual}
- peso_objetivo_kg: ${Peso_objetivo}

Selecciona ejercicios adecuados para el entorno y el objetivo desde esta lista:
Pecho: Press de banca plano con barra, Press de banca inclinado con mancuernas, Flexiones de brazos (peso corporal), Aperturas con mancuernas, Fondos en paralelas (pecho bajo/tríceps), Cruce de poleas.
Espalda: Dominadas (peso corporal), Jalón al pecho en polea, Remo con barra, Remo unilateral con mancuerna, Remo sentado en polea, Hiperextensiones lumbares.
Piernas: Sentadilla libre, Prensa de piernas, Zancadas / estocadas, Peso muerto rumano, Hip thrust (empuje de cadera), Extensión de cuádriceps en máquina, Curl femoral tumbado o sentado, Elevación de talones, Sentadilla búlgara.
Hombros: Press militar con barra o mancuernas, Elevaciones laterales con mancuernas, Pájaros / vuelos posteriores, Elevaciones frontales, Face pull (salud del hombro).
Brazos: Curl de bíceps con barra, Curl martillo con mancuernas, Curl predicador, Press francés, Extensión de tríceps en polea alta, Fondos entre bancos.
Abdomen / core: Plancha abdominal, Crunch abdominal clásico, Elevación de piernas colgado o en suelo, Giros rusos, Rueda abdominal.
Cardio / acondicionamiento: Burpees, Saltos de tijera, Salto a la cuerda.`;
	try {
		const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        });

        const planFromParts = response?.candidates?.[0]?.content?.parts
            ?.map((p) => (typeof p?.text === "string" ? p.text : ""))
            .join("")
            .trim();
        const planText = (typeof response?.text === "string" && response.text.trim())
            ? response.text.trim()
            : (planFromParts || "");

        const jsonCandidate = extractLikelyJson(planText);
        let planObj;
        try {
            planObj = JSON.parse(jsonCandidate);
        } catch {
            throw new Error("La IA no devolvio un JSON parseable.");
        }

        // Hacer el plan robusto: 7 días, descansos según selección, y campos requeridos
        planObj = normalizePlanWithSelectedDays(planObj);

        const validationError = validatePlanShape(planObj);
        if (validationError) {
            throw new Error(`JSON invalido: ${validationError}`);
        }

        const plan_entreno_to_store = JSON.stringify(planObj);

        const {data,_error}= await supabase.from("Planes").select("*").eq("ID_user",id_usuario).single();
		if(data){
			const {error}=await supabase.from("Planes").update({
				Plan_entreno:plan_entreno_to_store
			}).eq("ID_user",id_usuario);
			if(error) throw new Error(error.message);
			return new Response(JSON.stringify({plan_entreno:plan_entreno_to_store}),{
				headers:{...corsHeaders,"Content-Type":"application/json"},
				status:200,
			});
		}
        const {error2} = await supabase.from("Planes").insert({
            Plan_entreno: plan_entreno_to_store,
            Plan_alimenta: "Proximamente",
            ID_user: id_usuario,
        });

		if (error2) throw new Error(error2.message);
        return new Response(JSON.stringify({ plan_entreno: plan_entreno_to_store }), {
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