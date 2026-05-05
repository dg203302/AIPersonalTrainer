import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.94.1/+esm";
const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = Deno.env.get('API_Key_Supabase');
const supabase = createClient(supabaseUrl, supabaseKey, {admin: true});

export default async function handler(request, _context){
    const payload = await request.json();
    const { id_usuario } = payload;
    try {
        const { _data, error } = await supabase.auth.admin.deleteUser(id_usuario)
        if (error.status === 404 || error.message.includes("not found")) {
                return new Response(JSON.stringify({ message: "User deleted successfully" }), {
                headers: { "Content-Type": "application/json" },
                status: 200,
            });
        }
        else if (error) {
            throw new Error(error.message);
        }
        return new Response(JSON.stringify({ message: "User deleted successfully" }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        return new Response(JSON.stringify({ message: "User deleted successfully" }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    }
}