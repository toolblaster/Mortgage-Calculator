document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Element Cache ---
    const DOM = {
        homeValue: document.getElementById('homeValue'),
        mortgageBalance: document.getElementById('mortgageBalance'),
        ltvRatio: document.getElementById('ltvRatio'),
        helocTerm: document.getElementById('helocTerm'),
        helocRateSlider: document.getElementById('helocRateSlider'),
        helocRateValue: document.getElementById('helocRateValue'),
        refiTerm: document.getElementById('refiTerm'),
        refiClosingCosts: document.getElementById('refiClosingCosts'),
        refiRateSlider: document.getElementById('refiRateSlider'),
        refiRateValue: document.getElementById('refiRateValue'),
        compareBtn: document.getElementById('compareOptionsBtn'),
        saveBtn: document.getElementById('saveScenario'),
        saveFeedback: document.getElementById('saveFeedback'),
        totalEquityEl: document.getElementById('totalEquity'),
        availableEquityEl: document.getElementById('availableEquity'),
        helocMonthlyPaymentEl: document.getElementById('helocMonthlyPayment'),
        helocTotalInterestEl: document.getElementById('helocTotalInterest'),
        refiMonthlyPaymentEl: document.getElementById('refiMonthlyPayment'),
        refiTotalInterestEl: document.getElementById('refiTotalInterest'),
        equityChartCanvas: document.getElementById('equityChart'),
        comparisonChartCanvas: document.getElementById('comparisonChart'),
        faqAccordion: document.getElementById('faq-accordion'),
    };

    let equityChart = null;
    let comparisonChart = null;

    // --- Helper Functions ---
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
    };

    function animateValue(el, endValue, duration = 500) {
        if (!el) return;
        let startValue = parseFloat(el.dataset.value) || 0;
        el.dataset.value = endValue;
        let startTime = null;
        
        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const currentValue = startValue + (endValue - startValue) * progress;
            el.textContent = formatCurrency(currentValue);
            if (progress < 1) requestAnimationFrame(animation);
            else el.textContent = formatCurrency(endValue);
        }
        requestAnimationFrame(animation);
    }
    
    // --- Chart Rendering ---
    function renderEquityChart(mortgageBalance, totalEquity) {
        const ctx = DOM.equityChartCanvas.getContext('2d');
        if (equityChart) equityChart.destroy();
        equityChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Mortgage Balance', 'Your Equity'],
                datasets: [{ data: [mortgageBalance, totalEquity], backgroundColor: ['#1C768F', '#166534'], borderColor: '#ffffff', borderWidth: 3 }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => `${c.label}: ${formatCurrency(c.parsed)}` } } } }
        });
    }

    function renderComparisonChart(helocPayment, refiPayment, helocInterest, refiInterest) {
        const ctx = DOM.comparisonChartCanvas.getContext('2d');
        if (comparisonChart) comparisonChart.destroy();
        comparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Monthly Payment', 'Total Interest Paid'],
                datasets: [
                    { label: 'HELOC', data: [helocPayment, helocInterest], backgroundColor: '#3b82f6', },
                    { label: 'Cash-Out Refinance', data: [refiPayment, refiInterest], backgroundColor: '#10b981', }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${formatCurrency(c.raw)}` } } }, scales: { y: { beginAtZero: true, ticks: { callback: v => formatCurrency(v) } } } }
        });
    }

    // --- Core Calculation Logic ---
    function calculatePaymentAndInterest(principal, annualRate, termYears) {
        if (principal <= 0 || annualRate <= 0 || termYears <= 0) {
            return { payment: 0, totalInterest: 0 };
        }
        const monthlyRate = annualRate / 12 / 100;
        const numberOfPayments = termYears * 12;
        const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
        const totalPaid = payment * numberOfPayments;
        const totalInterest = totalPaid - principal;
        return { payment, totalInterest };
    }

    function runComparison() {
        const homeValue = parseFloat(DOM.homeValue.value) || 0;
        const mortgageBalance = parseFloat(DOM.mortgageBalance.value) || 0;
        const ltvRatio = (parseFloat(DOM.ltvRatio.value) || 85) / 100;
        
        if (homeValue <= 0) {
            if (equityChart) equityChart.destroy();
            if (comparisonChart) comparisonChart.destroy();
            return;
        }

        const totalEquity = Math.max(0, homeValue - mortgageBalance);
        const maxLoanAmount = homeValue * ltvRatio;
        const availableEquity = Math.max(0, maxLoanAmount - mortgageBalance);

        // HELOC Calculation
        const helocRate = parseFloat(DOM.helocRateSlider.value) || 0;
        const helocTerm = parseFloat(DOM.helocTerm.value) || 0;
        const helocResult = calculatePaymentAndInterest(availableEquity, helocRate, helocTerm);
        
        // Cash-Out Refinance Calculation
        const refiRate = parseFloat(DOM.refiRateSlider.value) || 0;
        const refiTerm = parseFloat(DOM.refiTerm.value) || 0;
        const refiClosingCosts = parseFloat(DOM.refiClosingCosts.value) || 0;
        const newLoanAmount = mortgageBalance + availableEquity + refiClosingCosts;
        const refiResult = calculatePaymentAndInterest(newLoanAmount, refiRate, refiTerm);

        // --- Render Results ---
        animateValue(DOM.totalEquityEl, totalEquity);
        animateValue(DOM.availableEquityEl, availableEquity);
        animateValue(DOM.helocMonthlyPaymentEl, helocResult.payment);
        animateValue(DOM.helocTotalInterestEl, helocResult.totalInterest);
        animateValue(DOM.refiMonthlyPaymentEl, refiResult.payment);
        animateValue(DOM.refiTotalInterestEl, refiResult.totalInterest);
        
        // --- Render Charts ---
        renderEquityChart(mortgageBalance, totalEquity);
        renderComparisonChart(helocResult.payment, refiResult.payment, helocResult.totalInterest, refiResult.totalInterest);
    }

    // --- URL Parameter Handling ---
    function saveScenarioToURL() {
        const params = new URLSearchParams();
        params.set('hv', DOM.homeValue.value);
        params.set('mb', DOM.mortgageBalance.value);
        params.set('ltv', DOM.ltvRatio.value);
        params.set('heloc_ir', DOM.helocRateSlider.value);
        params.set('heloc_lt', DOM.helocTerm.value);
        params.set('refi_ir', DOM.refiRateSlider.value);
        params.set('refi_lt', DOM.refiTerm.value);
        params.set('refi_cc', DOM.refiClosingCosts.value);
        
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        history.pushState({}, '', newUrl);

        DOM.saveFeedback.textContent = 'Scenario saved to URL!';
        setTimeout(() => { DOM.saveFeedback.textContent = ''; }, 3000);
    }
    
    function populateFromURL() {
        const params = new URLSearchParams(window.location.search);
        const setVal = (key, el) => { if (params.has(key)) el.value = params.get(key); };
        const setSlider = (key, slider, label) => {
            if (params.has(key)) {
                const val = params.get(key);
                slider.value = val;
                label.textContent = `${val}%`;
            }
        };

        setVal('hv', DOM.homeValue);
        setVal('mb', DOM.mortgageBalance);
        setVal('ltv', DOM.ltvRatio);
        setVal('heloc_lt', DOM.helocTerm);
        setSlider('heloc_ir', DOM.helocRateSlider, DOM.helocRateValue);
        setVal('refi_lt', DOM.refiTerm);
        setVal('refi_cc', DOM.refiClosingCosts);
        setSlider('refi_ir', DOM.refiRateSlider, DOM.refiRateValue);
        
        if (params.toString().length > 0) {
            runComparison();
        }
    }
    
    // --- Social Sharing ---
    function setupSharing() {
        const pageUrl = encodeURIComponent(window.location.href);
        const pageTitle = encodeURIComponent(document.title);
        const pageSource = encodeURIComponent("Strategic Mortgage Planner");

        document.getElementById('share-twitter-equity').href = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}`;
        document.getElementById('share-facebook-equity').href = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
        document.getElementById('share-linkedin-equity').href = `https://www.linkedin.com/shareArticle?mini=true&url=${pageUrl}&title=${pageTitle}&source=${pageSource}`;
        document.getElementById('share-whatsapp-equity').href = `https://api.whatsapp.com/send?text=${pageTitle}%20${pageUrl}`;
        document.getElementById('share-email-equity').href = `mailto:?subject=${pageTitle}&body=Check out this helpful calculator: ${pageUrl}`;
    }

    // --- FAQ Accordion ---
    function setupFAQ() {
        if (!DOM.faqAccordion) return;
        const faqItems = DOM.faqAccordion.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            const chevron = item.querySelector('.faq-chevron');

            question.addEventListener('click', () => {
                const isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';
                
                // Close all other items
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.querySelector('.faq-answer').style.maxHeight = '0px';
                        otherItem.querySelector('.faq-chevron').classList.remove('rotate-180');
                    }
                });

                // Toggle the clicked item
                if (isOpen) {
                    answer.style.maxHeight = '0px';
                    chevron.classList.remove('rotate-180');
                } else {
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    chevron.classList.add('rotate-180');
                }
            });
        });
    }

    // --- Event Listeners ---
    if (DOM.compareBtn) DOM.compareBtn.addEventListener('click', runComparison);
    if (DOM.saveBtn) DOM.saveBtn.addEventListener('click', saveScenarioToURL);
    if (DOM.helocRateSlider) DOM.helocRateSlider.addEventListener('input', (e) => { DOM.helocRateValue.textContent = `${e.target.value}%`; });
    if (DOM.refiRateSlider) DOM.refiRateSlider.addEventListener('input', (e) => { DOM.refiRateValue.textContent = `${e.target.value}%`; });
    
    // --- Initial Load ---
    populateFromURL();
    setupSharing();
    setupFAQ();
    if (!window.location.search) {
        runComparison();
    }
});
