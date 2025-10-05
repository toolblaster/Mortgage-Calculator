document.addEventListener('DOMContentLoaded', function() {
    const isBlogPage = window.location.pathname.includes('/blog/');

    // Determine the correct root path relative to the current page.
    const rootPath = isBlogPage ? '../' : './';

    const homePath = rootPath;
    const legalPath = `${rootPath}legal.html`;
    const blogPath = `${rootPath}blog/`;
    
    // The logo is an SVG symbol defined on the page, so its href doesn't need path correction.
    const logoIconPath = '#logo-icon';

    const headerHTML = `
        <header class="bg-white/80 backdrop-blur-lg shadow-sm no-print">
            <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-16">
                    <a href="${homePath}" class="flex items-center space-x-3 text-primary hover:opacity-90 transition-opacity">
                        <svg class="h-9 w-9" aria-hidden="true">
                            <use href="${logoIconPath}"></use>
                        </svg>
                        <span class="font-extrabold text-xl text-gray-800">
                            <span class="border-b-4 border-sky-500 pb-0.5">Strategic</span>
                            <span class="text-gray-600 font-bold">Mortgage Planner</span>
                        </span>
                    </a>
                    <div class="flex items-center space-x-4">
                        <a href="${homePath}" class="text-sm font-semibold text-primary hover:underline">Calculator</a>
                        <a href="${blogPath}" class="text-sm font-semibold text-primary hover:underline">Blog</a>
                        <a href="${legalPath}" class="text-sm font-semibold text-primary hover:underline">Contact & Legal</a>
                    </div>
                </div>
            </nav>
        </header>
    `;

    const footerHTML = `
        <footer class="bg-gray-800 text-gray-400 text-sm no-print">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div class="text-center text-xs space-y-1">
                    <p>&copy; <span id="copyright-year"></span> Strategic Mortgage Planner. All Rights Reserved.</p>
                    <p>A proud part of the <a href="https://toolblaster.com" target="_blank" rel="noopener noreferrer" class="text-white hover:underline font-semibold">toolblaster.com</a> Network</p>
                     <p><strong>Disclaimer:</strong> This tool is for informational purposes only. Consult a financial professional before making decisions.</p>
                </div>
            </div>
        </footer>
    `;

    const svgIcon = `
        <svg width="0" height="0" class="absolute">
          <defs>
            <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#0ea5e9;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#1C768F;stop-opacity:1" />
            </linearGradient>
          </defs>
          <symbol id="logo-icon" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="20" fill="url(#logo-gradient)"/>
            <path d="M50 25L25 45V75H41.6667V58.3333H58.3333V75H75V45L50 25Z" stroke="white" stroke-width="7" stroke-linejoin="round"/>
            <path d="M40 65L50 55L60 65" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M50 55V45" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
          </symbol>
        </svg>
    `;

    document.body.insertAdjacentHTML('afterbegin', svgIcon);
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
    document.body.insertAdjacentHTML('beforeend', footerHTML);

    const copyrightYearEl = document.getElementById('copyright-year');
    if (copyrightYearEl) {
        copyrightYearEl.textContent = new Date().getFullYear();
    }
});
