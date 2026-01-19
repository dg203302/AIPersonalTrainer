import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const apiKeyGemini = "AIzaSyBlbVQCj05X4kq5qed0mzLrw4v15VSwU5c";
const genAI = new GoogleGenerativeAI({ apiKey: apiKeyGemini });

const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500,
    }
});

const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_secret_8pOt21ZHhoru6-VbtV6sEQ_TYL8DivC";
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(request, context){
	let payload;
	try {
		payload = await request.json();
		const { lugar, objetivo, Edad, Altura, Peso_actual, Peso_objetivo } = payload;
		const prompt = `Genera un plan de entrenamiento semanal personalizado para una persona que entrena en ${lugar}, con el objetivo de ${objetivo}. La persona tiene ${Edad} años, mide ${Altura} cm, pesa ${Peso_actual} kg y su peso objetivo es ${Peso_objetivo} kg. El plan debe incluir ejercicios, series/repeticiones, descansos y una progresión sugerida. Proporciona el plan en formato JSON estructurado.`;

		const response = await model.generateContent({
			prompt: {
				text: prompt,
			},
		});

		const planEntrenamiento = response.candidates[0].content.text;

		//aca hacer la subida a supabase

		return new Response(JSON.stringify({ plan: planEntrenamiento }), {
			headers: { "Content-Type": "application/json" },
			status: 200,
		});
	}
	catch (error) {
		return context.json({ message: error.message }, { status: 500 });
	}
};