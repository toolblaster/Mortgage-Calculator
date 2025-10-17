document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Element Cache ---
    const DOM = {
        homePrice: document.getElementById('homePrice'),
        homePriceSlider: document.getElementById('homePriceSlider'),
        downPayment: document.getElementById('downPayment'),
        downPaymentType: document.getElementById('downPaymentType'),
        loanAmount: document.getElementById('loanAmount'),
        interestRate: document.getElementById('interestRate'),
        interestRateSlider: document.getElementById('interestRateSlider'),
        loanTerm: document.getElementById('loanTerm'),
        currency: document.getElementById('currency'),
        extraMonthlyPayment: document.getElementById('extraMonthlyPayment'),
        extraMonthlyPaymentSlider: document.getElementById('extraMonthlyPaymentSlider'),
        oneTimePayment: document.getElementById('oneTimePayment'),
        oneTimePaymentMonth: document.getElementById('oneTimePaymentMonth'),
        calculateBtn: document.getElementById('calculateBtn'),
        errorMessages: document.getElementById('error-messages'),

        // Results
        resultsSummary: document.getElementById('results-summary'),
        interestSaved: document.getElementById('interestSaved'),
        timeSaved: document.getElementById('timeSaved'),
        newPayoffDate: document.getElementById('newPayoffDate'),
        payoffChart: document.getElementById('payoffChart'),
        
        // Comparison Cards
        standardMonthlyPayment: document.getElementById('standardMonthlyPayment'),
        standardTotalInterest: document.getElementById('standardTotalInterest'),
        standardTotalPaid: document.getElementById('standardTotalPaid'),
        originalPayoffDate: document.getElementById('originalPayoffDate'),
        acceleratedMonthlyPayment: document.getElementById('acceleratedMonthlyPayment'),
        acceleratedTotalInterest: document.getElementById('acceleratedTotalInterest'),
        acceleratedTotalPaid: document.getElementById('acceleratedTotalPaid'),
        newPayoffDateSummary: document.getElementById('newPayoffDateSummary'),

        // Amortization Schedule
        scheduleSection: document.getElementById('schedule-section'),
        amortizationTableBody: document.getElementById('amortizationTableBody'),

        // Currency Symbols
        currencySymbolSmalls: document.querySelectorAll('.currency-symbol-small'),
        
        // Sharing
        saveScenarioBtn: document.getElementById('saveScenarioBtn'),
        saveFeedback: document.getElementById('saveFeedback'),
    };

    let payoffChart = null;

    // --- Helper Functions ---
    const updateCurrencySymbols = () => {
        const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$' };
        const symbol = symbols[DOM.currency.value] || '$';
        DOM.currencySymbolSmalls.forEach(span => span.textContent = symbol);
        
        // Update the down payment type dropdown
        const amountOption = DOM.downPaymentType.querySelector('option[value="amount"]');
        if (amountOption) {
            amountOption.textContent = symbol;
        }
    };
    
    function updateSliderFill(slider) {
        if (!slider) return;
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 100;
        const val = parseFloat(slider.value) || 0;
        const percentage = ((val - min) * 100) / (max - min);
        slider.style.background = `linear-gradient(to right, #1C768F ${percentage}%, #e5e7eb ${percentage}%)`;
    }

    const debounce = (func, delay) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    // --- Core Calculation Logic ---
    function getInputs() {
        const homePrice = parseFloat(DOM.homePrice.value) || 0;
        const downPaymentValue = parseFloat(DOM.downPayment.value) || 0;
        const downPaymentType = DOM.downPaymentType.value;

        let downPaymentAmount = 0;
        if (downPaymentType === 'percent') {
            downPaymentAmount = homePrice * (downPaymentValue / 100);
        } else {
            downPaymentAmount = downPaymentValue;
        }

        const loanAmount = homePrice - downPaymentAmount;
        DOM.loanAmount.value = loanAmount.toFixed(0);

        return {
            loanAmount,
            interestRate: parseFloat(DOM.interestRate.value) || 0,
            loanTerm: parseInt(DOM.loanTerm.value) || 30,
            extraMonthly: parseFloat(DOM.extraMonthlyPayment.value) || 0,
            oneTimePayment: parseFloat(DOM.oneTimePayment.value) || 0,
            oneTimePaymentMonth: parseInt(DOM.oneTimePaymentMonth.value) || 1,
        };
    }

    function calculateAmortization(loanAmount, annualRate, years, extraMonthly, oneTimePayment, oneTimePaymentMonth) {
        const totalMonths = years * 12;
        if (loanAmount <= 0 || annualRate <= 0 || years <= 0) {
            return { schedule: [], monthlyPayment: 0, totalInterest: 0, totalPaid: 0, payoffMonth: 0 };
        }
        
        const monthlyPayment = window.mortgageUtils.calculatePayment(loanAmount, annualRate, 12, totalMonths);
        const monthlyRate = annualRate / 12 / 100;

        let balance = loanAmount;
        let schedule = [];
        let totalInterest = 0;
        let payoffMonth = totalMonths;

        for (let month = 1; month <= totalMonths * 2 && balance > 0; month++) {
            const interest = balance * monthlyRate;
            let principal = monthlyPayment - interest;
            
            let effectiveExtra = extraMonthly;
            if (month === oneTimePaymentMonth) {
                effectiveExtra += oneTimePayment;
            }
            
            if (balance < monthlyPayment) {
                 principal = balance;
                 effectiveExtra = 0;
            }
            
            let totalPrincipalPaid = principal + effectiveExtra;
            
            if (balance - totalPrincipalPaid < 0) {
                totalPrincipalPaid = balance;
            }

            balance -= totalPrincipalPaid;
            totalInterest += interest;

            schedule.push({ month, balance: Math.max(0, balance) });

            if (balance <= 0) {
                payoffMonth = month;
                break;
            }
        }
        
        const totalPaid = loanAmount + totalInterest;
        return { schedule, monthlyPayment, totalInterest, totalPaid, payoffMonth };
    }

    // --- UI Update & Rendering ---
    function handleCalculate() {
        if (!validateInputs()) return;
        
        const inputs = getInputs();

        const standard = calculateAmortization(inputs.loanAmount, inputs.interestRate, inputs.loanTerm, 0, 0, 0);
        const accelerated = calculateAmortization(inputs.loanAmount, inputs.interestRate, inputs.loanTerm, inputs.extraMonthly, inputs.oneTimePayment, inputs.oneTimePaymentMonth);

        renderResults(standard, accelerated, inputs);
        renderChart(standard.schedule, accelerated.schedule);
        renderAmortizationTable(standard.schedule, accelerated.schedule);
    }
    
    function renderResults(standard, accelerated, inputs) {
        DOM.resultsSummary.classList.remove('hidden');
        DOM.scheduleSection.classList.remove('hidden');

        const interestSaved = standard.totalInterest - accelerated.totalInterest;
        DOM.interestSaved.textContent = window.mortgageUtils.formatCurrency(interestSaved > 0 ? interestSaved : 0, DOM.currency.value);

        const monthsSaved = standard.payoffMonth - accelerated.payoffMonth;
        const yearsSaved = Math.floor(monthsSaved / 12);
        const remainingMonths = monthsSaved % 12;
        DOM.timeSaved.textContent = `${yearsSaved}y ${remainingMonths}m`;

        const getPayoffDate = (months) => {
            const date = new Date();
            date.setMonth(date.getMonth() + months);
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        };
        
        DOM.newPayoffDate.textContent = getPayoffDate(accelerated.payoffMonth);
        DOM.originalPayoffDate.textContent = getPayoffDate(standard.payoffMonth);
        DOM.newPayoffDateSummary.textContent = getPayoffDate(accelerated.payoffMonth);

        // Update Cards
        DOM.standardMonthlyPayment.textContent = window.mortgageUtils.formatCurrency(standard.monthlyPayment, DOM.currency.value);
        DOM.standardTotalInterest.textContent = window.mortgageUtils.formatCurrency(standard.totalInterest, DOM.currency.value);
        DOM.standardTotalPaid.textContent = window.mortgageUtils.formatCurrency(standard.totalPaid, DOM.currency.value);
        
        DOM.acceleratedMonthlyPayment.textContent = window.mortgageUtils.formatCurrency(standard.monthlyPayment + inputs.extraMonthly, DOM.currency.value);
        DOM.acceleratedTotalInterest.textContent = window.mortgageUtils.formatCurrency(accelerated.totalInterest, DOM.currency.value);
        DOM.acceleratedTotalPaid.textContent = window.mortgageUtils.formatCurrency(accelerated.totalPaid, DOM.currency.value);
    }

    function renderChart(standardSchedule, acceleratedSchedule) {
        const ctx = DOM.payoffChart.getContext('2d');
        if (payoffChart) payoffChart.destroy();
        
        const maxMonths = standardSchedule.length;
        const labels = Array.from({ length: maxMonths }, (_, i) => i + 1);

        payoffChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Standard Loan Balance',
                        data: standardSchedule.map(p => ({ x: p.month, y: p.balance })),
                        borderColor: '#9ca3af', // gray-400
                        borderWidth: 3,
                        pointRadius: 0,
                        tension: 0.1,
                    },
                    {
                        label: 'Accelerated Loan Balance',
                        data: acceleratedSchedule.map(p => ({ x: p.month, y: p.balance })),
                        borderColor: '#166534', // accent
                        borderWidth: 3,
                        pointRadius: 0,
                        tension: 0.1,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: value => window.mortgageUtils.formatCurrency(value, DOM.currency.value, 0) }
                    },
                    x: {
                        type: 'linear',
                        ticks: {
                            callback: function(value) {
                                if (value % 60 === 0) return `Year ${value / 12}`;
                            },
                            autoSkip: false,
                            maxRotation: 0,
                        },
                        title: { display: true, text: 'Loan Term in Years' }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${window.mortgageUtils.formatCurrency(context.raw.y, DOM.currency.value)}`,
                            title: (tooltipItems) => `Month: ${tooltipItems[0].label}`
                        }
                    }
                }
            }
        });
    }

    function renderAmortizationTable(standard, accelerated) {
        let html = '';
        const maxRows = standard.length;
        for (let i = 0; i < maxRows; i++) {
            const standardBalance = standard[i] ? standard[i].balance : 0;
            const acceleratedBalance = accelerated[i] ? accelerated[i].balance : (accelerated.length > 0 ? 0 : null);
            
            html += `
                <tr class="hover:bg-gray-50">
                    <td class="p-2">${i + 1}</td>
                    <td class="p-2 text-right">${window.mortgageUtils.formatCurrency(standardBalance, DOM.currency.value)}</td>
                    <td class="p-2 text-right font-semibold ${acceleratedBalance !== null ? 'text-accent' : ''}">
                        ${acceleratedBalance !== null ? window.mortgageUtils.formatCurrency(acceleratedBalance, DOM.currency.value) : 'Paid Off'}
                    </td>
                </tr>
            `;
            if (acceleratedBalance !== null && acceleratedBalance <= 0) break;
        }
        DOM.amortizationTableBody.innerHTML = html;
    }

    function validateInputs() {
        DOM.errorMessages.innerHTML = '';
        DOM.errorMessages.classList.add('hidden');
        let errors = [];

        const inputs = getInputs();

        if (inputs.loanAmount <= 0) errors.push('Loan Amount must be positive. Check Home Price and Down Payment.');
        if (inputs.interestRate <= 0) errors.push('Interest Rate must be positive.');
        if (inputs.loanTerm <= 0) errors.push('Loan Term must be positive.');

        if (errors.length > 0) {
            DOM.errorMessages.innerHTML = errors.join('<br>');
            DOM.errorMessages.classList.remove('hidden');
            return false;
        }
        return true;
    }

    // --- Event Listeners & Initialization ---
    function setupEventListeners() {
        // Helper to sync a slider with its number input and handle updates
        const syncSliderAndInput = (slider, input) => {
            if (!slider || !input) return;
            const debouncedCalc = debounce(handleCalculate, 250);

            const update = () => {
                updateSliderFill(slider);
                debouncedCalc(); // Trigger calculation after any change
            };

            slider.addEventListener('input', () => {
                input.value = slider.value;
                update();
            });

            input.addEventListener('input', () => {
                 // Ensure value doesn't exceed slider max/min before updating
                const val = parseFloat(input.value);
                const max = parseFloat(slider.max);
                const min = parseFloat(slider.min);
                if (val > max) input.value = max;
                if (val < min) input.value = min;

                slider.value = input.value;
                update();
            });
        };
        
        // Sync our sliders
        syncSliderAndInput(DOM.homePriceSlider, DOM.homePrice);
        syncSliderAndInput(DOM.interestRateSlider, DOM.interestRate);
        syncSliderAndInput(DOM.extraMonthlyPaymentSlider, DOM.extraMonthlyPayment);

        // Listeners for other inputs that don't have sliders
        const otherInputs = [
            DOM.downPayment, DOM.downPaymentType, DOM.loanTerm, DOM.currency,
            DOM.oneTimePayment, DOM.oneTimePaymentMonth
        ];
        otherInputs.forEach(input => {
            if (input) {
                input.addEventListener('input', debounce(handleCalculate, 250));
            }
        });


        DOM.calculateBtn.addEventListener('click', handleCalculate);
        
        DOM.currency.addEventListener('change', () => {
            updateCurrencySymbols();
            handleCalculate();
        });

        // FAQ Accordion
        document.querySelectorAll('.faq-question').forEach(button => {
            button.addEventListener('click', () => {
                const answer = button.nextElementSibling;
                const chevron = button.querySelector('.faq-chevron');
                const isExpanded = button.getAttribute('aria-expanded') === 'true';

                button.setAttribute('aria-expanded', !isExpanded);
                answer.style.maxHeight = isExpanded ? '0px' : answer.scrollHeight + 'px';
                chevron.classList.toggle('rotate-180', !isExpanded);
            });
        });
        
        // Save & Share
        DOM.saveScenarioBtn.addEventListener('click', () => {
            const params = new URLSearchParams({
                hp: DOM.homePrice.value,
                dp: DOM.downPayment.value,
                dpt: DOM.downPaymentType.value,
                ir: DOM.interestRate.value,
                lt: DOM.loanTerm.value,
                cur: DOM.currency.value,
                emp: DOM.extraMonthlyPayment.value,
                otp: DOM.oneTimePayment.value,
                otpm: DOM.oneTimePaymentMonth.value
            });
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.pushState({ path: newUrl }, '', newUrl);
            DOM.saveFeedback.textContent = 'Scenario saved to URL! You can copy it.';
            setTimeout(() => { DOM.saveFeedback.textContent = ''; }, 3000);
        });
        
        // Add a resize listener to ensure sliders are responsive
        window.addEventListener('resize', debounce(() => {
            [DOM.homePriceSlider, DOM.interestRateSlider, DOM.extraMonthlyPaymentSlider].forEach(updateSliderFill);
        }, 100));
    }

    function init() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('hp')) {
            DOM.homePrice.value = params.get('hp');
            DOM.downPayment.value = params.get('dp');
            DOM.downPaymentType.value = params.get('dpt');
            DOM.interestRate.value = params.get('ir');
            DOM.loanTerm.value = params.get('lt');
            DOM.currency.value = params.get('cur');
            DOM.extraMonthlyPayment.value = params.get('emp');
            DOM.oneTimePayment.value = params.get('otp');
            DOM.oneTimePaymentMonth.value = params.get('otpm');

            // Sync sliders to URL params
            DOM.homePriceSlider.value = DOM.homePrice.value;
            DOM.interestRateSlider.value = DOM.interestRate.value;
            DOM.extraMonthlyPaymentSlider.value = DOM.extraMonthlyPayment.value;
        }
        
        setupEventListeners();
        updateCurrencySymbols();
        getInputs(); // To calculate initial loan amount
        handleCalculate();
        
        // Initial slider fill
        [DOM.homePriceSlider, DOM.interestRateSlider, DOM.extraMonthlyPaymentSlider].forEach(updateSliderFill);
    }

    init();
});
