import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";
import { neon } from "https://esm.sh/@neondatabase/serverless";

export default async function handler(request, context){
	const apiKey = neon(Deno.env.get("Gemini_API_Key"));
	if (!apiKey) {
		throw new Error("Missing Gemini_API_Key environment variable");
	}
	return new GoogleGenerativeAI(apiKey);
};