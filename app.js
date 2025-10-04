/* --- JAVASCRIPT LOGIC --- */

// --- Global Variables & Chart Instance ---
let mortgageChart = null;
let rentVsBuyChart = null;
let affordabilityChart = null;
const allInputIds = [ "loanAmount", "interestRate", "loanTerm", "initialLTV", "discountRate", "appreciationRate", "annualIncome", "nonMortgageDebt", "propertyTax", "insurance", "hoa", "pitiEscalationRate", "pmiRate", "extraPayment", "lumpSumPayment", "lumpSumPeriod", "refiPeriod", "refiRate", "refiTerm", "refiClosingCosts", "shockRateIncrease", "repaymentFrequency", "currency", "annualMaintenance", "monthlyUtilities", "monthlyRent", "rentIncrease", "investmentReturn", "closingCosts", "sellingCosts", "downPaymentAmount", "desiredFrontEndDTI", "desiredBackEndDTI" ];
let currentResults = null;
let currentTab = 'mortgage';

// --- Helper Functions ---
const formatCurrency = (amount) => {
    const currency = document.getElementById('currency').value || 'USD';
    // Use a specific locale that matches the common format for these currencies
    const locale = ['EUR', 'GBP'].includes(currency) ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency, minimumFractionDigits: 0 }).format(amount);
};
const formatPercent = (amount) => (amount * 100).toFixed(1) + '%';

/**
 * Animates a numerical value in a DOM element.
 * @param {HTMLElement} el - The element to update.
 * @param {number} endValue - The final value to display.
 * @param {number} duration - Animation duration in milliseconds.
 */
function animateValue(el, endValue, duration = 500) {
    if (!el) return;
    let startValue = parseFloat(el.dataset.value) || 0;
    el.dataset.value = endValue; // Store the new value immediately
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        const currentValue = startValue + (endValue - startValue) * progress;
        el.textContent = formatCurrency(currentValue);
        if (progress < 1) {
            requestAnimationFrame(animation);
        } else {
            el.textContent = formatCurrency(endValue); // Ensure final value is exact
        }
    }
    requestAnimationFrame(animation);
}

/**
 * Applies a temporary highlight animation to an element.
 * @param {string} elementId - The ID of the element to highlight.
 */
function flashHighlight(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.classList.add('flash-highlight');
        // Remove the class after the animation completes
        setTimeout(() => {
            el.classList.remove('flash-highlight');
        }, 1000); // Duration should match the CSS animation
    }
}

function updateCurrencySymbols() {
    const currency = document.getElementById('currency').value;
    const symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'CAD': 'C$',
        'AUD': 'A$'
    };
    const symbol = symbols[currency] || '$';

    const symbolSpanIds = [
        'mc-loan-currency', 'mc-tax-currency', 'mc-ins-currency', 'mc-hoa-currency',
        'mc-util-currency', 'mc-extra-currency', 'mc-lump-currency', 'mc-refi-currency',
        'dti-income-currency', 'dti-debt-currency',
        'afford-down-payment-currency',
        'rvb-rent-currency', 'rvb-closing-costs-currency'
    ];

    symbolSpanIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = symbol;
        }
    });
}


// --- Core Financial Calculation Functions ---

/**
 * Calculates the periodic payment for a fixed-rate loan.
 * @param {number} principal - The total loan amount.
 * @param {number} annualRate - The annual interest rate (e.g., 0.065).
 * @param {number} periodsPerYear - The number of payments per year.
 * @param {number} totalPeriods - The total number of payments over the loan's life.
 * @returns {number} The calculated periodic payment.
 */
function calculatePayment(principal, annualRate, periodsPerYear, totalPeriods) {
    if (annualRate <= 0 || totalPeriods <= 0) return principal / (totalPeriods > 0 ? totalPeriods : 1);
    const periodicRate = annualRate / periodsPerYear;
    const payment = principal * periodicRate / (1 - Math.pow(1 + periodicRate, -totalPeriods));
    return isFinite(payment) ? payment : 0;
}

/**
 * Generates the full amortization schedule and calculates key financial metrics.
 * This is the main engine of the calculator.
 * @returns {object} An object containing the schedule, totals, and other key metrics.
 */
function generateAmortization(principal, annualRate, periodsPerYear, totalPeriods, extraPaymentPerPeriod, lumpSumAmount, lumpSumPeriod, initialLTV, pmiRate, refiPeriod, refiRate, refiTerm, refiClosingCosts, pitiEscalationRate, discountRate, appreciationRate) {
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
    let currentAnnualTax = parseFloat(document.getElementById('propertyTax').value) || 0;
    let currentAnnualInsurance = parseFloat(document.getElementById('insurance').value) || 0;
    let currentMonthlyHoa = parseFloat(document.getElementById('hoa').value) || 0;
    const escalationFactor = 1 + (pitiEscalationRate / 100);

    for (let period = 1; currentBalance > 0 && period <= 50 * periodsPerYear; period++) {
        if (period > 1) {
            if ((period - 1) % periodsPerYear === 0) {
                currentAnnualTax *= escalationFactor;
                currentAnnualInsurance *= escalationFactor;
                currentMonthlyHoa *= escalationFactor;
            }
            currentPropertyValue *= (1 + periodicAppreciationRate);
        }
        let periodicRate = currentRate / periodsPerYear;
        if (!hasRefinanced && refiPeriod > 0 && period >= refiPeriod) {
            if (currentBalance > 0) currentBalance += refiClosingCosts;
            currentRate = refiRate / 100;
            totalPeriodsRemaining = Math.max(0, (refiTerm * periodsPerYear));
            standardPayment = calculatePayment(currentBalance, currentRate, periodsPerYear, totalPeriodsRemaining);
            hasRefinanced = true;
        }
        let interest = currentBalance * periodicRate;
        let calculatedPayment = standardPayment;
        if (currentBalance < calculatedPayment) calculatedPayment = currentBalance + interest;
        else if (calculatedPayment <= interest) calculatedPayment = interest + 1;
        let principalPayment = calculatedPayment - interest;
        let extraPrincipal = extraPaymentPerPeriod;
        if (lumpSumAmount > 0 && period === lumpSumPeriod) extraPrincipal += lumpSumAmount;
        let totalPrincipalPaid = principalPayment + extraPrincipal;
        if (currentBalance < totalPrincipalPaid) {
            totalPrincipalPaid = currentBalance;
            principalPayment = Math.max(0, totalPrincipalPaid - extraPrincipal);
        }
        currentBalance -= totalPrincipalPaid;
        totalInterestPaid += interest;
        const discountFactor = Math.pow(1 + periodicDiscountRate, period);
        const pvInterest = interest / discountFactor;
        totalPVInterestPaid += pvInterest;
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

// --- Rent vs. Buy Calculation ---
function calculateRentVsBuy() {
    const loanAmount = parseFloat(document.getElementById('loanAmount').value);
    const initialLTV = parseFloat(document.getElementById('initialLTV').value);
    const homePrice = loanAmount / (initialLTV / 100);
    const downPayment = homePrice - loanAmount;
    const closingCosts = parseFloat(document.getElementById('closingCosts').value);
    const sellingCostsRate = parseFloat(document.getElementById('sellingCosts').value) / 100;
    
    const monthlyRent = parseFloat(document.getElementById('monthlyRent').value);
    const annualRentIncrease = parseFloat(document.getElementById('rentIncrease').value) / 100;
    const annualInvestmentReturn = parseFloat(document.getElementById('investmentReturn').value) / 100;
    const loanTermYears = parseFloat(document.getElementById('loanTerm').value);
    const periodsPerYear = 12; // Assuming monthly for this comparison
    const totalPeriods = loanTermYears * periodsPerYear;

    // Buying calculation
    const buyingResults = generateAmortization(
        loanAmount,
        parseFloat(document.getElementById('interestRate').value) / 100,
        periodsPerYear,
        totalPeriods,
        0, 0, 0, initialLTV,
        parseFloat(document.getElementById('pmiRate').value) / 100,
        0, 0, 0, 0,
        parseFloat(document.getElementById('pitiEscalationRate').value) / 100,
        parseFloat(document.getElementById('discountRate').value) / 100,
        parseFloat(document.getElementById('appreciationRate').value) / 100
    );

    const buyingNetWorth = buyingResults.finalEquity - (buyingResults.finalPropertyValue * sellingCostsRate);
    
    // Renting calculation
    let investmentPortfolio = downPayment + closingCosts;
    let currentMonthlyRent = monthlyRent;
    const monthlyInvestmentReturn = annualInvestmentReturn / 12;

    const totalMonthlyOwnershipCost = (buyingResults.standardPayment * (12 / periodsPerYear)) + 
                                     (parseFloat(document.getElementById('propertyTax').value) / 12) + 
                                     (parseFloat(document.getElementById('insurance').value) / 12) + 
                                     parseFloat(document.getElementById('hoa').value) +
                                     ((homePrice * (parseFloat(document.getElementById('annualMaintenance').value) / 100)) / 12) +
                                     parseFloat(document.getElementById('monthlyUtilities').value);
    
    let rentingTimeline = [];
    let buyingTimeline = [];

    for (let i = 1; i <= totalPeriods; i++) {
        const monthlySavings = totalMonthlyOwnershipCost - currentMonthlyRent;
        investmentPortfolio += monthlySavings;
        investmentPortfolio *= (1 + monthlyInvestmentReturn);
        
        if (i % 12 === 0) {
            currentMonthlyRent *= (1 + annualRentIncrease);
        }
        
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
    
    return {
        buyingNetWorth,
        rentingNetWorth: investmentPortfolio,
        rentingTimeline,
        buyingTimeline
    };
}

// --- Affordability Calculation ---
function calculateAffordability() {
    const annualIncome = parseFloat(document.getElementById('annualIncome').value);
    const monthlyDebts = parseFloat(document.getElementById('nonMortgageDebt').value);
    const downPayment = parseFloat(document.getElementById('downPaymentAmount').value);
    const frontEndDTI = parseFloat(document.getElementById('desiredFrontEndDTI').value) / 100;
    const backEndDTI = parseFloat(document.getElementById('desiredBackEndDTI').value) / 100;
    const annualRate = parseFloat(document.getElementById('interestRate').value) / 100;
    const termYears = parseFloat(document.getElementById('loanTerm').value);
    const annualTax = parseFloat(document.getElementById('propertyTax').value);
    const annualInsurance = parseFloat(document.getElementById('insurance').value);

    const monthlyIncome = annualIncome / 12;
    const monthlyTax = annualTax / 12;
    const monthlyInsurance = annualInsurance / 12;

    const maxPaymentFromFrontEnd = monthlyIncome * frontEndDTI;
    const maxPaymentFromBackEnd = (monthlyIncome * backEndDTI) - monthlyDebts;

    const maxPITI = Math.min(maxPaymentFromFrontEnd, maxPaymentFromBackEnd);
    const maxPI = maxPITI - monthlyTax - monthlyInsurance;

    if (maxPI <= 0) {
        return { homePrice: 0, loanAmount: 0, piti: 0, pi: 0, tax: 0, insurance: 0 };
    }

    const periodsPerYear = 12;
    const totalPeriods = termYears * periodsPerYear;
    const monthlyRate = annualRate / periodsPerYear;
    
    const loanAmount = maxPI * (1 - Math.pow(1 + monthlyRate, -totalPeriods)) / monthlyRate;
    const homePrice = loanAmount + downPayment;

    return {
        homePrice: homePrice,
        loanAmount: loanAmount,
        piti: maxPITI,
        pi: maxPI,
        tax: monthlyTax,
        insurance: monthlyInsurance
    };
}


// --- DTI Calculation & Rendering ---
function calculateDTI(totalMonthlyHousingCost) {
    const annualIncome = parseFloat(document.getElementById('annualIncome').value) || 0;
    const monthlyNonMortgageDebt = parseFloat(document.getElementById('nonMortgageDebt').value) || 0;
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
    const applyStatus = (elementId, statusElementId, status) => {
        const el = document.getElementById(elementId);
        const statusEl = document.getElementById(statusElementId);
        el.className = `text-xl font-extrabold text-${status.color}`;
        statusEl.textContent = status.text;
        statusEl.className = `text-xs font-semibold mt-1 text-${status.color}`;
    };
    document.getElementById('frontEndDTI').textContent = formatPercent(frontEndDTI);
    applyStatus('frontEndDTI', 'frontEndDTIStatus', getStatus(frontEndDTI));
    document.getElementById('backEndDTI').textContent = formatPercent(backEndDTI);
    applyStatus('backEndDTI', 'backEndDTIStatus', getStatus(backEndDTI));
}

// --- Chart Rendering ---
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
                { label: 'Property Value', data: chartData.map(d => d.propertyValue), borderColor: '#1e8749', borderWidth: 3, fill: false, tension: 0.3, pointRadius: 2 },
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
            datasets: [
                {
                    label: 'Buying Net Worth',
                    data: buyingTimeline.map(d => d.netWorth),
                    borderColor: '#10b981', // green-500
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Renting Net Worth',
                    data: rentingTimeline.map(d => d.netWorth),
                    borderColor: '#3b82f6', // blue-500
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatCurrency(value)
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Long-Term Net Worth: Renting vs. Buying',
                    font: { size: 16 }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: c => `${c.dataset.label}: ${formatCurrency(c.parsed.y)}`
                    }
                }
            }
        }
    });
}

function renderAffordabilityChart(results) {
    const ctx = document.getElementById('affordabilityChart').getContext('2d');
    if (affordabilityChart) affordabilityChart.destroy();
    
    affordabilityChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Principal & Interest', 'Property Tax', 'Home Insurance'],
            datasets: [{
                label: 'Monthly Payment Breakdown',
                data: [results.pi, results.tax, results.insurance],
                backgroundColor: ['#1C768F', '#f59e0b', '#10b981'],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Estimated Monthly Payment Breakdown'
                },
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    callbacks: {
                        label: c => `${c.label}: ${formatCurrency(c.raw)}`
                    }
                }
            }
        }
    });
}


// --- Input Validation ---
function validateInputs() {
    const errors = [];
    const fields = [ { id: 'loanAmount', name: 'Loan Principal', min: 1 }, { id: 'interestRate', name: 'Interest Rate', min: 0.1, max: 100 }, { id: 'loanTerm', name: 'Loan Term', min: 1, max: 50 }, { id: 'initialLTV', name: 'Initial LTV', min: 1, max: 100 }, { id: 'annualIncome', name: 'Annual Income', min: 0 }, { id: 'nonMortgageDebt', name: 'Non-Mortgage Debt', min: 0 }, { id: 'appreciationRate', name: 'Appreciation Rate', min: 0, max: 50 }, { id: 'discountRate', name: 'Discount Rate', min: 0, max: 50 }, { id: 'pitiEscalationRate', name: 'PITI Escalation Rate', min: 0, max: 50 }, { id: 'pmiRate', name: 'PMI Rate', min: 0, max: 10 }, { id: 'propertyTax', name: 'Property Tax', min: 0 }, { id: 'insurance', name: 'Home Insurance', min: 0 }, { id: 'hoa', name: 'HOA Dues', min: 0 }, { id: 'extraPayment', name: 'Extra Payment', min: 0 }, { id: 'lumpSumPayment', name: 'Lump Sum Payment', min: 0 }, { id: 'annualMaintenance', name: 'Annual Maintenance', min: 0, max: 20 }, { id: 'monthlyUtilities', name: 'Monthly Utilities', min: 0 } ];
    
    if (currentTab === 'rent-vs-buy') {
        fields.push(
            { id: 'monthlyRent', name: 'Monthly Rent', min: 1 },
            { id: 'rentIncrease', name: 'Rent Increase', min: 0, max: 20 },
            { id: 'investmentReturn', name: 'Investment Return', min: 0, max: 30 },
            { id: 'closingCosts', name: 'Closing Costs', min: 0 },
            { id: 'sellingCosts', name: 'Selling Costs', min: 0, max: 20 }
        );
    } else if (currentTab === 'affordability') {
        fields.push(
            { id: 'downPaymentAmount', name: 'Down Payment', min: 0 },
            { id: 'desiredFrontEndDTI', name: 'Housing DTI', min: 10, max: 50 },
            { id: 'desiredBackEndDTI', name: 'Total DTI', min: 10, max: 50 }
        );
    }

    fields.forEach(field => {
        const el = document.getElementById(field.id);
        if (!el) return;
        const value = parseFloat(el.value);
        if (isNaN(value)) errors.push(`${field.name} must be a number.`);
        else {
            if (field.min !== undefined && value < field.min) errors.push(`${field.name} must be at least ${field.min}.`);
            if (field.max !== undefined && value > field.max) errors.push(`${field.name} cannot exceed ${field.max}.`);
        }
    });
    const errorContainer = document.getElementById('error-messages');
    const errorList = document.getElementById('error-list');
    if (errors.length > 0) {
        errorList.innerHTML = errors.map(e => `<li>${e}</li>`).join('');
        errorContainer.classList.remove('hidden');
        return false;
    }
    errorContainer.classList.add('hidden');
    return true;
}

// --- Main Calculation Orchestration ---
function handleCalculation(isShockTest = false) {
    const calculateButton = document.getElementById('calculateButton');
    calculateButton.disabled = true;
    calculateButton.textContent = 'Calculating...';
    setTimeout(() => {
        try { 
            if (validateInputs()) {
                if(currentTab === 'mortgage') {
                    calculateMortgage(isShockTest);
                } else if (currentTab === 'rent-vs-buy') {
                    runRentVsBuyAnalysis();
                } else if (currentTab === 'affordability') {
                    runAffordabilityAnalysis();
                }
                updateURLWithInputs();
            }
        } 
        catch (e) {
            console.error("Calculation Error:", e);
            const errorContainer = document.getElementById('error-messages');
            const errorList = document.getElementById('error-list');
            errorList.innerHTML = `<li>An unexpected error occurred. Please check console.</li>`;
            errorContainer.classList.remove('hidden');
        } finally {
            calculateButton.disabled = false;
            calculateButton.textContent = 'Calculate Scenario';
        }
    }, 50);
}

function runRentVsBuyAnalysis() {
    const results = calculateRentVsBuy();
    
    document.getElementById('buyingNetWorth').textContent = formatCurrency(results.buyingNetWorth);
    document.getElementById('rentingNetWorth').textContent = formatCurrency(results.rentingNetWorth);
    
    const conclusionEl = document.getElementById('rent-vs-buy-conclusion');
    if (results.buyingNetWorth > results.rentingNetWorth) {
        conclusionEl.innerHTML = `<p class="text-lg font-bold text-green-700">Buying appears to be the better financial decision in this scenario.</p>`;
    } else {
        conclusionEl.innerHTML = `<p class="text-lg font-bold text-blue-700">Renting and investing the difference appears to be the better financial decision in this scenario.</p>`;
    }

    renderRentVsBuyChart(results.rentingTimeline, results.buyingTimeline);
    
    const resultsEl = document.getElementById('rent-vs-buy-results');
    resultsEl.style.opacity = 1;
    resultsEl.classList.add('results-animate-in');
}

function runAffordabilityAnalysis() {
    const results = calculateAffordability();
    
    document.getElementById('affordableHomePrice').textContent = formatCurrency(results.homePrice);
    document.getElementById('affordableLoanAmount').textContent = formatCurrency(results.loanAmount);
    document.getElementById('affordablePITI').textContent = formatCurrency(results.piti);

    renderAffordabilityChart(results);
    
    const resultsEl = document.getElementById('affordability-results');
    resultsEl.style.opacity = 1;
    resultsEl.classList.add('results-animate-in');
}


function calculateMortgage(isShockTest = false) {
    const getVal = id => parseFloat(document.getElementById(id).value);
    const principal = getVal('loanAmount'), annualRate = getVal('interestRate') / 100, termYears = getVal('loanTerm');
    const periodsPerYear = parseInt(document.getElementById('repaymentFrequency').value), totalPeriods = termYears * periodsPerYear;
    const pTax = getVal('propertyTax'), ins = getVal('insurance'), hoa = getVal('hoa'), pitiEsc = getVal('pitiEscalationRate') / 100;
    const extraP = getVal('extraPayment'), lumpSum = getVal('lumpSumPayment'), lumpPeriod = getVal('lumpSumPeriod');
    const ltv = getVal('initialLTV'), pmiRate = getVal('pmiRate') / 100;
    const refiP = getVal('refiPeriod'), refiR = getVal('refiRate'), refiT = getVal('refiTerm'), refiC = getVal('refiClosingCosts');
    const discRate = getVal('discountRate') / 100, apprRate = getVal('appreciationRate') / 100;
    const annualMaintenanceRate = getVal('annualMaintenance') / 100;
    const monthlyUtilities = getVal('monthlyUtilities');
    
    const resultsEl = document.getElementById('results');
    resultsEl.style.opacity = 1;
    resultsEl.classList.add('results-enter-active');
    document.getElementById('schedule-wrapper').style.opacity = 1;
    document.getElementById('shock-results').style.display = 'none';

    const original = generateAmortization(principal, annualRate, periodsPerYear, totalPeriods, 0, 0, 0, ltv, 0, 0, 0, 0, 0, 0, discRate, 0);
    const accelerated = generateAmortization(principal, annualRate, periodsPerYear, totalPeriods, extraP, lumpSum, lumpPeriod, ltv, pmiRate, refiP, refiR, refiT, refiC, pitiEsc, discRate, apprRate);
    
    const standardPmt = original.standardPayment;
    const pniMonthly = standardPmt * (12 / periodsPerYear);
    const pmiMonthly = (accelerated.schedule[0] ? accelerated.schedule[0].pmi : 0) * (12 / periodsPerYear);
    const totalPITI = pniMonthly + (pTax / 12) + (ins / 12) + hoa + pmiMonthly;

    const initialPropertyValue = (ltv > 0 && ltv <= 100) ? principal / (ltv / 100) : principal;
    const monthlyMaintenance = (initialPropertyValue * annualMaintenanceRate) / 12;
    const totalMonthlyOwnershipCost = totalPITI + monthlyMaintenance + monthlyUtilities;

    renderDTI(calculateDTI(totalMonthlyOwnershipCost).frontEnd, calculateDTI(totalMonthlyOwnershipCost).backEnd);

    const setTxt = (id, val) => document.getElementById(id).textContent = val;
    animateValue(document.getElementById('finalEquity'), accelerated.finalEquity);
    animateValue(document.getElementById('finalPropertyValue'), accelerated.finalPropertyValue);
    setTxt('totalMonthlyPaymentPITI', formatCurrency(totalPITI));
    setTxt('totalOwnershipCost', formatCurrency(totalMonthlyOwnershipCost));
    
    const pmiNote = document.getElementById('pmiDropNote');
    if (pmiRate > 0 && ltv > 80 && accelerated.pmiDropPeriod) {
        pmiNote.style.display = 'block';
        setTxt('pmiDropPeriod', accelerated.pmiDropPeriod);
    } else { pmiNote.style.display = 'none'; }
    
    setTxt('acceleratedPaymentDisplay', formatCurrency(standardPmt + extraP));
    animateValue(document.getElementById('totalInterestOriginal'), original.totalInterest);
    animateValue(document.getElementById('totalInterestNew'), accelerated.totalInterest);
    animateValue(document.getElementById('npvOriginal'), original.totalPVInterest);
    animateValue(document.getElementById('npvNew'), accelerated.totalPVInterest);
    const iSaved = original.totalInterest - accelerated.totalInterest;
    const npvSaved = original.totalPVInterest - accelerated.totalPVInterest;
    const tSavedPeriods = original.payoffPeriod - accelerated.payoffPeriod;
    const tSavedY = Math.floor(tSavedPeriods / periodsPerYear);
    const tSavedM = Math.round((tSavedPeriods % periodsPerYear) * (12 / periodsPerYear));
    const timeSavedStr = `${tSavedY}y ${tSavedM}m`;
    const payoffDate = (periods) => {
        let d = new Date();
        d.setMonth(d.getMonth() + Math.round(periods * (12 / periodsPerYear)));
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    };
    setTxt('originalPayoffDate', payoffDate(original.payoffPeriod));
    setTxt('newPayoffDate', payoffDate(accelerated.payoffPeriod));
    animateValue(document.getElementById('interestSaved'), iSaved);
    animateValue(document.getElementById('npvSaved'), npvSaved);
    setTxt('timeSaved', timeSavedStr);
    
    // --- Visual Feedback ---
    if (iSaved > 0) flashHighlight('interestSaved');
    if (npvSaved > 0) flashHighlight('npvSaved');
    if (tSavedPeriods > 0) flashHighlight('timeSaved');

    renderChart(accelerated);
    generateAmortizationTable(original, accelerated);

    if (isShockTest) {
        const shockInc = getVal('shockRateIncrease') / 100;
        const shockRate = annualRate + shockInc;
        const shockPmt = calculatePayment(principal, shockRate, periodsPerYear, totalPeriods);
        document.getElementById('shock-results').style.display = 'block';
        setTxt('shockRateDisplay', (shockRate * 100).toFixed(2));
        setTxt('originalShockPaymentDisplay', formatCurrency(standardPmt));
        setTxt('shockPaymentDisplay', formatCurrency(shockPmt));
        setTxt('paymentIncrease', formatCurrency(shockPmt - standardPmt));
    }

    currentResults = {
        original,
        accelerated,
        totalPITI,
        totalMonthlyOwnershipCost,
        dti: calculateDTI(totalMonthlyOwnershipCost),
        interestSaved: iSaved,
        npvSaved: npvSaved,
        timeSaved: timeSavedStr,
        inputs: Object.fromEntries(allInputIds.map(id => [id, document.getElementById(id).value]))
    };
}

function generateAmortizationTable(originalResults, acceleratedResults) {
    const table = document.getElementById('amortizationTable');
    table.innerHTML = `<thead class="text-xs text-gray-700 bg-gray-50 uppercase tracking-wider"><tr><th rowspan="2" class="py-2 px-1 border-b-2 border-gray-300 border-r">#</th><th colspan="4" class="py-2 px-1 border-b-2 border-gray-300 text-center bg-red-50/70 border-r border-red-300">Original Loan</th><th colspan="10" class="py-2 px-1 border-b-2 border-gray-300 text-center bg-sky-50/70">Accelerated Scenario</th></tr><tr class="font-medium"><th class="py-2 px-1 border-b border-gray-300 text-right bg-red-50/70">Nom. Interest</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-red-50/70 text-npv">PV Interest</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-red-50/70">P&I Pmt</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-red-50/70 border-r border-red-300">Balance</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70 text-accent">Home Equity</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70 text-accent">Property Val</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">P&I Pmt</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">Tax/Ins/HOA</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">Nom. Interest</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70 text-npv">PV Interest</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">PMI</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">Extra</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">Total Pmt</th><th class="py-2 px-1 border-b border-gray-300 text-right bg-sky-50/70">Balance</th></tr></thead><tbody></tbody>`;
    const body = table.querySelector('tbody');
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

// --- Form Reset ---
function resetForm() {
    const defaults = { loanAmount: "300000", interestRate: "6.5", loanTerm: "30", initialLTV: "90", discountRate: "3.0", appreciationRate: "3.5", annualIncome: "120000", nonMortgageDebt: "800", propertyTax: "3600", insurance: "1200", hoa: "0", pitiEscalationRate: "2.0", pmiRate: "0.5", extraPayment: "100", lumpSumPayment: "5000", lumpSumPeriod: "1", refiPeriod: "60", refiRate: "5.0", refiTerm: "15", refiClosingCosts: "5000", shockRateIncrease: "1.0", annualMaintenance: "1.0", monthlyUtilities: "300", monthlyRent: "2000", rentIncrease: "3.0", investmentReturn: "7.0", closingCosts: "8000", sellingCosts: "6.0", downPaymentAmount: "60000", desiredFrontEndDTI: "28", desiredBackEndDTI: "36" };
    for (const id in defaults) {
        const el = document.getElementById(id);
        if (el) el.value = defaults[id];
    }
    document.getElementById('repaymentFrequency').value = "12";
    document.getElementById('currency').value = "USD";
    history.pushState(null, '', window.location.pathname); // Clear URL params on reset
    handleCalculation();
    updateCurrencySymbols();
}

// --- URL State Management ---
function updateURLWithInputs() {
    const params = new URLSearchParams();
    allInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) params.set(id, el.value);
    });
    // Replace the current history state instead of pushing a new one
    history.replaceState(null, '', '?' + params.toString());
}

function populateFormFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.toString().length === 0) return false;
    
    allInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el && params.has(id)) {
            el.value = params.get(id);
        }
    });
    return true;
}


// --- Modal Management ---
function setupModal() {
    const modal = document.getElementById('shareModal');
    const saveButton = document.getElementById('saveButton');
    const closeModalButton = document.getElementById('closeModalButton');
    const copyUrlButton = document.getElementById('copyUrlButton');
    const shareUrlInput = document.getElementById('shareUrlInput');
    const copyFeedback = document.getElementById('copyFeedback');

    saveButton.addEventListener('click', () => {
        // Ensure URL is up-to-date before showing
        updateURLWithInputs();
        shareUrlInput.value = window.location.href;
        modal.classList.remove('hidden');
        shareUrlInput.select(); // Select the text for easy copying
    });

    closeModalButton.addEventListener('click', () => {
        modal.classList.add('hidden');
        copyFeedback.textContent = ''; // Clear feedback on close
    });

    copyUrlButton.addEventListener('click', () => {
        shareUrlInput.select();
        try {
            // Use execCommand for better iframe compatibility
            document.execCommand('copy');
            copyFeedback.textContent = 'Copied to clipboard!';
            setTimeout(() => { copyFeedback.textContent = ''; }, 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
            copyFeedback.textContent = 'Failed to copy.';
        }
    });

    // Close modal if clicking outside of it
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.classList.add('hidden');
            copyFeedback.textContent = '';
        }
    });
}

// --- PDF Generation ---
function generatePDF() {
    if (currentTab !== 'mortgage') {
        alert("PDF reports are only available for the 'Mortgage Calculator' tab.");
        return;
    }
    if (!currentResults) {
        alert("Please calculate a scenario on the Mortgage Calculator tab first to generate a report.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { inputs, totalPITI, totalMonthlyOwnershipCost, dti, original, accelerated, interestSaved, npvSaved, timeSaved } = currentResults;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(28, 118, 143); // Primary Color
    doc.text("Strategic Mortgage Planner", 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Personalized Mortgage Report", 105, 27, { align: 'center' });
    doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 105, 32, { align: 'center' });

    const summaryData = [
        ['Loan Principal', formatCurrency(inputs.loanAmount)],
        ['Interest Rate', `${inputs.interestRate}%`],
        ['Loan Term', `${inputs.loanTerm} Years`],
        ['Est. PITI + PMI', formatCurrency(totalPITI)],
        ['Total Monthly Ownership Cost', formatCurrency(totalMonthlyOwnershipCost)],
        ['Front-End DTI (Housing)', formatPercent(dti.frontEnd)],
        ['Back-End DTI (Total Debt)', formatPercent(dti.backEnd)]
    ];
    doc.autoTable({
        startY: 40,
        head: [['Key Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [28, 118, 143] }
    });

    const comparisonData = [
        ['Payoff Date', payoffDate(original.payoffPeriod, inputs.repaymentFrequency), payoffDate(accelerated.payoffPeriod, inputs.repaymentFrequency)],
        ['Total Interest Paid', formatCurrency(original.totalInterest), formatCurrency(accelerated.totalInterest)],
        ['NPV of Interest Cost', formatCurrency(original.totalPVInterest), formatCurrency(accelerated.totalPVInterest)],
        ['Final Equity', formatCurrency(original.finalEquity), formatCurrency(accelerated.finalEquity)]
    ];
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Metric', 'Original Loan', 'Accelerated Scenario']],
        body: comparisonData,
        theme: 'grid',
        headStyles: { fillColor: [28, 118, 143] }
    });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 135, 73); // Accent color
    doc.text("Accelerated Payoff Savings Summary", 14, doc.lastAutoTable.finalY + 15);
    const savingsData = [
        ['Nominal Interest Saved', formatCurrency(interestSaved)],
        ['NPV (True Value) Saved', formatCurrency(npvSaved)],
        ['Time Shaved Off Loan', timeSaved]
    ];
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 22,
        body: savingsData,
        theme: 'plain',
    });

    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(28, 118, 143);
    doc.text("Accelerated Amortization Schedule (Annual Summary)", 105, 15, { align: 'center' });
    
    const schedule = accelerated.schedule;
    const periodsPerYear = parseInt(inputs.repaymentFrequency);
    const annualData = [];
    let yearInterest = 0, yearPrincipal = 0, yearExtra = 0;
    for (let i = 0; i < schedule.length; i++) {
        yearInterest += schedule[i].interest;
        yearPrincipal += schedule[i].pniPrincipal;
        yearExtra += schedule[i].extraPayment;

        if ((i + 1) % periodsPerYear === 0 || i === schedule.length - 1) {
            const yearEnd = schedule[i];
            annualData.push([
                `Year ${Math.ceil(yearEnd.period / periodsPerYear)}`,
                formatCurrency(yearInterest),
                formatCurrency(yearPrincipal + yearExtra),
                formatCurrency(yearEnd.totalEquity),
                formatCurrency(yearEnd.balance)
            ]);
            yearInterest = 0;
            yearPrincipal = 0;
            yearExtra = 0;
        }
    }
    doc.autoTable({
        startY: 25,
        head: [['Year', 'Total Interest Paid', 'Total Principal Paid', 'End of Year Equity', 'End of Year Balance']],
        body: annualData,
        theme: 'striped',
        headStyles: { fillColor: [28, 118, 143] }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
        doc.text('Disclaimer: This is for informational purposes only. Consult a financial professional.', 105, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save(`Mortgage_Report_${new Date().toISOString().slice(0,10)}.pdf`);
}

const payoffDate = (periods, periodsPerYear) => {
    let d = new Date();
    d.setMonth(d.getMonth() + Math.round(periods * (12 / periodsPerYear)));
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
};

// --- Tab Management ---
function setupTabs() {
    const tabs = {
        'mortgage': { button: document.getElementById('mortgage-tab'), content: document.getElementById('mortgage-calculator-content') },
        'affordability': { button: document.getElementById('affordability-tab'), content: document.getElementById('affordability-content') },
        'rent-vs-buy': { button: document.getElementById('rent-vs-buy-tab'), content: document.getElementById('rent-vs-buy-content') }
    };

    function switchTab(tab) {
        currentTab = tab;
        for (const key in tabs) {
            if (key === tab) {
                tabs[key].button.classList.add('active');
                tabs[key].button.setAttribute('aria-selected', 'true');
                tabs[key].content.classList.remove('hidden');
            } else {
                tabs[key].button.classList.remove('active');
                tabs[key].button.setAttribute('aria-selected', 'false');
                tabs[key].content.classList.add('hidden');
            }
        }
    }

    for (const key in tabs) {
        tabs[key].button.addEventListener('click', () => switchTab(key));
    }
    
    // Set initial active tab
    switchTab('mortgage');
}


// --- Initial Page Load ---
window.onload = () => {
    setupTabs();

    // Populate form from URL if params exist, otherwise run with defaults
    if (!populateFormFromURL()) {
        resetForm(); // Set defaults if no params
    } else {
        handleCalculation(); // Calculate with URL params
    }
    
    // Set up the modal listeners
    setupModal();

    // Set the copyright year in the footer
    document.getElementById('copyright-year').textContent = new Date().getFullYear();

    // Add currency change listener and initial symbol update
    document.getElementById('currency').addEventListener('change', updateCurrencySymbols);
    updateCurrencySymbols();

    // Automatically load the content guide
    loadGuide();
};

// --- SEO Content Loader ---
function loadGuide() {
    const guideContent = document.getElementById('guide-content');
    if (!guideContent) return;

    fetch('content-guide.html')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.text();
        })
        .then(html => {
            guideContent.innerHTML = html;
        })
        .catch(error => {
            guideContent.innerHTML = '<p class="text-red-500 text-center">Sorry, the guide could not be loaded.</p>';
            console.error('Error fetching content guide:', error);
        });
}
