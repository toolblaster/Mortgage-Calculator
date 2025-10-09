document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Element Cache ---
    const DOM = {
        homeValue: document.getElementById('homeValue'),
        homeValueSlider: document.getElementById('homeValueSlider'),
        mortgageBalance: document.getElementById('mortgageBalance'),
        mortgageBalanceSlider: document.getElementById('mortgageBalanceSlider'),
        currency: document.getElementById('currency'),
        ltvRatio: document.getElementById('ltvRatio'),
        helocTerm: document.getElementById('helocTerm'),
        helocRateSlider: document.getElementById('helocRateSlider'),
        helocRateValue: document.getElementById('helocRateValue'),
        refiTerm: document.getElementById('refiTerm'),
        refiClosingCosts: document.getElementById('refiClosingCosts'),
        refiRateSlider: document.getElementById('refiRateSlider'),
        refiRateValue: document.getElementById('refiRateValue'),
        saveScenarioBtn: document.getElementById('saveScenario'),
        saveFeedback: document.getElementById('saveFeedback'),
        
        // Input Currency Spans
        homeValueCurrency: document.getElementById('homeValueCurrency'),
        mortgageBalanceCurrency: document.getElementById('mortgageBalanceCurrency'),
        closingCostsCurrency: document.getElementById('closingCostsCurrency'),

        // Opportunity Cost
        homeAppreciation: document.getElementById('homeAppreciation'),
        investmentReturn: document.getElementById('investmentReturn'),
        opportunityCostSection: document.getElementById('opportunity-cost-section'),
        opportunityCostChart: document.getElementById('opportunityCostChart'),
        opportunityCostSummary: document.getElementById('opportunity-cost-summary'),

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
    let opportunityCostChart = null;

    // --- Helper Functions ---
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
            el.textContent = window.mortgageUtils.formatCurrency(currentValue, DOM.currency.value);
            if (progress < 1) requestAnimationFrame(animation);
            else el.textContent = window.mortgageUtils.formatCurrency(endValue, DOM.currency.value);
        }
        requestAnimationFrame(animation);
    }
    
    function updateSliderFill(slider) {
        if (!slider) return;
        const min = slider.min || 0;
        const max = slider.max || 100;
        const val = slider.value || 0;
        const percentage = ((val - min) * 100) / (max - min);
        slider.style.background = `linear-gradient(to right, #2C98C2 ${percentage}%, #e5e7eb ${percentage}%)`;
    }

     function syncSliderAndInput(slider, input) {
        if (!slider || !input) return;
        
        const update = () => {
            updateSliderFill(slider);
            updateUI();
        };
        
        slider.addEventListener('input', (e) => {
            input.value = e.target.value;
            update();
        });
        input.addEventListener('input', (e) => {
            slider.value = e.target.value;
            update();
        });

        updateSliderFill(slider);
    }
    
    function updateCurrencySymbols() {
        const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$' };
        const symbol = symbols[DOM.currency.value] || '$';
        if (DOM.homeValueCurrency) DOM.homeValueCurrency.textContent = symbol;
        if (DOM.mortgageBalanceCurrency) DOM.mortgageBalanceCurrency.textContent = symbol;
        if (DOM.closingCostsCurrency) DOM.closingCostsCurrency.textContent = symbol;
    }
    
    // --- Core Calculation Logic ---
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
        const helocPayment = window.mortgageUtils.calculatePayment(availableEquity, helocRate, 12, helocTerm * 12);
        const helocTotalInterest = (helocPayment * helocTerm * 12) - availableEquity;
        
        // Cash-Out Refinance Calculation
        const mortgageBalance = parseFloat(DOM.mortgageBalance.value) || 0;
        const closingCosts = parseFloat(DOM.refiClosingCosts.value) || 0;
        const newLoanAmount = mortgageBalance + availableEquity + closingCosts;
        const refiRate = parseFloat(DOM.refiRateSlider.value);
        const refiTerm = parseFloat(DOM.refiTerm.value);
        const refiPayment = window.mortgageUtils.calculatePayment(newLoanAmount, refiRate, 12, refiTerm * 12);
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
        renderOpportunityCostChart(results);
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
                    tooltip: { callbacks: { label: c => `${c.label}: ${window.mortgageUtils.formatCurrency(c.raw, DOM.currency.value)}` } }
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
                    tooltip: { callbacks: { label: c => `${c.dataset.label}: ${window.mortgageUtils.formatCurrency(c.raw, DOM.currency.value)}` } }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => window.mortgageUtils.formatCurrency(value, DOM.currency.value)
                        }
                    }
                }
            }
        });
    }

    function renderOpportunityCostChart(results) {
        const availableEquity = results.availableEquity;
        if (availableEquity <= 0) {
            DOM.opportunityCostSection.classList.add('hidden');
            return;
        }
        DOM.opportunityCostSection.classList.remove('hidden');

        const investmentReturn = parseFloat(DOM.investmentReturn.value) / 100;
        const appreciationRate = parseFloat(DOM.homeAppreciation.value) / 100;
        const term = Math.max(parseFloat(DOM.helocTerm.value), parseFloat(DOM.refiTerm.value));

        const investmentData = [];
        let investmentValue = availableEquity;
        for (let i = 0; i <= term; i++) {
            investmentData.push(investmentValue);
            investmentValue *= (1 + investmentReturn);
        }

        const equityData = [];
        let equityValue = availableEquity;
        for (let i = 0; i <= term; i++) {
            equityData.push(equityValue);
            equityValue *= (1 + appreciationRate);
        }

        if (opportunityCostChart) opportunityCostChart.destroy();
        const ctx = DOM.opportunityCostChart.getContext('2d');
        opportunityCostChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({ length: term + 1 }, (_, i) => `Year ${i}`),
                datasets: [
                    {
                        label: 'Invested Equity Growth',
                        data: investmentData,
                        borderColor: '#166534',
                        backgroundColor: 'rgba(22, 101, 52, 0.2)',
                        fill: 'origin',
                        tension: 0.1
                    },
                    {
                        label: 'Equity Growth in Home',
                        data: equityData,
                        borderColor: '#1C768F',
                        backgroundColor: 'rgba(28, 118, 143, 0.2)',
                        fill: 'origin',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => window.mortgageUtils.formatCurrency(v, DOM.currency.value) } }
                },
                plugins: {
                    tooltip: { mode: 'index', intersect: false, callbacks: { label: c => `${c.dataset.label}: ${window.mortgageUtils.formatCurrency(c.raw, DOM.currency.value)}` } }
                }
            }
        });

        const finalInvestmentValue = investmentData[investmentData.length - 1];
        const finalEquityValue = equityData[equityData.length - 1];
        const difference = finalInvestmentValue - finalEquityValue;

        let summaryHTML = '';
        if (difference > 0) {
            summaryHTML = `By <strong>investing</strong> the borrowed equity, you could potentially have <strong>${window.mortgageUtils.formatCurrency(difference, DOM.currency.value)} more</strong> in net worth after ${term} years.`;
        } else {
            summaryHTML = `By <strong>leaving the equity in your home</strong>, you are projected to be <strong>${window.mortgageUtils.formatCurrency(Math.abs(difference), DOM.currency.value)} ahead</strong> compared to investing it.`;
        }
        DOM.opportunityCostSummary.innerHTML = summaryHTML;
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        syncSliderAndInput(DOM.homeValueSlider, DOM.homeValue);
        syncSliderAndInput(DOM.mortgageBalanceSlider, DOM.mortgageBalance);
        
        const inputsToUpdate = [
            DOM.ltvRatio, DOM.helocTerm, DOM.refiTerm, DOM.refiClosingCosts,
            DOM.homeAppreciation, DOM.investmentReturn
        ];
        inputsToUpdate.forEach(input => input.addEventListener('input', updateUI));
        
        DOM.currency.addEventListener('input', () => {
            updateCurrencySymbols();
            updateUI();
        });


        DOM.helocRateSlider.addEventListener('input', (e) => {
            DOM.helocRateValue.textContent = `${parseFloat(e.target.value).toFixed(1)}%`;
            updateSliderFill(e.target);
            updateUI();
        });
        
        DOM.refiRateSlider.addEventListener('input', (e) => {
            DOM.refiRateValue.textContent = `${parseFloat(e.target.value).toFixed(1)}%`;
            updateSliderFill(e.target);
            updateUI();
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
                rr: DOM.refiRateSlider.value,
                ha: DOM.homeAppreciation.value,
                ir: DOM.investmentReturn.value
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
            DOM.homeAppreciation.value = params.get('ha') || 3;
            DOM.investmentReturn.value = params.get('ir') || 7;
            
            // Sync sliders to URL params
            DOM.homeValueSlider.value = params.get('hv');
            DOM.mortgageBalanceSlider.value = params.get('mb');
        }
        
        setupEventListeners();
        updateCurrencySymbols();
        [DOM.homeValueSlider, DOM.mortgageBalanceSlider, DOM.helocRateSlider, DOM.refiRateSlider].forEach(updateSliderFill);
        updateUI(); // Initial calculation
    }

    init();
});
