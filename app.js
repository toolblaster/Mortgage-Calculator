/*
================================================
Strategic Mortgage Planner - Application Logic
This file handles UI, event listeners, and state management.
================================================
*/

(function() {
    'use strict';

    // --- DOM Element Cache ---
    const DOM = {
        // Input Fields
        loanAmount: document.getElementById('loanAmount'), loanAmountSlider: document.getElementById('loanAmountSlider'),
        interestRate: document.getElementById('interestRate'), interestRateSlider: document.getElementById('interestRateSlider'),
        loanTerm: document.getElementById('loanTerm'), loanTermSlider: document.getElementById('loanTermSlider'),
        initialLTV: document.getElementById('initialLTV'), discountRate: document.getElementById('discountRate'), appreciationRate: document.getElementById('appreciationRate'),
        annualIncome: document.getElementById('annualIncome'), nonMortgageDebt: document.getElementById('nonMortgageDebt'), propertyTax: document.getElementById('propertyTax'),
        insurance: document.getElementById('insurance'), hoa: document.getElementById('hoa'), pitiEscalationRate: document.getElementById('pitiEscalationRate'),
        pmiRate: document.getElementById('pmiRate'), extraPayment: document.getElementById('extraPayment'), lumpSumPayment: document.getElementById('lumpSumPayment'),
        lumpSumPeriod: document.getElementById('lumpSumPeriod'), refiPeriod: document.getElementById('refiPeriod'), refiRate: document.getElementById('refiRate'),
        refiTerm: document.getElementById('refiTerm'), refiClosingCosts: document.getElementById('refiClosingCosts'), shockRateIncrease: document.getElementById('shockRateIncrease'),
        repaymentFrequency: document.getElementById('repaymentFrequency'), currency: document.getElementById('currency'), annualMaintenance: document.getElementById('annualMaintenance'),
        monthlyUtilities: document.getElementById('monthlyUtilities'), monthlyRent: document.getElementById('monthlyRent'), rentIncrease: document.getElementById('rentIncrease'),
        investmentReturn: document.getElementById('investmentReturn'), closingCosts: document.getElementById('closingCosts'), sellingCosts: document.getElementById('sellingCosts'),
        downPaymentAmount: document.getElementById('downPaymentAmount'), desiredFrontEndDTI: document.getElementById('desiredFrontEndDTI'), desiredBackEndDTI: document.getElementById('desiredBackEndDTI'),
        originalLoanAmount: document.getElementById('originalLoanAmount'), currentInterestRate: document.getElementById('currentInterestRate'), loanStartMonth: document.getElementById('loanStartMonth'), loanStartYear: document.getElementById('loanStartYear'),
        newInterestRate: document.getElementById('newInterestRate'), newLoanTerm: document.getElementById('newLoanTerm'), newClosingCosts: document.getElementById('newClosingCosts'),
        
        // Investment Property Inputs
        purchasePrice: document.getElementById('purchasePrice'), investmentDownPayment: document.getElementById('investmentDownPayment'), investmentInterestRate: document.getElementById('investmentInterestRate'),
        investmentLoanTerm: document.getElementById('investmentLoanTerm'), investmentClosingCosts: document.getElementById('investmentClosingCosts'), monthlyRentalIncome: document.getElementById('monthlyRentalIncome'),
        vacancyRate: document.getElementById('vacancyRate'), propertyTaxes: document.getElementById('propertyTaxes'), propertyInsurance: document.getElementById('propertyInsurance'),
        maintenanceCosts: document.getElementById('maintenanceCosts'), managementFee: document.getElementById('managementFee'),

        // Buttons
        calculateButtons: document.querySelectorAll('.calculate-button'), resetButtons: document.querySelectorAll('.reset-button'),
        saveButton: document.getElementById('saveButton'), shockTestButton: document.getElementById('shockTestButton'),

        // Output Areas
        results: document.getElementById('results'), affordabilityResults: document.getElementById('affordability-results'),
        rentVsBuyResults: document.getElementById('rent-vs-buy-results'), refinanceResults: document.getElementById('refinance-results'),
        investmentResults: document.getElementById('investment-results'),
        shockResults: document.getElementById('shock-results'), totalMonthlyPaymentPITI: document.getElementById('totalMonthlyPaymentPITI'),
        totalOwnershipCost: document.getElementById('totalOwnershipCost'), pmiDropNote: document.getElementById('pmiDropNote'),
        pmiDropPeriod: document.getElementById('pmiDropPeriod'), frontEndDTI: document.getElementById('frontEndDTI'),
        frontEndDTIStatus: document.getElementById('frontEndDTIStatus'), backEndDTI: document.getElementById('backEndDTI'),
        backEndDTIStatus: document.getElementById('backEndDTIStatus'), finalEquity: document.getElementById('finalEquity'),
        finalPropertyValue: document.getElementById('finalPropertyValue'), standardPaymentDisplay: document.getElementById('standardPaymentDisplay'),
        acceleratedPaymentDisplay: document.getElementById('acceleratedPaymentDisplay'), totalInterestOriginal: document.getElementById('totalInterestOriginal'),
        totalInterestNew: document.getElementById('totalInterestNew'), npvOriginal: document.getElementById('npvOriginal'),
        npvNew: document.getElementById('npvNew'), interestSaved: document.getElementById('interestSaved'),
        timeSaved: document.getElementById('timeSaved'), npvSaved: document.getElementById('npvSaved'),
        originalPayoffDate: document.getElementById('originalPayoffDate'), newPayoffDate: document.getElementById('newPayoffDate'),
        shockRateDisplay: document.getElementById('shockRateDisplay'), originalShockPaymentDisplay: document.getElementById('originalShockPaymentDisplay'),
        shockPaymentDisplay: document.getElementById('shockPaymentDisplay'), paymentIncrease: document.getElementById('paymentIncrease'),
        scheduleWrapper: document.getElementById('schedule-wrapper'), amortizationTable: document.getElementById('amortizationTable'),
        buyingNetWorth: document.getElementById('buyingNetWorth'), rentingNetWorth: document.getElementById('rentingNetWorth'),
        rentVsBuyConclusion: document.getElementById('rent-vs-buy-conclusion'), affordableHomePrice: document.getElementById('affordableHomePrice'),
        affordableLoanAmount: document.getElementById('affordableLoanAmount'), affordablePITI: document.getElementById('affordablePITI'),
        refiMonthlySavings: document.getElementById('refiMonthlySavings'), refiBreakEven: document.getElementById('refiBreakEven'),
        refiLifetimeSavings: document.getElementById('refiLifetimeSavings'),
        cashFlow: document.getElementById('cashFlow'), capRate: document.getElementById('capRate'), cashOnCashROI: document.getElementById('cashOnCashROI'),

        // UI Components
        errorMessages: document.getElementById('error-messages'), errorList: document.getElementById('error-list'),
        shareModal: document.getElementById('shareModal'), closeModalButton: document.getElementById('closeModalButton'),
        copyUrlButton: document.getElementById('copyUrlButton'), shareUrlInput: document.getElementById('shareUrlInput'),
        copyFeedback: document.getElementById('copyFeedback'),
        chartOptions: document.getElementById('chart-options'),
        togglePrincipalPaid: document.getElementById('togglePrincipalPaid'),
        toggleInterestPaid: document.getElementById('toggleInterestPaid'),
    };
    
    const allInputIds = Object.keys(DOM).filter(key => 
        DOM[key] && (DOM[key].tagName === 'INPUT' || DOM[key].tagName === 'SELECT')
    );

    let mortgageChart = null, rentVsBuyChart = null, affordabilityChart = null, refinanceChart = null, investmentChart = null;
    let currentResults = null, currentTab = 'mortgage';
    let tabs = {};
    let state = {};

    function updateStateFromDOM() {
        allInputIds.forEach(id => {
            if (DOM[id]) {
                const el = DOM[id];
                const isNumberInput = el.tagName === 'INPUT' && el.type === 'number';
                let value = el.value;
                if (isNumberInput) {
                    value = parseFloat(el.value);
                    if (isNaN(value)) value = 0;
                }
                 if (el.tagName === 'SELECT' && !isNaN(parseInt(el.value, 10))) {
                    value = parseInt(el.value, 10);
                }
                state[id] = value;
            }
        });
        if (DOM.loanStartYear && DOM.loanStartMonth) {
            state.loanStartDate = `${DOM.loanStartYear.value}-${DOM.loanStartMonth.value}`;
        }
    }

    const formatPercent = (amount) => (amount).toFixed(2) + '%';

    function animateValue(el, endValue, duration = 500, isCurrency = true, isPercent = false) {
        if (!el) return;
        let startValue = parseFloat(el.dataset.value) || 0;
        el.dataset.value = endValue;
        let startTime = null;
        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const currentValue = startValue + (endValue - startValue) * progress;
            if (isPercent) el.textContent = formatPercent(currentValue);
            else if (isCurrency) el.textContent = window.mortgageUtils.formatCurrency(currentValue, state.currency);
            else el.textContent = currentValue.toFixed(1);
            if (progress < 1) requestAnimationFrame(animation);
            else {
                if (isPercent) el.textContent = formatPercent(endValue);
                else if (isCurrency) el.textContent = window.mortgageUtils.formatCurrency(endValue, state.currency);
                else el.textContent = endValue.toFixed(1);
            }
        }
        requestAnimationFrame(animation);
    }

    function flashHighlight(elementId) {
        const el = DOM[elementId];
        if (el) {
            el.classList.add('flash-highlight');
            setTimeout(() => el.classList.remove('flash-highlight'), 1000);
        }
    }

    function updateCurrencySymbols() {
        const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$' };
        const symbol = symbols[state.currency] || '$';
        const symbolSpanIds = ['mc-loan-currency', 'mc-tax-currency', 'mc-ins-currency', 'mc-hoa-currency', 'mc-util-currency', 'mc-extra-currency', 'mc-lump-currency', 'mc-refi-currency', 'dti-income-currency', 'dti-debt-currency', 'afford-down-payment-currency', 'rvb-rent-currency', 'rvb-closing-costs-currency', 'refi-orig-currency', 'refi-costs-currency', 'inv-purchase-currency', 'inv-closing-costs-currency', 'inv-rent-currency', 'inv-tax-currency', 'inv-ins-currency'];
        symbolSpanIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = symbol;
        });
    }

    function calculateDTI(totalMonthlyHousingCost) {
        if (state.annualIncome === 0) return { frontEnd: 0, backEnd: 0 };
        const grossMonthlyIncome = state.annualIncome / 12;
        return { frontEnd: totalMonthlyHousingCost / grossMonthlyIncome, backEnd: (totalMonthlyHousingCost + state.nonMortgageDebt) / grossMonthlyIncome };
    }

    function renderDTI(frontEndDTI, backEndDTI) {
        const getStatus = (dti) => {
            const ratio = dti * 100;
            if (ratio <= 36) return { text: 'Excellent (<36%)', color: 'dti-safe' };
            if (ratio <= 43) return { text: 'Acceptable (<43%)', color: 'dti-high' };
            return { text: 'High Risk (>43%)', color: 'dti-critical' };
        };
        const applyStatus = (element, statusElement, status) => {
            element.className = `text-base font-extrabold text-${status.color}`;
            statusElement.textContent = status.text;
            statusElement.className = `text-xs font-semibold mt-1 text-${status.color}`;
        };
        DOM.frontEndDTI.textContent = formatPercent(frontEndDTI*100);
        applyStatus(DOM.frontEndDTI, DOM.frontEndDTIStatus, getStatus(frontEndDTI));
        DOM.backEndDTI.textContent = formatPercent(backEndDTI*100);
        applyStatus(DOM.backEndDTI, DOM.backEndDTIStatus, getStatus(backEndDTI));
    }

    function renderChart(acceleratedResults) {
        const ctx = document.getElementById('comparisonChart').getContext('2d');
        if (mortgageChart) mortgageChart.destroy();
        const schedule = acceleratedResults.schedule;
        const step = Math.ceil(schedule.length / 50);
        const chartData = schedule.filter((_, index) => index % step === 0 || index === schedule.length - 1);
        const labels = chartData.map(d => `Yr ${Math.ceil(d.period / 12)}`);
        
        let datasets = [
            { label: 'Property Value', data: chartData.map(d => d.propertyValue), borderColor: '#166534', borderWidth: 3, fill: false, tension: 0.3, pointRadius: 2 },
            { label: 'Total Home Equity', data: chartData.map(d => d.totalEquity), borderColor: '#34d399', backgroundColor: 'rgba(52, 211, 153, 0.1)', borderWidth: 2, fill: 'origin', tension: 0.3, pointRadius: 1 },
            { label: 'Loan Balance', data: chartData.map(d => d.balance), borderColor: '#1C768F', borderWidth: 3, fill: false, tension: 0.3, pointRadius: 2 }
        ];

        if (DOM.togglePrincipalPaid && DOM.togglePrincipalPaid.checked) {
            datasets.push({
                label: 'Total Principal Paid',
                data: chartData.map(d => d.cumulativePrincipal),
                borderColor: '#8b5cf6', // purple-500
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                tension: 0.3,
                pointRadius: 0
            });
        }
        if (DOM.toggleInterestPaid && DOM.toggleInterestPaid.checked) {
            datasets.push({
                label: 'Total Interest Paid',
                data: chartData.map(d => d.cumulativeInterest),
                borderColor: '#dc2626', // red-600
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                tension: 0.3,
                pointRadius: 0
            });
        }

        mortgageChart = new Chart(ctx, {
            type: 'line', data: { labels: labels, datasets: datasets },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: value => window.mortgageUtils.formatCurrency(value, state.currency).replace(/[,.€$£]/g, '') } } }, plugins: { title: { display: true, text: 'Equity Accumulation vs. Debt Payoff', font: { size: 14, weight: '600' } }, tooltip: { mode: 'index', intersect: false, callbacks: { label: c => `${c.dataset.label}: ${window.mortgageUtils.formatCurrency(c.parsed.y, state.currency)}` } } } }
        });
    }

    function renderRentVsBuyChart(rentingTimeline, buyingTimeline) {
        const ctx = document.getElementById('rentVsBuyChart').getContext('2d');
        if (rentVsBuyChart) rentVsBuyChart.destroy();
        const labels = rentingTimeline.map(d => `Year ${d.year}`);
        rentVsBuyChart = new Chart(ctx, {
            type: 'line', data: { labels: labels, datasets: [ { label: 'Buying Net Worth', data: buyingTimeline.map(d => d.netWorth), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.3 }, { label: 'Renting Net Worth', data: rentingTimeline.map(d => d.netWorth), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.3 } ] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: value => window.mortgageUtils.formatCurrency(value, state.currency) } } }, plugins: { title: { display: true, text: 'Long-Term Net Worth: Renting vs. Buying', font: { size: 16 } }, tooltip: { mode: 'index', intersect: false, callbacks: { label: c => `${c.dataset.label}: ${window.mortgageUtils.formatCurrency(c.parsed.y, state.currency)}` } } } }
        });
    }

    function renderRefinanceChart(results) {
        const ctx = document.getElementById('refinanceChart').getContext('2d');
        if (refinanceChart) refinanceChart.destroy();
        const breakEvenMonth = isFinite(results.breakEvenMonths) ? results.breakEvenMonths : null;
        const labels = results.savingsTimeline.map(d => d.month);
        refinanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cumulative Savings',
                    data: results.savingsTimeline.map(d => d.savings),
                    borderColor: '#166534',
                    backgroundColor: 'rgba(22, 101, 52, 0.1)',
                    fill: 'origin',
                    tension: 0.1,
                    pointRadius: 0,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'Refinance Cumulative Savings Over Time' },
                    tooltip: { callbacks: { label: c => `Month ${c.label}: ${window.mortgageUtils.formatCurrency(c.raw, state.currency)} in savings` } },
                    annotation: {
                        annotations: {
                            breakEvenLine: { type: 'line', yMin: 0, yMax: 0, borderColor: '#9A3412', borderWidth: 2, borderDash: [6, 6], label: { content: 'Break-Even', position: 'start', display: true, font: { weight: 'bold' }, backgroundColor: 'rgba(255,255,255,0.7)' } },
                            ...(breakEvenMonth && { breakEvenMarker: { type: 'line', xMin: breakEvenMonth, xMax: breakEvenMonth, borderColor: '#9A3412', borderWidth: 2, label: { content: `Break-Even: ${Math.floor(breakEvenMonth / 12)}y ${Math.round(breakEvenMonth % 12)}m`, position: 'end', display: true, font: { weight: 'bold' }, backgroundColor: 'rgba(255,255,255,0.7)', rotation: -90, yAdjust: 20 } } })
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: false, ticks: { callback: value => window.mortgageUtils.formatCurrency(value, state.currency) }, title: { display: true, text: 'Cumulative Savings' } },
                    x: { ticks: { callback: function(value, index) { const month = labels[index]; return month % 12 === 0 ? `Year ${month/12}` : null; }, autoSkip: false, maxRotation: 0 }, title: { display: true, text: 'Months Since Refinance' } }
                }
            }
        });
    }

    function validateInputs() {
        const errors = [];
        let fields;
        
        // Clear previous inline errors
        document.querySelectorAll('.inline-error-message').forEach(el => el.textContent = '');
        allInputIds.forEach(id => { if (DOM[id]) DOM[id].classList.remove('input-error'); });

        if (currentTab === 'mortgage') {
             fields = [ { id: 'loanAmount', name: 'Loan Principal', min: 1 }, { id: 'interestRate', name: 'Interest Rate', min: 0.1, max: 100 }, { id: 'loanTerm', name: 'Loan Term', min: 1, max: 50 }, { id: 'initialLTV', name: 'Initial LTV', min: 1, max: 100 }, { id: 'annualIncome', name: 'Annual Income', min: 0 }, { id: 'nonMortgageDebt', name: 'Non-Mortgage Debt', min: 0 }, { id: 'appreciationRate', name: 'Appreciation Rate', min: 0, max: 50 }, { id: 'discountRate', name: 'Discount Rate', min: 0, max: 50 }, { id: 'pitiEscalationRate', name: 'PITI Escalation Rate', min: 0, max: 50 }, { id: 'pmiRate', name: 'PMI Rate', min: 0, max: 10 }, { id: 'propertyTax', name: 'Property Tax', min: 0 }, { id: 'insurance', name: 'Home Insurance', min: 0 }, { id: 'hoa', name: 'HOA Dues', min: 0 }, { id: 'extraPayment', name: 'Extra Payment', min: 0 }, { id: 'lumpSumPayment', name: 'Lump Sum Payment', min: 0 }, { id: 'annualMaintenance', name: 'Annual Maintenance', min: 0, max: 20 }, { id: 'monthlyUtilities', name: 'Monthly Utilities', min: 0 } ];
        } else if (currentTab === 'rent-vs-buy') {
            fields = [ { id: 'monthlyRent', name: 'Monthly Rent', min: 1 }, { id: 'rentIncrease', name: 'Rent Increase', min: 0, max: 20 }, { id: 'investmentReturn', name: 'Investment Return', min: 0, max: 30 }, { id: 'closingCosts', name: 'Closing Costs', min: 0 }, { id: 'sellingCosts', name: 'Selling Costs', min: 0, max: 20 } ];
        } else if (currentTab === 'affordability') {
            fields = [ { id: 'downPaymentAmount', name: 'Down Payment', min: 0 }, { id: 'desiredFrontEndDTI', name: 'Housing DTI', min: 10, max: 50 }, { id: 'desiredBackEndDTI', name: 'Total DTI', min: 10, max: 50 } ];
        } else if (currentTab === 'refinance') {
            fields = [{ id: 'originalLoanAmount', name: 'Original Loan Amount', min: 1000 }, { id: 'currentInterestRate', name: 'Current Interest Rate', min: 0.1, max: 25 }, { id: 'newInterestRate', name: 'New Interest Rate', min: 0.1, max: 25 }, { id: 'newLoanTerm', name: 'New Loan Term', min: 5, max: 50 }, { id: 'newClosingCosts', name: 'Closing Costs', min: 0 }];
        } else if (currentTab === 'investment') {
            fields = [ {id: 'purchasePrice', name: 'Purchase Price', min: 1}, {id: 'investmentDownPayment', name: 'Down Payment', min: 0, max: 100}, {id: 'investmentInterestRate', name: 'Interest Rate', min: 0}, {id: 'investmentLoanTerm', name: 'Loan Term', min: 1}, {id: 'investmentClosingCosts', name: 'Closing Costs', min: 0}, {id: 'monthlyRentalIncome', name: 'Monthly Rent', min: 0}, {id: 'vacancyRate', name: 'Vacancy Rate', min: 0, max: 100}, {id: 'propertyTaxes', name: 'Property Taxes', min: 0}, {id: 'propertyInsurance', name: 'Insurance', min: 0}, {id: 'maintenanceCosts', name: 'Maintenance', min: 0, max: 100}, {id: 'managementFee', name: 'Management Fee', min: 0, max: 100} ];
        }
        
        fields.forEach(field => {
            const el = DOM[field.id]; if (!el) return;
            const errorEl = document.getElementById(`${field.id}-error`);
            const value = state[field.id];
            let errorMessage = '';

            if (typeof value === 'undefined' || (typeof value === 'number' && isNaN(value))) {
                errorMessage = `${field.name} must be a number.`;
            } else {
                if (field.min !== undefined && value < field.min) {
                    errorMessage = `${field.name} must be at least ${field.min}.`;
                }
                if (field.max !== undefined && value > field.max) {
                    errorMessage = `${field.name} cannot exceed ${field.max}.`;
                }
            }

            if (errorMessage) {
                errors.push(errorMessage);
                el.classList.add('input-error');
                if (errorEl) errorEl.textContent = errorMessage;
            }
        });

        DOM.errorMessages.classList.add('hidden'); // Always hide the top-level error message box.
        return errors.length === 0;
    }

    function handleCalculation(isShockTest = false, button = null) {
        const calculateButton = button;
        let originalButtonText = '';
        let activeContent;
        let loader;
        if (calculateButton) {
            originalButtonText = calculateButton.textContent;
            activeContent = calculateButton.closest('[role="tabpanel"]');
            if(activeContent) loader = activeContent.querySelector('.loading-overlay');
            if (loader) loader.classList.remove('hidden');
            calculateButton.disabled = true;
            calculateButton.textContent = 'Calculating...';
        }
        [DOM.results, DOM.affordabilityResults, DOM.rentVsBuyResults, DOM.refinanceResults, DOM.investmentResults].forEach(el => {
            if (el) {
                el.classList.remove('results-animate-in');
                el.classList.add('opacity-0');
            }
        });
        updateStateFromDOM();
        
        setTimeout(() => {
            try { 
                if (validateInputs()) {
                    if(currentTab === 'mortgage') calculateMortgage(isShockTest);
                    else if (currentTab === 'rent-vs-buy') runRentVsBuyAnalysis();
                    else if (currentTab === 'affordability') runAffordabilityAnalysis();
                    else if (currentTab === 'refinance') runRefinanceAnalysis();
                    else if (currentTab === 'investment') runInvestmentAnalysis();
                    updateURLWithInputs();
                }
            } 
            catch (e) { console.error("Calculation Error:", e); DOM.errorList.innerHTML = `<li>An unexpected error occurred. Please check console.</li>`; DOM.errorMessages.classList.remove('hidden'); } 
            finally {
                if (calculateButton) {
                    if (loader) loader.classList.add('hidden');
                    calculateButton.disabled = false;
                    calculateButton.textContent = originalButtonText;
                }
            }
        }, 50); // Reduced delay for better responsiveness with sliders
    }

    function runRentVsBuyAnalysis() {
        const results = window.plannerCore.calculateRentVsBuy(state);
        DOM.buyingNetWorth.textContent = window.mortgageUtils.formatCurrency(results.buyingNetWorth, state.currency);
        DOM.rentingNetWorth.textContent = window.mortgageUtils.formatCurrency(results.rentingNetWorth, state.currency);
        DOM.rentVsBuyConclusion.innerHTML = results.buyingNetWorth > results.rentingNetWorth ? `<p class="text-lg font-bold text-green-700">Buying appears to be the better financial decision.</p>` : `<p class="text-lg font-bold text-blue-700">Renting and investing appears to be the better financial decision.</p>`;
        renderRentVsBuyChart(results.rentingTimeline, results.buyingTimeline);
        DOM.rentVsBuyResults.classList.remove('opacity-0');
        DOM.rentVsBuyResults.classList.add('results-animate-in');
    }
    
    function runRefinanceAnalysis() {
        const results = window.plannerCore.calculateRefinance(state);
        animateValue(DOM.refiMonthlySavings, results.monthlySavings);
        if (isFinite(results.breakEvenMonths)) {
            const years = Math.floor(results.breakEvenMonths / 12); const months = Math.round(results.breakEvenMonths % 12);
            DOM.refiBreakEven.textContent = `${years}y ${months}m`;
        } else { DOM.refiBreakEven.textContent = 'N/A'; }
        animateValue(DOM.refiLifetimeSavings, results.lifetimeSavings);
        renderRefinanceChart(results);
        DOM.refinanceResults.classList.remove('opacity-0');
        DOM.refinanceResults.classList.add('results-animate-in');
    }

    function runAffordabilityAnalysis() {
        const results = window.plannerCore.AffordabilityCalculator.calculate(state);
        animateValue(DOM.affordableHomePrice, results.homePrice);
        animateValue(DOM.affordableLoanAmount, results.loanAmount);
        animateValue(DOM.affordablePITI, results.piti);
        if (!affordabilityChart) {
            const ctx = document.getElementById('affordabilityChart').getContext('2d');
            affordabilityChart = new Chart(ctx, { type: 'doughnut', options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Estimated Monthly Payment Breakdown' }, legend: { position: 'bottom', }, tooltip: { callbacks: { label: c => `${c.label}: ${window.mortgageUtils.formatCurrency(c.raw, state.currency)}` } } } } });
        }
        affordabilityChart.data = { labels: ['Principal & Interest', 'Property Tax', 'Home Insurance'], datasets: [{ label: 'Monthly Payment Breakdown', data: [results.pi, results.tax, results.insurance], backgroundColor: ['#1C768F', '#b45309', '#065f46'], borderColor: '#ffffff', borderWidth: 2 }] };
        affordabilityChart.update();
        DOM.affordabilityResults.classList.remove('opacity-0');
        DOM.affordabilityResults.classList.add('results-animate-in');
    }

    function runInvestmentAnalysis() {
        const results = window.plannerCore.InvestmentCalculator.calculate(state);
        animateValue(DOM.cashFlow, results.monthlyCashFlow);
        animateValue(DOM.capRate, results.capRate, 500, false, true);
        animateValue(DOM.cashOnCashROI, results.cashOnCashROI, 500, false, true);
        if (!investmentChart) {
            const ctx = document.getElementById('investmentChart').getContext('2d');
            investmentChart = new Chart(ctx, { type: 'bar', options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }, title: { display: true, text: 'Monthly Income vs. Expenses' }, tooltip: { callbacks: { label: c => window.mortgageUtils.formatCurrency(c.raw, state.currency) } } }, scales: { x: { beginAtZero: true, ticks: { callback: value => window.mortgageUtils.formatCurrency(value, state.currency) } } } } });
        }
        const cashFlowColor = results.monthlyCashFlow >= 0 ? 'rgba(22, 163, 74, 0.8)' : 'rgba(239, 68, 68, 0.8)';
        investmentChart.data = { labels: ['Gross Income', 'Expenses', 'Cash Flow'], datasets: [{ label: 'Monthly Financials', data: [results.income, results.p_i + results.taxes_ins + results.other_exp, results.monthlyCashFlow], backgroundColor: ['rgba(5, 150, 105, 0.8)', 'rgba(219, 39, 119, 0.8)', cashFlowColor] }] };
        investmentChart.update();
        DOM.investmentResults.classList.remove('opacity-0');
        DOM.investmentResults.classList.add('results-animate-in');
    }

    function calculateMortgage(isShockTest = false) {
        const periodsPerYear = state.repaymentFrequency;
        const originalParams = { principal: state.loanAmount, annualRate: state.interestRate / 100, periodsPerYear, totalPeriods: state.loanTerm * periodsPerYear, extraPaymentPerPeriod: 0, lumpSumAmount: 0, lumpSumPeriod: 0, initialLTV: state.initialLTV, pmiRate: 0, refiPeriod: 0, refiRate: 0, refiTerm: 0, refiClosingCosts: 0, pitiEscalationRate: 0, discountRate: state.discountRate / 100, appreciationRate: 0, propertyTax: state.propertyTax, insurance: state.insurance, hoa: state.hoa };
        const acceleratedParams = { ...originalParams, extraPaymentPerPeriod: state.extraPayment, lumpSumAmount: state.lumpSumPayment, lumpSumPeriod: state.lumpSumPeriod, pmiRate: state.pmiRate / 100, refiPeriod: state.refiPeriod, refiRate: state.refiRate, refiTerm: state.refiTerm, refiClosingCosts: state.refiClosingCosts, pitiEscalationRate: state.pitiEscalationRate / 100, appreciationRate: state.appreciationRate / 100 };
        
        DOM.scheduleWrapper.style.opacity = 1; DOM.shockResults.style.display = 'none';
        const original = window.plannerCore.generateAmortization(originalParams);
        const accelerated = window.plannerCore.generateAmortization(acceleratedParams);
        const savingsSummary = document.getElementById('savings-summary');
        if (savingsSummary) {
            savingsSummary.classList.remove('hidden', 'savings-summary-pop-in');
            setTimeout(() => savingsSummary.classList.add('savings-summary-pop-in'), 50);
        }
        if (DOM.chartOptions) DOM.chartOptions.classList.remove('hidden');
        const pniMonthly = original.standardPayment * (12 / periodsPerYear);
        const pmiMonthly = (accelerated.schedule[0] ? accelerated.schedule[0].pmi : 0) * (12 / periodsPerYear);
        const totalPITI = pniMonthly + (state.propertyTax / 12) + (state.insurance / 12) + state.hoa + pmiMonthly;
        const initialPropertyValue = (state.initialLTV > 0 && state.initialLTV <= 100) ? state.loanAmount / (state.initialLTV / 100) : state.loanAmount;
        const monthlyMaintenance = (initialPropertyValue * (state.annualMaintenance / 100)) / 12;
        const totalMonthlyOwnershipCost = totalPITI + monthlyMaintenance + state.monthlyUtilities;
        renderDTI(calculateDTI(totalMonthlyOwnershipCost).frontEnd, calculateDTI(totalMonthlyOwnershipCost).backEnd);
        animateValue(DOM.finalEquity, accelerated.finalEquity);
        animateValue(DOM.finalPropertyValue, accelerated.finalPropertyValue);
        DOM.totalMonthlyPaymentPITI.textContent = window.mortgageUtils.formatCurrency(totalPITI, state.currency);
        DOM.totalOwnershipCost.textContent = window.mortgageUtils.formatCurrency(totalMonthlyOwnershipCost, state.currency);
        if (state.pmiRate > 0 && state.initialLTV > 80 && accelerated.pmiDropPeriod) {
            DOM.pmiDropNote.style.display = 'block';
            DOM.pmiDropPeriod.textContent = accelerated.pmiDropPeriod;
        } else { DOM.pmiDropNote.style.display = 'none'; }
        DOM.standardPaymentDisplay.textContent = window.mortgageUtils.formatCurrency(original.standardPayment * (12 / periodsPerYear), state.currency);
        DOM.acceleratedPaymentDisplay.textContent = window.mortgageUtils.formatCurrency((original.standardPayment + state.extraPayment) * (12/periodsPerYear), state.currency);
        animateValue(DOM.totalInterestOriginal, original.totalInterest);
        animateValue(DOM.totalInterestNew, accelerated.totalInterest);
        animateValue(DOM.npvOriginal, original.totalPVInterest);
        animateValue(DOM.npvNew, accelerated.totalPVInterest);
        const iSaved = original.totalInterest - accelerated.totalInterest;
        const npvSaved = original.totalPVInterest - accelerated.totalPVInterest;
        const tSavedPeriods = original.payoffPeriod - accelerated.payoffPeriod;
        const tSavedY = Math.floor(tSavedPeriods / periodsPerYear);
        const tSavedM = Math.round((tSavedPeriods % periodsPerYear) * (12 / periodsPerYear));
        const timeSavedStr = `${tSavedY}y ${tSavedM}m`;
        DOM.originalPayoffDate.textContent = payoffDate(original.payoffPeriod, periodsPerYear);
        DOM.newPayoffDate.textContent = payoffDate(accelerated.payoffPeriod, periodsPerYear);
        animateValue(DOM.interestSaved, iSaved);
        animateValue(DOM.npvSaved, npvSaved);
        DOM.timeSaved.textContent = timeSavedStr;
        if (iSaved > 0) flashHighlight('interestSaved');
        if (npvSaved > 0) flashHighlight('npvSaved');
        if (tSavedPeriods > 0) flashHighlight('timeSaved');
        renderChart(accelerated);
        generateAmortizationTable(original, accelerated);
        if (isShockTest) {
            const shockInc = state.shockRateIncrease / 100;
            const shockRate = (state.interestRate / 100) + shockInc;
            const shockPmt = window.mortgageUtils.calculatePayment(state.loanAmount, shockRate * 100, periodsPerYear, state.loanTerm * periodsPerYear);
            DOM.shockResults.style.display = 'block';
            DOM.shockRateDisplay.textContent = (shockRate * 100).toFixed(2);
            DOM.originalShockPaymentDisplay.textContent = window.mortgageUtils.formatCurrency(original.standardPayment, state.currency);
            DOM.shockPaymentDisplay.textContent = window.mortgageUtils.formatCurrency(shockPmt, state.currency);
            DOM.paymentIncrease.textContent = window.mortgageUtils.formatCurrency(shockPmt - original.standardPayment, state.currency);
        }
        currentResults = { original, accelerated, totalPITI, totalMonthlyOwnershipCost, dti: calculateDTI(totalMonthlyOwnershipCost), interestSaved: iSaved, npvSaved: npvSaved, timeSaved: timeSavedStr, inputs: { ...state } };
        DOM.results.classList.remove('opacity-0');
        DOM.results.classList.add('results-animate-in');
    }

    function generateAmortizationTable(originalResults, acceleratedResults) {
        DOM.amortizationTable.innerHTML = `<thead class="text-xs text-gray-700 bg-gray-50 uppercase tracking-wider"><tr><th rowspan="2" class="py-2 px-1 border-b-2 border-gray-300 border-r">#</th><th colspan="4" class="py-2 px-1 border-b-2 border-gray-300 text-center bg-red-50/70 border-r border-red-300">Original Loan</th><th colspan="10" class="py-2 px-1 border-b-2 border-gray-300 text-center bg-sky-50/70">Accelerated Scenario</th></tr><tr class="font-medium"><th class="py-2 px-1 border-b border-gray-300 text-right bg-red-50/70">Nom. Interest</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-red-50/70 text-npv">PV Interest</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-red-50/70">P&I Pmt</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-red-50/70 border-r border-red-300">Balance</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70 text-accent">Home Equity</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/50 text-accent">Property Val</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">P&I Pmt</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">Tax/Ins/HOA</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">Nom. Interest</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70 text-npv">PV Interest</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">PMI</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">Extra</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">Total Pmt</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">Balance</th></tr></thead><tbody></tbody>`;
        const body = DOM.amortizationTable.querySelector('tbody');
        const maxPeriods = Math.max(originalResults.payoffPeriod, acceleratedResults.payoffPeriod);
        let rowsHtml = '';
        for (let i = 0; i < maxPeriods; i++) {
            const o = originalResults.schedule[i] || {}; const a = acceleratedResults.schedule[i] || {};
            if (!o.balance && !a.balance && i >= originalResults.payoffPeriod && i >= acceleratedResults.payoffPeriod) break;
            const newPNIPayment = (a.pniPrincipal || 0) + (a.interest || 0); const totalNewPayment = newPNIPayment + (a.periodicPITI || 0) + (a.extraPayment || 0);
            const taxInsHOA = (a.periodicPITI || 0) - (a.pmi || 0);
            rowsHtml += `<tr class="text-xs hover:bg-gray-50 border-b border-gray-200"><td class="p-2 border-r border-gray-300 font-semibold text-center">${i+1}</td><td class="p-2 text-right bg-red-50/50">${o.interest?window.mortgageUtils.formatCurrency(o.interest, state.currency):'-'}</td><td class="p-2 text-right bg-red-50/50 text-npv">${o.pvInterest?window.mortgageUtils.formatCurrency(o.pvInterest, state.currency):'-'}</td><td class="p-2 text-right bg-red-50/50">${o.principalPaid?window.mortgageUtils.formatCurrency(o.interest+o.principalPaid, state.currency):'-'}</td><td class="p-2 text-right bg-red-50/50 font-bold border-r border-red-300">${o.balance?window.mortgageUtils.formatCurrency(o.balance, state.currency):'PAID'}</td><td class="p-2 text-right bg-sky-50/50 font-bold text-accent">${a.totalEquity?window.mortgageUtils.formatCurrency(a.totalEquity, state.currency):'FULL'}</td><td class="p-2 text-right bg-sky-50/50 text-accent">${a.propertyValue?window.mortgageUtils.formatCurrency(a.propertyValue, state.currency):'FINAL'}</td><td class="p-2 text-right bg-sky-50/50">${a.interest?window.mortgageUtils.formatCurrency(newPNIPayment, state.currency):'-'}</td><td class="p-2 text-right bg-sky-50/50">${a.interest?window.mortgageUtils.formatCurrency(taxInsHOA, state.currency):'-'}</td><td class="p-2 text-right bg-sky-50/50">${a.interest?window.mortgageUtils.formatCurrency(a.interest, state.currency):'-'}</td><td class="p-2 text-right bg-sky-50/50 text-npv">${a.pvInterest?window.mortgageUtils.formatCurrency(a.pvInterest, state.currency):'-'}</td><td class="p-2 text-right bg-sky-50/50">${a.pmi>0.01?window.mortgageUtils.formatCurrency(a.pmi, state.currency):'-'}</td><td class="p-2 text-right bg-sky-50/50">${a.extraPayment>0.01?window.mortgageUtils.formatCurrency(a.extraPayment, state.currency):'-'}</td><td class="p-2 text-right bg-sky-50/50 font-bold text-primary">${a.interest?window.mortgageUtils.formatCurrency(totalNewPayment, state.currency):'-'}</td><td class="p-2 text-right bg-sky-50/50 font-bold">${a.balance?window.mortgageUtils.formatCurrency(a.balance, state.currency):'PAID'}</td></tr>`;
        }
        body.innerHTML = rowsHtml;
    }

    function resetForm() {
        const defaults = { loanAmount: "300000", interestRate: "6.5", loanTerm: "30", initialLTV: "90", discountRate: "3.0", appreciationRate: "3.5", annualIncome: "120000", nonMortgageDebt: "800", propertyTax: "3600", insurance: "1200", hoa: "0", pitiEscalationRate: "2.0", pmiRate: "0.5", extraPayment: "100", lumpSumPayment: "5000", lumpSumPeriod: "1", refiPeriod: "60", refiRate: "5.0", refiTerm: "15", refiClosingCosts: "5000", shockRateIncrease: "1.0", annualMaintenance: "1.0", monthlyUtilities: "300", monthlyRent: "2000", rentIncrease: "3.0", investmentReturn: "7.0", closingCosts: "8000", sellingCosts: "6.0", downPaymentAmount: "60000", desiredFrontEndDTI: "28", desiredBackEndDTI: "36", originalLoanAmount: "300000", currentInterestRate: "6.5", newInterestRate: "5.0", newLoanTerm: "30", newClosingCosts: "5000", purchasePrice: "250000", investmentDownPayment: "20", investmentInterestRate: "7.5", investmentLoanTerm: "30", investmentClosingCosts: "4000", monthlyRentalIncome: "2200", vacancyRate: "5", propertyTaxes: "3000", propertyInsurance: "1000", maintenanceCosts: "8", managementFee: "10" };
        localStorage.removeItem('mortgageCalculatorState');
        for (const id in defaults) { const el = DOM[id]; if (el) el.value = defaults[id]; }
        if(DOM.loanStartMonth) DOM.loanStartMonth.value = "01";
        if(DOM.loanStartYear) DOM.loanStartYear.value = "2021";
        if (DOM.loanAmountSlider) DOM.loanAmountSlider.value = defaults.loanAmount;
        if (DOM.interestRateSlider) DOM.interestRateSlider.value = defaults.interestRate;
        if (DOM.loanTermSlider) DOM.loanTermSlider.value = defaults.loanTerm;
        DOM.repaymentFrequency.value = "12"; DOM.currency.value = "USD";
        updateStateFromDOM();
        history.pushState(null, '', window.location.pathname);
        handleCalculation(false, DOM.calculateButtons[0]);
        updateCurrencySymbols();
    }

    function updateURLWithInputs() {
        const params = new URLSearchParams();
        for (const key in state) {
            params.set(key, state[key]);
        }
        history.replaceState(null, '', '?' + params.toString());
    }

    function saveStateToLocalStorage() {
        try {
            const stateToSave = { ...state };
            localStorage.setItem('mortgageCalculatorState', JSON.stringify(stateToSave));
        } catch (e) {
            console.error("Could not save state to local storage:", e);
        }
    }

    function loadStateFromURLOrLocalStorage() {
        const params = new URLSearchParams(window.location.search);
        if (params.toString().length > 0) {
            allInputIds.forEach(id => { 
                const el = DOM[id]; 
                if (el && params.has(id) && id !== 'loanStartMonth' && id !== 'loanStartYear') {
                    el.value = params.get(id); 
                }
            });
            if (params.has('loanStartDate')) {
                const [year, month] = params.get('loanStartDate').split('-');
                if (DOM.loanStartYear && DOM.loanStartMonth) {
                    DOM.loanStartYear.value = year;
                    DOM.loanStartMonth.value = month;
                }
            }
            return true;
        } else {
            try {
                const savedState = localStorage.getItem('mortgageCalculatorState');
                if (savedState) {
                    const parsedState = JSON.parse(savedState);
                    allInputIds.forEach(id => {
                        if (DOM[id] && parsedState[id] !== undefined) {
                            DOM[id].value = parsedState[id];
                        }
                    });
                     if (parsedState.loanStartDate) {
                        const [year, month] = parsedState.loanStartDate.split('-');
                        if (DOM.loanStartYear && DOM.loanStartMonth) {
                            DOM.loanStartYear.value = year;
                            DOM.loanStartMonth.value = month;
                        }
                    }
                    return true;
                }
            } catch (e) {
                console.error("Could not load state from local storage:", e);
            }
        }
        return false;
    }


    function setupModal() {
        DOM.saveButton.addEventListener('click', () => {
            updateURLWithInputs(); DOM.shareUrlInput.value = window.location.href;
            DOM.shareModal.classList.remove('hidden'); DOM.shareUrlInput.select();
        });
        DOM.closeModalButton.addEventListener('click', () => { DOM.shareModal.classList.add('hidden'); DOM.copyFeedback.textContent = ''; });
        DOM.copyUrlButton.addEventListener('click', () => {
            DOM.shareUrlInput.select();
            try { document.execCommand('copy'); DOM.copyFeedback.textContent = 'Copied to clipboard!'; setTimeout(() => { DOM.copyFeedback.textContent = ''; }, 2000); } 
            catch (err) { console.error('Failed to copy: ', err); DOM.copyFeedback.textContent = 'Failed to copy.'; }
        });
        DOM.shareModal.addEventListener('click', (event) => { if (event.target === DOM.shareModal) { DOM.shareModal.classList.add('hidden'); DOM.copyFeedback.textContent = ''; } });
    }

    function generatePDF() {
        if (currentTab !== 'mortgage' || !currentResults) { alert("Please calculate a scenario on the Mortgage Calculator tab first to generate a report."); return; }
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        const { inputs, totalPITI, totalMonthlyOwnershipCost, dti, original, accelerated, interestSaved, npvSaved, timeSaved } = currentResults;
        doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(28, 118, 143);
        doc.text("Strategic Mortgage Planner", 105, 20, { align: 'center' });
        doc.setFontSize(10); doc.setTextColor(100); doc.setFont("helvetica", "normal");
        doc.text("Personalized Mortgage Report", 105, 27, { align: 'center' });
        doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 105, 32, { align: 'center' });
        const summaryData = [ ['Loan Principal', window.mortgageUtils.formatCurrency(inputs.loanAmount, inputs.currency)], ['Interest Rate', `${inputs.interestRate}%`], ['Loan Term', `${inputs.loanTerm} Years`], ['Est. PITI + PMI', window.mortgageUtils.formatCurrency(totalPITI, inputs.currency)], ['Total Monthly Ownership Cost', window.mortgageUtils.formatCurrency(totalMonthlyOwnershipCost, inputs.currency)], ['Front-End DTI (Housing)', formatPercent(dti.frontEnd*100)], ['Back-End DTI (Total Debt)', formatPercent(dti.backEnd*100)] ];
        doc.autoTable({ startY: 40, head: [['Key Metric', 'Value']], body: summaryData, theme: 'striped', headStyles: { fillColor: [28, 118, 143] } });
        const comparisonData = [ ['Payoff Date', payoffDate(original.payoffPeriod, inputs.repaymentFrequency), payoffDate(accelerated.payoffPeriod, inputs.repaymentFrequency)], ['Total Interest Paid', window.mortgageUtils.formatCurrency(original.totalInterest, inputs.currency), window.mortgageUtils.formatCurrency(accelerated.totalInterest, inputs.currency)], ['NPV of Interest Cost', window.mortgageUtils.formatCurrency(original.totalPVInterest, inputs.currency), window.mortgageUtils.formatCurrency(accelerated.totalPVInterest, inputs.currency)], ['Final Equity', window.mortgageUtils.formatCurrency(original.finalEquity, inputs.currency), window.mortgageUtils.formatCurrency(accelerated.finalEquity, inputs.currency)] ];
        doc.autoTable({ startY: doc.lastAutoTable.finalY + 10, head: [['Metric', 'Original Loan', 'Accelerated Scenario']], body: comparisonData, theme: 'grid', headStyles: { fillColor: [28, 118, 143] } });
        doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 135, 73);
        doc.text("Accelerated Payoff Savings Summary", 14, doc.lastAutoTable.finalY + 15);
        const savingsData = [ ['Nominal Interest Saved', window.mortgageUtils.formatCurrency(interestSaved, inputs.currency)], ['NPV (True Value) Saved', window.mortgageUtils.formatCurrency(npvSaved, inputs.currency)], ['Time Shaved Off Loan', timeSaved] ];
        doc.autoTable({ startY: doc.lastAutoTable.finalY + 22, body: savingsData, theme: 'plain' });
        doc.addPage(); doc.setFontSize(16); doc.setTextColor(28, 118, 143);
        doc.text("Accelerated Amortization Schedule (Annual Summary)", 105, 15, { align: 'center' });
        const annualData = []; let yearInterest = 0, yearPrincipal = 0, yearExtra = 0;
        for (let i = 0; i < accelerated.schedule.length; i++) {
            yearInterest += accelerated.schedule[i].interest; yearPrincipal += accelerated.schedule[i].pniPrincipal; yearExtra += accelerated.schedule[i].extraPayment;
            if ((i + 1) % inputs.repaymentFrequency === 0 || i === accelerated.schedule.length - 1) {
                const yearEnd = accelerated.schedule[i];
                annualData.push([ `Year ${Math.ceil(yearEnd.period / inputs.repaymentFrequency)}`, window.mortgageUtils.formatCurrency(yearInterest, inputs.currency), window.mortgageUtils.formatCurrency(yearPrincipal + yearExtra, inputs.currency), window.mortgageUtils.formatCurrency(yearEnd.totalEquity, inputs.currency), window.mortgageUtils.formatCurrency(yearEnd.balance, inputs.currency) ]);
                yearInterest = 0; yearPrincipal = 0; yearExtra = 0;
            }
        }
        doc.autoTable({ startY: 25, head: [['Year', 'Total Interest Paid', 'Total Principal Paid', 'End of Year Equity', 'End of Year Balance']], body: annualData, theme: 'striped', headStyles: { fillColor: [28, 118, 143] } });
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150); doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10); doc.text('Disclaimer: This is for informational purposes only. Consult a financial professional.', 105, doc.internal.pageSize.height - 10, { align: 'center' });
        }
        doc.save(`Mortgage_Report_${new Date().toISOString().slice(0,10)}.pdf`);
    }

    function payoffDate(periods, periodsPerYear) {
        let d = new Date(); const totalMonths = Math.round(periods / (periodsPerYear / 12));
        d.setMonth(d.getMonth() + totalMonths);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    };

    function switchTab(tab) {
        currentTab = tab;
        for (const key in tabs) {
            if (tabs[key].button && tabs[key].content) {
                const isActive = key === tab;
                tabs[key].button.classList.toggle('active', isActive);
                tabs[key].button.setAttribute('aria-selected', isActive);
                tabs[key].content.classList.toggle('hidden', !isActive);
            }
        }
        if(history.replaceState) {
            history.replaceState(null, null, `#${tab}-tab`);
        }
        
        handleCalculation();
    }

    function setupTabs() {
        tabs = { 
            'mortgage': { button: document.getElementById('mortgage-tab'), content: document.getElementById('mortgage-calculator-content') }, 
            'affordability': { button: document.getElementById('affordability-tab'), content: document.getElementById('affordability-content') }, 
            'rent-vs-buy': { button: document.getElementById('rent-vs-buy-tab'), content: document.getElementById('rent-vs-buy-content') },
            'refinance': { button: document.getElementById('refinance-tab'), content: document.getElementById('refinance-content') },
            'investment': { button: document.getElementById('investment-tab'), content: document.getElementById('investment-content') }
        };
        for (const key in tabs) {
            if (tabs[key].button) {
                tabs[key].button.addEventListener('click', () => switchTab(key));
            }
        }
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
        const debouncedCalc = debounce(() => handleCalculation(false), 250);
        
        const update = () => {
            updateSliderFill(slider);
            debouncedCalc();
        };
        
        slider.addEventListener('input', () => {
            input.value = slider.value;
            update();
        });
        input.addEventListener('change', () => {
            slider.value = input.value;
            update();
        });
        
        updateSliderFill(slider); // Initial fill
    }

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }


    function init() {
        if (window.ChartAnnotation) {
            Chart.register(window.ChartAnnotation);
        } else {
            console.warn('Chart.js Annotation plugin not found. Break-even line will not be displayed.');
        }

        setupTabs();
        setupModal();
        
        syncSliderAndInput(DOM.loanAmountSlider, DOM.loanAmount);
        syncSliderAndInput(DOM.interestRateSlider, DOM.interestRate);
        syncSliderAndInput(DOM.loanTermSlider, DOM.loanTerm);
        
        document.body.style.opacity = '0'; // Hide body to prevent FOUC

        window.addEventListener('beforeprint', () => {
            if (Chart && Chart.defaults) Chart.defaults.animation = false;
        });

        window.addEventListener('afterprint', () => {
            if (Chart && Chart.defaults) Chart.defaults.animation = {};
        });

        DOM.currency.addEventListener('change', () => {
            updateStateFromDOM();
            updateCurrencySymbols();
            const visibleButton = document.querySelector(`#${currentTab}-content .calculate-button`) || DOM.calculateButtons[0];
            handleCalculation(false, visibleButton);
        });
        
        DOM.calculateButtons.forEach(btn => btn.addEventListener('click', (event) => handleCalculation(false, event.target)));
        DOM.resetButtons.forEach(btn => btn.addEventListener('click', resetForm));
        if(DOM.shockTestButton) DOM.shockTestButton.addEventListener('click', () => handleCalculation(true, DOM.shockTestButton));
        
        document.querySelector('.print-button').addEventListener('click', () => window.print());
        document.querySelector('.pdf-button').addEventListener('click', generatePDF);
        
        if(DOM.togglePrincipalPaid) DOM.togglePrincipalPaid.addEventListener('change', () => { if (currentResults) renderChart(currentResults.accelerated); });
        if(DOM.toggleInterestPaid) DOM.toggleInterestPaid.addEventListener('change', () => { if (currentResults) renderChart(currentResults.accelerated); });

        allInputIds.forEach(id => {
            const el = DOM[id];
            if (el && !['loanAmount', 'interestRate', 'loanTerm'].includes(id)) {
                 const debouncedSave = debounce(() => {
                    updateStateFromDOM();
                    saveStateToLocalStorage();
                    handleCalculation();
                }, 400);

                el.addEventListener('input', debouncedSave);
            }
        });

        loadGuide();
        
        const dataLoaded = loadStateFromURLOrLocalStorage();

        const hash = window.location.hash.substring(1);
        const tabKeyFromHash = hash.replace('-tab', '');
        
        if (tabs[tabKeyFromHash]) {
            switchTab(tabKeyFromHash);
             setTimeout(() => {
                const calculatorEl = document.getElementById('calculator');
                if (calculatorEl) calculatorEl.scrollIntoView({ behavior: 'smooth' });
            }, 150);
        } else {
            switchTab('mortgage');
        }

        populateYearDropdown();
        
        updateStateFromDOM();

        const initialVisibleButton = document.querySelector('.calculate-button:not([style*="display: none"])') || DOM.calculateButtons[0];

        if (!dataLoaded) {
             resetForm();
        } else {
            updateStateFromDOM();
            handleCalculation(false, initialVisibleButton);
        }
        updateCurrencySymbols();
        [DOM.loanAmountSlider, DOM.interestRateSlider, DOM.loanTermSlider].forEach(s => {
            if(s) updateSliderFill(s);
        });
        
        document.body.style.transition = 'opacity 0.5s';
        document.body.style.opacity = '1';

        
        const backToTopButton = document.getElementById('back-to-top');
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) backToTopButton.classList.remove('hidden');
            else backToTopButton.classList.add('hidden');
        });
        backToTopButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
    
    function populateYearDropdown() {
        const yearSelect = DOM.loanStartYear;
        if (!yearSelect) return;
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < 40; i++) {
            const year = currentYear - i;
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
    }
    
    function loadGuide() {
        const guideContent = document.getElementById('guide-content'); if (!guideContent) return;
        fetch('content-guide.html')
            .then(response => response.ok ? response.text() : Promise.reject('Guide not found'))
            .then(html => { guideContent.innerHTML = html; })
            .catch(error => { guideContent.innerHTML = '<p class="text-red-500 text-center p-8">Sorry, the homeowner\'s guide could not be loaded.</p>'; console.error('Error fetching content guide:', error); });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
