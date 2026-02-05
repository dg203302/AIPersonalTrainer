import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseUrl = "https://lhecmoeilmhzgxpcetto.supabase.co";
const supabaseKey = "sb_publishable_oLC8LcDLa3jR72Hpd_jJsA_eXjMlP3-";
const supabase = createClient(supabaseUrl, supabaseKey, {auth: {persistSession: true,autoRefreshToken: false, storage: localStorage}});

const updateFixedChromeHeights = () => {
    const header = document.querySelector("header");
    const footer = document.querySelector("footer");
    const root = document.documentElement;

    if (header) root.style.setProperty("--header-fixed", `${header.offsetHeight}px`);
    if (footer) root.style.setProperty("--footer-fixed", `${footer.offsetHeight}px`);
};

const initFixedChromeObservers = () => {
    updateFixedChromeHeights();
    if ("ResizeObserver" in window) {
        const ro = new ResizeObserver(() => updateFixedChromeHeights());
        const header = document.querySelector("header");
        const footer = document.querySelector("footer");
        if (header) ro.observe(header);
        if (footer) ro.observe(footer);
    } else {
        window.addEventListener("resize", updateFixedChromeHeights, { passive: true });
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFixedChromeObservers, { once: true });
} else {
    initFixedChromeObservers();
}

document.getElementById("boton_google").addEventListener("click",async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `index.html`}
    });

    if (error) {
        alert("Error al iniciar sesión con Google: " + error.message);
        return;
    }
    if (data?.url) {
        window.location.href = data.url;
    } else {
        alert("Error al iniciar sesión con Google: oauth_url_generation_failed"); //poner swal
    }
});

window.onload = () =>{
    supabase.auth.getSession().then(({data: {session}}) => {
        if (session) {
            window.location.href = "index.html";
        }
    });
}