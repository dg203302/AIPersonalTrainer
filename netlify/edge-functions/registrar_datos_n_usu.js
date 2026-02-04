import { createClient } from '@supabase/supabase-js';
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

    const id_usuario = payload?.id_usuario ?? payload?.ID_user;
    if (!id_usuario) {
        return context.json({ message: "Falta 'id_usuario' en el JSON" }, { status: 400 });
    }

    const toNumberOrNull = (value) => {
        if (value === null || value === undefined || value === "") return null;
        const asNumber = typeof value === "number" ? value : Number(value);
        return Number.isFinite(asNumber) ? asNumber : null;
    };

    const edad = toNumberOrNull(payload?.edad ?? payload?.Edad);
    const altura = toNumberOrNull(payload?.altura ?? payload?.Altura);
    const peso = toNumberOrNull(payload?.peso ?? payload?.Peso ?? payload?.peso_act);
    const peso_obj = toNumberOrNull(payload?.peso_obj ?? payload?.Peso_Obj ?? payload?.peso_desea);

    const { data, error } = await supabase
        .from('Datos Fitness')
        .insert([
            {
                ID_user: id_usuario,
                Altura: altura,
                Peso: peso,
                Edad: edad,
                Peso_Obj: peso_obj,
            },
        ]);
    if (error) {
        return context.json({ message: 'Error al registrar el usuario', error: error.message }, { status: 500 });
    }
    return context.json({ message: 'Usuario registrado exitosamente', data }, { status: 200 });
}