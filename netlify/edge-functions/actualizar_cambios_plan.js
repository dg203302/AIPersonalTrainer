import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_secret_8pOt21ZHhoru6-VbtV6sEQ_TYL8DivC";
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(request, context){
    let payload;
    try {
        payload = await request.json();
    } catch {
        return context.json({ message: "Body inválido: se esperaba JSON" }, { status: 400 });
    }

    const plan_json = payload?.plan_entreno;
    const id_usuario = payload?.id_usuario;
    
    if (!plan_json) {
        return context.json({ message: "Falta 'Plan_entreno' en el JSON" }, { status: 400 });
    }
    if (!id_usuario) {
        return context.json({ message: "Falta 'id_usuario' en el JSON" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('Planes')
        .update({ Plan_entreno: plan_json})
        .eq('ID_user', id_usuario);
    if (error) {
        return context.json({ message: 'Error al actualizar el plan', error: error.message }, { status: 500 });
    }
    return context.json({ message: 'Plan actualizado exitosamente', data }, { status: 200 });
}