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
        paymentFrequency: document.getElementById('paymentFrequency'),
        currency: document.getElementById('currency'),
        extraMonthlyPayment: document.getElementById('extraMonthlyPayment'),
        extraMonthlyPaymentSlider: document.getElementById('extraMonthlyPaymentSlider'),
        oneTimePayment: document.getElementById('oneTimePayment'),
        oneTimePaymentMonth: document.getElementById('oneTimePaymentMonth'),
        investmentReturn: document.getElementById('investmentReturn'), // New
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
        
        // Opportunity Cost
        opportunityCostSection: document.getElementById('opportunity-cost-section'),
        opportunityCostChart: document.getElementById('opportunityCostChart'),
        opportunityCostSummary: document.getElementById('opportunityCostSummary'),
    };

    let payoffChart = null;
    let opportunityCostChart = null; // New chart instance

    // --- Helper Functions ---
    const updateCurrencySymbols = () => {
        const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$' };
        const symbol = symbols[DOM.currency.value] || '$';
        DOM.currencySymbolSmalls.forEach(span => span.textContent = symbol);
        
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
            paymentFrequency: DOM.paymentFrequency.value,
            extraPerPayment: parseFloat(DOM.extraMonthlyPayment.value) || 0,
            oneTimePayment: parseFloat(DOM.oneTimePayment.value) || 0,
            oneTimePaymentMonth: parseInt(DOM.oneTimePaymentMonth.value) || 1,
            investmentReturn: parseFloat(DOM.investmentReturn.value) || 0,
        };
    }

    function calculateAmortization(loanAmount, annualRate, years, frequency, extraPerPayment, oneTimePayment, oneTimePaymentMonth, investmentReturn) {
        let periodsPerYear;
        const monthlyPaymentForCalc = window.mortgageUtils.calculatePayment(loanAmount, annualRate, 12, years * 12);
        let paymentPerPeriod;

        switch (frequency) {
            case 'biweekly': periodsPerYear = 26; paymentPerPeriod = monthlyPaymentForCalc * 12 / 26; break;
            case 'accelerated-biweekly': periodsPerYear = 26; paymentPerPeriod = monthlyPaymentForCalc / 2; break;
            default: periodsPerYear = 12; paymentPerPeriod = monthlyPaymentForCalc; break;
        }
        
        const totalPeriods = years * periodsPerYear;
        if (loanAmount <= 0 || annualRate <= 0 || years <= 0) {
            return { schedule: [], paymentPerPeriod: 0, totalInterest: 0, totalPaid: 0, payoffPeriod: 0, investmentGrowth: [] };
        }

        const periodicRate = annualRate / periodsPerYear / 100;
        const periodicInvestmentRate = investmentReturn / periodsPerYear / 100;

        let balance = loanAmount;
        let schedule = [];
        let totalInterest = 0;
        let payoffPeriod = totalPeriods;
        let investmentPortfolio = 0;
        let investmentGrowth = [];

        for (let period = 1; period <= totalPeriods * 2 && balance > 0; period++) {
            const interest = balance * periodicRate;
            let principal = paymentPerPeriod - interest;
            let effectiveExtra = extraPerPayment;
            
            const targetMonth = oneTimePaymentMonth;
            const targetPeriod = Math.ceil(targetMonth * (periodsPerYear / 12));
            if (period === targetPeriod) {
                effectiveExtra += oneTimePayment;
            }
            
            if (balance < paymentPerPeriod) {
                 principal = balance;
                 effectiveExtra = 0;
            }
            
            let totalPrincipalPaid = principal + effectiveExtra;
            
            if (balance - totalPrincipalPaid < 0) {
                totalPrincipalPaid = balance;
            }

            balance -= totalPrincipalPaid;
            totalInterest += interest;

            schedule.push({ period, balance: Math.max(0, balance), extraPayment: effectiveExtra });

            // Investment calculation
            investmentPortfolio = (investmentPortfolio + effectiveExtra) * (1 + periodicInvestmentRate);
            investmentGrowth.push({ period, value: investmentPortfolio });

            if (balance <= 0) {
                payoffPeriod = period;
                break;
            }
        }
        
        const totalPaid = loanAmount + totalInterest;
        return { schedule, paymentPerPeriod, totalInterest, totalPaid, payoffPeriod, periodsPerYear, investmentGrowth };
    }

    // --- UI Update & Rendering ---
    function handleCalculate() {
        if (!validateInputs()) return;
        
        const inputs = getInputs();

        const standard = calculateAmortization(inputs.loanAmount, inputs.interestRate, inputs.loanTerm, inputs.paymentFrequency, 0, 0, 0, 0);
        const accelerated = calculateAmortization(inputs.loanAmount, inputs.interestRate, inputs.loanTerm, inputs.paymentFrequency, inputs.extraPerPayment, inputs.oneTimePayment, inputs.oneTimePaymentMonth, inputs.investmentReturn);

        renderResults(standard, accelerated, inputs);
        renderChart(standard.schedule, accelerated.schedule);
        renderAmortizationTable(standard.schedule, accelerated.schedule);
        renderOpportunityCostChart(standard.schedule, accelerated.schedule, accelerated.investmentGrowth);
    }
    
    function renderResults(standard, accelerated, inputs) {
        DOM.resultsSummary.classList.remove('hidden');
        DOM.scheduleSection.classList.remove('hidden');

        const interestSaved = standard.totalInterest - accelerated.totalInterest;
        DOM.interestSaved.textContent = window.mortgageUtils.formatCurrency(interestSaved > 0 ? interestSaved : 0, DOM.currency.value);

        const periodsSaved = standard.payoffPeriod - accelerated.payoffPeriod;
        const yearsSaved = Math.floor(periodsSaved / standard.periodsPerYear);
        const remainingMonths = Math.round((periodsSaved % standard.periodsPerYear) / (standard.periodsPerYear / 12));
        DOM.timeSaved.textContent = `${yearsSaved}y ${remainingMonths}m`;

        const getPayoffDate = (periods, periodsPerYear) => {
            const totalMonths = Math.ceil(periods / (periodsPerYear / 12));
            const date = new Date();
            date.setMonth(date.getMonth() + totalMonths);
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        };
        
        DOM.newPayoffDate.textContent = getPayoffDate(accelerated.payoffPeriod, accelerated.periodsPerYear);
        DOM.originalPayoffDate.textContent = getPayoffDate(standard.payoffPeriod, standard.periodsPerYear);
        DOM.newPayoffDateSummary.textContent = getPayoffDate(accelerated.payoffPeriod, accelerated.periodsPerYear);

        // Update Cards
        const freqText = inputs.paymentFrequency.replace('-', ' ');
        DOM.standardMonthlyPayment.textContent = `${window.mortgageUtils.formatCurrency(standard.paymentPerPeriod, DOM.currency.value)} / ${freqText}`;
        DOM.standardTotalInterest.textContent = window.mortgageUtils.formatCurrency(standard.totalInterest, DOM.currency.value);
        DOM.standardTotalPaid.textContent = window.mortgageUtils.formatCurrency(standard.totalPaid, DOM.currency.value);
        
        DOM.acceleratedMonthlyPayment.textContent = `${window.mortgageUtils.formatCurrency(standard.paymentPerPeriod + inputs.extraPerPayment, DOM.currency.value)} / ${freqText}`;
        DOM.acceleratedTotalInterest.textContent = window.mortgageUtils.formatCurrency(accelerated.totalInterest, DOM.currency.value);
        DOM.acceleratedTotalPaid.textContent = window.mortgageUtils.formatCurrency(accelerated.totalPaid, DOM.currency.value);
    }

    function renderChart(standardSchedule, acceleratedSchedule) {
        const ctx = DOM.payoffChart.getContext('2d');
        if (payoffChart) payoffChart.destroy();
        
        const maxPeriods = standardSchedule.length;
        const labels = Array.from({ length: maxPeriods }, (_, i) => i + 1);

        payoffChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Standard Loan Balance',
                        data: standardSchedule.map(p => ({ x: p.period, y: p.balance })),
                        borderColor: '#9ca3af', // gray-400
                        borderWidth: 3,
                        pointRadius: 0,
                        tension: 0.1,
                    },
                    {
                        label: 'Accelerated Loan Balance',
                        data: acceleratedSchedule.map(p => ({ x: p.period, y: p.balance })),
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
                                const freq = DOM.paymentFrequency.value;
                                const ppy = freq === 'monthly' ? 12 : 26;
                                if (value > 0 && value % (ppy * 5) === 0) return `Year ${Math.round(value / ppy)}`;
                            },
                            autoSkip: false,
                            maxRotation: 0,
                        },
                        title: { display: true, text: 'Loan Term' }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${window.mortgageUtils.formatCurrency(context.raw.y, DOM.currency.value)}`,
                            title: (tooltipItems) => `Period: ${tooltipItems[0].label}`
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

    function renderOpportunityCostChart(standardSchedule, acceleratedSchedule, investmentGrowth) {
        const inputs = getInputs();
        if (inputs.extraPerPayment <= 0 && inputs.oneTimePayment <= 0) {
            DOM.opportunityCostSection.classList.add('hidden');
            return;
        }
        DOM.opportunityCostSection.classList.remove('hidden');

        const extraEquityData = acceleratedSchedule.map((p, i) => {
            const standardBalance = standardSchedule[i] ? standardSchedule[i].balance : standardSchedule[standardSchedule.length - 1].balance;
            const extraEquity = standardBalance - p.balance;
            return { x: p.period, y: extraEquity };
        });

        const investmentData = investmentGrowth.map(p => ({ x: p.period, y: p.value }));

        const finalInvestmentValue = investmentData.length > 0 ? investmentData[investmentData.length - 1].y : 0;
        const finalExtraEquity = extraEquityData.length > 0 ? extraEquityData[extraEquityData.length - 1].y : 0;

        if (opportunityCostChart) opportunityCostChart.destroy();
        const ctx = DOM.opportunityCostChart.getContext('2d');
        opportunityCostChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    { label: 'Investment Growth', data: investmentData, borderColor: '#166534', backgroundColor: 'rgba(22, 101, 52, 0.2)', fill: 'origin', tension: 0.1, pointRadius: 0 },
                    { label: 'Extra Equity from Payments', data: extraEquityData, borderColor: '#1C768F', backgroundColor: 'rgba(28, 118, 143, 0.2)', fill: 'origin', tension: 0.1, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { type: 'linear', title: { display: true, text: 'Payment Periods' } },
                    y: { beginAtZero: true, ticks: { callback: v => window.mortgageUtils.formatCurrency(v, DOM.currency.value) } }
                },
                plugins: {
                    tooltip: { mode: 'index', intersect: false, callbacks: { label: c => `${c.dataset.label}: ${window.mortgageUtils.formatCurrency(c.raw.y, DOM.currency.value)}` } }
                }
            }
        });

        const difference = finalInvestmentValue - finalExtraEquity;
        let summaryHTML = '';
        if (difference > 0) {
            summaryHTML = `By <strong>investing</strong> your extra payments, you could potentially have <strong>${window.mortgageUtils.formatCurrency(difference, DOM.currency.value)} more</strong> in net worth by the time your mortgage would have been paid off.`;
        } else {
            summaryHTML = `By making extra payments on your mortgage, you are projected to be <strong>${window.mortgageUtils.formatCurrency(Math.abs(difference), DOM.currency.value)} ahead</strong> compared to investing.`;
        }
        DOM.opportunityCostSummary.innerHTML = summaryHTML;
    }


    function validateInputs() {
        DOM.errorMessages.innerHTML = '';
        DOM.errorMessages.classList.add('hidden');
        let errors = [];

        const inputs = getInputs();

        if (inputs.loanAmount <= 0) errors.push('Loan Amount must be positive. Check Home Price and Down Payment.');
        if (inputs.interestRate <= 0) errors.push('Interest Rate must be positive.');
        if (inputs.loanTerm <= 0) errors.push('Loan Term must be positive.');
        if (inputs.investmentReturn < 0) errors.push('Investment Return cannot be negative.');

        if (errors.length > 0) {
            DOM.errorMessages.innerHTML = errors.join('<br>');
            DOM.errorMessages.classList.remove('hidden');
            return false;
        }
        return true;
    }

    // --- Event Listeners & Initialization ---
    function setupEventListeners() {
        const syncSliderAndInput = (slider, input) => {
            if (!slider || !input) return;
            const debouncedCalc = debounce(handleCalculate, 250);

            const update = () => {
                updateSliderFill(slider);
                debouncedCalc();
            };

            slider.addEventListener('input', () => {
                input.value = slider.value;
                update();
            });

            input.addEventListener('input', () => {
                const val = parseFloat(input.value);
                const max = parseFloat(slider.max);
                const min = parseFloat(slider.min);
                if (val > max) input.value = max;
                if (val < min) input.value = min;

                slider.value = input.value;
                update();
            });
        };
        
        syncSliderAndInput(DOM.homePriceSlider, DOM.homePrice);
        syncSliderAndInput(DOM.interestRateSlider, DOM.interestRate);
        syncSliderAndInput(DOM.extraMonthlyPaymentSlider, DOM.extraMonthlyPayment);

        const otherInputs = [
            DOM.downPayment, DOM.downPaymentType, DOM.loanTerm, DOM.currency,
            DOM.oneTimePayment, DOM.oneTimePaymentMonth, DOM.paymentFrequency, DOM.investmentReturn
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

        document.querySelectorAll('.faq-question').forEach(button => {
            button.addEventListener('click', () => {
                const answer = button.nextElementSibling;
                const chevron = button.querySelector('.faq-chevron');
                const isExpanded = button.getAttribute('aria-expanded') === 'true';

                button.setAttribute('aria-expanded', !isExpanded);
                answer.style.maxHeight = isExpanded ? '0px' : answer.scrollHeight + 'px';
                if(chevron) chevron.classList.toggle('rotate-180', !isExpanded);
            });
        });
        
        DOM.saveScenarioBtn.addEventListener('click', () => {
            const params = new URLSearchParams({
                hp: DOM.homePrice.value,
                dp: DOM.downPayment.value,
                dpt: DOM.downPaymentType.value,
                ir: DOM.interestRate.value,
                lt: DOM.loanTerm.value,
                pf: DOM.paymentFrequency.value,
                cur: DOM.currency.value,
                emp: DOM.extraMonthlyPayment.value,
                otp: DOM.oneTimePayment.value,
                otpm: DOM.oneTimePaymentMonth.value,
                inv: DOM.investmentReturn.value
            });
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.pushState({ path: newUrl }, '', newUrl);
            DOM.saveFeedback.textContent = 'Scenario saved to URL! You can copy it.';
            setTimeout(() => { DOM.saveFeedback.textContent = ''; }, 3000);
        });
        
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
            DOM.paymentFrequency.value = params.get('pf') || 'monthly';
            DOM.currency.value = params.get('cur');
            DOM.extraMonthlyPayment.value = params.get('emp');
            DOM.oneTimePayment.value = params.get('otp');
            DOM.oneTimePaymentMonth.value = params.get('otpm');
            DOM.investmentReturn.value = params.get('inv') || 7.0;

            DOM.homePriceSlider.value = DOM.homePrice.value;
            DOM.interestRateSlider.value = DOM.interestRate.value;
            DOM.extraMonthlyPaymentSlider.value = DOM.extraMonthlyPayment.value;
        }
        
        setupEventListeners();
        updateCurrencySymbols();
        getInputs();
        handleCalculate();
        
        [DOM.homePriceSlider, DOM.interestRateSlider, DOM.extraMonthlyPaymentSlider].forEach(updateSliderFill);
    }

    init();
});
