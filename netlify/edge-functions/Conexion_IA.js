import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

export default function conectar_gemini(apiKey = Deno.env.get("Gemini_API_Key")) {
	if (!apiKey) {
		throw new Error("Missing Gemini_API_Key environment variable");
	}
	return new GoogleGenerativeAI(apiKey);
}