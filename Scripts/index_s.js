document.getElementById("boton_google").addEventListener("click",async () => {
    const response = await fetch('/api/login_google');
    const result =  await response.json();
    if(response.ok){
        window.location.href = result.redirectUrl;
    } else {
        alert("Error al iniciar sesión con Google: " + result.error);
    }
});
document.getElementById("boton_prueba").addEventListener("click",async () => {
    const response = await fetch('/api/Prueba');
    const text =  await response.text();
    alert(text);
});