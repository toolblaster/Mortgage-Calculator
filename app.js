/*
================================================
Strategic Mortgage Planner - Application Logic
(Refactored for improved structure and maintainability)
================================================
This script is wrapped in an IIFE to prevent global scope pollution.
It caches DOM elements for efficiency and organizes logic into distinct sections.

TABLE OF CONTENTS
-----------------
1. IIFE & Scope Initialization
2. DOM Element Cache
3. Global State & Chart Instances
4. Helper Functions (Formatting, Animation)
5. Core Financial Calculation Functions
6. DTI (Debt-to-Income) Calculation & Rendering
7. Chart Rendering Functions
8. Input Validation
9. Main Calculation Orchestration
10. Form & State Management (Reset, URL)
11. UI Component Management (Modal, Tabs, PDF)
12. Event Listeners & Initial Page Load
================================================
*/

// --- 1. IIFE & Scope Initialization ---
(function() {
    'use strict';

    // --- 2. DOM Element Cache ---
    // Caching all DOM elements needed for the script to avoid repeated queries.
    const DOM = {
        // Input Fields
        loanAmount: document.getElementById('loanAmount'),
        interestRate: document.getElementById('interestRate'),
        loanTerm: document.getElementById('loanTerm'),
        initialLTV: document.getElementById('initialLTV'),
        discountRate: document.getElementById('discountRate'),
        appreciationRate: document.getElementById('appreciationRate'),
        annualIncome: document.getElementById('annualIncome'),
        nonMortgageDebt: document.getElementById('nonMortgageDebt'),
        propertyTax: document.getElementById('propertyTax'),
        insurance: document.getElementById('insurance'),
        hoa: document.getElementById('hoa'),
        pitiEscalationRate: document.getElementById('pitiEscalationRate'),
        pmiRate: document.getElementById('pmiRate'),
        extraPayment: document.getElementById('extraPayment'),
        lumpSumPayment: document.getElementById('lumpSumPayment'),
        lumpSumPeriod: document.getElementById('lumpSumPeriod'),
        refiPeriod: document.getElementById('refiPeriod'),
        refiRate: document.getElementById('refiRate'),
        refiTerm: document.getElementById('refiTerm'),
        refiClosingCosts: document.getElementById('refiClosingCosts'),
        shockRateIncrease: document.getElementById('shockRateIncrease'),
        repaymentFrequency: document.getElementById('repaymentFrequency'),
        currency: document.getElementById('currency'),
        annualMaintenance: document.getElementById('annualMaintenance'),
        monthlyUtilities: document.getElementById('monthlyUtilities'),
        monthlyRent: document.getElementById('monthlyRent'),
        rentIncrease: document.getElementById('rentIncrease'),
        investmentReturn: document.getElementById('investmentReturn'),
        closingCosts: document.getElementById('closingCosts'),
        sellingCosts: document.getElementById('sellingCosts'),
        downPaymentAmount: document.getElementById('downPaymentAmount'),
        desiredFrontEndDTI: document.getElementById('desiredFrontEndDTI'),
        desiredBackEndDTI: document.getElementById('desiredBackEndDTI'),
        originalLoanAmount: document.getElementById('originalLoanAmount'),
        currentInterestRate: document.getElementById('currentInterestRate'),
        loanStartDate: document.getElementById('loanStartDate'),
        newInterestRate: document.getElementById('newInterestRate'),
        newLoanTerm: document.getElementById('newLoanTerm'),
        newClosingCosts: document.getElementById('newClosingCosts'),

        // Buttons
        calculateButtons: document.querySelectorAll('.calculate-button'),
        resetButtons: document.querySelectorAll('.reset-button'),
        saveButton: document.getElementById('saveButton'),
        shockTestButton: document.getElementById('shockTestButton'),

        // Output Areas
        results: document.getElementById('results'),
        affordabilityResults: document.getElementById('affordability-results'),
        rentVsBuyResults: document.getElementById('rent-vs-buy-results'),
        refinanceResults: document.getElementById('refinance-results'),
        shockResults: document.getElementById('shock-results'),
        totalMonthlyPaymentPITI: document.getElementById('totalMonthlyPaymentPITI'),
        totalOwnershipCost: document.getElementById('totalOwnershipCost'),
        pmiDropNote: document.getElementById('pmiDropNote'),
        pmiDropPeriod: document.getElementById('pmiDropPeriod'),
        frontEndDTI: document.getElementById('frontEndDTI'),
        frontEndDTIStatus: document.getElementById('frontEndDTIStatus'),
        backEndDTI: document.getElementById('backEndDTI'),
        backEndDTIStatus: document.getElementById('backEndDTIStatus'),
        finalEquity: document.getElementById('finalEquity'),
        finalPropertyValue: document.getElementById('finalPropertyValue'),
        standardPaymentDisplay: document.getElementById('standardPaymentDisplay'),
        acceleratedPaymentDisplay: document.getElementById('acceleratedPaymentDisplay'),
        totalInterestOriginal: document.getElementById('totalInterestOriginal'),
        totalInterestNew: document.getElementById('totalInterestNew'),
        npvOriginal: document.getElementById('npvOriginal'),
        npvNew: document.getElementById('npvNew'),
        interestSaved: document.getElementById('interestSaved'),
        timeSaved: document.getElementById('timeSaved'),
        npvSaved: document.getElementById('npvSaved'),
        originalPayoffDate: document.getElementById('originalPayoffDate'),
        newPayoffDate: document.getElementById('newPayoffDate'),
        shockRateDisplay: document.getElementById('shockRateDisplay'),
        originalShockPaymentDisplay: document.getElementById('originalShockPaymentDisplay'),
        shockPaymentDisplay: document.getElementById('shockPaymentDisplay'),
        paymentIncrease: document.getElementById('paymentIncrease'),
        scheduleWrapper: document.getElementById('schedule-wrapper'),
        amortizationTable: document.getElementById('amortizationTable'),
        buyingNetWorth: document.getElementById('buyingNetWorth'),
        rentingNetWorth: document.getElementById('rentingNetWorth'),
        rentVsBuyConclusion: document.getElementById('rent-vs-buy-conclusion'),
        affordableHomePrice: document.getElementById('affordableHomePrice'),
        affordableLoanAmount: document.getElementById('affordableLoanAmount'),
        affordablePITI: document.getElementById('affordablePITI'),
        refiMonthlySavings: document.getElementById('refiMonthlySavings'),
        refiBreakEven: document.getElementById('refiBreakEven'),
        refiLifetimeSavings: document.getElementById('refiLifetimeSavings'),


        // UI Components
        errorMessages: document.getElementById('error-messages'),
        errorList: document.getElementById('error-list'),
        shareModal: document.getElementById('shareModal'),
        closeModalButton: document.getElementById('closeModalButton'),
        copyUrlButton: document.getElementById('copyUrlButton'),
        shareUrlInput: document.getElementById('shareUrlInput'),
        copyFeedback: document.getElementById('copyFeedback'),
    };
    
    // An object to hold all input IDs for easy iteration
    const allInputIds = Object.keys(DOM).filter(key => 
        DOM[key] && (DOM[key].tagName === 'INPUT' || DOM[key].tagName === 'SELECT')
    );


    // --- 3. Global State & Chart Instances ---
    let mortgageChart = null;
    let rentVsBuyChart = null;
    let affordabilityChart = null;
    let refinanceChart = null;
    let currentResults = null;
    let currentTab = 'mortgage';


    // --- 4. Helper Functions ---

    /**
     * Formats a number as a currency string based on the selected currency.
     * @param {number} amount - The number to format.
     * @returns {string} The formatted currency string.
     */
    const formatCurrency = (amount) => {
        const currency = DOM.currency.value || 'USD';
        const locale = ['EUR', 'GBP'].includes(currency) ? 'de-DE' : 'en-US';
        return new Intl.NumberFormat(locale, { style: 'currency', currency: currency, minimumFractionDigits: 0 }).format(amount);
    };
    const formatPercent = (amount) => (amount * 100).toFixed(1) + '%';

    /**
     * Animates a numerical value in a DOM element from a start to an end value.
     * @param {HTMLElement} el - The DOM element to update.
     * @param {number} endValue - The final value to display.
     * @param {number} duration - Animation duration in milliseconds.
     */
    function animateValue(el, endValue, duration = 500, isCurrency = true) {
        if (!el) return;
        let startValue = parseFloat(el.dataset.value) || 0;
        el.dataset.value = endValue;
        let startTime = null;

        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const currentValue = startValue + (endValue - startValue) * progress;
            el.textContent = isCurrency ? formatCurrency(currentValue) : currentValue.toFixed(1);
            if (progress < 1) {
                requestAnimationFrame(animation);
            } else {
                el.textContent = isCurrency ? formatCurrency(endValue) : endValue.toFixed(1);
            }
        }
        requestAnimationFrame(animation);
    }

    /**
     * Applies a temporary highlight animation to an element.
     * @param {string} elementId - The ID of the element to highlight.
     */
    function flashHighlight(elementId) {
        const el = DOM[elementId];
        if (el) {
            el.classList.add('flash-highlight');
            setTimeout(() => {
                el.classList.remove('flash-highlight');
            }, 1000);
        }
    }

    /**
     * Updates all currency symbols in the UI.
     */
    function updateCurrencySymbols() {
        const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$' };
        const symbol = symbols[DOM.currency.value] || '$';
        const symbolSpanIds = [
            'mc-loan-currency', 'mc-tax-currency', 'mc-ins-currency', 'mc-hoa-currency',
            'mc-util-currency', 'mc-extra-currency', 'mc-lump-currency', 'mc-refi-currency',
            'dti-income-currency', 'dti-debt-currency',
            'afford-down-payment-currency',
            'rvb-rent-currency', 'rvb-closing-costs-currency',
            'refi-orig-currency', 'refi-costs-currency'
        ];
        symbolSpanIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = symbol;
        });
    }


    // --- 5. Core Financial Calculation Functions ---

    /**
     * Calculates the periodic payment for a fixed-rate loan.
     */
    function calculatePayment(principal, annualRate, periodsPerYear, totalPeriods) {
        if (annualRate <= 0 || totalPeriods <= 0) return principal / (totalPeriods > 0 ? totalPeriods : 1);
        const periodicRate = annualRate / periodsPerYear;
        const payment = principal * periodicRate / (1 - Math.pow(1 + periodicRate, -totalPeriods));
        return isFinite(payment) ? payment : 0;
    }

    /**
     * Generates the full amortization schedule and key financial metrics.
     */
    function generateAmortization(params) {
        let { principal, annualRate, periodsPerYear, totalPeriods, extraPaymentPerPeriod, lumpSumAmount, lumpSumPeriod, initialLTV, pmiRate, refiPeriod, refiRate, refiTerm, refiClosingCosts, pitiEscalationRate, discountRate, appreciationRate } = params;
        
        let currentBalance = principal, currentRate = annualRate, totalPeriodsRemaining = totalPeriods;
        const standardPaymentOriginal = calculatePayment(principal, annualRate, periodsPerYear, totalPeriods);
        let standardPayment = standardPaymentOriginal;
        let totalInterestPaid = 0, totalPVInterestPaid = 0, payoffPeriod = 0, pmiDropPeriod = null;
        let amortizationSchedule = [];
        const periodicPmiRate = pmiRate / periodsPerYear;
        const periodicDiscountRate = discountRate / periodsPerYear;
        const periodicAppreciationRate = appreciationRate / periodsPerYear;
        const initialPropertyValue = (initialLTV > 0 && initialLTV <= 100) ? principal / (initialLTV / 100) : principal;
        let currentPropertyValue = initialPropertyValue;
        const pmiStopThreshold = 0.80 * initialPropertyValue;
        let isPMIActive = (initialLTV > 80);
        let hasRefinanced = false;
        let currentAnnualTax = parseFloat(DOM.propertyTax.value) || 0;
        let currentAnnualInsurance = parseFloat(DOM.insurance.value) || 0;
        let currentMonthlyHoa = parseFloat(DOM.hoa.value) || 0;
        const escalationFactor = 1 + (pitiEscalationRate / 100);

        for (let period = 1; currentBalance > 0 && period <= 50 * periodsPerYear; period++) {
            // Annual cost increases (Tax, Insurance, HOA) and property appreciation
            if (period > 1) {
                if ((period - 1) % periodsPerYear === 0) {
                    currentAnnualTax *= escalationFactor;
                    currentAnnualInsurance *= escalationFactor;
                    currentMonthlyHoa *= escalationFactor;
                }
                currentPropertyValue *= (1 + periodicAppreciationRate);
            }

            // Handle Refinancing
            let periodicRate = currentRate / periodsPerYear;
            if (!hasRefinanced && refiPeriod > 0 && period >= refiPeriod) {
                if (currentBalance > 0) currentBalance += refiClosingCosts;
                currentRate = refiRate / 100;
                totalPeriodsRemaining = Math.max(0, (refiTerm * periodsPerYear));
                standardPayment = calculatePayment(currentBalance, currentRate, periodsPerYear, totalPeriodsRemaining);
                hasRefinanced = true;
            }

            // Core P&I calculation
            let interest = currentBalance * periodicRate;
            let calculatedPayment = standardPayment;
            if (currentBalance < calculatedPayment) calculatedPayment = currentBalance + interest;
            else if (calculatedPayment <= interest) calculatedPayment = interest + 1; // Ensure principal is paid
            let principalPayment = calculatedPayment - interest;
            
            // Extra Payments
            let extraPrincipal = extraPaymentPerPeriod;
            if (lumpSumAmount > 0 && period === lumpSumPeriod) extraPrincipal += lumpSumAmount;
            let totalPrincipalPaid = principalPayment + extraPrincipal;
            if (currentBalance < totalPrincipalPaid) {
                totalPrincipalPaid = currentBalance;
                principalPayment = Math.max(0, totalPrincipalPaid - extraPrincipal);
            }
            currentBalance -= totalPrincipalPaid;

            // Totals & NPV calculation
            totalInterestPaid += interest;
            const pvInterest = interest / Math.pow(1 + periodicDiscountRate, period);
            totalPVInterestPaid += pvInterest;
            
            // PMI Calculation
            let pmiPayment = 0;
            if (isPMIActive) {
                pmiPayment = currentBalance * periodicPmiRate;
                if (currentBalance <= pmiStopThreshold) {
                    isPMIActive = false;
                    pmiDropPeriod = period;
                }
            }
            
            const periodicPITI = (currentAnnualTax / periodsPerYear) + (currentAnnualInsurance / periodsPerYear) + currentMonthlyHoa + pmiPayment;
            const currentEquity = Math.max(0, currentPropertyValue - currentBalance);
            
            amortizationSchedule.push({ period, interest: Math.max(0, interest), principalPaid: Math.max(0, totalPrincipalPaid), balance: Math.max(0, currentBalance), propertyValue: currentPropertyValue, totalEquity: currentEquity, pniPrincipal: Math.max(0, principalPayment), extraPayment: extraPrincipal, pmi: pmiPayment, rate: currentRate * 100, periodicPITI: periodicPITI, pvInterest: pvInterest });
            
            if (currentBalance <= 0) {
                payoffPeriod = period;
                break;
            }
        }
        return { schedule: amortizationSchedule, totalInterest: totalInterestPaid, totalPVInterest: totalPVInterestPaid, payoffPeriod, standardPayment: standardPaymentOriginal, firstPeriodPITI: amortizationSchedule.length > 0 ? amortizationSchedule[0].periodicPITI * (12 / periodsPerYear) : standardPaymentOriginal, pmiDropPeriod, finalPropertyValue: currentPropertyValue, finalEquity: Math.max(0, currentPropertyValue) };
    }

    /**
     * Calculates and compares renting vs. buying outcomes.
     */
    function calculateRentVsBuy() {
        const loanAmount = parseFloat(DOM.loanAmount.value);
        const initialLTV = parseFloat(DOM.initialLTV.value);
        const homePrice = loanAmount / (initialLTV / 100);
        const downPayment = homePrice - loanAmount;
        const closingCosts = parseFloat(DOM.closingCosts.value);
        const sellingCostsRate = parseFloat(DOM.sellingCosts.value) / 100;
        
        const monthlyRent = parseFloat(DOM.monthlyRent.value);
        const annualRentIncrease = parseFloat(DOM.rentIncrease.value) / 100;
        const annualInvestmentReturn = parseFloat(DOM.investmentReturn.value) / 100;
        const loanTermYears = parseFloat(DOM.loanTerm.value);
        const periodsPerYear = 12;
        const totalPeriods = loanTermYears * periodsPerYear;

        const buyingParams = {
            principal: loanAmount, annualRate: parseFloat(DOM.interestRate.value) / 100, periodsPerYear, totalPeriods, extraPaymentPerPeriod: 0, lumpSumAmount: 0, lumpSumPeriod: 0, initialLTV, pmiRate: parseFloat(DOM.pmiRate.value) / 100, refiPeriod: 0, refiRate: 0, refiTerm: 0, refiClosingCosts: 0, pitiEscalationRate: parseFloat(DOM.pitiEscalationRate.value) / 100, discountRate: parseFloat(DOM.discountRate.value) / 100, appreciationRate: parseFloat(DOM.appreciationRate.value) / 100
        };
        const buyingResults = generateAmortization(buyingParams);
        const buyingNetWorth = buyingResults.finalEquity - (buyingResults.finalPropertyValue * sellingCostsRate);
        
        let investmentPortfolio = downPayment + closingCosts;
        let currentMonthlyRent = monthlyRent;
        const monthlyInvestmentReturn = annualInvestmentReturn / 12;

        const totalMonthlyOwnershipCost = (buyingResults.standardPayment * (12 / periodsPerYear)) + (parseFloat(DOM.propertyTax.value) / 12) + (parseFloat(DOM.insurance.value) / 12) + parseFloat(DOM.hoa.value) + ((homePrice * (parseFloat(DOM.annualMaintenance.value) / 100)) / 12) + parseFloat(DOM.monthlyUtilities.value);
        
        let rentingTimeline = [], buyingTimeline = [];

        for (let i = 1; i <= totalPeriods; i++) {
            investmentPortfolio += (totalMonthlyOwnershipCost - currentMonthlyRent);
            investmentPortfolio *= (1 + monthlyInvestmentReturn);
            
            if (i % 12 === 0) currentMonthlyRent *= (1 + annualRentIncrease);
            
            const year = Math.ceil(i / 12);
            if (i % 12 === 0 || i === totalPeriods) {
                rentingTimeline.push({ year: year, netWorth: investmentPortfolio });
                const buyingData = buyingResults.schedule[i - 1];
                if(buyingData) {
                    const currentBuyingNetWorth = buyingData.totalEquity - (buyingData.propertyValue * sellingCostsRate);
                    buyingTimeline.push({ year: year, netWorth: currentBuyingNetWorth });
                }
            }
        }
        
        return { buyingNetWorth, rentingNetWorth: investmentPortfolio, rentingTimeline, buyingTimeline };
    }

    /**
     * Calculates maximum affordable home price based on DTI.
     */
    function calculateAffordability() {
        const annualIncome = parseFloat(DOM.annualIncome.value);
        const monthlyDebts = parseFloat(DOM.nonMortgageDebt.value);
        const downPayment = parseFloat(DOM.downPaymentAmount.value);
        const frontEndDTI = parseFloat(DOM.desiredFrontEndDTI.value) / 100;
        const backEndDTI = parseFloat(DOM.desiredBackEndDTI.value) / 100;
        const annualRate = parseFloat(DOM.interestRate.value) / 100;
        const termYears = parseFloat(DOM.loanTerm.value);
        const annualTax = parseFloat(DOM.propertyTax.value);
        const annualInsurance = parseFloat(DOM.insurance.value);

        const monthlyIncome = annualIncome / 12;
        const monthlyTax = annualTax / 12;
        const monthlyInsurance = annualInsurance / 12;

        const maxPaymentFromFrontEnd = monthlyIncome * frontEndDTI;
        const maxPaymentFromBackEnd = (monthlyIncome * backEndDTI) - monthlyDebts;

        const maxPITI = Math.min(maxPaymentFromFrontEnd, maxPaymentFromBackEnd);
        const maxPI = maxPITI - monthlyTax - monthlyInsurance;

        if (maxPI <= 0) return { homePrice: 0, loanAmount: 0, piti: 0, pi: 0, tax: 0, insurance: 0 };
        
        const monthlyRate = annualRate / 12;
        const loanAmount = maxPI * (1 - Math.pow(1 + monthlyRate, -(termYears * 12))) / monthlyRate;
        const homePrice = loanAmount + downPayment;

        return { homePrice, loanAmount, piti: maxPITI, pi: maxPI, tax: monthlyTax, insurance: monthlyInsurance };
    }

    /**
     * Calculates refinance savings and break-even point.
     */
    function calculateRefinance() {
        const originalAmount = parseFloat(DOM.originalLoanAmount.value);
        const currentRate = parseFloat(DOM.currentInterestRate.value) / 100;
        const startDate = new Date(DOM.loanStartDate.value + '-01T00:00:00');
        const originalTermYears = parseFloat(DOM.loanTerm.value); // Assume original term from main calc
        
        const newRate = parseFloat(DOM.newInterestRate.value) / 100;
        const newTermYears = parseFloat(DOM.newLoanTerm.value);
        const closingCosts = parseFloat(DOM.newClosingCosts.value);

        const periodsPerYear = 12;
        const originalTotalPeriods = originalTermYears * periodsPerYear;
        const monthsPassed = (new Date().getFullYear() - startDate.getFullYear()) * 12 + (new Date().getMonth() - startDate.getMonth());
        
        if (monthsPassed >= originalTotalPeriods || monthsPassed < 0) {
            return { monthlySavings: 0, breakEvenMonths: Infinity, lifetimeSavings: 0, currentPayment: 0, newPayment: 0, totalOldInterest: 0, totalNewInterest: 0 };
        }

        const periodicCurrentRate = currentRate / periodsPerYear;
        const currentPayment = calculatePayment(originalAmount, currentRate, periodsPerYear, originalTotalPeriods);
        let remainingBalance = originalAmount;
        for (let i = 0; i < monthsPassed; i++) {
            const interest = remainingBalance * periodicCurrentRate;
            remainingBalance -= (currentPayment - interest);
        }

        const newTotalPeriods = newTermYears * periodsPerYear;
        const newPayment = calculatePayment(remainingBalance, newRate, periodsPerYear, newTotalPeriods);
        const monthlySavings = currentPayment - newPayment;

        const breakEvenMonths = monthlySavings > 0 ? closingCosts / monthlySavings : Infinity;

        let remainingOldInterest = 0;
        let tempBalanceOld = remainingBalance;
        for (let i = 0; i < (originalTotalPeriods - monthsPassed); i++) {
            const interest = tempBalanceOld * periodicCurrentRate;
            remainingOldInterest += interest;
            tempBalanceOld -= (currentPayment - interest);
        }

        let totalNewInterest = 0;
        let tempBalanceNew = remainingBalance;
        const periodicNewRate = newRate / periodsPerYear;
        for (let i = 0; i < newTotalPeriods; i++) {
            const interest = tempBalanceNew * periodicNewRate;
            totalNewInterest += interest;
            tempBalanceNew -= (newPayment - interest);
        }

        const lifetimeSavings = remainingOldInterest - (totalNewInterest + closingCosts);
        
        return { monthlySavings, breakEvenMonths, lifetimeSavings, currentPayment, newPayment, totalOldInterest: remainingOldInterest, totalNewInterest: totalNewInterest + closingCosts };
    }


    // --- 6. DTI Calculation & Rendering ---
    function calculateDTI(totalMonthlyHousingCost) {
        const annualIncome = parseFloat(DOM.annualIncome.value) || 0;
        const monthlyNonMortgageDebt = parseFloat(DOM.nonMortgageDebt.value) || 0;
        if (annualIncome === 0) return { frontEnd: 0, backEnd: 0 };
        const grossMonthlyIncome = annualIncome / 12;
        return { frontEnd: totalMonthlyHousingCost / grossMonthlyIncome, backEnd: (totalMonthlyHousingCost + monthlyNonMortgageDebt) / grossMonthlyIncome };
    }

    function renderDTI(frontEndDTI, backEndDTI) {
        const getStatus = (dti) => {
            const ratio = dti * 100;
            if (ratio <= 36) return { text: 'Excellent (<36%)', color: 'dti-safe' };
            if (ratio <= 43) return { text: 'Acceptable (<43%)', color: 'dti-high' };
            return { text: 'High Risk (>43%)', color: 'dti-critical' };
        };
        const applyStatus = (element, statusElement, status) => {
            element.className = `text-lg sm:text-xl font-extrabold text-${status.color}`;
            statusElement.textContent = status.text;
            statusElement.className = `text-xs font-semibold mt-1 text-${status.color}`;
        };
        DOM.frontEndDTI.textContent = formatPercent(frontEndDTI);
        applyStatus(DOM.frontEndDTI, DOM.frontEndDTIStatus, getStatus(frontEndDTI));
        DOM.backEndDTI.textContent = formatPercent(backEndDTI);
        applyStatus(DOM.backEndDTI, DOM.backEndDTIStatus, getStatus(backEndDTI));
    }


    // --- 7. Chart Rendering Functions ---
    function renderChart(acceleratedResults) {
        const ctx = document.getElementById('comparisonChart').getContext('2d');
        if (mortgageChart) mortgageChart.destroy();
        const schedule = acceleratedResults.schedule;
        const step = Math.ceil(schedule.length / 50);
        const chartData = schedule.filter((_, index) => index % step === 0 || index === schedule.length - 1);
        const labels = chartData.map(d => `Yr ${Math.ceil(d.period / 12)}`);
        mortgageChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Property Value', data: chartData.map(d => d.propertyValue), borderColor: '#166534', borderWidth: 3, fill: false, tension: 0.3, pointRadius: 2 },
                    { label: 'Total Home Equity', data: chartData.map(d => d.totalEquity), borderColor: '#34d399', backgroundColor: 'rgba(52, 211, 153, 0.1)', borderWidth: 2, fill: 'origin', tension: 0.3, pointRadius: 1 },
                    { label: 'Loan Balance', data: chartData.map(d => d.balance), borderColor: '#1C768F', borderWidth: 3, fill: false, tension: 0.3, pointRadius: 2 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: value => formatCurrency(value).replace(/[,.€$£]/g, '') } } }, plugins: { title: { display: true, text: 'Equity Accumulation vs. Debt Payoff', font: { size: 14, weight: '600' } }, tooltip: { mode: 'index', intersect: false, callbacks: { label: c => `${c.dataset.label}: ${formatCurrency(c.parsed.y)}` } } } }
        });
    }

    function renderRentVsBuyChart(rentingTimeline, buyingTimeline) {
        const ctx = document.getElementById('rentVsBuyChart').getContext('2d');
        if (rentVsBuyChart) rentVsBuyChart.destroy();
        const labels = rentingTimeline.map(d => `Year ${d.year}`);
        rentVsBuyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [ { label: 'Buying Net Worth', data: buyingTimeline.map(d => d.netWorth), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.3 }, { label: 'Renting Net Worth', data: rentingTimeline.map(d => d.netWorth), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.3 } ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: value => formatCurrency(value) } } }, plugins: { title: { display: true, text: 'Long-Term Net Worth: Renting vs. Buying', font: { size: 16 } }, tooltip: { mode: 'index', intersect: false, callbacks: { label: c => `${c.dataset.label}: ${formatCurrency(c.parsed.y)}` } } } }
        });
    }

    function renderAffordabilityChart(results) {
        const ctx = document.getElementById('affordabilityChart').getContext('2d');
        if (affordabilityChart) affordabilityChart.destroy();
        affordabilityChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Principal & Interest', 'Property Tax', 'Home Insurance'],
                datasets: [{ label: 'Monthly Payment Breakdown', data: [results.pi, results.tax, results.insurance], backgroundColor: ['#1C768F', '#b45309', '#065f46'], borderColor: '#ffffff', borderWidth: 2 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Estimated Monthly Payment Breakdown' }, legend: { position: 'bottom', }, tooltip: { callbacks: { label: c => `${c.label}: ${formatCurrency(c.raw)}` } } } }
        });
    }

    function renderRefinanceChart(results) {
        const ctx = document.getElementById('refinanceChart').getContext('2d');
        if (refinanceChart) refinanceChart.destroy();
        refinanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Monthly P&I Payment', 'Total Interest Cost'],
                datasets: [
                    { label: 'Current Loan', data: [results.currentPayment, results.totalOldInterest], backgroundColor: '#be123c' },
                    { label: 'New Loan', data: [results.newPayment, results.totalNewInterest], backgroundColor: '#166534' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Payment & Total Cost Comparison' }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${formatCurrency(c.raw)}` } } }, scales: { y: { beginAtZero: true, ticks: { callback: value => formatCurrency(value) } } } }
        });
    }


    // --- 8. Input Validation ---
    function validateInputs() {
        const errors = [];
        let fields = [ { id: 'loanAmount', name: 'Loan Principal', min: 1 }, { id: 'interestRate', name: 'Interest Rate', min: 0.1, max: 100 }, { id: 'loanTerm', name: 'Loan Term', min: 1, max: 50 }, { id: 'initialLTV', name: 'Initial LTV', min: 1, max: 100 }, { id: 'annualIncome', name: 'Annual Income', min: 0 }, { id: 'nonMortgageDebt', name: 'Non-Mortgage Debt', min: 0 }, { id: 'appreciationRate', name: 'Appreciation Rate', min: 0, max: 50 }, { id: 'discountRate', name: 'Discount Rate', min: 0, max: 50 }, { id: 'pitiEscalationRate', name: 'PITI Escalation Rate', min: 0, max: 50 }, { id: 'pmiRate', name: 'PMI Rate', min: 0, max: 10 }, { id: 'propertyTax', name: 'Property Tax', min: 0 }, { id: 'insurance', name: 'Home Insurance', min: 0 }, { id: 'hoa', name: 'HOA Dues', min: 0 }, { id: 'extraPayment', name: 'Extra Payment', min: 0 }, { id: 'lumpSumPayment', name: 'Lump Sum Payment', min: 0 }, { id: 'annualMaintenance', name: 'Annual Maintenance', min: 0, max: 20 }, { id: 'monthlyUtilities', name: 'Monthly Utilities', min: 0 } ];
        
        if (currentTab === 'rent-vs-buy') {
            fields = fields.concat([{ id: 'monthlyRent', name: 'Monthly Rent', min: 1 }, { id: 'rentIncrease', name: 'Rent Increase', min: 0, max: 20 }, { id: 'investmentReturn', name: 'Investment Return', min: 0, max: 30 }, { id: 'closingCosts', name: 'Closing Costs', min: 0 }, { id: 'sellingCosts', name: 'Selling Costs', min: 0, max: 20 }]);
        } else if (currentTab === 'affordability') {
            fields = fields.concat([{ id: 'downPaymentAmount', name: 'Down Payment', min: 0 }, { id: 'desiredFrontEndDTI', name: 'Housing DTI', min: 10, max: 50 }, { id: 'desiredBackEndDTI', name: 'Total DTI', min: 10, max: 50 }]);
        } else if (currentTab === 'refinance') {
            fields = [{ id: 'originalLoanAmount', name: 'Original Loan Amount', min: 1000 }, { id: 'currentInterestRate', name: 'Current Interest Rate', min: 0.1, max: 25 }, { id: 'newInterestRate', name: 'New Interest Rate', min: 0.1, max: 25 }, { id: 'newLoanTerm', name: 'New Loan Term', min: 5, max: 50 }, { id: 'newClosingCosts', name: 'Closing Costs', min: 0 }];
        }
        
        // First, clear all previous error styles
        allInputIds.forEach(id => { if (DOM[id]) DOM[id].classList.remove('input-error'); });

        fields.forEach(field => {
            const el = DOM[field.id];
            if (!el) return;
            const value = parseFloat(el.value);
            let hasError = false;
            if (el.type === 'month' && !el.value) {
                errors.push('Loan Start Date is required.');
                hasError = true;
            } else if (el.type !== 'month' && isNaN(value)) {
                errors.push(`${field.name} must be a number.`);
                hasError = true;
            } else {
                if (field.min !== undefined && value < field.min) {
                    errors.push(`${field.name} must be at least ${field.min}.`);
                    hasError = true;
                }
                if (field.max !== undefined && value > field.max) {
                    errors.push(`${field.name} cannot exceed ${field.max}.`);
                    hasError = true;
                }
            }
            if (hasError) {
                el.classList.add('input-error');
            }
        });

        if (errors.length > 0) {
            DOM.errorList.innerHTML = errors.map(e => `<li>${e}</li>`).join('');
            DOM.errorMessages.classList.remove('hidden');
            return false;
        }
        DOM.errorMessages.classList.add('hidden');
        return true;
    }


    // --- 9. Main Calculation Orchestration ---
    function handleCalculation(isShockTest = false) {
        // Find the active calculate button
        const calculateButton = document.querySelector(`#${currentTab}-content .calculate-button`);
        if(calculateButton) {
            calculateButton.disabled = true;
            calculateButton.textContent = 'Calculating...';
        }

        setTimeout(() => {
            try { 
                if (validateInputs()) {
                    if(currentTab === 'mortgage') calculateMortgage(isShockTest);
                    else if (currentTab === 'rent-vs-buy') runRentVsBuyAnalysis();
                    else if (currentTab === 'affordability') runAffordabilityAnalysis();
                    else if (currentTab === 'refinance') runRefinanceAnalysis();
                    updateURLWithInputs();
                }
            } 
            catch (e) {
                console.error("Calculation Error:", e);
                DOM.errorList.innerHTML = `<li>An unexpected error occurred. Please check console.</li>`;
                DOM.errorMessages.classList.remove('hidden');
            } finally {
                if(calculateButton) {
                    calculateButton.disabled = false;
                    const buttonTextMap = {
                        mortgage: 'Calculate Scenario',
                        affordability: 'Calculate Affordability',
                        'rent-vs-buy': 'Calculate Comparison',
                        refinance: 'Analyze Refinance'
                    };
                    calculateButton.textContent = buttonTextMap[currentTab];
                }
            }
        }, 50);
    }

    function runRentVsBuyAnalysis() {
        const results = calculateRentVsBuy();
        DOM.buyingNetWorth.textContent = formatCurrency(results.buyingNetWorth);
        DOM.rentingNetWorth.textContent = formatCurrency(results.rentingNetWorth);
        DOM.rentVsBuyConclusion.innerHTML = results.buyingNetWorth > results.rentingNetWorth
            ? `<p class="text-lg font-bold text-green-700">Buying appears to be the better financial decision.</p>`
            : `<p class="text-lg font-bold text-blue-700">Renting and investing appears to be the better financial decision.</p>`;

        renderRentVsBuyChart(results.rentingTimeline, results.buyingTimeline);
        DOM.rentVsBuyResults.style.opacity = 1;
        DOM.rentVsBuyResults.classList.add('results-animate-in');
    }

    function runAffordabilityAnalysis() {
        const results = calculateAffordability();
        DOM.affordableHomePrice.textContent = formatCurrency(results.homePrice);
        DOM.affordableLoanAmount.textContent = formatCurrency(results.loanAmount);
        DOM.affordablePITI.textContent = formatCurrency(results.piti);
        renderAffordabilityChart(results);
        DOM.affordabilityResults.style.opacity = 1;
        DOM.affordabilityResults.classList.add('results-animate-in');
    }
    
    function runRefinanceAnalysis() {
        const results = calculateRefinance();
        DOM.refiMonthlySavings.textContent = formatCurrency(results.monthlySavings);
        if (isFinite(results.breakEvenMonths)) {
            const years = Math.floor(results.breakEvenMonths / 12);
            const months = Math.round(results.breakEvenMonths % 12);
            DOM.refiBreakEven.textContent = `${years}y ${months}m`;
        } else {
            DOM.refiBreakEven.textContent = 'N/A';
        }
        DOM.refiLifetimeSavings.textContent = formatCurrency(results.lifetimeSavings);

        renderRefinanceChart(results);
        DOM.refinanceResults.style.opacity = 1;
        DOM.refinanceResults.classList.add('results-animate-in');
    }

    function calculateMortgage(isShockTest = false) {
        const getVal = id => parseFloat(DOM[id].value);
        const periodsPerYear = parseInt(DOM.repaymentFrequency.value);
        
        const originalParams = { principal: getVal('loanAmount'), annualRate: getVal('interestRate') / 100, periodsPerYear, totalPeriods: getVal('loanTerm') * periodsPerYear, extraPaymentPerPeriod: 0, lumpSumAmount: 0, lumpSumPeriod: 0, initialLTV: getVal('initialLTV'), pmiRate: 0, refiPeriod: 0, refiRate: 0, refiTerm: 0, refiClosingCosts: 0, pitiEscalationRate: 0, discountRate: getVal('discountRate') / 100, appreciationRate: 0 };
        const acceleratedParams = { ...originalParams, extraPaymentPerPeriod: getVal('extraPayment'), lumpSumAmount: getVal('lumpSumPayment'), lumpSumPeriod: getVal('lumpSumPeriod'), pmiRate: getVal('pmiRate') / 100, refiPeriod: getVal('refiPeriod'), refiRate: getVal('refiRate'), refiTerm: getVal('refiTerm'), refiClosingCosts: getVal('refiClosingCosts'), pitiEscalationRate: getVal('pitiEscalationRate') / 100, appreciationRate: getVal('appreciationRate') / 100 };
        
        DOM.results.style.opacity = 1;
        DOM.results.classList.add('results-enter-active');
        DOM.scheduleWrapper.style.opacity = 1;
        DOM.shockResults.style.display = 'none';

        const original = generateAmortization(originalParams);
        const accelerated = generateAmortization(acceleratedParams);
        
        const pniMonthly = original.standardPayment * (12 / periodsPerYear);
        const pmiMonthly = (accelerated.schedule[0] ? accelerated.schedule[0].pmi : 0) * (12 / periodsPerYear);
        const totalPITI = pniMonthly + (getVal('propertyTax') / 12) + (getVal('insurance') / 12) + getVal('hoa') + pmiMonthly;

        const initialPropertyValue = (getVal('initialLTV') > 0 && getVal('initialLTV') <= 100) ? getVal('loanAmount') / (getVal('initialLTV') / 100) : getVal('loanAmount');
        const monthlyMaintenance = (initialPropertyValue * (getVal('annualMaintenance') / 100)) / 12;
        const totalMonthlyOwnershipCost = totalPITI + monthlyMaintenance + getVal('monthlyUtilities');

        renderDTI(calculateDTI(totalMonthlyOwnershipCost).frontEnd, calculateDTI(totalMonthlyOwnershipCost).backEnd);

        animateValue(DOM.finalEquity, accelerated.finalEquity);
        animateValue(DOM.finalPropertyValue, accelerated.finalPropertyValue);
        DOM.totalMonthlyPaymentPITI.textContent = formatCurrency(totalPITI);
        DOM.totalOwnershipCost.textContent = formatCurrency(totalMonthlyOwnershipCost);
        
        if (getVal('pmiRate') > 0 && getVal('initialLTV') > 80 && accelerated.pmiDropPeriod) {
            DOM.pmiDropNote.style.display = 'block';
            DOM.pmiDropPeriod.textContent = accelerated.pmiDropPeriod;
        } else { DOM.pmiDropNote.style.display = 'none'; }
        
        DOM.standardPaymentDisplay.textContent = formatCurrency(original.standardPayment * (12 / periodsPerYear));
        DOM.acceleratedPaymentDisplay.textContent = formatCurrency((original.standardPayment + getVal('extraPayment')) * (12/periodsPerYear));
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
            const shockInc = getVal('shockRateIncrease') / 100;
            const shockRate = (getVal('interestRate') / 100) + shockInc;
            const shockPmt = calculatePayment(getVal('loanAmount'), shockRate, periodsPerYear, getVal('loanTerm') * periodsPerYear);
            DOM.shockResults.style.display = 'block';
            DOM.shockRateDisplay.textContent = (shockRate * 100).toFixed(2);
            DOM.originalShockPaymentDisplay.textContent = formatCurrency(original.standardPayment);
            DOM.shockPaymentDisplay.textContent = formatCurrency(shockPmt);
            DOM.paymentIncrease.textContent = formatCurrency(shockPmt - original.standardPayment);
        }

        currentResults = { original, accelerated, totalPITI, totalMonthlyOwnershipCost, dti: calculateDTI(totalMonthlyOwnershipCost), interestSaved: iSaved, npvSaved: npvSaved, timeSaved: timeSavedStr, inputs: Object.fromEntries(allInputIds.map(id => [id, DOM[id].value])) };
    }

    function generateAmortizationTable(originalResults, acceleratedResults) {
        DOM.amortizationTable.innerHTML = `<thead class="text-xs text-gray-700 bg-gray-50 uppercase tracking-wider"><tr><th rowspan="2" class="py-2 px-1 border-b-2 border-gray-300 border-r">#</th><th colspan="4" class="py-2 px-1 border-b-2 border-gray-300 text-center bg-red-50/70 border-r border-red-300">Original Loan</th><th colspan="10" class="py-2 px-1 border-b-2 border-gray-300 text-center bg-sky-50/70">Accelerated Scenario</th></tr><tr class="font-medium"><th class="py-2 px-1 border-b border-gray-300 text-right bg-red-50/70">Nom. Interest</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-red-50/70 text-npv">PV Interest</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-red-50/70">P&I Pmt</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-red-50/70 border-r border-red-300">Balance</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70 text-accent">Home Equity</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/50 text-accent">Property Val</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">P&I Pmt</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">Tax/Ins/HOA</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">Nom. Interest</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70 text-npv">PV Interest</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">PMI</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">Extra</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">Total Pmt</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">Balance</th></tr></thead><tbody></tbody>`;
        const body = DOM.amortizationTable.querySelector('tbody');
        const maxPeriods = Math.max(originalResults.payoffPeriod, acceleratedResults.payoffPeriod);
        let rowsHtml = '';
        for (let i = 0; i < maxPeriods; i++) {
            const o = originalResults.schedule[i] || {};
            const a = acceleratedResults.schedule[i] || {};
            if (!o.balance && !a.balance && i >= originalResults.payoffPeriod && i >= acceleratedResults.payoffPeriod) break;
            const newPNIPayment = (a.pniPrincipal || 0) + (a.interest || 0);
            const totalNewPayment = newPNIPayment + (a.periodicPITI || 0) + (a.extraPayment || 0);
            const taxInsHOA = (a.periodicPITI || 0) - (a.pmi || 0);
            rowsHtml += `<tr class="text-xs hover:bg-gray-50 border-b border-gray-200"><td class="p-2 border-r border-gray-300 font-semibold text-center">${i+1}</td><td class="p-2 text-right bg-red-50/50">${o.interest?formatCurrency(o.interest):'-'}</td><td class="p-2 text-right bg-red-50/50 text-npv">${o.pvInterest?formatCurrency(o.pvInterest):'-'}</td><td class="p-2 text-right bg-red-50/50">${o.principalPaid?formatCurrency(o.interest+o.principalPaid):'-'}</td><td class="p-2 text-right bg-red-50/50 font-bold border-r border-red-300">${o.balance?formatCurrency(o.balance):'PAID'}</td><td class="p-2 text-right bg-sky-50/50 font-bold text-accent">${a.totalEquity?formatCurrency(a.totalEquity):'FULL'}</td><td class="p-2 text-right bg-sky-50/50 text-accent">${a.propertyValue?formatCurrency(a.propertyValue):'FINAL'}</td><td class="p-2 text-right bg-sky-50/50">${a.interest?formatCurrency(newPNIPayment):'-'}</td><td class="p-2 text-right bg-sky-50/50">${a.interest?formatCurrency(taxInsHOA):'-'}</td><td class="p-2 text-right bg-sky-50/50">${a.interest?formatCurrency(a.interest):'-'}</td><td class="p-2 text-right bg-sky-50/50 text-npv">${a.pvInterest?formatCurrency(a.pvInterest):'-'}</td><td class="p-2 text-right bg-sky-50/50">${a.pmi>0.01?formatCurrency(a.pmi):'-'}</td><td class="p-2 text-right bg-sky-50/50">${a.extraPayment>0.01?formatCurrency(a.extraPayment):'-'}</td><td class="p-2 text-right bg-sky-50/50 font-bold text-primary">${a.interest?formatCurrency(totalNewPayment):'-'}</td><td class="p-2 text-right bg-sky-50/50 font-bold">${a.balance?formatCurrency(a.balance):'PAID'}</td></tr>`;
        }
        body.innerHTML = rowsHtml;
    }


    // --- 10. Form & State Management ---
    function resetForm() {
        const defaults = { loanAmount: "300000", interestRate: "6.5", loanTerm: "30", initialLTV: "90", discountRate: "3.0", appreciationRate: "3.5", annualIncome: "120000", nonMortgageDebt: "800", propertyTax: "3600", insurance: "1200", hoa: "0", pitiEscalationRate: "2.0", pmiRate: "0.5", extraPayment: "100", lumpSumPayment: "5000", lumpSumPeriod: "1", refiPeriod: "60", refiRate: "5.0", refiTerm: "15", refiClosingCosts: "5000", shockRateIncrease: "1.0", annualMaintenance: "1.0", monthlyUtilities: "300", monthlyRent: "2000", rentIncrease: "3.0", investmentReturn: "7.0", closingCosts: "8000", sellingCosts: "6.0", downPaymentAmount: "60000", desiredFrontEndDTI: "28", desiredBackEndDTI: "36", originalLoanAmount: "300000", currentInterestRate: "6.5", loanStartDate: "2021-01", newInterestRate: "5.0", newLoanTerm: "30", newClosingCosts: "5000" };
        for (const id in defaults) {
            const el = DOM[id];
            if (el) el.value = defaults[id];
        }
        DOM.repaymentFrequency.value = "12";
        DOM.currency.value = "USD";
        history.pushState(null, '', window.location.pathname);
        handleCalculation();
        updateCurrencySymbols();
    }

    function updateURLWithInputs() {
        const params = new URLSearchParams();
        allInputIds.forEach(id => {
            const el = DOM[id];
            if (el) params.set(id, el.value);
        });
        history.replaceState(null, '', '?' + params.toString());
    }

    function populateFormFromURL() {
        const params = new URLSearchParams(window.location.search);
        if (params.toString().length === 0) return false;
        
        allInputIds.forEach(id => {
            const el = DOM[id];
            if (el && params.has(id)) {
                el.value = params.get(id);
            }
        });
        return true;
    }

    // --- 11. UI Component Management ---
    function setupModal() {
        DOM.saveButton.addEventListener('click', () => {
            updateURLWithInputs();
            DOM.shareUrlInput.value = window.location.href;
            DOM.shareModal.classList.remove('hidden');
            DOM.shareUrlInput.select();
        });
        DOM.closeModalButton.addEventListener('click', () => {
            DOM.shareModal.classList.add('hidden');
            DOM.copyFeedback.textContent = '';
        });
        DOM.copyUrlButton.addEventListener('click', () => {
            DOM.shareUrlInput.select();
            try {
                document.execCommand('copy');
                DOM.copyFeedback.textContent = 'Copied to clipboard!';
                setTimeout(() => { DOM.copyFeedback.textContent = ''; }, 2000);
            } catch (err) {
                console.error('Failed to copy: ', err);
                DOM.copyFeedback.textContent = 'Failed to copy.';
            }
        });
        DOM.shareModal.addEventListener('click', (event) => {
            if (event.target === DOM.shareModal) {
                DOM.shareModal.classList.add('hidden');
                DOM.copyFeedback.textContent = '';
            }
        });
    }

    function generatePDF() {
        if (currentTab !== 'mortgage' || !currentResults) {
            alert("Please calculate a scenario on the Mortgage Calculator tab first to generate a report.");
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const { inputs, totalPITI, totalMonthlyOwnershipCost, dti, original, accelerated, interestSaved, npvSaved, timeSaved } = currentResults;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(28, 118, 143);
        doc.text("Strategic Mortgage Planner", 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        doc.text("Personalized Mortgage Report", 105, 27, { align: 'center' });
        doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 105, 32, { align: 'center' });
        const summaryData = [ ['Loan Principal', formatCurrency(inputs.loanAmount)], ['Interest Rate', `${inputs.interestRate}%`], ['Loan Term', `${inputs.loanTerm} Years`], ['Est. PITI + PMI', formatCurrency(totalPITI)], ['Total Monthly Ownership Cost', formatCurrency(totalMonthlyOwnershipCost)], ['Front-End DTI (Housing)', formatPercent(dti.frontEnd)], ['Back-End DTI (Total Debt)', formatPercent(dti.backEnd)] ];
        doc.autoTable({ startY: 40, head: [['Key Metric', 'Value']], body: summaryData, theme: 'striped', headStyles: { fillColor: [28, 118, 143] } });
        const comparisonData = [ ['Payoff Date', payoffDate(original.payoffPeriod, inputs.repaymentFrequency), payoffDate(accelerated.payoffPeriod, inputs.repaymentFrequency)], ['Total Interest Paid', formatCurrency(original.totalInterest), formatCurrency(accelerated.totalInterest)], ['NPV of Interest Cost', formatCurrency(original.totalPVInterest), formatCurrency(accelerated.totalPVInterest)], ['Final Equity', formatCurrency(original.finalEquity), formatCurrency(accelerated.finalEquity)] ];
        doc.autoTable({ startY: doc.lastAutoTable.finalY + 10, head: [['Metric', 'Original Loan', 'Accelerated Scenario']], body: comparisonData, theme: 'grid', headStyles: { fillColor: [28, 118, 143] } });
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 135, 73);
        doc.text("Accelerated Payoff Savings Summary", 14, doc.lastAutoTable.finalY + 15);
        const savingsData = [ ['Nominal Interest Saved', formatCurrency(interestSaved)], ['NPV (True Value) Saved', formatCurrency(npvSaved)], ['Time Shaved Off Loan', timeSaved] ];
        doc.autoTable({ startY: doc.lastAutoTable.finalY + 22, body: savingsData, theme: 'plain' });
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(28, 118, 143);
        doc.text("Accelerated Amortization Schedule (Annual Summary)", 105, 15, { align: 'center' });
        const annualData = [];
        let yearInterest = 0, yearPrincipal = 0, yearExtra = 0;
        for (let i = 0; i < accelerated.schedule.length; i++) {
            yearInterest += accelerated.schedule[i].interest; yearPrincipal += accelerated.schedule[i].pniPrincipal; yearExtra += accelerated.schedule[i].extraPayment;
            if ((i + 1) % inputs.repaymentFrequency === 0 || i === accelerated.schedule.length - 1) {
                const yearEnd = accelerated.schedule[i];
                annualData.push([ `Year ${Math.ceil(yearEnd.period / inputs.repaymentFrequency)}`, formatCurrency(yearInterest), formatCurrency(yearPrincipal + yearExtra), formatCurrency(yearEnd.totalEquity), formatCurrency(yearEnd.balance) ]);
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
        let d = new Date();
        const totalMonths = Math.round(periods / (periodsPerYear / 12));
        d.setMonth(d.getMonth() + totalMonths);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    };

    function setupTabs() {
        const tabs = { 
            'mortgage': { button: document.getElementById('mortgage-tab'), content: document.getElementById('mortgage-calculator-content') }, 
            'affordability': { button: document.getElementById('affordability-tab'), content: document.getElementById('affordability-content') }, 
            'rent-vs-buy': { button: document.getElementById('rent-vs-buy-tab'), content: document.getElementById('rent-vs-buy-content') },
            'refinance': { button: document.getElementById('refinance-tab'), content: document.getElementById('refinance-content') } 
        };
        function switchTab(tab) {
            currentTab = tab;
            for (const key in tabs) {
                if (key === tab) {
                    tabs[key].button.classList.add('active'); tabs[key].button.setAttribute('aria-selected', 'true'); tabs[key].content.classList.remove('hidden');
                } else {
                    tabs[key].button.classList.remove('active'); tabs[key].button.setAttribute('aria-selected', 'false'); tabs[key].content.classList.add('hidden');
                }
            }
        }
        for (const key in tabs) {
            if (tabs[key].button) {
                tabs[key].button.addEventListener('click', () => switchTab(key));
            }
        }
        switchTab('mortgage');
    }


    // --- 12. Event Listeners & Initial Page Load ---
    function init() {
        setupTabs();
        setupModal();
        
        DOM.currency.addEventListener('change', updateCurrencySymbols);
        
        DOM.calculateButtons.forEach(btn => btn.addEventListener('click', () => handleCalculation(false)));
        DOM.resetButtons.forEach(btn => btn.addEventListener('click', resetForm));

        if(DOM.shockTestButton) {
            DOM.shockTestButton.addEventListener('click', () => handleCalculation(true));
        }
        
        document.querySelector('.print-button').addEventListener('click', () => window.print());
        document.querySelector('.pdf-button').addEventListener('click', generatePDF);
        
        loadGuide();

        if (!populateFormFromURL()) {
            resetForm();
        } else {
            handleCalculation();
        }
        updateCurrencySymbols();
    }
    
    function loadGuide() {
        const guideContent = document.getElementById('guide-content');
        if (!guideContent) return;
        fetch('content-guide.html')
            .then(response => response.ok ? response.text() : Promise.reject('Guide not found'))
            .then(html => { guideContent.innerHTML = html; })
            .catch(error => {
                guideContent.innerHTML = '<p class="text-red-500 text-center p-8">Sorry, the homeowner\'s guide could not be loaded.</p>';
                console.error('Error fetching content guide:', error);
            });
    }

    // Run the initializer once the DOM is fully loaded.
    document.addEventListener('DOMContentLoaded', init);

})();
