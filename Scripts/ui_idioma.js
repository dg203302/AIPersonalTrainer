(() => {
	"use strict";

	const STORAGE_KEY = "ui_idioma";
	const ES = "es";
	const EN = "en";

	const normalizeLang = (value) => (String(value).toLowerCase() === EN ? EN : ES);

	const getIdioma = () => {
		try {
			return normalizeLang(localStorage.getItem(STORAGE_KEY));
		} catch {
			return ES;
		}
	};

	const applyIdioma = (lang) => {
		const normalized = normalizeLang(lang);
		document.documentElement.lang = normalized;
		document.documentElement.classList.toggle("lang-en", normalized === EN);
	};

	const setIdioma = (lang) => {
		const normalized = normalizeLang(lang);
		try {
			localStorage.setItem(STORAGE_KEY, normalized);
		} catch {
			// ignore
		}
		applyIdioma(normalized);
		translatePage(document);
		return normalized;
	};

	const toDatasetKey = (attrName) => {
		const pascal = String(attrName)
			.split("-")
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join("");
		return `i18nEs${pascal}`;
	};

	const translateElement = (el, lang) => {
		if (!(el instanceof Element)) return;

		const normalized = normalizeLang(lang);

		const enText = el.getAttribute("data-i18n-en");
		if (enText !== null) {
			if (!el.dataset.i18nEs) el.dataset.i18nEs = el.textContent ?? "";
			el.textContent = normalized === EN ? enText : el.dataset.i18nEs;
		}

		const attrs = ["aria-label", "title", "placeholder", "alt"];
		for (const attr of attrs) {
			const enAttr = el.getAttribute(`data-i18n-en-${attr}`);
			if (enAttr === null) continue;

			const datasetKey = toDatasetKey(attr);
			if (!(datasetKey in el.dataset)) {
				const current = el.getAttribute(attr);
				el.dataset[datasetKey] = current ?? "";
			}

			if (normalized === EN) el.setAttribute(attr, enAttr);
			else el.setAttribute(attr, el.dataset[datasetKey] ?? "");
		}
	};

	const translatePage = (root = document) => {
		const lang = getIdioma();
		applyIdioma(lang);

		const selector = [
			"[data-i18n-en]",
			"[data-i18n-en-aria-label]",
			"[data-i18n-en-title]",
			"[data-i18n-en-placeholder]",
		].join(",");

		if (root instanceof Element) {
			if (root.matches(selector)) translateElement(root, lang);
			root.querySelectorAll(selector).forEach((el) => translateElement(el, lang));
			return;
		}

		// Document
		document.querySelectorAll(selector).forEach((el) => translateElement(el, lang));
	};

	window.UIIdioma = {
		getIdioma,
		setIdioma,
		applyIdioma,
		translatePage,
	};

	// Apply ASAP and translate when DOM is ready.
	applyIdioma(getIdioma());
	if (document.readyState === "loading") {
		document.addEventListener(
			"DOMContentLoaded",
			() => {
				translatePage(document);
			},
			{ once: true },
		);
	} else {
		translatePage(document);
	}
})();
