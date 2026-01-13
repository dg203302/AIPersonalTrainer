document.getElementById("boton_google").addEventListener("click",async () => {
    const response = await fetch('/login_google', { method: 'POST' });
    const result = await response.json().catch(() => ({}));
    if(response.ok){
        window.location.href = result.redirectUrl;
    } else {
        alert("Error al iniciar sesión con Google: " + (result.error ?? 'unknown_error'));
    }
});
window.onload = () => {
    fetch()
}