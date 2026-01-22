import { logout } from "./logout.js";
const username = localStorage.getItem("username_usuario")
const avatar = localStorage.getItem("avatar_usuario")
const id_usuario = localStorage.getItem("id_usuario")
const altura_usuario = localStorage.getItem("altura_usuario")
const edad_usuario = localStorage.getItem("edad_usuario")
const peso_usuario = localStorage.getItem("peso_usuario")
const peso_objetivo_usuario = localStorage.getItem("peso_objetivo_usuario")

const WHEEL_ITEM_HEIGHT = 44;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const buildWheelInRoot = ({ root, field, values, format, initialValue }) => {
	const wheelEl = root?.querySelector(`.wheel[data-field="${field}"]`);
	const inputEl = root?.querySelector(`#${field}`);
	if (!wheelEl || !inputEl) return;

	wheelEl.innerHTML = "";
	wheelEl.dataset.index = "0";
	wheelEl.dataset.length = String(values.length);

	const frag = document.createDocumentFragment();
	for (let i = 0; i < values.length; i++) {
		const item = document.createElement("div");
		item.className = "wheel-item";
		item.dataset.value = String(values[i]);
		item.textContent = format ? format(values[i]) : String(values[i]);
		frag.appendChild(item);
	}
	wheelEl.appendChild(frag);

	const setActive = (index) => {
		const clampedIndex = clamp(index, 0, values.length - 1);
		wheelEl.dataset.index = String(clampedIndex);
		inputEl.value = String(values[clampedIndex]);
		const items = wheelEl.querySelectorAll(".wheel-item");
		items.forEach((node, idx) => node.classList.toggle("is-active", idx === clampedIndex));
	};

	let scrollTimer = null;
	const onScroll = () => {
		const idx = Math.round((wheelEl.scrollTop + 0.0001) / WHEEL_ITEM_HEIGHT);
		setActive(idx);
		if (scrollTimer) window.clearTimeout(scrollTimer);
		scrollTimer = window.setTimeout(() => {
			wheelEl.scrollTo({ top: Number(wheelEl.dataset.index) * WHEEL_ITEM_HEIGHT, behavior: "smooth" });
		}, 80);
	};

	wheelEl.addEventListener("scroll", onScroll, { passive: true });
	wheelEl.addEventListener("click", (e) => {
		const item = e.target.closest(".wheel-item");
		if (!item) return;
		const items = Array.from(wheelEl.querySelectorAll(".wheel-item"));
		const idx = items.indexOf(item);
		setActive(idx);
		wheelEl.scrollTo({ top: idx * WHEEL_ITEM_HEIGHT, behavior: "smooth" });
	});

	wheelEl.addEventListener("keydown", (e) => {
		if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
		e.preventDefault();
		const delta = e.key === "ArrowDown" ? 1 : -1;
		const idx = Number(wheelEl.dataset.index || "0") + delta;
		setActive(idx);
		wheelEl.scrollTo({ top: Number(wheelEl.dataset.index) * WHEEL_ITEM_HEIGHT, behavior: "smooth" });
	});

	// Init at a provided value if present, otherwise first item
	const initial = Number.isFinite(initialValue) ? Number(initialValue) : values[0];
	const initialIndex = clamp(values.indexOf(initial), 0, values.length - 1);
	setActive(initialIndex);
	wheelEl.scrollTop = initialIndex * WHEEL_ITEM_HEIGHT;
};

const initAlturaWheelInPopup = (popupEl, currentAltura) => {
	const alturas = [];
	for (let cm = 100; cm <= 200; cm++) alturas.push(cm);
	const safeCurrent = clamp(Number(currentAltura) || 170, 100, 200);
	buildWheelInRoot({
		root: popupEl,
		field: "altura_modal",
		values: alturas,
		format: (cm) => `${cm} cm`,
		initialValue: safeCurrent,
	});
};

const pad2 = (value) => String(value).padStart(2, "0");

const isValidYMD = (year, month, day) => {
	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
	if (month < 1 || month > 12) return false;
	if (day < 1 || day > 31) return false;
	const d = new Date(year, month - 1, day);
	return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
};

const calcAgeFromYMD = (year, month, day) => {
	const today = new Date();
	let age = today.getFullYear() - year;
	const m = (today.getMonth() + 1) - month;
	if (m < 0 || (m === 0 && today.getDate() < day)) age -= 1;
	return age;
};

const initEdadWheelsInPopup = (popupEl, currentEdad) => {
	const years = [];
	for (let y = 2032; y >= 1900; y--) years.push(y);

	const safeEdad = clamp(Number(currentEdad) || 26, 1, 120);
	const yearDefault = clamp(new Date().getFullYear() - safeEdad, 1900, 2032);

	buildWheelInRoot({
		root: popupEl,
		field: "dia_modal",
		values: Array.from({ length: 31 }, (_, i) => i + 1),
		format: pad2,
		initialValue: 1,
	});
	buildWheelInRoot({
		root: popupEl,
		field: "mes_modal",
		values: Array.from({ length: 12 }, (_, i) => i + 1),
		format: pad2,
		initialValue: 1,
	});
	buildWheelInRoot({
		root: popupEl,
		field: "ano_modal",
		values: years,
		format: (y) => String(y),
		initialValue: yearDefault,
	});
};

const initPesoWheelInPopup = (popupEl, { mode, currentPesoAct, currentPesoObj }) => {
	const weights = [];
	for (let kg = 40; kg <= 200; kg++) weights.push(kg);

	const safeAct = clamp(Number(currentPesoAct) || 70, 40, 200);
	const safeObj = clamp(Number(currentPesoObj) || 75, 40, 200);

	if (mode === "obj") {
		buildWheelInRoot({
			root: popupEl,
			field: "peso_desea_modal",
			values: weights,
			format: (kg) => `${kg} kg`,
			initialValue: safeObj,
		});
		return;
	}

	buildWheelInRoot({
		root: popupEl,
		field: "peso_act_modal",
		values: weights,
		format: (kg) => `${kg} kg`,
		initialValue: safeAct,
	});
};

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
	document.getElementById("username").textContent = username;
	document.getElementById("icono_usuario").src = avatar;
	document.getElementById("altura_usuario").textContent = altura_usuario;
	document.getElementById("edad_usuario").textContent = edad_usuario;
	document.getElementById("peso_usuario").textContent = peso_usuario;
	document.getElementById("peso_objetivo_usuario").textContent = peso_objetivo_usuario;
}

document.getElementById("editar_altura").addEventListener("click", async () => {
	const currentAltura = parseInt(localStorage.getItem("altura_usuario") || "170", 10);

	const result = await swal.fire({
		title: "Editar Altura",
		html: `
			<div class="altura-wheel">
				<p class="swal-helper">Seleccioná tu altura. Podés deslizar, tocar o usar las flechas ↑ ↓.</p>
				<div class="wheel-row has-row-highlight" role="group" aria-label="Altura">
					<div class="wheel" data-field="altura_modal" aria-label="Altura en centímetros" tabindex="0"></div>
				</div>
				<input type="hidden" id="altura_modal" required>
			</div>
		`,
		showCancelButton: true,
		confirmButtonText: "Guardar",
		cancelButtonText: "Cancelar",
		customClass: {
			popup: "perfil-swal",
			confirmButton: "perfil-swal-confirm",
			cancelButton: "perfil-swal-cancel",
		},
		didOpen: () => {
			const popup = (typeof swal.getPopup === "function" && swal.getPopup()) || document.querySelector(".swal2-popup");
			initAlturaWheelInPopup(popup, currentAltura);
		},
		preConfirm: () => {
			const popup = (typeof swal.getPopup === "function" && swal.getPopup()) || document.querySelector(".swal2-popup");
			const input = popup?.querySelector("#altura_modal");
			const alt = parseInt(input?.value || "", 10);
			if (!Number.isFinite(alt) || alt < 100 || alt > 200) {
				if (typeof swal.showValidationMessage === "function") {
					swal.showValidationMessage("Altura inválida");
				}
				return false;
			}
			return alt;
		},
	});

	if (!result.isConfirmed) return;
	const nuevaAltura = result.value;
	localStorage.setItem("altura_usuario", String(nuevaAltura));
	const alturaSpan = document.getElementById("altura_usuario");
	if (alturaSpan) alturaSpan.textContent = String(nuevaAltura);
	await subirCambiosPerfil();
})

document.getElementById("editar_edad").addEventListener("click", async () => {
	const currentEdad = parseInt(localStorage.getItem("edad_usuario") || "26", 10);

	const result = await swal.fire({
		title: "Editar Edad",
		html: `
			<div class="edad-wheel">
				<p class="swal-helper">Elegí tu fecha de nacimiento (día/mes/año). Luego calculamos tu edad automáticamente.</p>
				<div class="wheel-row" role="group" aria-label="Fecha de nacimiento">
					<div class="wheel" data-field="dia_modal" aria-label="Día" tabindex="0"></div>
					<div class="wheel" data-field="mes_modal" aria-label="Mes" tabindex="0"></div>
					<div class="wheel" data-field="ano_modal" aria-label="Año" tabindex="0"></div>
				</div>
				<input type="hidden" id="dia_modal" required>
				<input type="hidden" id="mes_modal" required>
				<input type="hidden" id="ano_modal" required>
			</div>
		`,
		showCancelButton: true,
		confirmButtonText: "Guardar",
		cancelButtonText: "Cancelar",
		customClass: {
			popup: "perfil-swal",
			confirmButton: "perfil-swal-confirm",
			cancelButton: "perfil-swal-cancel",
		},
		didOpen: () => {
			const popup = (typeof swal.getPopup === "function" && swal.getPopup()) || document.querySelector(".swal2-popup");
			initEdadWheelsInPopup(popup, currentEdad);
		},
		preConfirm: () => {
			const popup = (typeof swal.getPopup === "function" && swal.getPopup()) || document.querySelector(".swal2-popup");
			const dia = parseInt(popup?.querySelector("#dia_modal")?.value || "", 10);
			const mes = parseInt(popup?.querySelector("#mes_modal")?.value || "", 10);
			const ano = parseInt(popup?.querySelector("#ano_modal")?.value || "", 10);
			if (!isValidYMD(ano, mes, dia)) {
				if (typeof swal.showValidationMessage === "function") swal.showValidationMessage("Fecha de nacimiento inválida");
				return false;
			}
			const edad = calcAgeFromYMD(ano, mes, dia);
			if (!Number.isFinite(edad) || edad < 1 || edad > 120) {
				if (typeof swal.showValidationMessage === "function") swal.showValidationMessage("Edad inválida");
				return false;
			}
			return edad;
		},
	});

	if (!result.isConfirmed) return;
	const nuevaEdad = result.value;
	localStorage.setItem("edad_usuario", String(nuevaEdad));
	const edadSpan = document.getElementById("edad_usuario");
	if (edadSpan) edadSpan.textContent = String(nuevaEdad);
	await subirCambiosPerfil();
})

const openPesoModal = async ({ mode = "act" } = {}) => {
	const currentPesoAct = parseInt(localStorage.getItem("peso_usuario") || "70", 10);
	const currentPesoObj = parseInt(localStorage.getItem("peso_objetivo_usuario") || "75", 10);

	const isObj = mode === "obj";
	const title = isObj ? "Editar Peso Objetivo" : "Editar Peso Actual";
	const sectionTitle = isObj ? "Peso objetivo" : "Peso actual";
	const wheelField = isObj ? "peso_desea_modal" : "peso_act_modal";
	const wheelAria = isObj ? "Peso objetivo en kilogramos" : "Peso actual en kilogramos";
	const inputId = isObj ? "peso_desea_modal" : "peso_act_modal";

	const result = await swal.fire({
		title: title,
		html: `
			<div class="pesos-wheel">
				<p class="swal-helper">Ajustá tu ${sectionTitle.toLowerCase()}. Podés deslizar, tocar o usar ↑ ↓.</p>
				<div class="pesos-grid" role="group" aria-label="Selección de pesos">
					<section class="field">
						<h3>${sectionTitle}</h3>
						<div class="wheel-wrap">
							<div class="wheel" data-field="${wheelField}" aria-label="${wheelAria}" tabindex="0"></div>
							<div class="wheel-highlight" aria-hidden="true"></div>
						</div>
						<input type="hidden" id="${inputId}" required>
					</section>
				</div>
			</div>
		`,
		showCancelButton: true,
		confirmButtonText: "Guardar",
		cancelButtonText: "Cancelar",
		customClass: {
			popup: "perfil-swal",
			confirmButton: "perfil-swal-confirm",
			cancelButton: "perfil-swal-cancel",
		},
		didOpen: () => {
			const popup = (typeof swal.getPopup === "function" && swal.getPopup()) || document.querySelector(".swal2-popup");
			initPesoWheelInPopup(popup, { mode, currentPesoAct, currentPesoObj });
			popup?.querySelector(`.wheel[data-field="${wheelField}"]`)?.focus?.();
		},
		preConfirm: () => {
			const popup = (typeof swal.getPopup === "function" && swal.getPopup()) || document.querySelector(".swal2-popup");
			const value = parseInt(popup?.querySelector(`#${inputId}`)?.value || "", 10);
			if (!Number.isFinite(value) || value < 40 || value > 200) {
				if (typeof swal.showValidationMessage === "function") {
					swal.showValidationMessage(isObj ? "Peso objetivo inválido" : "Peso actual inválido");
				}
				return false;
			}
			return value;
		},
	});

	if (!result.isConfirmed) return;
	const newValue = result.value;
	if (isObj) {
		localStorage.setItem("peso_objetivo_usuario", String(newValue));
		const pesoObjSpan = document.getElementById("peso_objetivo_usuario");
		if (pesoObjSpan) pesoObjSpan.textContent = String(newValue);
	} else {
		localStorage.setItem("peso_usuario", String(newValue));
		const pesoSpan = document.getElementById("peso_usuario");
		if (pesoSpan) pesoSpan.textContent = String(newValue);
	}
	await subirCambiosPerfil();
};

document.getElementById("editar_peso").addEventListener("click", async () => {
	await openPesoModal({ mode: "act" });
})
document.getElementById("editar_peso_objetivo").addEventListener("click", async () => {
	await openPesoModal({ mode: "obj" });
})


document.getElementById("eliminar_cuenta").addEventListener("click", async () => {
	await EliminarPerfil()
})

async function EliminarPerfil(){
	const result = await swal.fire({
		title: '¿Estás seguro?',
		text: "Esta acción no se puede deshacer. Se eliminará toda tu información.",
		icon: 'warning',
		showCancelButton: true,
		confirmButtonText: 'Sí, eliminar mi cuenta',
		cancelButtonText: 'Cancelar',
		customClass: {
			popup: 'perfil-swal',
			confirmButton: 'perfil-swal-confirm',
			cancelButton: 'perfil-swal-cancel',
		},
	});

	if (!result.isConfirmed) return;

	let response;
	try {
		response = await fetch('/eliminar_cuenta_perfil', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id_usuario: id_usuario }),
		});
	} catch (e) {
		await swal.fire({
			icon: 'error',
			title: 'Error',
			text: 'No se pudo conectar con el servidor. Intentá nuevamente.',
			customClass: {
				popup: 'perfil-swal',
				confirmButton: 'perfil-swal-confirm',
			},
		});
		return;
	}

	if (!response.ok) {
		const payload = await response.json().catch(() => ({}));
		await swal.fire({
			icon: 'error',
			title: 'Error al eliminar',
			text: payload?.error ? String(payload.error) : 'No se pudo eliminar la cuenta. Intentá nuevamente.',
			customClass: {
				popup: 'perfil-swal',
				confirmButton: 'perfil-swal-confirm',
			},
		});
		return;
	}

	await swal.fire({
		icon: 'success',
		title: 'Cuenta eliminada',
		text: 'Tu cuenta ha sido eliminada correctamente.',
		toast: true,
		position: 'top-end',
		showConfirmButton: false,
		timer: 2500,
		timerProgressBar: true,
	});

	setTimeout(async () => {
		await logout();
	}, 800);
}

async function subirCambiosPerfil(){
	const response = await fetch('/cargar_cambios_perfil', {
		method: 'POST',
		body: JSON.stringify({
			id_usuario: id_usuario,
			altura_usuario: localStorage.getItem("altura_usuario"),
			edad_usuario: localStorage.getItem("edad_usuario"),
			peso_usuario: localStorage.getItem("peso_usuario"),
			peso_objetivo_usuario: localStorage.getItem("peso_objetivo_usuario"),
		}),
	});
	const result = await response.json().catch(() => ({}));
	if (response.ok) {
		swal.fire({
			icon: 'success',
			title: 'Cambios guardados',
			text: 'Tu perfil ha sido actualizado correctamente.',
			toast: true,
			position: 'top-end',
			showConfirmButton: false,
			timer: 2000,
			timerProgressBar: true,
		});
		console.log("Cambios de perfil subidos correctamente:", result);
	} else {
		console.error("Error al subir cambios de perfil:", result);
	}
}