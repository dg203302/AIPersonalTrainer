import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.94.1/+esm";
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
    const id_usu = payload.id_usuario;
    const altura_nueva = payload.altura_usuario;
    const edad_nueva = payload.edad_usuario;
    const peso_nuevo = payload.peso_usuario;
    const objetivo_nuevo = payload.peso_objetivo_usuario;
    
    const { data, error } = await supabase
        .from('Datos Fitness')
        .update({
            Altura: altura_nueva,
            Edad: edad_nueva,
            Peso: peso_nuevo,
            Peso_Obj: objetivo_nuevo
        })
        .eq('ID_user', id_usu);
    if (error) {
        return context.json({ message: "Error al actualizar el perfil", error: error.message }, { status: 500 });
    }
    return context.json({ message: "Perfil actualizado correctamente", data: data }, { status: 200 });
}