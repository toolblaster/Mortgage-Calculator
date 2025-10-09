document.addEventListener('DOMContentLoaded', function() {
    // Determine the root path based on the current page's location
    let rootPath = './';
    const path = window.location.pathname;
    // If the path contains /blog/ or /calculators/, the root is one level up
    if (path.includes('/blog/') || path.includes('/calculators/')) {
        rootPath = '../';
    }

    // UPDATED: Removed index.html from homePath and added calculatorHubPath
    const homePath = rootPath;
    const calculatorHubPath = `${rootPath}calculators/`;
    const quizPath = `${rootPath}Refinance-Readiness-Quiz.html`;
    const legalPath = `${rootPath}contact-us-and-legal.html`; 
    const blogPath = `${rootPath}blog/`;
    
    const logoIconPath = '#logo-icon';

    const headerHTML = `
        <header class="bg-white/80 backdrop-blur-lg shadow-sm no-print sticky md:static top-0 z-40">
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
                    <!-- Desktop Menu -->
                    <div class="hidden md:flex items-center space-x-4">
                        <a href="${homePath}" class="text-sm font-semibold text-primary hover:underline">All-in-One Planner</a>
                        <a href="${calculatorHubPath}" class="text-sm font-semibold text-primary hover:underline">Calculator Hub</a>
                        <a href="${quizPath}" class="text-sm font-semibold text-primary hover:underline">Refinance Quiz</a>
                        <a href="${blogPath}" class="text-sm font-semibold text-primary hover:underline">Blog</a>
                        <a href="${legalPath}" class="text-sm font-semibold text-primary hover:underline">Contact & Legal</a>
                    </div>
                    <!-- Mobile menu button -->
                    <div class="md:hidden flex items-center">
                        <button id="mobile-menu-button" type="button" class="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary" aria-controls="mobile-menu" aria-expanded="false">
                            <span class="sr-only">Open main menu</span>
                            <svg id="hamburger-icon" class="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            <svg id="close-icon" class="hidden h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </nav>
            <!-- Mobile menu, show/hide based on menu state. -->
            <div class="md:hidden hidden" id="mobile-menu">
                <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                    <a href="${homePath}" class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50">All-in-One Planner</a>
                    <a href="${calculatorHubPath}" class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50">Calculator Hub</a>
                    <a href="${quizPath}" class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50">Refinance Quiz</a>
                    <a href="${blogPath}" class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50">Blog</a>
                    <a href="${legalPath}" class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50">Contact & Legal</a>
                </div>
            </div>
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
    
    // Add Mobile Menu Toggle Logic
    const menuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const hamburger = document.getElementById('hamburger-icon');
    const close = document.getElementById('close-icon');

    if (menuButton) {
        menuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            hamburger.classList.toggle('hidden');
            close.classList.toggle('hidden');
        });
    }

    // --- NEW: Centralized Related Articles Logic ---
    function setupRelatedArticles() {
        const desktopSidebar = document.querySelector('aside .sticky ul');
        const mobileSidebar = document.getElementById('mobile-related-articles');

        // If neither sidebar exists on the page, do nothing.
        if (!desktopSidebar && !mobileSidebar) {
            return;
        }

        const allArticles = [
            { url: 'home-equity-vs-refinance.html', title: 'Home Equity vs. Refinance', description: 'Decide how to best tap into your home\'s value.' },
            { url: 'hidden-costs-of-buying-a-home.html', title: 'Hidden Costs of Buying a Home', description: 'Discover the closing fees, taxes, and maintenance to plan for.' },
            { url: 'how-to-buy-your-first-home-guide.html', title: 'First-Time Home Buyer Guide', description: 'A step-by-step guide from start to finish.' },
            { url: 'mortgage-amortization-explained.html', title: 'Mortgage Amortization Explained', description: 'See where your payment really goes.' },
            { url: 'fixed-vs-variable-mortgage-guide.html', title: 'Fixed vs. Variable Mortgage', description: 'Choose the right loan type for you.' },
            { url: 'how-much-house-can-i-afford.html', title: 'How Much House Can I Afford?', description: 'A deep dive into budgeting for a home.' },
            { url: 'first-time-home-buyer-checklist.html', title: 'First-Time Home Buyer\'s Checklist', description: 'Your essential 10-step guide to success.' },
        ];

        const currentPage = window.location.pathname.split('/').pop();
        
        // Filter out the current article and shuffle the rest
        const relatedArticles = allArticles
            .filter(article => article.url !== currentPage)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3); // Show up to 3 related articles

        const articlesHtml = relatedArticles.map(article => `
            <li>
                <a href="${article.url}" class="font-semibold text-primary hover:underline group">
                    <span class="block text-sm">${article.title}</span>
                    <span class="block text-xs text-gray-500 group-hover:text-accent">${article.description}</span>
                </a>
            </li>
        `).join('');
        
        // Populate Desktop Sidebar if it exists
        if (desktopSidebar) {
            desktopSidebar.innerHTML = articlesHtml;
        }

        // Populate and manage Mobile Sidebar if it exists
        if (mobileSidebar) {
            const mobileList = mobileSidebar.querySelector('ul');
            if(mobileList) {
                mobileList.innerHTML = relatedArticles.map(article => `
                     <li>
                        <a href="${article.url}" class="font-semibold text-primary hover:underline group">
                            <span class="block text-sm">${article.title}</span>
                        </a>
                     </li>`).join('');
            }

            const closeButton = document.getElementById('close-mobile-sidebar');
            let sidebarShown = false;

            const showSidebar = () => { if (!sidebarShown) { mobileSidebar.classList.remove('translate-y-full'); sidebarShown = true; } };
            const hideSidebar = () => { mobileSidebar.classList.add('translate-y-full'); sidebarShown = false; };
            
            if(closeButton) closeButton.addEventListener('click', hideSidebar);
            
            window.addEventListener('scroll', () => { 
                if (!sidebarShown && (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) { 
                    showSidebar(); 
                } 
            }, { passive: true });
        }
    }

    setupRelatedArticles();

});
