// Simplified logic for standalone calculator pages
(function() {
    'use strict';

    // --- Helper Functions ---
    const formatCurrency = (amount, currency = 'USD') => {
        const locale = ['EUR', 'GBP'].includes(currency) ? 'de-DE' : 'en-US';
        return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
    };

    const calculatePayment = (principal, annualRate, periodsPerYear, totalPeriods) => {
        if (annualRate <= 0) return principal / totalPeriods;
        const periodicRate = annualRate / periodsPerYear;
        return principal * periodicRate / (1 - Math.pow(1 + periodicRate, -totalPeriods));
    };

    // --- Affordability Calculator Logic ---
    function runAffordabilityAnalysis() {
        const getVal = id => parseFloat(document.getElementById(id).value);
        const annualIncome = getVal('annualIncome');
        const monthlyDebts = getVal('nonMortgageDebt');
        const downPayment = getVal('downPaymentAmount');
        const backEndDTI = getVal('desiredBackEndDTI') / 100;
        const annualRate = getVal('interestRate') / 100;
        const termYears = getVal('loanTerm');
        const annualTax = getVal('propertyTax');
        const annualInsurance = getVal('insurance');

        const monthlyIncome = annualIncome / 12;
        const monthlyTax = annualTax / 12;
        const monthlyInsurance = annualInsurance / 12;

        const maxPaymentFromBackEnd = (monthlyIncome * backEndDTI) - monthlyDebts;
        const maxPI = maxPaymentFromBackEnd - monthlyTax - monthlyInsurance;
        
        if (maxPI <= 0) {
             document.getElementById('affordableHomePrice').textContent = formatCurrency(0);
             document.getElementById('affordableLoanAmount').textContent = formatCurrency(0);
             document.getElementById('affordablePITI').textContent = formatCurrency(0);
            return;
        }
        
        const monthlyRate = annualRate / 12;
        const loanAmount = maxPI * (1 - Math.pow(1 + monthlyRate, -(termYears * 12))) / monthlyRate;
        const homePrice = loanAmount + downPayment;

        document.getElementById('affordableHomePrice').textContent = formatCurrency(homePrice);
        document.getElementById('affordableLoanAmount').textContent = formatCurrency(loanAmount);
        document.getElementById('affordablePITI').textContent = formatCurrency(maxPaymentFromBackEnd);

        renderAffordabilityChart({ pi: maxPI, tax: monthlyTax, insurance: monthlyInsurance });
    }

    let affordabilityChart = null;
    function renderAffordabilityChart(results) {
        const ctx = document.getElementById('affordabilityChart').getContext('2d');
        if (affordabilityChart) affordabilityChart.destroy();
        affordabilityChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Principal & Interest', 'Property Tax', 'Home Insurance'],
                datasets: [{ data: [results.pi, results.tax, results.insurance], backgroundColor: ['#1C768F', '#b45309', '#065f46'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Estimated Monthly Payment Breakdown' }, legend: { position: 'bottom' } } }
        });
    }

    // --- Rent vs. Buy Calculator Logic ---
    function runRentVsBuyAnalysis() {
        const getVal = id => parseFloat(document.getElementById(id).value);

        const homePrice = getVal('homePrice');
        const downPayment = getVal('downPaymentRvB');
        const loanAmount = homePrice - downPayment;
        document.getElementById('loanAmount').value = loanAmount;
        document.getElementById('initialLTV').value = (loanAmount / homePrice) * 100;

        const buyingNetWorthOverTime = [];
        const rentingNetWorthOverTime = [];
        const years = getVal('loanTerm');

        // Simplified calculation for chart
        let currentEquity = downPayment;
        let propertyValue = homePrice;
        let rentInvestment = downPayment;
        let currentRent = getVal('monthlyRent');
        const monthlyPayment = calculatePayment(loanAmount, getVal('interestRate') / 100, 12, years * 12);
        const monthlyOwnershipCost = monthlyPayment + (getVal('propertyTax')/12) + (getVal('insurance')/12) + ((homePrice * (getVal('annualMaintenance')/100))/12);

        for (let i = 1; i <= years; i++) {
            propertyValue *= (1 + getVal('appreciationRate') / 100);
            currentEquity += (monthlyPayment * 12 * (i/years)); // Simplified equity growth
            
            const costDifference = monthlyOwnershipCost - currentRent;
            rentInvestment += (costDifference * 12);
            rentInvestment *= (1 + getVal('investmentReturn') / 100);
            currentRent *= (1 + getVal('rentIncrease') / 100);
            
            buyingNetWorthOverTime.push(propertyValue - loanAmount + currentEquity - (propertyValue * getVal('sellingCosts') / 100) );
            rentingNetWorthOverTime.push(rentInvestment);
        }
        
        document.getElementById('buyingNetWorth').textContent = formatCurrency(buyingNetWorthOverTime[buyingNetWorthOverTime.length - 1]);
        document.getElementById('rentingNetWorth').textContent = formatCurrency(rentingNetWorthOverTime[rentingNetWorthOverTime.length - 1]);
        
        const conclusionEl = document.getElementById('rent-vs-buy-conclusion');
        if(buyingNetWorthOverTime[buyingNetWorthOverTime.length - 1] > rentingNetWorthOverTime[rentingNetWorthOverTime.length-1]){
            conclusionEl.innerHTML = `<p class="text-accent">Buying appears to be the better financial decision over ${years} years.</p>`;
        } else {
            conclusionEl.innerHTML = `<p class="text-primary">Renting and investing the difference appears to be the better financial decision over ${years} years.</p>`;
        }

        renderRentVsBuyChart(rentingNetWorthOverTime, buyingNetWorthOverTime, years);
    }
    
    let rentVsBuyChart = null;
    function renderRentVsBuyChart(rentingData, buyingData, years) {
        const ctx = document.getElementById('rentVsBuyChart').getContext('2d');
        if (rentVsBuyChart) rentVsBuyChart.destroy();
        const labels = Array.from({length: years}, (_, i) => `Year ${i + 1}`);
        rentVsBuyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'Buying Net Worth', data: buyingData, borderColor: '#1e8749', fill: true, backgroundColor: 'rgba(30, 135, 73, 0.1)' },
                    { label: 'Renting Net Worth', data: rentingData, borderColor: '#1C768F', fill: true, backgroundColor: 'rgba(28, 118, 143, 0.1)' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: false } }, scales: { y: { ticks: { callback: (v) => formatCurrency(v) } } } }
        });
    }

    // --- Refinance Calculator Logic ---
    function runRefinanceAnalysis() {
        const getVal = id => parseFloat(document.getElementById(id).value);
        const originalAmount = getVal('originalLoanAmount');
        const currentRate = getVal('currentInterestRate') / 100;
        const startDate = new Date(document.getElementById('loanStartDate').value + '-01T00:00:00');
        const originalTermYears = 30; // Assuming 30 for simplicity on this page
        
        const newRate = getVal('newInterestRate') / 100;
        const newTermYears = getVal('newLoanTerm');
        const closingCosts = getVal('newClosingCosts');

        const monthsPassed = (new Date().getFullYear() - startDate.getFullYear()) * 12 + (new Date().getMonth() - startDate.getMonth());
        
        if (monthsPassed < 0) return;

        const currentPayment = calculatePayment(originalAmount, currentRate, 12, originalTermYears * 12);
        let remainingBalance = originalAmount;
        for (let i = 0; i < monthsPassed; i++) {
            remainingBalance -= (currentPayment - (remainingBalance * currentRate / 12));
        }

        const newPayment = calculatePayment(remainingBalance + closingCosts, newRate, 12, newTermYears * 12);
        const monthlySavings = currentPayment - newPayment;
        const breakEvenMonths = monthlySavings > 0 ? closingCosts / monthlySavings : Infinity;

        let totalOldInterest = 0;
        let tempBalanceOld = remainingBalance;
        for(let i=0; i < (originalTermYears*12 - monthsPassed); i++){
            totalOldInterest += tempBalanceOld * currentRate / 12;
            tempBalanceOld -= (currentPayment - (tempBalanceOld * currentRate/12));
        }
        
        let totalNewInterest = 0;
        let tempBalanceNew = remainingBalance + closingCosts;
         for(let i=0; i < newTermYears*12; i++){
            totalNewInterest += tempBalanceNew * newRate / 12;
            tempBalanceNew -= (newPayment - (tempBalanceNew * newRate/12));
        }

        const lifetimeSavings = totalOldInterest - totalNewInterest;

        document.getElementById('refiMonthlySavings').textContent = formatCurrency(monthlySavings);
        document.getElementById('refiBreakEven').textContent = isFinite(breakEvenMonths) ? `${Math.floor(breakEvenMonths/12)}y ${Math.round(breakEvenMonths % 12)}m` : 'N/A';
        document.getElementById('refiLifetimeSavings').textContent = formatCurrency(lifetimeSavings);

        renderRefinanceChart({ currentPayment, newPayment, totalOldInterest, totalNewInterest });
    }

    let refinanceChart = null;
    function renderRefinanceChart(results) {
        const ctx = document.getElementById('refinanceChart').getContext('2d');
        if (refinanceChart) refinanceChart.destroy();
        refinanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Monthly P&I Payment', 'Total Future Interest'],
                datasets: [
                    { label: 'Current Loan', data: [results.currentPayment, results.totalOldInterest], backgroundColor: '#be123c' },
                    { label: 'New Loan', data: [results.newPayment, results.totalNewInterest], backgroundColor: '#166534' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Payment & Total Cost Comparison' } } }
        });
    }


    // --- Initialization ---
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('affordability-calculator-container')) {
            document.getElementById('calculate-affordability').addEventListener('click', runAffordabilityAnalysis);
            runAffordabilityAnalysis();
        }
        if (document.getElementById('rent-vs-buy-calculator-container')) {
            document.getElementById('calculate-rent-vs-buy').addEventListener('click', runRentVsBuyAnalysis);
            runRentVsBuyAnalysis();
        }
        if (document.getElementById('refinance-calculator-container')) {
            document.getElementById('calculate-refinance').addEventListener('click', runRefinanceAnalysis);
            runRefinanceAnalysis();
        }
    });

})();
