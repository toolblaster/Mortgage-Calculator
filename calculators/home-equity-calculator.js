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
        compareOptionsBtn: document.getElementById('compareOptionsBtn'),
        saveScenarioBtn: document.getElementById('saveScenario'),
        saveFeedback: document.getElementById('saveFeedback'),
        
        // Results
        availableEquity: document.getElementById('availableEquity'),
        totalEquity: document.getElementById('totalEquity'),
        helocMonthlyPayment: document.getElementById('helocMonthlyPayment'),
        helocTotalInterest: document.getElementById('helocTotalInterest'),
        refiMonthlyPayment: document.getElementById('refiMonthlyPayment'),
        refiTotalInterest: document.getElementById('refiTotalInterest'),
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
    
    // --- Core Calculation Logic ---
    function calculatePayment(principal, annualRate, termYears) {
        if (principal <= 0 || annualRate <= 0 || termYears <= 0) return 0;
        const monthlyRate = annualRate / 12 / 100;
        const numberOfPayments = termYears * 12;
        const payment = principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
        return isFinite(payment) ? payment : 0;
    }

    function calculateEquity() {
        const homeValue = parseFloat(DOM.homeValue.value) || 0;
        const mortgageBalance = parseFloat(DOM.mortgageBalance.value) || 0;
        const ltvRatio = parseFloat(DOM.ltvRatio.value) || 0;

        const totalEquity = homeValue - mortgageBalance;
        const maxLoanAmount = homeValue * (ltvRatio / 100);
        const availableEquity = Math.max(0, maxLoanAmount - mortgageBalance);

        return { totalEquity, availableEquity };
    }

    function calculateScenarios() {
        const { totalEquity, availableEquity } = calculateEquity();

        // HELOC Calculation
        const helocRate = parseFloat(DOM.helocRateSlider.value);
        const helocTerm = parseFloat(DOM.helocTerm.value);
        const helocPayment = calculatePayment(availableEquity, helocRate, helocTerm);
        const helocTotalInterest = (helocPayment * helocTerm * 12) - availableEquity;
        
        // Cash-Out Refinance Calculation
        const mortgageBalance = parseFloat(DOM.mortgageBalance.value) || 0;
        const closingCosts = parseFloat(DOM.refiClosingCosts.value) || 0;
        const newLoanAmount = mortgageBalance + availableEquity + closingCosts;
        const refiRate = parseFloat(DOM.refiRateSlider.value);
        const refiTerm = parseFloat(DOM.refiTerm.value);
        const refiPayment = calculatePayment(newLoanAmount, refiRate, refiTerm);
        const refiTotalInterest = (refiPayment * refiTerm * 12) - newLoanAmount;

        return {
            totalEquity,
            availableEquity,
            heloc: {
                monthlyPayment: helocPayment,
                totalInterest: helocTotalInterest > 0 ? helocTotalInterest : 0,
            },
            refi: {
                monthlyPayment: refiPayment,
                totalInterest: refiTotalInterest > 0 ? refiTotalInterest : 0,
            }
        };
    }
    
    // --- UI Update & Rendering ---
    function updateUI() {
        const results = calculateScenarios();

        animateValue(DOM.totalEquity, results.totalEquity);
        animateValue(DOM.availableEquity, results.availableEquity);
        animateValue(DOM.helocMonthlyPayment, results.heloc.monthlyPayment);
        animateValue(DOM.helocTotalInterest, results.heloc.totalInterest);
        animateValue(DOM.refiMonthlyPayment, results.refi.monthlyPayment);
        animateValue(DOM.refiTotalInterest, results.refi.totalInterest);

        renderEquityChart(results.totalEquity, parseFloat(DOM.mortgageBalance.value) || 0);
        renderComparisonChart(results);
    }

    function renderEquityChart(equity, mortgage) {
        const ctx = document.getElementById('equityChart').getContext('2d');
        if (equityChart) equityChart.destroy();
        
        equityChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Your Equity', 'Mortgage Balance'],
                datasets: [{
                    data: [equity, mortgage],
                    backgroundColor: ['#166534', '#1C768F'],
                    borderColor: '#ffffff',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: c => `${c.label}: ${formatCurrency(c.raw)}` } }
                }
            }
        });
    }

    function renderComparisonChart(results) {
        const ctx = document.getElementById('comparisonChart').getContext('2d');
        if (comparisonChart) comparisonChart.destroy();

        comparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Monthly Payment', 'Total Interest Paid'],
                datasets: [
                    {
                        label: 'HELOC',
                        data: [results.heloc.monthlyPayment, results.heloc.totalInterest],
                        backgroundColor: '#38bdf8', // sky-400
                    },
                    {
                        label: 'Cash-Out Refinance',
                        data: [results.refi.monthlyPayment, results.refi.totalInterest],
                        backgroundColor: '#34d399', // emerald-400
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: c => `${c.dataset.label}: ${formatCurrency(c.raw)}` } }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        DOM.compareOptionsBtn.addEventListener('click', updateUI);

        DOM.helocRateSlider.addEventListener('input', (e) => {
            DOM.helocRateValue.textContent = `${parseFloat(e.target.value).toFixed(1)}%`;
        });
        
        DOM.refiRateSlider.addEventListener('input', (e) => {
            DOM.refiRateValue.textContent = `${parseFloat(e.target.value).toFixed(1)}%`;
        });

        // Save Scenario
        DOM.saveScenarioBtn.addEventListener('click', () => {
            const params = new URLSearchParams({
                hv: DOM.homeValue.value,
                mb: DOM.mortgageBalance.value,
                ltv: DOM.ltvRatio.value,
                ht: DOM.helocTerm.value,
                hr: DOM.helocRateSlider.value,
                rt: DOM.refiTerm.value,
                rc: DOM.refiClosingCosts.value,
                rr: DOM.refiRateSlider.value
            });
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.pushState({ path: newUrl }, '', newUrl);
            DOM.saveFeedback.textContent = 'Scenario saved to URL!';
            setTimeout(() => { DOM.saveFeedback.textContent = ''; }, 3000);
        });
        
        // FAQ Accordion
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            const chevron = item.querySelector('.faq-chevron');

            question.addEventListener('click', () => {
                const isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';
                
                // Close all other answers when opening a new one
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.querySelector('.faq-answer').style.maxHeight = '0px';
                        otherItem.querySelector('.faq-chevron').classList.remove('rotate-180');
                    }
                });

                if (isOpen) {
                    answer.style.maxHeight = '0px';
                    chevron.classList.remove('rotate-180');
                } else {
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    chevron.classList.add('rotate-180');
                }
            });
        });

        // Share links
        const pageUrl = encodeURIComponent(window.location.href);
        const pageTitle = encodeURIComponent(document.title);
        document.getElementById('share-twitter-equity').href = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}`;
        document.getElementById('share-facebook-equity').href = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
        document.getElementById('share-linkedin-equity').href = `https://www.linkedin.com/shareArticle?mini=true&url=${pageUrl}&title=${pageTitle}`;
        document.getElementById('share-whatsapp-equity').href = `https://api.whatsapp.com/send?text=${pageTitle}%20${pageUrl}`;
        document.getElementById('share-email-equity').href = `mailto:?subject=${pageTitle}&body=Check out this helpful calculator: ${pageUrl}`;
    }

    // --- Initialization ---
    function init() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('hv')) {
            DOM.homeValue.value = params.get('hv');
            DOM.mortgageBalance.value = params.get('mb');
            DOM.ltvRatio.value = params.get('ltv');
            DOM.helocTerm.value = params.get('ht');
            DOM.helocRateSlider.value = params.get('hr');
            DOM.helocRateValue.textContent = `${params.get('hr')}%`;
            DOM.refiTerm.value = params.get('rt');
            DOM.refiClosingCosts.value = params.get('rc');
            DOM.refiRateSlider.value = params.get('rr');
            DOM.refiRateValue.textContent = `${params.get('rr')}%`;
        }
        
        setupEventListeners();
        updateUI(); // Initial calculation
    }

    init();
});
