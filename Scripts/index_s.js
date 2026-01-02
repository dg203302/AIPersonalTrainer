document.getElementById("boton_google").addEventListener("click",async () => {
    const response = await fetch("/API/Login_google");
    const result =  await response.json();
    if(response.ok){
        window.location.href = result.redirectUrl;
    } else {
        alert("Error al iniciar sesión con Google: " + result.error);
    }
});