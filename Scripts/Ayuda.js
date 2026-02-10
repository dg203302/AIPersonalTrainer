const username = localStorage.getItem("username_usuario")
const avatar = localStorage.getItem("avatar_usuario")

window.onload = async () => {
    document.getElementById("username").textContent = username;
    document.getElementById("icono_usuario").src = avatar;
}