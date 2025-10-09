document.addEventListener('DOMContentLoaded', function() {
    // Determine the root path based on the current page's location
    let rootPath = './';
    const path = window.location.pathname;
    // If the path contains /blog/ or /calculators/, the root is one level up
    if (path.includes('/blog/') || path.includes('/calculators/')) {
        rootPath = '../';
    }

    const homePath = rootPath;
    const quizPath = `${rootPath}Refinance-Readiness-Quiz.html`;
    const calcHubPath = `${rootPath}calculators/`;
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
                        <a href="${calcHubPath}" class="text-sm font-semibold text-primary hover:underline">Calculator Hub</a>
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
                    <a href="${calcHubPath}" class="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50">Calculator Hub</a>
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

    // --- NEW: Centralized Social Sharing ---
    function setupSocialSharing() {
        const placeholder = document.getElementById('share-section-placeholder');
        if (!placeholder) return;

        const shareHTML = `
            <div class="bg-gray-50 border-t border-gray-200 py-4 no-print">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
                        <h3 class="text-xs font-semibold text-gray-800">Found this helpful? Share it:</h3>
                        <div class="flex items-center gap-3">
                            <a id="global-share-twitter" href="#" target="_blank" rel="noopener noreferrer" title="Share on Twitter" class="p-2 bg-[#1DA1F2] text-white rounded-full hover:bg-[#0c85d0] transition-colors shadow-md">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.223.085a4.93 4.93 0 004.6 3.419A9.9 9.9 0 010 17.54a13.94 13.94 0 007.547 2.21c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                            </a>
                            <a id="global-share-facebook" href="#" target="_blank" rel="noopener noreferrer" title="Share on Facebook" class="p-2 bg-[#1877F2] text-white rounded-full hover:bg-[#166fe5] transition-colors shadow-md">
                                 <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clip-rule="evenodd"/></svg>
                            </a>
                            <a id="global-share-linkedin" href="#" target="_blank" rel="noopener noreferrer" title="Share on LinkedIn" class="p-2 bg-[#0077B5] text-white rounded-full hover:bg-[#006097] transition-colors shadow-md">
                                 <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                            </a>
                            <a id="global-share-whatsapp" href="#" target="_blank" rel="noopener noreferrer" title="Share on WhatsApp" class="p-2 bg-[#25D366] text-white rounded-full hover:bg-[#1ebe59] transition-colors shadow-md">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.31-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/></svg>
                            </a>
                            <a id="global-share-email" href="#" title="Share via Email" class="p-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors shadow-md">
                                 <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path></svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        placeholder.innerHTML = shareHTML;
        
        const pageUrl = encodeURIComponent(window.location.href);
        const pageTitle = encodeURIComponent(document.title);
        const pageSource = "Strategic Mortgage Planner";

        document.getElementById('global-share-twitter').href = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}`;
        document.getElementById('global-share-facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
        document.getElementById('global-share-linkedin').href = `https://www.linkedin.com/shareArticle?mini=true&url=${pageUrl}&title=${pageTitle}&source=${pageSource}`;
        document.getElementById('global-share-whatsapp').href = `https://api.whatsapp.com/send?text=${pageTitle}%20${pageUrl}`;
        document.getElementById('global-share-email').href = `mailto:?subject=${pageTitle}&body=Check out this helpful tool: ${pageUrl}`;
    }

    // --- NEW: Centralized Related Articles ---
    function setupRelatedArticles() {
        const desktopPlaceholder = document.getElementById('desktop-sidebar-placeholder');
        const mobilePlaceholder = document.getElementById('mobile-sidebar-placeholder');

        const articles = [
            { href: "how-to-buy-your-first-home-guide.html", title: "First-Time Home Buyer Guide", desc: "A step-by-step overview." },
            { href: "mortgage-amortization-explained.html", title: "Mortgage Amortization Explained", desc: "See your loan cost breakdown." },
            { href: "fixed-vs-variable-mortgage-guide.html", title: "Fixed vs. Variable Mortgage?", desc: "Choose the right loan type." },
            { href: "how-much-house-can-i-afford.html", title: "How Much House Can I Afford?", desc: "A deep dive into budgeting." },
            { href: "first-time-home-buyer-checklist.html", title: "First-Time Home Buyer's Checklist", desc: "Your essential 10-step guide." }
        ];

        const currentPage = window.location.pathname.split('/').pop();
        const relatedArticles = articles.filter(article => article.href !== currentPage).slice(0, 3);

        if (relatedArticles.length === 0) return;

        const generateLinksHTML = (articles) => {
            return articles.map(article => `
                <li>
                    <a href="${article.href}" class="font-semibold text-primary hover:underline group">
                        <span class="block text-sm">${article.title}</span>
                        <span class="block text-xs text-gray-500 group-hover:text-accent">${article.desc}</span>
                    </a>
                </li>
            `).join('');
        };
        
        if (desktopPlaceholder) {
            desktopPlaceholder.innerHTML = `
                <div class="sticky top-24">
                    <div class="sidebar-widget">
                         <h3 class="sidebar-title">Related Guides</h3>
                         <ul class="space-y-4">${generateLinksHTML(relatedArticles)}</ul>
                    </div>
                </div>
            `;
        }

        if (mobilePlaceholder) {
            mobilePlaceholder.innerHTML = `
                <div id="mobile-related-articles" class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg transform translate-y-full transition-transform duration-300 ease-in-out z-40">
                    <div class="flex justify-between items-center mb-3">
                         <h3 class="font-bold text-md text-primary">Related Articles</h3>
                         <button id="close-mobile-sidebar" class="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                    </div>
                     <ul class="space-y-3">${generateLinksHTML(relatedArticles)}</ul>
                </div>
            `;

            const mobileSidebar = document.getElementById('mobile-related-articles');
            const closeButton = document.getElementById('close-mobile-sidebar');
            let sidebarShown = false;
            if (mobileSidebar && closeButton) {
                const showSidebar = () => { if (!sidebarShown) { mobileSidebar.classList.remove('translate-y-full'); sidebarShown = true; } };
                const hideSidebar = () => { mobileSidebar.classList.add('translate-y-full'); sidebarShown = false; };
                closeButton.addEventListener('click', hideSidebar);
                window.addEventListener('scroll', () => { if (!sidebarShown && (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) { showSidebar(); } }, { passive: true });
            }
        }
    }
    
    // --- Run on page load ---
    setupSocialSharing();
    setupRelatedArticles();
});
