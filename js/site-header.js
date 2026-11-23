/**
 * سربرگ یکپارچهٔ نوبتینو
 *
 * این اسکریپت اولین عنصر <header> صفحه را با سربرگ مشترک جایگزین می‌کند.
 * در انتهای <body> و پس از مارک‌آپ صفحه بارگذاری شود.
 *
 * عنصری با [data-header-actions] که از قبل داخل هدر باشد (مثل زرهٔ اعلان‌ها)
 * حفظ و در سمت مقابل لوگو قرار می‌گیرد.
 *
 * مقادیر بصری از docs/design-system.md گرفته شده‌اند.
 */
(function () {
	'use strict';

	// آدرس‌ها نسبت به محل این فایل حل می‌شوند تا در همهٔ صفحه‌ها یکی باشند.
	const scriptUrl = document.currentScript ? document.currentScript.src : '';
	const root = scriptUrl ? new URL('../', scriptUrl).href : '';
	const page = name => root + 'html/' + name;

	const LANDING = page('P01-landing.html');
	const currentPage = decodeURIComponent(location.pathname.split('/').pop() || '');

	const NAV_ITEMS = [
		{ label: 'جست‌وجو', href: currentPage === 'P01-landing.html' ? '#search' : LANDING + '#search' },
		{ label: 'تخصص‌ها', href: currentPage === 'P01-landing.html' ? '#specialties' : LANDING + '#specialties' },
		{ label: 'درباره ما', href: currentPage === 'P01-landing.html' ? '#about' : LANDING + '#about' },
		{ label: 'تماس', href: currentPage === 'P01-landing.html' ? '#contact' : LANDING + '#contact' },
		{ label: 'پنل کاربر', href: page('P04-user-panel.html'), file: 'P04-user-panel.html' },
		{ label: 'پنل پزشک', href: page('P05-doctor-panel.html'), file: 'P05-doctor-panel.html' }
	];

	const CSS = `
		.nbh {
			background: var(--white, #FFFFFF);
			border-bottom: 1px solid var(--border, #DCE6EB);
			position: sticky;
			top: 0;
			z-index: 100;
			font-family: 'Vazirmatn', system-ui, sans-serif;
			color: var(--text-primary, #111827);
		}
		.nbh-container {
			max-width: 1200px;
			margin: 0 auto;
			padding: 0 20px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 16px;
			min-height: 72px;
		}
		.nbh-logo {
			display: flex;
			align-items: center;
			flex-shrink: 0;
		}
		.nbh-logo img {
			height: 40px;
			width: auto;
			object-fit: contain;
			display: block;
		}
		.nbh-nav {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 4px;
			flex: 1;
		}
		.nbh-nav a {
			display: inline-flex;
			align-items: center;
			min-height: 44px;
			padding: 0 14px;
			border-radius: 999px;
			font-size: 15px;
			font-weight: 500;
			color: var(--text-primary, #111827);
			text-decoration: none;
			white-space: nowrap;
			transition: color 0.2s, background-color 0.2s;
		}
		.nbh-nav a:hover {
			color: var(--primary, #3262CE);
			background: var(--primary-light, #E7F0FB);
			text-decoration: none;
		}
		.nbh-nav a[aria-current="page"] {
			color: var(--primary, #3262CE);
			background: var(--primary-light, #E7F0FB);
			font-weight: 600;
		}
		.nbh-actions {
			display: flex;
			align-items: center;
			gap: 8px;
			flex-shrink: 0;
		}
		.nbh-btn {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			min-height: 44px;
			padding: 0 20px;
			border-radius: 999px;
			border: none;
			cursor: pointer;
			font-family: inherit;
			font-size: 14px;
			font-weight: 600;
			text-decoration: none;
			transition: background-color 0.2s, box-shadow 0.2s;
		}
		.nbh-btn:hover { text-decoration: none; }
		.nbh-btn-primary {
			background: var(--primary, #3262CE);
			color: var(--white, #FFFFFF);
		}
		.nbh-btn-primary:hover { background: #2654B8; }
		.nbh-btn-secondary {
			background: transparent;
			color: var(--primary, #3262CE);
			border: 1.5px solid var(--primary, #3262CE);
		}
		.nbh-btn-secondary:hover { background: var(--primary-light, #E7F0FB); }
		.nbh-menu-btn {
			display: none;
			align-items: center;
			justify-content: center;
			width: 44px;
			height: 44px;
			border-radius: 999px;
			border: 1px solid var(--border, #DCE6EB);
			background: var(--white, #FFFFFF);
			color: var(--dark, #111B30);
			font-size: 18px;
			cursor: pointer;
		}
		.nbh-mobile {
			display: none;
			flex-direction: column;
			gap: 4px;
			max-width: 1200px;
			margin: 0 auto;
			padding: 0 20px 16px;
		}
		.nbh.open .nbh-mobile { display: flex; }
		.nbh-mobile a, .nbh-mobile .nbh-btn {
			display: flex;
			align-items: center;
			min-height: 44px;
			padding: 0 14px;
			border-radius: 12px;
			font-size: 15px;
			font-weight: 500;
			color: var(--text-primary, #111827);
			text-decoration: none;
		}
		.nbh-mobile a:hover { background: var(--primary-light, #E7F0FB); text-decoration: none; }
		.nbh-mobile a[aria-current="page"] {
			color: var(--primary, #3262CE);
			background: var(--primary-light, #E7F0FB);
			font-weight: 600;
		}
		.nbh-auth { display: flex; gap: 8px; }
		.nbh-auth .nbh-btn { min-height: 40px; padding: 0 18px; }
		.nbh-mobile-auth { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
		.nbh-mobile-auth .nbh-secondary { border: 1.5px solid var(--primary, #3262CE); color: var(--primary, #3262CE); }

		@media (max-width: 900px) {
			.nbh-container { min-height: 64px; }
			.nbh-nav, .nbh-auth { display: none; }
			.nbh-menu-btn { display: inline-flex; }
		}
		@media (max-width: 480px) {
			.nbh-container, .nbh-mobile { padding: 0 16px; }
			.nbh-mobile { padding-bottom: 16px; }
			.nbh-logo img { height: 32px; }
		}
		@media (prefers-reduced-motion: reduce) {
			.nbh * { transition: none !important; }
		}
	`;

	function navLink(item) {
		const current = item.file && item.file === currentPage ? ' aria-current="page"' : '';
		return `<a href="${item.href}"${current}>${item.label}</a>`;
	}

	function render() {
		const header = document.querySelector('header');
		if (!header || header.dataset.headerReady === 'true') return;

		// اقدام‌های اختصاصی صفحه (مثل اعلان‌ها) پیش از بازسازی حفظ می‌شوند.
		const pageActions = header.querySelector('[data-header-actions]');

		const style = document.createElement('style');
		style.id = 'nbh-style';
		style.textContent = CSS;
		document.head.appendChild(style);

		header.classList.add('nbh');
		header.setAttribute('data-header-ready', 'true');
		header.innerHTML = `
			<div class="nbh-container">
				<a class="nbh-logo" href="${LANDING}" aria-label="نوبتینو - صفحهٔ اصلی">
					<img src="${root}images/Logo.png" alt="نوبتینو">
				</a>
				<nav class="nbh-nav" aria-label="ناوبری اصلی">${NAV_ITEMS.map(navLink).join('')}</nav>
				<div class="nbh-actions">
					<div class="nbh-auth">
						<button type="button" class="nbh-btn nbh-btn-secondary">ورود</button>
						<button type="button" class="nbh-btn nbh-btn-primary">ثبت‌نام</button>
					</div>
					<div class="nbh-page-actions"></div>
					<button type="button" class="nbh-menu-btn" aria-label="باز و بسته کردن منو" aria-expanded="false" aria-controls="nbhMobile">
						<i class="fas fa-bars" aria-hidden="true"></i>
					</button>
				</div>
			</div>
			<nav class="nbh-mobile" id="nbhMobile" aria-label="ناوبری موبایل">
				${NAV_ITEMS.map(navLink).join('')}
				<div class="nbh-mobile-auth">
					<button type="button" class="nbh-btn nbh-btn-secondary">ورود</button>
					<button type="button" class="nbh-btn nbh-btn-primary">ثبت‌نام</button>
				</div>
			</nav>
		`;

		if (pageActions) {
			header.querySelector('.nbh-page-actions').appendChild(pageActions);
		}

		const toggle = header.querySelector('.nbh-menu-btn');
		const setOpen = open => {
			header.classList.toggle('open', open);
			toggle.setAttribute('aria-expanded', String(open));
			toggle.querySelector('i').className = open ? 'fas fa-xmark' : 'fas fa-bars';
		};
		toggle.addEventListener('click', () => setOpen(!header.classList.contains('open')));
		header.querySelectorAll('.nbh-mobile a').forEach(link => {
			link.addEventListener('click', () => setOpen(false));
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', render);
	} else {
		render();
	}
})();
