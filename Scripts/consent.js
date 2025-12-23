async function consentimiento_oauth(opcion_elegida) {
    const res = await fetch("/API/OAuth_consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ opcion: opcion_elegida, provider: "google" }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        console.error("OAuth consent failed", data);
        window.location.href = "/";
        return;
    }

    if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
    }

    console.error("Missing redirectUrl", data);
    window.location.href = "/";
}

document.getElementById("aceptar_oauth").addEventListener("click", () => {
    consentimiento_oauth("aceptar");
});

document.getElementById("denegar_oauth").addEventListener("click", () => {
    consentimiento_oauth("denegar");
});