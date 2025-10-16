document.addEventListener('DOMContentLoaded', function () {
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
        originalPayoffDate: document.getElementById('originalPayoffDate'),
        payoffChart: document.getElementById('payoffChart'),
        scheduleSection: document.getElementById('schedule-section'),
        amortizationTableBody: document.getElementById('amortizationTableBody'),

        // New Summary Fields
        standardMonthlyPayment: document.getElementById('standardMonthlyPayment'),
        standardTotalInterest: document.getElementById('standardTotalInterest'),
        standardTotalPaid: document.getElementById('standardTotalPaid'),
        acceleratedMonthlyPayment: document.getElementById('acceleratedMonthlyPayment'),
        acceleratedTotalInterest: document.getElementById('acceleratedTotalInterest'),
        acceleratedTotalPaid: document.getElementById('acceleratedTotalPaid'),
        newPayoffDateSummary: document.getElementById('newPayoffDateSummary'),


        // Currency Symbols
        currencySymbolSmalls: document.querySelectorAll('.currency-symbol-small'),
    };

    let payoffChart = null;

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
    
    const animateValue = (el, endValue, duration = 500) => {
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
    };

    function updateSliderFill(slider) {
        if (!slider) return;
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 100;
        const val = parseFloat(slider.value) || 0;
        const percentage = val > 0 ? ((val - min) * 100) / (max - min) : 0;
        slider.style.background = `linear-gradient(to right, #2C98C2 ${percentage}%, #e5e7eb ${percentage}%)`;
    }
    
    function syncSliderAndInput(slider, input) {
        if (!slider || !input) return;
        
        slider.addEventListener('input', (e) => {
            input.value = e.target.value;
            updateSliderFill(slider);
            debouncedCalculate();
        });
        input.addEventListener('input', (e) => {
            slider.value = e.target.value;
            updateSliderFill(slider);
            debouncedCalculate();
        });

        updateSliderFill(slider);
    }
    
    const getLoanAmount = () => {
        const homePrice = parseFloat(DOM.homePrice.value) || 0;
        const dpValue = parseFloat(DOM.downPayment.value) || 0;
        const dpType = DOM.downPaymentType.value;
        let downPaymentAmount = 0;
        if (dpType === 'percent') {
            downPaymentAmount = homePrice * (dpValue / 100);
        } else {
            downPaymentAmount = dpValue;
        }
        const loanAmount = homePrice - downPaymentAmount;
        DOM.loanAmount.value = window.mortgageUtils.formatCurrency(loanAmount, DOM.currency.value, 0);
        return loanAmount;
    };


    // --- Core Calculation Logic ---
    function calculateAmortization(loanAmount, annualRate, years, extraMonthly, oneTimePayment, oneTimePaymentMonth) {
        const totalMonths = years * 12;
        if (loanAmount <= 0 || annualRate < 0 || years <= 0) {
            return { schedule: [], totalInterest: 0, monthlyPayment: 0 };
        }
        const monthlyPayment = window.mortgageUtils.calculatePayment(loanAmount, annualRate, 12, totalMonths);
        if (monthlyPayment <= 0) {
            return { schedule: [], totalInterest: 0, monthlyPayment: 0 };
        }
        const monthlyRate = annualRate / 12 / 100;

        let balance = loanAmount;
        let schedule = [];
        let totalInterest = 0;
        let month = 1;

        while (balance > 0.01) {
            const interestForMonth = balance * monthlyRate;
            let principalFromPayment = monthlyPayment - interestForMonth;
            if (principalFromPayment < 0) principalFromPayment = 0;
            
            let currentExtra = extraMonthly;
            if (month === oneTimePaymentMonth) {
                currentExtra += oneTimePayment;
            }
            
            let totalPrincipalToPay = principalFromPayment + currentExtra;

            if (balance <= totalPrincipalToPay) {
                totalInterest += interestForMonth > 0 ? interestForMonth : 0;
                balance = 0;
            } else {
                balance -= totalPrincipalToPay;
                totalInterest += interestForMonth;
            }

            schedule.push({ month, balance });
            
            if (month > totalMonths * 2) break; // Safety break
            month++;
        }
        return { schedule, totalInterest, monthlyPayment };
    }


    // --- UI Update & Rendering ---
    function renderResults(standard, accelerated, loanAmount) {
        const interestSavedValue = standard.totalInterest - accelerated.totalInterest;
        animateValue(DOM.interestSaved, interestSavedValue > 0 ? interestSavedValue : 0);

        const formatDate = (totalMonths) => {
            if (totalMonths === 0) return "-";
            const date = new Date();
            date.setMonth(date.getMonth() + totalMonths);
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        };

        const timeSavedMonths = standard.schedule.length - accelerated.schedule.length;
        if (timeSavedMonths > 0) {
            const years = Math.floor(timeSavedMonths / 12);
            const months = timeSavedMonths % 12;
            DOM.timeSaved.textContent = `${years}y ${months}m`;
        } else {
            DOM.timeSaved.textContent = "0y 0m";
        }

        const originalPayoffDateStr = formatDate(standard.schedule.length);
        const newPayoffDateStr = formatDate(accelerated.schedule.length);

        DOM.originalPayoffDate.textContent = originalPayoffDateStr;
        DOM.newPayoffDate.textContent = newPayoffDateStr;

        // Populate new summary fields
        DOM.standardMonthlyPayment.textContent = window.mortgageUtils.formatCurrency(standard.monthlyPayment, DOM.currency.value, 2);
        DOM.standardTotalInterest.textContent = window.mortgageUtils.formatCurrency(standard.totalInterest, DOM.currency.value, 2);
        DOM.standardTotalPaid.textContent = window.mortgageUtils.formatCurrency(loanAmount + standard.totalInterest, DOM.currency.value, 2);
        
        const extraMonthly = parseFloat(DOM.extraMonthlyPayment.value) || 0;
        DOM.acceleratedMonthlyPayment.textContent = window.mortgageUtils.formatCurrency(standard.monthlyPayment + extraMonthly, DOM.currency.value, 2);
        DOM.acceleratedTotalInterest.textContent = window.mortgageUtils.formatCurrency(accelerated.totalInterest, DOM.currency.value, 2);
        DOM.acceleratedTotalPaid.textContent = window.mortgageUtils.formatCurrency(loanAmount + accelerated.totalInterest, DOM.currency.value, 2);
        
        DOM.newPayoffDateSummary.textContent = newPayoffDateStr;


        renderChart(standard.schedule, accelerated.schedule);
        renderTable(standard.schedule, accelerated.schedule);
        
        DOM.resultsSummary.classList.remove('hidden');
        DOM.scheduleSection.classList.remove('hidden');
    }

    function renderChart(standardSchedule, acceleratedSchedule) {
        const standardLabels = standardSchedule.map(p => p.month);
        const maxMonths = standardLabels.length;

        const standardData = standardSchedule.map(p => p.balance);
        const acceleratedData = acceleratedSchedule.map(p => p.balance);
        
        const labels = Array.from({ length: maxMonths }, (_, i) => i + 1);

        const datasets = [{
            label: 'Standard Loan Balance',
            data: standardData,
            borderColor: '#9ca3af', // gray-400
            borderWidth: 3,
            fill: false,
            tension: 0.1,
            pointRadius: 0
        }, {
            label: 'Accelerated Loan Balance',
            data: acceleratedData,
            borderColor: '#166534', // accent
            borderWidth: 3,
            fill: false,
            tension: 0.1,
            pointRadius: 0,
        }];

        if (payoffChart) {
            payoffChart.destroy();
        }

        payoffChart = new Chart(DOM.payoffChart, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { callback: value => window.mortgageUtils.formatCurrency(value, DOM.currency.value) } },
                    x: {
                        ticks: {
                            callback: (value, index, values) => {
                                const month = labels[index];
                                return (month % 12 === 1 && month > 1) || month === 1 ? `Yr ${Math.floor(month/12)}` : null;
                            },
                            autoSkip: true,
                            maxRotation: 0,
                        }
                    }
                },
                plugins: {
                    tooltip: { mode: 'index', intersect: false, callbacks: { label: (c) => `${c.dataset.label}: ${window.mortgageUtils.formatCurrency(c.raw, DOM.currency.value)}` } }
                }
            }
        });
    }
    
    function renderTable(standardSchedule, acceleratedSchedule) {
        let html = '';
        const maxRows = standardSchedule.length;
        for (let i = 0; i < maxRows; i++) {
            const standardBalance = standardSchedule[i] ? standardSchedule[i].balance : 0;
            const acceleratedBalance = i < acceleratedSchedule.length ? acceleratedSchedule[i].balance : 0;
             html += `
                <tr class="hover:bg-gray-50">
                    <td class="p-2">${i + 1}</td>
                    <td class="p-2 text-right">${window.mortgageUtils.formatCurrency(standardBalance, DOM.currency.value, 0)}</td>
                    <td class="p-2 text-right font-semibold text-accent">${acceleratedBalance > 0 || i < acceleratedSchedule.length ? window.mortgageUtils.formatCurrency(acceleratedBalance, DOM.currency.value, 0) : 'Paid Off'}</td>
                </tr>
            `;
            if (acceleratedBalance <= 0 && i >= acceleratedSchedule.length -1) break;
        }
        DOM.amortizationTableBody.innerHTML = html;
    }

    // --- Validation ---
    function validateInputs() {
        DOM.errorMessages.innerHTML = '';
        DOM.errorMessages.classList.add('hidden');
        let errors = [];
        const inputs = [
            { el: DOM.homePrice, name: 'Home Price' },
            { el: DOM.downPayment, name: 'Down Payment' },
            { el: DOM.interestRate, name: 'Interest Rate' },
            { el: DOM.extraMonthlyPayment, name: 'Extra Monthly Payment' },
            { el: DOM.oneTimePayment, name: 'One-Time Payment' },
            { el: DOM.oneTimePaymentMonth, name: 'Lump Sum Month' },
        ];
        inputs.forEach(input => {
            const value = parseFloat(input.el.value);
            if (isNaN(value) || value < 0) {
                errors.push(`${input.name} must be a non-negative number.`);
            }
        });

        if (errors.length > 0) {
            DOM.errorMessages.innerHTML = errors.join('<br>');
            DOM.errorMessages.classList.remove('hidden');
            return false;
        }
        return true;
    }

    // --- Event Handler ---
    const handleCalculate = () => {
        if (!validateInputs()) {
            DOM.resultsSummary.classList.add('hidden');
            DOM.scheduleSection.classList.add('hidden');
            return;
        };

        const loanAmount = getLoanAmount();
        const interestRate = parseFloat(DOM.interestRate.value);
        const loanTerm = parseInt(DOM.loanTerm.value);
        const extraMonthly = parseFloat(DOM.extraMonthlyPayment.value) || 0;
        const oneTimePayment = parseFloat(DOM.oneTimePayment.value) || 0;
        const oneTimePaymentMonth = parseInt(DOM.oneTimePaymentMonth.value) || 1;

        const standard = calculateAmortization(loanAmount, interestRate, loanTerm, 0, 0, 0);
        const accelerated = calculateAmortization(loanAmount, interestRate, loanTerm, extraMonthly, oneTimePayment, oneTimePaymentMonth);

        renderResults(standard, accelerated, loanAmount);
    };
    
    const debounce = (func, delay) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };
    const debouncedCalculate = debounce(handleCalculate, 300);

    // --- Initialization ---
    function init() {
        syncSliderAndInput(DOM.homePriceSlider, DOM.homePrice);
        syncSliderAndInput(DOM.interestRateSlider, DOM.interestRate);
        syncSliderAndInput(DOM.extraMonthlyPaymentSlider, DOM.extraMonthlyPayment);

        const inputsToRecalculate = [
            DOM.downPayment, DOM.downPaymentType, DOM.loanTerm, 
            DOM.oneTimePayment, DOM.oneTimePaymentMonth
        ];
        inputsToRecalculate.forEach(el => el.addEventListener('input', () => {
             getLoanAmount(); // Update loan amount display instantly
             debouncedCalculate();
        }));
        
        DOM.calculateBtn.addEventListener('click', handleCalculate);
        
        DOM.currency.addEventListener('change', () => {
            updateCurrencySymbols();
            handleCalculate();
        });

        updateCurrencySymbols();
        getLoanAmount();
        handleCalculate(); // Initial calculation on page load
    }

    init();
});
