/* Bottom sheet modal (slide from bottom) - lightweight helper.
   Exposes: window.PTBottomSheet.open(options) -> Promise<void>
*/

(() => {
	let activeClose = null;

	const FOCUSABLE_SELECTOR = [
		"button",
		"[href]",
		"input",
		"select",
		"textarea",
		"[tabindex]:not([tabindex='-1'])",
	].join(",");

	const lockScroll = () => {
		const root = document.documentElement;
		const prev = {
			overflow: root.style.overflow,
			paddingRight: root.style.paddingRight,
		};
		const scrollbarW = window.innerWidth - root.clientWidth;
		root.style.overflow = "hidden";
		if (scrollbarW > 0) root.style.paddingRight = `${scrollbarW}px`;
		return () => {
			root.style.overflow = prev.overflow;
			root.style.paddingRight = prev.paddingRight;
		};
	};

	const isHtml = (v) => typeof v === "string";

	const open = async ({
		title = "",
		subtitle = "",
		meta = "",
		ariaLabel = "",
		html = "",
		closeText = "Cerrar",
		className = "",
		showClose = false,
		showHandle = true,
		allowOutsideClose = true,
		allowEscapeClose = true,
		allowDragClose = true,
		didOpen,
		willClose,
	} = {}) => {
		if (!isHtml(html)) html = String(html ?? "");
		const existing = document.querySelector(".pt-sheet-overlay");
		if (existing) {
			try {
				existing.remove();
			} catch {
				// ignore
			}
		}

		const unlock = lockScroll();

		const overlay = document.createElement("div");
		overlay.className = "pt-sheet-overlay";
		overlay.setAttribute("role", "presentation");

		const sheet = document.createElement("section");
		sheet.className = `pt-sheet${className ? ` ${className}` : ""}`;
		sheet.setAttribute("role", "dialog");
		sheet.setAttribute("aria-modal", "true");
		if (ariaLabel) sheet.setAttribute("aria-label", ariaLabel);

		const titleId = `pt_sheet_title_${Math.random().toString(36).slice(2)}`;
		if (title) sheet.setAttribute("aria-labelledby", titleId);

		const header = document.createElement("header");
		header.className = "pt-sheet-header";

		const handle = showHandle
			? (() => {
				const el = document.createElement("div");
				el.className = "pt-sheet-handle";
				el.setAttribute("aria-hidden", "true");
				return el;
			})()
			: null;

		const titleWrap = document.createElement("div");
		titleWrap.className = "pt-sheet-titlewrap";

		const h2 = document.createElement("h2");
		h2.className = "pt-sheet-title";
		h2.id = titleId;
		h2.textContent = title || "";
		if (!title) h2.classList.add("sr-only");

		const sub = document.createElement("div");
		sub.className = "pt-sheet-subtitle";
		sub.textContent = subtitle || meta || "";
		if (!subtitle && !meta) sub.classList.add("sr-only");

		const closeBtn = showClose
			? (() => {
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "pt-sheet-close";
				btn.setAttribute("aria-label", closeText);
				btn.innerHTML = "<span aria-hidden=\"true\">×</span>";
				return btn;
			})()
			: null;

		titleWrap.appendChild(h2);
		titleWrap.appendChild(sub);
		if (handle) header.appendChild(handle);
		header.appendChild(titleWrap);
		if (closeBtn) header.appendChild(closeBtn);

		const content = document.createElement("div");
		content.className = "pt-sheet-content";
		content.innerHTML = html;

		sheet.appendChild(header);
		sheet.appendChild(content);
		overlay.appendChild(sheet);
		document.body.appendChild(overlay);

		let resolvePromise;
		const done = new Promise((resolve) => {
			resolvePromise = resolve;
		});

		let closed = false;
		let removeListeners = () => {};

		const close = () => {
			if (closed) return;
			closed = true;
			activeClose = null;

			try {
				if (typeof willClose === "function") willClose();
			} catch {
				// ignore
			}

			sheet.style.transform = "";
			overlay.classList.remove("is-open");
			sheet.classList.remove("is-open");

			const finish = () => {
				removeListeners();
				try {
					overlay.remove();
				} catch {
					// ignore
				}
				try {
					unlock();
				} catch {
					// ignore
				}
				resolvePromise();
			};

			// wait for transition end (fallback timeout)
			let t = null;
			const onEnd = (ev) => {
				if (ev && ev.target !== sheet) return;
				cleanup();
				finish();
			};
			const cleanup = () => {
				if (t) window.clearTimeout(t);
				sheet.removeEventListener("transitionend", onEnd);
			};
			sheet.addEventListener("transitionend", onEnd);
			t = window.setTimeout(() => {
				cleanup();
				finish();
			}, 260);
		};

		// Expose programmatic close for the current sheet
		activeClose = close;

		const onKeyDown = (ev) => {
			if (ev.key === "Escape") {
				if (!allowEscapeClose) return;
				ev.preventDefault();
				close();
				return;
			}

			// Basic focus trap
			if (ev.key !== "Tab") return;
			const focusables = Array.from(sheet.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
				return el instanceof HTMLElement && !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true";
			});
			if (!focusables.length) return;
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			const active = document.activeElement;
			if (ev.shiftKey) {
				if (active === first || active === sheet) {
					ev.preventDefault();
					last.focus();
				}
			} else {
				if (active === last) {
					ev.preventDefault();
					first.focus();
				}
			}
		};

		const onOverlayClick = (ev) => {
			// close only if clicking outside the sheet
			if (!allowOutsideClose) return;
			if (ev.target === overlay) close();
		};

		// Drag-to-close on the handle (downwards)
		let dragStartY = 0;
		let dragLastY = 0;
		let dragging = false;
		let dragStartedAt = 0;
		let activePointerId = null;

		const setDragState = (isDragging) => {
			if (isDragging) {
				sheet.classList.add("is-dragging");
				overlay.classList.add("is-dragging");
			} else {
				sheet.classList.remove("is-dragging");
				overlay.classList.remove("is-dragging");
			}
		};

		const beginDrag = (clientY) => {
			dragging = true;
			dragStartY = clientY;
			dragLastY = clientY;
			dragStartedAt = performance.now();
			setDragState(true);
		};

		const moveDrag = (clientY) => {
			if (!dragging) return;
			dragLastY = clientY;
			const delta = Math.max(0, dragLastY - dragStartY);
			sheet.style.transform = `translateY(${delta}px)`;
			const fade = Math.min(0.68, delta / 420);
			overlay.style.opacity = String(1 - fade);
		};

		const endDrag = () => {
			if (!dragging) return;
			dragging = false;
			setDragState(false);

			const delta = Math.max(0, dragLastY - dragStartY);
			const elapsed = Math.max(1, performance.now() - dragStartedAt);
			const velocity = (delta / elapsed) * 1000; // px/s
			const threshold = Math.min(180, sheet.getBoundingClientRect().height * 0.28);

			overlay.style.opacity = "";

			if (delta >= threshold || velocity >= 900) {
				close();
				return;
			}

			// Snap back
			sheet.style.transform = "";
		};

		const isDragZone = (target) => {
			if (!(target instanceof HTMLElement)) return false;
			return (
				!!target.closest(".pt-sheet-handle") ||
				!!target.closest(".pt-sheet-header") ||
				!!target.closest(".pt-detail-hero")
			);
		};

		const onDragPointerDown = (ev) => {
			if (!(ev instanceof PointerEvent)) return;
			if (ev.pointerType === "mouse" && ev.button !== 0) return;
			if (!allowDragClose) return;
			if (!isDragZone(ev.target)) return;
			activePointerId = ev.pointerId;
			beginDrag(ev.clientY);
			try {
				sheet.setPointerCapture(ev.pointerId);
			} catch {
				// ignore
			}
		};

		const onDragPointerMove = (ev) => {
			if (!dragging) return;
			if (!(ev instanceof PointerEvent)) return;
			if (activePointerId != null && ev.pointerId !== activePointerId) return;
			moveDrag(ev.clientY);
		};

		const onDragPointerUp = (ev) => {
			if (!(ev instanceof PointerEvent)) return;
			if (activePointerId != null && ev.pointerId !== activePointerId) return;
			activePointerId = null;
			endDrag();
		};

		// Touch fallback (older mobile browsers)
		const onDragTouchStart = (ev) => {
			const t = ev.touches && ev.touches[0];
			if (!t) return;
			if (!allowDragClose) return;
			if (!isDragZone(ev.target)) return;
			beginDrag(t.clientY);
		};
		const onDragTouchMove = (ev) => {
			if (!dragging) return;
			const t = ev.touches && ev.touches[0];
			if (!t) return;
			// Prevent page scroll while dragging the handle
			try { ev.preventDefault(); } catch { }
			moveDrag(t.clientY);
		};
		const onDragTouchEnd = () => {
			endDrag();
		};

		removeListeners = () => {
			document.removeEventListener("keydown", onKeyDown);
			overlay.removeEventListener("click", onOverlayClick);
			if (closeBtn) closeBtn.removeEventListener("click", close);
			sheet.removeEventListener("pointerdown", onDragPointerDown);
			sheet.removeEventListener("pointermove", onDragPointerMove);
			sheet.removeEventListener("pointerup", onDragPointerUp);
			sheet.removeEventListener("pointercancel", onDragPointerUp);
			sheet.removeEventListener("touchstart", onDragTouchStart);
			sheet.removeEventListener("touchmove", onDragTouchMove);
			sheet.removeEventListener("touchend", onDragTouchEnd);
			sheet.removeEventListener("touchcancel", onDragTouchEnd);
		};

		document.addEventListener("keydown", onKeyDown);
		overlay.addEventListener("click", onOverlayClick);
		if (closeBtn) closeBtn.addEventListener("click", close);
		sheet.addEventListener("pointerdown", onDragPointerDown);
		sheet.addEventListener("pointermove", onDragPointerMove);
		sheet.addEventListener("pointerup", onDragPointerUp);
		sheet.addEventListener("pointercancel", onDragPointerUp);
		// Use non-passive touchmove so preventDefault works
		sheet.addEventListener("touchstart", onDragTouchStart, { passive: true });
		sheet.addEventListener("touchmove", onDragTouchMove, { passive: false });
		sheet.addEventListener("touchend", onDragTouchEnd, { passive: true });
		sheet.addEventListener("touchcancel", onDragTouchEnd, { passive: true });

		// open animation
		requestAnimationFrame(() => {
			overlay.classList.add("is-open");
			sheet.classList.add("is-open");
		});

		// Focus the sheet (keeps keyboard users inside)
		setTimeout(() => {
			try {
				sheet.setAttribute("tabindex", "-1");
				sheet.focus();
			} catch {
				// ignore
			}
		}, 0);

		try {
			if (typeof didOpen === "function") didOpen(sheet);
		} catch {
			// ignore
		}

		await done;
	};

	const close = () => {
		try {
			if (typeof activeClose === "function") activeClose();
		} catch {
			// ignore
		}
	};

	window.PTBottomSheet = { open, close };
})();
