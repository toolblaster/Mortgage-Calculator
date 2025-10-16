document.addEventListener('DOMContentLoaded', function () {
    // --- DOM Element Cache ---
    const DOM = {
        homePrice: document.getElementById('homePrice'),
        downPayment: document.getElementById('downPayment'),
        downPaymentType: document.getElementById('downPaymentType'),
        loanAmount: document.getElementById('loanAmount'),
        interestRate: document.getElementById('interestRate'),
        loanTerm: document.getElementById('loanTerm'),
        currency: document.getElementById('currency'),
        extraMonthlyPayment: document.getElementById('extraMonthlyPayment'),
        oneTimePayment: document.getElementById('oneTimePayment'),
        oneTimePaymentMonth: document.getElementById('oneTimePaymentMonth'),
        calculateBtn: document.getElementById('calculateBtn'),
        errorMessages: document.getElementById('error-messages'),
        
        // Results
        resultsSummary: document.getElementById('results-summary'),
        interestSaved: document.getElementById('interestSaved'),
        newPayoffDate: document.getElementById('newPayoffDate'),
        originalPayoffDate: document.getElementById('originalPayoffDate'),
        payoffChart: document.getElementById('payoffChart'),
        scheduleSection: document.getElementById('schedule-section'),
        amortizationTableBody: document.getElementById('amortizationTableBody'),

        // Currency Symbols
        currencySymbolSmalls: document.querySelectorAll('.currency-symbol-small'),
    };

    let payoffChart = null;

    // --- Helper Functions ---
    const updateCurrencySymbols = () => {
        const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$' };
        const symbol = symbols[DOM.currency.value] || '$';
        DOM.currencySymbolSmalls.forEach(span => span.textContent = symbol);
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
            return { schedule: [], totalInterest: 0 };
        }
        const monthlyPayment = window.mortgageUtils.calculatePayment(loanAmount, annualRate, 12, totalMonths);
        const monthlyRate = annualRate / 12 / 100;

        let balance = loanAmount;
        let schedule = [];
        let totalInterest = 0;

        for (let month = 1; month <= totalMonths && balance > 0; month++) {
            const interest = balance * monthlyRate;
            let principal = monthlyPayment - interest;
            let currentExtra = extraMonthly;

            if (month === oneTimePaymentMonth) {
                currentExtra += oneTimePayment;
            }
            
            let principalPaid = principal + currentExtra;

            // Adjust final payment
            if (balance < principalPaid + interest) {
                 principalPaid = balance;
                 balance = 0;
            } else {
                 balance -= principalPaid;
            }
            
            totalInterest += interest;

            schedule.push({
                month,
                balance: balance > 0 ? balance : 0
            });
        }
        return { schedule, totalInterest };
    }

    // --- UI Update & Rendering ---
    function renderResults(standard, accelerated) {
        const interestSavedValue = standard.totalInterest - accelerated.totalInterest;
        animateValue(DOM.interestSaved, interestSavedValue > 0 ? interestSavedValue : 0);

        const formatDate = (totalMonths) => {
            const date = new Date();
            date.setMonth(date.getMonth() + totalMonths);
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        };

        DOM.originalPayoffDate.textContent = formatDate(standard.schedule.length);
        DOM.newPayoffDate.textContent = formatDate(accelerated.schedule.length);

        renderChart(standard.schedule, accelerated.schedule);
        renderTable(standard.schedule, accelerated.schedule);
        
        DOM.resultsSummary.classList.remove('hidden');
        DOM.scheduleSection.classList.remove('hidden');
    }

    function renderChart(standardSchedule, acceleratedSchedule) {
        const labels = Array.from({ length: standardSchedule.length }, (_, i) => i + 1);
        const standardData = standardSchedule.map(p => p.balance);
        const acceleratedData = acceleratedSchedule.map(p => p.balance);
        
        // Ensure accelerated data array is same length as labels for charting
        while (acceleratedData.length < standardData.length) {
            acceleratedData.push(0);
        }

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
                                return (month % 12 === 0 && month > 0) ? `Year ${month / 12}` : null;
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
            const acceleratedBalance = acceleratedSchedule[i] ? acceleratedSchedule[i].balance : 0;
             html += `
                <tr class="hover:bg-gray-50">
                    <td class="p-2">${i + 1}</td>
                    <td class="p-2 text-right">${window.mortgageUtils.formatCurrency(standardBalance, DOM.currency.value, 0)}</td>
                    <td class="p-2 text-right font-semibold text-accent">${window.mortgageUtils.formatCurrency(acceleratedBalance, DOM.currency.value, 0)}</td>
                </tr>
            `;
            if (acceleratedBalance <= 0 && i > acceleratedSchedule.length) break;
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
    function handleCalculate() {
        if (!validateInputs()) return;

        const loanAmount = getLoanAmount();
        const interestRate = parseFloat(DOM.interestRate.value);
        const loanTerm = parseInt(DOM.loanTerm.value);
        const extraMonthly = parseFloat(DOM.extraMonthlyPayment.value) || 0;
        const oneTimePayment = parseFloat(DOM.oneTimePayment.value) || 0;
        const oneTimePaymentMonth = parseInt(DOM.oneTimePaymentMonth.value) || 1;

        const standard = calculateAmortization(loanAmount, interestRate, loanTerm, 0, 0, 0);
        const accelerated = calculateAmortization(loanAmount, interestRate, loanTerm, extraMonthly, oneTimePayment, oneTimePaymentMonth);

        renderResults(standard, accelerated);
    }

    // --- Initialization ---
    function init() {
        const inputs = [
            DOM.homePrice, DOM.downPayment, DOM.downPaymentType, DOM.interestRate,
            DOM.loanTerm, DOM.extraMonthlyPayment, DOM.oneTimePayment, DOM.oneTimePaymentMonth
        ];
        inputs.forEach(el => el.addEventListener('input', getLoanAmount));
        
        DOM.calculateBtn.addEventListener('click', handleCalculate);
        DOM.currency.addEventListener('change', () => {
            updateCurrencySymbols();
            handleCalculate();
        });

        updateCurrencySymbols();
        handleCalculate(); // Initial calculation on page load
    }

    init();
});
