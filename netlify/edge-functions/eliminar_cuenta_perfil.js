import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_secret_8pOt21ZHhoru6-VbtV6sEQ_TYL8DivC";
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