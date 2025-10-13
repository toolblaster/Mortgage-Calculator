document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Element Cache ---
    const DOM = {
        homePrice: document.getElementById('homePrice'),
        homePriceSlider: document.getElementById('homePriceSlider'),
        downPaymentInput: document.getElementById('downPaymentInput'),
        downPaymentSlider: document.getElementById('downPaymentSlider'),
        dpTypePercent: document.getElementById('dpTypePercent'),
        dpTypeAmount: document.getElementById('dpTypeAmount'),
        currency: document.getElementById('currency'),
        loanTerm: document.getElementById('loanTerm'),
        interestRate: document.getElementById('interestRate'),
        loanType: document.getElementById('loanType'),
        propertyTaxes: document.getElementById('propertyTaxes'),
        homeInsurance: document.getElementById('homeInsurance'),
        saveScenarioBtn: document.getElementById('saveScenarioBtn'),
        saveFeedback: document.getElementById('saveFeedback'),

        // New Advanced Features
        targetDownPayment: document.getElementById('targetDownPayment'),
        monthlySavings: document.getElementById('monthlySavings'),
        savingsGoalResult: document.getElementById('savingsGoalResult'),
        compare15yrPayment: document.getElementById('compare15yrPayment'),
        compare15yrInterestSaved: document.getElementById('compare15yrInterestSaved'),

        // Currency Symbols
        currencySymbol: document.getElementById('currency-symbol'),
        currencySymbolSmalls: document.querySelectorAll('.currency-symbol-small'),

        // Results
        downPaymentAmount: document.getElementById('downPaymentAmount'),
        loanAmount: document.getElementById('loanAmount'),
        totalMonthlyPayment: document.getElementById('totalMonthlyPayment'),
        piPayment: document.getElementById('piPayment'),
        tiPayment: document.getElementById('tiPayment'),
        closingCosts: document.getElementById('closingCosts'),
        ltvRatio: document.getElementById('ltvRatio'),
        pmiSection: document.getElementById('pmiSection'),
        pmiAmount: document.getElementById('pmiAmount'),
    };

    let loanPieChart = null;
    let dpInputType = '%'; // '%' or '$'

    // --- Helper Functions ---
    function animateValue(el, endValue, duration = 500, isPercent = false) {
        if (!el) return;
        let startValue = parseFloat(el.dataset.value) || 0;
        el.dataset.value = endValue;
        let startTime = null;
        const currency = DOM.currency.value;

        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const currentValue = startValue + (endValue - startValue) * progress;
            
            if (isPercent) {
                el.textContent = `${currentValue.toFixed(1)}%`;
            } else {
                el.textContent = window.mortgageUtils.formatCurrency(currentValue, currency);
            }

            if (progress < 1) {
                requestAnimationFrame(animation);
            } else {
                 if (isPercent) {
                    el.textContent = `${endValue.toFixed(1)}%`;
                } else {
                    el.textContent = window.mortgageUtils.formatCurrency(endValue, currency);
                }
            }
        }
        requestAnimationFrame(animation);
    }
    
    function updateSliderFill(slider) {
        if (!slider) return;
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 100;
        const val = parseFloat(slider.value) || 0;
        const percentage = ((val - min) * 100) / (max - min);
        slider.style.background = `linear-gradient(to right, #2C98C2 ${percentage}%, #e5e7eb ${percentage}%)`;
    }

    function updateCurrencySymbols() {
        const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$' };
        const symbol = symbols[DOM.currency.value] || '$';
        if (DOM.currencySymbol) DOM.currencySymbol.textContent = symbol;
        DOM.currencySymbolSmalls.forEach(span => span.textContent = symbol);
        if (DOM.dpTypeAmount) DOM.dpTypeAmount.textContent = symbol;
    }

    // --- Core Calculation & Rendering ---
    function calculateAndRender() {
        // --- 1. Get Inputs ---
        const homePrice = parseFloat(DOM.homePrice.value) || 0;
        const loanTerm = parseFloat(DOM.loanTerm.value) || 30;
        const interestRate = parseFloat(DOM.interestRate.value) || 0;
        const annualTaxes = parseFloat(DOM.propertyTaxes.value) || 0;
        const annualInsurance = parseFloat(DOM.homeInsurance.value) || 0;
        let dpValue = parseFloat(DOM.downPaymentInput.value) || 0;

        // --- 2. Calculate Core Values ---
        let downPaymentAmountValue = 0;
        if (dpInputType === '%') {
            downPaymentAmountValue = homePrice * (dpValue / 100);
        } else {
            downPaymentAmountValue = dpValue;
        }

        const loanAmountValue = homePrice - downPaymentAmountValue;
        const ltv = homePrice > 0 ? (loanAmountValue / homePrice) * 100 : 0;

        // --- 3. Calculate Payments ---
        const piPayment = window.mortgageUtils.calculatePayment(loanAmountValue, interestRate, 12, loanTerm * 12);
        const tiPayment = (annualTaxes + annualInsurance) / 12;

        // PMI Calculation
        let pmiPayment = 0;
        const pmiRate = 0.005; // 0.5% annual rate, a common estimate
        if (ltv > 80 && DOM.loanType.value === 'conventional') {
            pmiPayment = (loanAmountValue * pmiRate) / 12;
            DOM.pmiSection.classList.remove('hidden');
            DOM.pmiAmount.textContent = `~${window.mortgageUtils.formatCurrency(pmiPayment, DOM.currency.value)} / month`;
        } else {
            DOM.pmiSection.classList.add('hidden');
        }

        const totalMonthlyPayment = piPayment + tiPayment + pmiPayment;
        const estimatedClosingCosts = homePrice * 0.035; // Average of 2-5%

        // --- 4. Render Outputs ---
        animateValue(DOM.downPaymentAmount, downPaymentAmountValue);
        animateValue(DOM.loanAmount, loanAmountValue);
        animateValue(DOM.totalMonthlyPayment, totalMonthlyPayment);
        animateValue(DOM.piPayment, piPayment);
        animateValue(DOM.tiPayment, tiPayment);
        animateValue(DOM.closingCosts, estimatedClosingCosts);
        animateValue(DOM.ltvRatio, ltv, 500, true);

        // --- 5. Render Chart ---
        renderChart(downPaymentAmountValue, loanAmountValue);
        
        // --- 6. Advanced Calculations & Rendering ---
        calculateSavingsGoal(homePrice, downPaymentAmountValue);
        calculateLoanComparison(loanAmountValue, interestRate, loanTerm, piPayment);
    }

    function calculateSavingsGoal(homePrice, currentDownPayment) {
        const targetDP = parseFloat(DOM.targetDownPayment.value) || 0;
        const monthlySavings = parseFloat(DOM.monthlySavings.value) || 0;

        if (homePrice > 0 && targetDP > 0 && monthlySavings > 0) {
            const targetAmount = homePrice * (targetDP / 100);
            const amountToSave = targetAmount - currentDownPayment;

            if (amountToSave <= 0) {
                DOM.savingsGoalResult.classList.remove('hidden');
                DOM.savingsGoalResult.innerHTML = `<h3 class="text-sm font-bold text-secondary">Savings Goal Reached!</h3><p class="text-xs">You've already saved enough for your ${targetDP}% down payment goal.</p>`;
                return;
            }

            const monthsToSave = amountToSave / monthlySavings;
            const years = Math.floor(monthsToSave / 12);
            const months = Math.ceil(monthsToSave % 12);
            
            DOM.savingsGoalResult.classList.remove('hidden');
            DOM.savingsGoalResult.innerHTML = `<h3 class="text-sm font-bold text-secondary">Savings Goal Projection</h3><p class="text-xs">To reach your <strong>${targetDP}%</strong> down payment goal, it will take you approximately <strong>${years > 0 ? `${years} years and ` : ''}${months} months</strong> of saving.</p>`;
        } else {
            DOM.savingsGoalResult.classList.add('hidden');
        }
    }
    
    function calculateLoanComparison(loanAmount, interestRate, currentTerm, currentPIPayment) {
        if (loanAmount <= 0 || interestRate <= 0 || currentTerm <= 15) {
             DOM.compare15yrPayment.textContent = 'N/A';
             DOM.compare15yrInterestSaved.textContent = 'N/A';
            return;
        }

        const payment15yr = window.mortgageUtils.calculatePayment(loanAmount, interestRate, 12, 15 * 12);
        const totalInterestCurrent = (currentPIPayment * currentTerm * 12) - loanAmount;
        const totalInterest15yr = (payment15yr * 15 * 12) - loanAmount;
        const interestSaved = totalInterestCurrent - totalInterest15yr;

        DOM.compare15yrPayment.textContent = window.mortgageUtils.formatCurrency(payment15yr, DOM.currency.value);
        DOM.compare15yrInterestSaved.textContent = window.mortgageUtils.formatCurrency(interestSaved, DOM.currency.value);
    }
    
    function renderChart(downPayment, loanAmount) {
        const ctx = document.getElementById('loanPieChart').getContext('2d');
        if (loanPieChart) loanPieChart.destroy();
        
        loanPieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Down Payment', 'Loan Amount'],
                datasets: [{
                    data: [downPayment, loanAmount],
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

    // --- Event Listeners & UI Logic ---
    function setupEventListeners() {
        const inputs = [
            DOM.homePrice, DOM.homePriceSlider, DOM.downPaymentInput, DOM.downPaymentSlider,
            DOM.loanTerm, DOM.interestRate, DOM.propertyTaxes, DOM.homeInsurance, DOM.loanType,
            DOM.targetDownPayment, DOM.monthlySavings
        ];
        inputs.forEach(input => input.addEventListener('input', calculateAndRender));

        DOM.currency.addEventListener('input', () => {
            updateCurrencySymbols();
            calculateAndRender();
        });
        
        // --- Sync Home Price ---
        DOM.homePriceSlider.addEventListener('input', (e) => DOM.homePrice.value = e.target.value);
        DOM.homePrice.addEventListener('input', (e) => DOM.homePriceSlider.value = e.target.value);

        // --- Sync Down Payment ---
        DOM.downPaymentSlider.addEventListener('input', (e) => DOM.downPaymentInput.value = e.target.value);
        DOM.downPaymentInput.addEventListener('input', (e) => DOM.downPaymentSlider.value = e.target.value);
        
        // --- Down Payment Type Toggle ---
        function setDpType(type) {
            const previousType = dpInputType;
            dpInputType = type;
            const homePrice = parseFloat(DOM.homePrice.value) || 0;
            const dpInputVal = parseFloat(DOM.downPaymentInput.value) || 0;

            if (type === '%' && previousType === '$') {
                DOM.dpTypePercent.classList.add('bg-primary', 'text-white');
                DOM.dpTypePercent.classList.remove('text-gray-600');
                DOM.dpTypeAmount.classList.remove('bg-primary', 'text-white');
                DOM.dpTypeAmount.classList.add('text-gray-600');
                
                DOM.downPaymentSlider.min = "0";
                DOM.downPaymentSlider.max = "50";
                DOM.downPaymentSlider.step = "0.5";
                if(dpInputVal > 0 && homePrice > 0){
                    const newPercent = Math.min(50, (dpInputVal / homePrice) * 100);
                    DOM.downPaymentInput.value = newPercent.toFixed(1);
                    DOM.downPaymentSlider.value = newPercent.toFixed(1);
                }

            } else if (type === '$' && previousType === '%') {
                DOM.dpTypeAmount.classList.add('bg-primary', 'text-white');
                DOM.dpTypeAmount.classList.remove('text-gray-600');
                DOM.dpTypePercent.classList.remove('bg-primary', 'text-white');
                DOM.dpTypePercent.classList.add('text-gray-600');
                
                DOM.downPaymentSlider.min = "0";
                DOM.downPaymentSlider.max = homePrice * 0.5;
                DOM.downPaymentSlider.step = "500";
                
                const newAmount = Math.round((homePrice * (dpInputVal / 100)) / 500) * 500;
                DOM.downPaymentInput.value = newAmount;
                DOM.downPaymentSlider.value = newAmount;
            }
            updateSliderFill(DOM.downPaymentSlider);
            calculateAndRender();
        }
        DOM.dpTypePercent.addEventListener('click', () => setDpType('%'));
        DOM.dpTypeAmount.addEventListener('click', () => setDpType('$'));

        // --- Save & Share ---
        DOM.saveScenarioBtn.addEventListener('click', () => {
            const params = new URLSearchParams({
                hp: DOM.homePrice.value,
                dp: DOM.downPaymentInput.value,
                dpt: dpInputType,
                lt: DOM.loanTerm.value,
                ir: DOM.interestRate.value,
                pt: DOM.propertyTaxes.value,
                hi: DOM.homeInsurance.value,
                cur: DOM.currency.value,
                ltype: DOM.loanType.value,
                tdp: DOM.targetDownPayment.value,
                ms: DOM.monthlySavings.value
            });
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.pushState({ path: newUrl }, '', newUrl);
            DOM.saveFeedback.textContent = 'Scenario saved to URL! You can copy it.';
            setTimeout(() => { DOM.saveFeedback.textContent = ''; }, 3000);
        });

        // Update all slider fills on any input change
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            slider.addEventListener('input', () => updateSliderFill(slider));
        });
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', (e) => {
                const correspondingSlider = document.getElementById(e.target.id + 'Slider');
                if (correspondingSlider) updateSliderFill(correspondingSlider);
            });
        });

        // --- FAQ Accordion ---
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            const chevron = item.querySelector('.faq-chevron');

            question.addEventListener('click', () => {
                const isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';
                
                if (isOpen) {
                    answer.style.maxHeight = '0px';
                    question.setAttribute('aria-expanded', 'false');
                } else {
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    question.setAttribute('aria-expanded', 'true');
                }
            });
        });
    }

    // --- Initialization ---
    function init() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('hp')) {
            DOM.homePrice.value = params.get('hp');
            DOM.downPaymentInput.value = params.get('dp');
            DOM.loanTerm.value = params.get('lt');
            DOM.interestRate.value = params.get('ir');
            DOM.propertyTaxes.value = params.get('pt');
            DOM.homeInsurance.value = params.get('hi');
            DOM.currency.value = params.get('cur') || 'USD';
            DOM.loanType.value = params.get('ltype') || 'conventional';
            DOM.targetDownPayment.value = params.get('tdp') || '20';
            DOM.monthlySavings.value = params.get('ms') || '500';
            
            // Set DP type and sync sliders from URL
            const dpType = params.get('dpt') || '%';
            if(dpType === '$') {
                dpInputType = '$';
                DOM.dpTypeAmount.classList.add('bg-primary', 'text-white');
                DOM.dpTypeAmount.classList.remove('text-gray-600');
                DOM.dpTypePercent.classList.remove('bg-primary', 'text-white');
                DOM.dpTypePercent.classList.add('text-gray-600');
                DOM.downPaymentSlider.max = parseFloat(DOM.homePrice.value) * 0.5;
                DOM.downPaymentSlider.step = "500";
            }
            DOM.homePriceSlider.value = params.get('hp');
            DOM.downPaymentSlider.value = params.get('dp');
        }

        setupEventListeners();
        updateCurrencySymbols();
        document.querySelectorAll('input[type="range"]').forEach(updateSliderFill);
        calculateAndRender();
    }

    init();
});
