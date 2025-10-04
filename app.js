/* --- JAVASCRIPT LOGIC --- */

// --- Global Variables & Chart Instance ---
let mortgageChart = null;
const allInputIds = [ "loanAmount", "interestRate", "loanTerm", "initialLTV", "discountRate", "appreciationRate", "annualIncome", "nonMortgageDebt", "propertyTax", "insurance", "hoa", "pitiEscalationRate", "pmiRate", "extraPayment", "lumpSumPayment", "lumpSumPeriod", "refiPeriod", "refiRate", "refiTerm", "refiClosingCosts", "shockRateIncrease", "repaymentFrequency", "currency" ];

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

// --- DTI Calculation & Rendering ---
function calculateDTI(totalMonthlyPITI) {
    const annualIncome = parseFloat(document.getElementById('annualIncome').value) || 0;
    const monthlyNonMortgageDebt = parseFloat(document.getElementById('nonMortgageDebt').value) || 0;
    if (annualIncome === 0) return { frontEnd: 0, backEnd: 0 };
    const grossMonthlyIncome = annualIncome / 12;
    return { frontEnd: totalMonthlyPITI / grossMonthlyIncome, backEnd: (totalMonthlyPITI + monthlyNonMortgageDebt) / grossMonthlyIncome };
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

// --- Input Validation ---
function validateInputs() {
    const errors = [];
    const fields = [ { id: 'loanAmount', name: 'Loan Principal', min: 1 }, { id: 'interestRate', name: 'Interest Rate', min: 0.1, max: 100 }, { id: 'loanTerm', name: 'Loan Term', min: 1, max: 50 }, { id: 'initialLTV', name: 'Initial LTV', min: 1, max: 100 }, { id: 'annualIncome', name: 'Annual Income', min: 0 }, { id: 'nonMortgageDebt', name: 'Non-Mortgage Debt', min: 0 }, { id: 'appreciationRate', name: 'Appreciation Rate', min: 0, max: 50 }, { id: 'discountRate', name: 'Discount Rate', min: 0, max: 50 }, { id: 'pitiEscalationRate', name: 'PITI Escalation Rate', min: 0, max: 50 }, { id: 'pmiRate', name: 'PMI Rate', min: 0, max: 10 }, { id: 'propertyTax', name: 'Property Tax', min: 0 }, { id: 'insurance', name: 'Home Insurance', min: 0 }, { id: 'hoa', name: 'HOA Dues', min: 0 }, { id: 'extraPayment', name: 'Extra Payment', min: 0 }, { id: 'lumpSumPayment', name: 'Lump Sum Payment', min: 0 } ];
    fields.forEach(field => {
        const value = parseFloat(document.getElementById(field.id).value);
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
                calculateMortgage(isShockTest);
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
            calculateButton.textContent = 'Calculate Full Scenario';
        }
    }, 50);
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
    renderDTI(calculateDTI(totalPITI).frontEnd, calculateDTI(totalPITI).backEnd);

    const setTxt = (id, val) => document.getElementById(id).textContent = val;
    animateValue(document.getElementById('finalEquity'), accelerated.finalEquity);
    animateValue(document.getElementById('finalPropertyValue'), accelerated.finalPropertyValue);
    setTxt('totalMonthlyPaymentPITI', formatCurrency(totalPITI));
    setTxt('standardPaymentDisplay', formatCurrency(standardPmt));
    
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
    const payoffDate = (periods) => {
        let d = new Date();
        d.setMonth(d.getMonth() + Math.round(periods * (12 / periodsPerYear)));
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    };
    setTxt('originalPayoffDate', payoffDate(original.payoffPeriod));
    setTxt('newPayoffDate', payoffDate(accelerated.payoffPeriod));
    animateValue(document.getElementById('interestSaved'), iSaved);
    animateValue(document.getElementById('npvSaved'), npvSaved);
    setTxt('timeSaved', `${tSavedY}y ${tSavedM}m`);
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
    const defaults = { loanAmount: "300000", interestRate: "6.5", loanTerm: "30", initialLTV: "90", discountRate: "3.0", appreciationRate: "3.5", annualIncome: "120000", nonMortgageDebt: "800", propertyTax: "3600", insurance: "1200", hoa: "0", pitiEscalationRate: "2.0", pmiRate: "0.5", extraPayment: "100", lumpSumPayment: "5000", lumpSumPeriod: "1", refiPeriod: "60", refiRate: "5.0", refiTerm: "15", refiClosingCosts: "5000", shockRateIncrease: "1.0" };
    for (const id in defaults) document.getElementById(id).value = defaults[id];
    document.getElementById('repaymentFrequency').value = "12";
    document.getElementById('currency').value = "USD";
    history.pushState(null, '', window.location.pathname); // Clear URL params on reset
    handleCalculation();
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

// --- Initial Page Load ---
window.onload = () => {
    // Populate form from URL if params exist, otherwise run with defaults
    if (!populateFormFromURL()) {
        resetForm(); // Set defaults if no params
    } else {
        handleCalculation(); // Calculate with URL params
    }
    
    // Set the copyright year in the footer
    document.getElementById('copyright-year').textContent = new Date().getFullYear();

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
