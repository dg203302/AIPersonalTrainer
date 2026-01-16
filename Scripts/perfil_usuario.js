const username = localStorage.getItem("username_usuario")
const avatar = localStorage.getItem("avatar_usuario")
const id_usuario = localStorage.getItem("id_usuario")
const altura_usuario = localStorage.getItem("altura_usuario")
const edad_usuario = localStorage.getItem("edad_usuario")
const peso_usuario = localStorage.getItem("peso_usuario")
const peso_objetivo_usuario = localStorage.getItem("peso_objetivo_usuario")

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

window.onload = async () => {
    
}