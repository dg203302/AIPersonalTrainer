import { GoogleGenAI } from "https://esm.sh/@google/genai@1.38.0";



const fetchGeminiApiKeyFromEdge = async () => {
	let res;
	let txt = "";
	try {
		res = await fetch("/obtener_gemini_api_key", { method: "POST" });
		txt = await res.text();
	} catch (e) {
		throw new Error(`No se pudo contactar el servidor para la API key: ${e?.message || String(e)}`);
	}
	if (!res.ok) {
		let msg = txt;
		try {
			const parsed = JSON.parse(txt);
			msg = parsed?.error || parsed?.message || msg;
		} catch {
			// ignore
		}
		throw new Error(`No se pudo obtener la API key (HTTP ${res.status}): ${String(msg).slice(0, 240)}`);
	}
	let parsed;
	try {
		parsed = JSON.parse(txt);
	} catch {
		parsed = null;
	}
    return parsed?.apiKey ?? "";
};

const normalizeKey = (s) =>
	String(s ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();

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

const allowedExercisesByKey = (() => {
	const map = new Map();
	for (const items of Object.values(EJERCICIOS_INDICE)) {
		for (const ex of items) {
			map.set(normalizeKey(ex), ex);
		}
	}
	return map;
})();

const normalizeSelectedExercises = (value) => {
	if (!Array.isArray(value)) return [];
	const out = [];
	const seen = new Set();
	for (const item of value) {
		const key = normalizeKey(item);
		if (!key) continue;
		const canonical = allowedExercisesByKey.get(key);
		if (!canonical) continue;
		if (seen.has(canonical)) continue;
		seen.add(canonical);
		out.push(canonical);
		if (out.length >= 40) break;
	}
	return out;
};

const extractLikelyJson = (text) => {
	const s = String(text ?? "").trim();
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
			if (typeof ex.descripcion_detallada !== "string" || !ex.descripcion_detallada.trim()) return "Cada ejercicio debe tener descripcion_detallada (string)";
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

const stripAccents = (s) =>
	String(s ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();

const normalizeIntensidad = (value) => {
	const v = stripAccents(value).toLowerCase();
	if (v.includes("baj")) return "baja";
	if (v.includes("alt")) return "alta";
	if (v.includes("med")) return "media";
	return "media";
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const ALL_DIAS_ES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const ALL_DIAS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DAY_INDEX_BY_CODE = { L: 0, M: 1, X: 2, J: 3, V: 4, S: 5, D: 6 };
const DAY_INDEX_BY_NAME = {
	// Spanish (sin tildes)
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
	// Abbreviations
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

const normalizeSelectedDays = ({ dias, dias_semana, idiomaNorm }) => {
	const ALL_DIAS = idiomaNorm === "en" ? ALL_DIAS_EN : ALL_DIAS_ES;
	const selectedIdx = new Set();

	if (Array.isArray(dias)) {
		for (const item of dias) {
			const code = String(item ?? "").toUpperCase();
			const idx = Object.prototype.hasOwnProperty.call(DAY_INDEX_BY_CODE, code) ? DAY_INDEX_BY_CODE[code] : null;
			if (idx != null) selectedIdx.add(idx);
		}
	}

	if (Array.isArray(dias_semana)) {
		for (const item of dias_semana) {
			const idx = getDayIndexFromName(item);
			if (idx != null) selectedIdx.add(idx);
		}
	}

	if (selectedIdx.size === 0) {
		for (let i = 0; i < 7; i++) selectedIdx.add(i);
	}

	return Array.from(selectedIdx)
		.sort((a, b) => a - b)
		.map((idx) => ALL_DIAS[idx]);
};

const canonicalDayKey = (dayLabel) => {
	const idx = getDayIndexFromName(dayLabel);
	if (idx != null) return ALL_DIAS_EN[idx].toLowerCase();
	return stripAccents(dayLabel).toLowerCase();
};

const normalizePlanWithSelectedDays = ({ planObj, idiomaNorm, lugar, objetivo, intensidadNorm, ejerciciosPorDiaObjetivo, diasSeleccionados, ejerciciosSeleccionados }) => {
	if (!planObj || typeof planObj !== "object") return planObj;
	const root = planObj.plan_entrenamiento_hipertrofia;
	if (!root || typeof root !== "object") return planObj;

	const t = (es, en) => (idiomaNorm === "en" ? en : es);
	const ALL_DIAS = idiomaNorm === "en" ? ALL_DIAS_EN : ALL_DIAS_ES;

	root.usuario = (root.usuario && typeof root.usuario === "object") ? root.usuario : {};
	root.usuario.intensidad = intensidadNorm;
	root.usuario.ejercicios_por_dia = ejerciciosPorDiaObjetivo;

	const semanalRaw = root.configuracion_semanal;
	const semanalArr = Array.isArray(semanalRaw) ? semanalRaw : [];

	const byDay = new Map();
	for (const item of semanalArr) {
		if (!item || typeof item !== "object") continue;
		const key = canonicalDayKey(item.dia);
		if (key) byDay.set(key, item);
	}

	const selectedKeys = new Set(diasSeleccionados.map(canonicalDayKey));
	const selectedExerciseKeySet = new Set(ejerciciosSeleccionados.map((e) => normalizeKey(e)));
	const soloEjerciciosSeleccionados = ejerciciosSeleccionados.length > 0;

	const isAllowedExerciseName = (name) => {
		if (!soloEjerciciosSeleccionados) return true;
		const k = normalizeKey(name);
		return k && selectedExerciseKeySet.has(k);
	};

	const normalizeExercise = (ex) => {
		if (!ex || typeof ex !== "object") return null;
		const nombre = typeof ex.nombre === "string" ? ex.nombre : String(ex.nombre ?? "").trim();
		if (!nombre) return null;
		if (!isAllowedExerciseName(nombre)) return null;

		const descripcionRaw = (typeof ex.descripcion === "string" && ex.descripcion.trim())
			? ex.descripcion.trim()
			: (typeof ex.description === "string" && ex.description.trim())
				? ex.description.trim()
				: t(
					"Realizá el movimiento controlado, con técnica correcta y rango completo.",
					"Perform the movement in a controlled manner, with proper form and full range of motion."
				);

		const descripcionDetalladaRaw = (typeof ex.descripcion_detallada === "string" && ex.descripcion_detallada.trim())
			? ex.descripcion_detallada.trim()
			: (typeof ex.detailed_description === "string" && ex.detailed_description.trim())
				? ex.detailed_description.trim()
				: descripcionRaw + t(
					" Técnica: mantén la postura, rango completo y control en la fase excéntrica. Respiración: inspira en la fase excéntrica y exhala en la fase concéntrica. Progresión: recomendaciones de sobrecarga progresiva (p.ej. aumentar 2-5% de carga o 1-2 repeticiones cuando completes el rango objetivo durante 1-2 sesiones).",
					" Technique: maintain posture, full range of motion, and control the eccentric phase. Breathing: inhale on the eccentric, exhale on the concentric. Progression: use progressive overload (e.g., +2–5% weight or +1–2 reps once you hit the target range for 1–2 sessions)."
				);

		const seriesNum = Number(ex.series);
		const descansoNum = Number(ex.descanso_segundos);
		const repeticiones = (typeof ex.repeticiones === "string" && ex.repeticiones.trim())
			? ex.repeticiones.trim()
			: String(ex.repeticiones ?? ex.reps ?? "10-12").trim() || "10-12";

		return {
			nombre,
			descripcion: descripcionRaw,
			descripcion_detallada: descripcionDetalladaRaw,
			series: Number.isFinite(seriesNum) ? seriesNum : 4,
			repeticiones,
			descanso_segundos: Number.isFinite(descansoNum) ? descansoNum : 90,
		};
	};

	const allExercises = Object.values(EJERCICIOS_INDICE).flat();
	const pickFallbackPool = () => {
		if (soloEjerciciosSeleccionados) return ejerciciosSeleccionados;
		const entornoKey = normalizeKey(lugar);
		if (entornoKey.includes("casa")) {
			return allExercises.filter((name) => {
				const k = normalizeKey(name);
				return !k.includes("polea") && !k.includes("maquina") && !k.includes("prensa") && !k.includes("barra") && !k.includes("predicador");
			});
		}
		return allExercises;
	};
	const fallbackPool = pickFallbackPool();

	const makeFallbackExercise = (nombre) => ({
		nombre,
		descripcion: t(
			"Movimiento controlado, técnica correcta, rango completo. Ajustá carga según tu nivel.",
			"Controlled movement, proper form, full range of motion. Adjust load to your level."
		),
		descripcion_detallada: t(
			"Ejecución detallada: postura neutra, respiración (inspira en la fase de bajada/excéntrica y exhala en la fase de empuje/concéntrica), tempo recomendado 2-1-2. Recomendación de sobrecarga progresiva: intenta aumentar ligeramente la carga (2-5%) o añadir 1-2 repeticiones cuando completes el rango objetivo durante 1-2 sesiones, priorizando siempre la técnica. Ajustá la carga para completar las repeticiones con buena técnica.",
			"Detailed execution: neutral posture, breathing (inhale on the lowering/eccentric, exhale on the lifting/concentric), suggested tempo 2-1-2. Progressive overload: try to increase load slightly (2–5%) or add 1–2 reps once you hit the target range for 1–2 sessions—always prioritizing form. Adjust load so you can complete reps with good technique."
		),
		series: 4,
		repeticiones: "10-12",
		descanso_segundos: 90,
	});

	const semanalFixed = ALL_DIAS.map((diaCanonical) => {
		const key = canonicalDayKey(diaCanonical);
		const isSelected = selectedKeys.has(key);
		const original = byDay.get(key);
		const base = (original && typeof original === "object") ? original : { dia: diaCanonical };

		base.dia = diaCanonical;
		if (!isSelected) {
			return { dia: diaCanonical, enfoque: t("Descanso", "Rest"), ejercicios: [] };
		}

		const enfoque = (typeof base.enfoque === "string" && base.enfoque.trim()) ? base.enfoque.trim() : t("Entrenamiento", "Training");
		const ejerciciosRaw = Array.isArray(base.ejercicios) ? base.ejercicios : [];
		let ejerciciosNorm = ejerciciosRaw.map(normalizeExercise).filter(Boolean);
		if (soloEjerciciosSeleccionados) {
			ejerciciosNorm = ejerciciosNorm.filter((e) => isAllowedExerciseName(e.nombre));
		}

		if (ejerciciosNorm.length > ejerciciosPorDiaObjetivo) {
			ejerciciosNorm = ejerciciosNorm.slice(0, ejerciciosPorDiaObjetivo);
		}
		if (ejerciciosNorm.length < ejerciciosPorDiaObjetivo) {
			const existing = new Set(ejerciciosNorm.map((e) => normalizeKey(e.nombre)));

			if (soloEjerciciosSeleccionados) {
				const pool = Array.isArray(fallbackPool) ? fallbackPool : [];
				if (pool.length > 0) {
					let idx = 0;
					const guard = ejerciciosPorDiaObjetivo * 20;
					let steps = 0;
					while (ejerciciosNorm.length < ejerciciosPorDiaObjetivo && steps < guard) {
						const name = pool[idx % pool.length];
						idx++;
						steps++;
						const k = normalizeKey(name);
						if (existing.has(k) && existing.size < pool.length) continue;
						ejerciciosNorm.push(makeFallbackExercise(name));
						existing.add(k);
					}
				}
			} else {
				for (const name of fallbackPool) {
					const k = normalizeKey(name);
					if (existing.has(k)) continue;
					ejerciciosNorm.push(makeFallbackExercise(name));
					existing.add(k);
					if (ejerciciosNorm.length >= ejerciciosPorDiaObjetivo) break;
				}
			}
		}

		return { dia: diaCanonical, enfoque, ejercicios: ejerciciosNorm };
	});

	root.configuracion_semanal = semanalFixed;
	planObj.plan_entrenamiento_hipertrofia = root;
	return planObj;
};

export const generatePlanEntreno = async (payload) => {

	const idiomaNorm = String(payload?.idioma ?? "").trim().toLowerCase() === "en" ? "en" : "es";
	const idiomaLabel = idiomaNorm === "en" ? "English" : "Español";
	const t = (es, en) => (idiomaNorm === "en" ? en : es);

	const lugar = payload?.lugar;
	const objetivo = payload?.objetivo;
	const intensidadNorm = normalizeIntensidad(payload?.intensidad);

	const ejerciciosPorDiaFromPayload = Number(payload?.ejercicios_por_dia);
	const ejerciciosPorDiaFromInt = ({ baja: 4, media: 6, alta: 8 })[intensidadNorm] ?? 6;
	const ejerciciosPorDiaObjetivo = Number.isFinite(ejerciciosPorDiaFromPayload)
		? clamp(Math.round(ejerciciosPorDiaFromPayload), 1, 12)
		: ejerciciosPorDiaFromInt;

	const diasSeleccionados = normalizeSelectedDays({ dias: payload?.dias, dias_semana: payload?.dias_semana, idiomaNorm });
	const diasSeleccionadosJson = JSON.stringify(diasSeleccionados);

	const ejerciciosSeleccionados = normalizeSelectedExercises(payload?.ejercicios_seleccionados);
	const ejerciciosSeleccionadosJson = JSON.stringify(ejerciciosSeleccionados);

	const ALL_DIAS = idiomaNorm === "en" ? ALL_DIAS_EN : ALL_DIAS_ES;
	const schemaDays = ALL_DIAS
		.map(
			(d) =>
				`            {"dia":"${d}","enfoque":"<string>","ejercicios":[{"nombre":"<string>","descripcion":"<string>","descripcion_detallada":"<string>","series":4,"repeticiones":"10-12","descanso_segundos":90}]}`
		)
		.join(",\n");

	const entornoValue = String(lugar ?? "").toLowerCase() === "gimnasio" ? t("Gimnasio", "Gym") : t("Casa", "Home");
	const objetivoValue = String(objetivo ?? "").toLowerCase() === "grasa" ? t("grasa", "fat") : t("musculo", "muscle");
	const progresionMetodoValue = t("Sobrecarga progresiva", "Progressive overload");

	const prompt = `Devuelve UNICAMENTE un JSON valido (RFC 8259).
PROHIBIDO: texto extra, markdown, bloques \
\
\
json, comentarios, comas finales.

Idioma de salida:
- Preferencia: ${idiomaLabel}.
- Mantén las CLAVES JSON exactamente como el esquema (no traduzcas claves).
- Traduce SOLO los VALORES de texto según el idioma (dia, enfoque, descripcion, descripcion_detallada, progresion_sugerida.*).
- IMPORTANTE: NO traduzcas los nombres de ejercicios (ejercicios[].nombre). Deben quedar exactamente en español/canónicos de la lista provista.
- Para idioma inglés: usa nombres de días en inglés (Monday..Sunday). Para español: Lunes..Domingo.

Usa SIEMPRE este formato EXACTO (mismas claves y tipos):
{
	"plan_entrenamiento_hipertrofia": {
		"usuario": {
			"edad": ${Number(payload?.Edad) || 0},
			"estatura_cm": ${Number(payload?.Altura) || 0},
			"peso_objetivo_kg": ${Number(payload?.Peso_objetivo) || 0},
			"entorno": "${entornoValue}",
			"objetivo": "${objetivoValue}",
			"intensidad": "${intensidadNorm}",
			"ejercicios_por_dia": ${ejerciciosPorDiaObjetivo}
		},
		"configuracion_semanal": [
${schemaDays}
		],
		"progresion_sugerida": {
			"metodo": "${progresionMetodoValue}",
			"descripcion": "<string>"
		}
	}
}

Reglas extra:
- series y descanso_segundos deben ser NUMEROS (no strings).
- repeticiones SIEMPRE string (ej: "10-12" o "45-60 segundos").
- descripcion SIEMPRE string con instrucciones claras y breves (resumen corto).
- descripcion_detallada SIEMPRE string con instrucciones más completas y técnicas (detalle).
- descripcion_detallada DEBE incluir, por cada ejercicio: técnica correcta (puntos clave de ejecución), una recomendación concreta de sobrecarga progresiva (cómo progresar semana a semana) y la técnica de respiración recomendada para ese ejercicio.
- configuracion_semanal debe tener exactamente 7 dias (Monday..Sunday / Lunes..Domingo según idioma).

Regla de intensidad (OBLIGATORIA):
- intensidad seleccionada: ${intensidadNorm}
- Para CADA dia seleccionado (no descanso) devuelve EXACTAMENTE ${ejerciciosPorDiaObjetivo} ejercicios.
- Para dias NO seleccionados: ejercicios []

Regla de dias seleccionados:
- Si el dia NO esta en la lista de dias seleccionados, entonces ese dia debe ser descanso: enfoque "${t("Descanso", "Rest")}" o "${t("Descanso Total", "Full Rest")}" y ejercicios [].
- Si el dia SI esta en la lista de dias seleccionados, entonces debe tener ejercicios (no vacio) y enfoque coherente.

Dias seleccionados para entrenar (SOLO estos dias deben tener ejercicios; los otros dias deben ser descanso con ejercicios []):
${diasSeleccionadosJson}

Preferencias opcionales de ejercicios (puede venir vacio):
- Si la lista NO esta vacia, entonces DEBES usar SOLAMENTE esos ejercicios en todo el plan.
- PROHIBIDO incluir cualquier ejercicio que no este en la lista de ejercicios preferidos.
- Si la lista NO alcanza para llenar todos los dias/sesiones, puedes REPETIR ejercicios preferidos (pero nunca inventar/agregar otros).
Ejercicios preferidos:
${ejerciciosSeleccionadosJson}

Ahora genera el plan semanal para:
- entorno: ${payload?.lugar}
- objetivo: ${payload?.objetivo}
- edad: ${payload?.Edad}
- estatura_cm: ${payload?.Altura}
- peso_actual_kg: ${payload?.Peso_actual}
- peso_objetivo_kg: ${payload?.Peso_objetivo}

Selecciona ejercicios adecuados para el entorno y el objetivo desde esta lista:
Pecho: Press de banca plano con barra, Press de banca inclinado con mancuernas, Flexiones de brazos (peso corporal), Aperturas con mancuernas, Fondos en paralelas (pecho bajo/tríceps), Cruce de poleas.
Espalda: Dominadas (peso corporal), Jalón al pecho en polea, Remo con barra, Remo unilateral con mancuerna, Remo sentado en polea, Hiperextensiones lumbares.
Piernas: Sentadilla libre, Prensa de piernas, Zancadas / estocadas, Peso muerto rumano, Hip thrust (empuje de cadera), Extensión de cuádriceps en máquina, Curl femoral tumbado o sentado, Elevación de talones, Sentadilla búlgara.
Hombros: Press militar con barra o mancuernas, Elevaciones laterales con mancuernas, Pájaros / vuelos posteriores, Elevaciones frontales, Face pull (salud del hombro).
Brazos: Curl de bíceps con barra, Curl martillo con mancuernas, Curl predicador, Press francés, Extensión de tríceps en polea alta, Fondos entre bancos.
Tríceps: Press francés, Extensión de tríceps en polea alta, Fondos entre bancos, Extensión de tríceps con mancuerna sobre la cabeza, Patada de tríceps con mancuerna.
Antebrazos: Curl de muñeca con barra, Curl de muñeca con mancuerna, Curl invertido con barra, Farmer's walk (caminata del granjero).
Abdomen / core: Plancha abdominal, Crunch abdominal clásico, Elevación de piernas colgado o en suelo, Giros rusos, Rueda abdominal.
Cardio / acondicionamiento: Burpees, Saltos de tijera, Salto a la cuerda.`;

	const ai = new GoogleGenAI({ apiKey: await fetchGeminiApiKeyFromEdge() });
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: prompt,
	});

	const planFromParts = response?.candidates?.[0]?.content?.parts
		?.map((p) => (typeof p?.text === "string" ? p.text : ""))
		.join("")
		.trim();
	const planText = (typeof response?.text === "string" && response.text.trim()) ? response.text.trim() : (planFromParts || "");
	const jsonCandidate = extractLikelyJson(planText);

	let planObj;
	try {
		planObj = JSON.parse(jsonCandidate);
	} catch {
		throw new Error("La IA no devolvió un JSON parseable.");
	}

	planObj = normalizePlanWithSelectedDays({
		planObj,
		idiomaNorm,
		lugar,
		objetivo,
		intensidadNorm,
		ejerciciosPorDiaObjetivo,
		diasSeleccionados,
		ejerciciosSeleccionados,
	});

	const validationError = validatePlanShape(planObj);
	if (validationError) throw new Error(`JSON inválido: ${validationError}`);

	return {
		planObj,
		plan_entreno: JSON.stringify(planObj),
		meta: {
			idioma: idiomaNorm,
			intensidad: intensidadNorm,
			ejercicios_por_dia: ejerciciosPorDiaObjetivo,
			dias: diasSeleccionados,
			ejercicios_seleccionados: ejerciciosSeleccionados,
		},
	};
};

