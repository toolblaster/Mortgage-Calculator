document.addEventListener('DOMContentLoaded', function () {
    // --- DOM Element Cache ---
    const DOM = {
        loanAmount: document.getElementById('loanAmount'),
        loanAmountSlider: document.getElementById('loanAmountSlider'),
        interestRate: document.getElementById('interestRate'),
        interestRateSlider: document.getElementById('interestRateSlider'),
        loanTerm: document.getElementById('loanTerm'),
        loanTermSlider: document.getElementById('loanTermSlider'),
        extraMonthly: document.getElementById('extraMonthly'),
        oneTimePayment: document.getElementById('oneTimePayment'),
        oneTimePaymentMonth: document.getElementById('oneTimePaymentMonth'),
        propertyTax: document.getElementById('propertyTax'),
        homeInsurance: document.getElementById('homeInsurance'),
        currency: document.getElementById('currency'),
        calculateBtn: document.getElementById('calculateBtn'),
        errorMessages: document.getElementById('error-messages'),
        resultsSummary: document.getElementById('results-summary'),
        monthlyPayment: document.getElementById('monthlyPayment'),
        totalInterest: document.getElementById('totalInterest'),
        payoffDate: document.getElementById('payoffDate'),
        interestSaved: document.getElementById('interestSaved'),
        progressBar: document.getElementById('progressBar'),
        progressText: document.getElementById('progressText'),
        compareToggle: document.getElementById('compareToggle'),
        amortizationChart: document.getElementById('amortizationChart'),
        tableSection: document.getElementById('table-section'),
        amortizationTableBody: document.getElementById('amortizationTableBody'),
        downloadPDF: document.getElementById('downloadPDF'),
        downloadCSV: document.getElementById('downloadCSV'),
        currencySymbol: document.getElementById('currency-symbol'),
        currencySymbolSmalls: document.querySelectorAll('.currency-symbol-small'),
        
        investmentReturn: document.getElementById('investmentReturn'),
        opportunityCostSection: document.getElementById('opportunity-cost-section'),
        opportunityCostChart: document.getElementById('opportunityCostChart'),
        opportunityCostSummary: document.getElementById('opportunity-cost-summary'),

        // SEO Content Elements
        exampleAmortizationChart: document.getElementById('exampleAmortizationChart'),
        termTabsContainer: document.getElementById('term-tabs-container'),
        termComparisonChart: document.getElementById('termComparisonChart'),
        termComparisonSummary: document.getElementById('term-comparison-summary'),
    };

    let amortizationChart = null;
    let exampleChart = null;
    let termComparisonChart = null;
    let opportunityCostChart = null;
    let standardSchedule = [], acceleratedSchedule = [];

    // --- Helper Functions ---
    const updateCurrencySymbols = () => {
        const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$' };
        const symbol = symbols[DOM.currency.value] || '$';
        if (DOM.currencySymbol) DOM.currencySymbol.textContent = symbol;
        DOM.currencySymbolSmalls.forEach(span => span.textContent = symbol);
    };
    
    // --- Two-way data binding for sliders and inputs ---
    function syncSliderAndInput(slider, input, isCurrency = false) {
        slider.addEventListener('input', (e) => {
            input.value = e.target.value;
            handleCalculate(); // Recalculate in real-time
        });
        input.addEventListener('input', (e) => {
            slider.value = e.target.value;
            handleCalculate(); // Recalculate in real-time
        });
    }


    // --- Core Calculation Logic ---
    function calculateAmortization(loanAmount, annualRate, years, extraMonthly, oneTimePayment, oneTimePaymentMonth) {
        const totalMonths = years * 12;
        if (loanAmount <= 0 || annualRate <= 0 || years <= 0) {
            return { schedule: [], monthlyPayment: 0, totalInterest: 0, totalExtraPaid: 0 };
        }
        const monthlyPayment = window.mortgageUtils.calculatePayment(loanAmount, annualRate, 12, totalMonths);
        const monthlyRate = annualRate / 12 / 100;

        let balance = loanAmount;
        let schedule = [];
        let totalInterest = 0;
        let totalExtraPaid = 0;

        for (let month = 1; month <= totalMonths && balance > 0; month++) {
            const interest = balance * monthlyRate;
            let principal = monthlyPayment - interest;
            let currentExtra = extraMonthly;

            if (month === oneTimePaymentMonth) {
                currentExtra += oneTimePayment;
            }

            if (balance < monthlyPayment + currentExtra) {
                principal = balance - interest;
                currentExtra = 0; // No extra payment if the balance is less than a regular payment
            }
            
            let principalPaid = principal + currentExtra;
            if (balance < principalPaid) {
                principalPaid = balance;
                currentExtra = Math.max(0, balance - principal);
            }
            
            balance -= principalPaid;
            totalInterest += interest;
            totalExtraPaid += currentExtra;

            schedule.push({
                month,
                payment: monthlyPayment,
                principal: principalPaid - currentExtra,
                interest,
                extraPayment: currentExtra,
                balance: balance > 0 ? balance : 0
            });
        }
        return { schedule, monthlyPayment, totalInterest, totalExtraPaid };
    }
    
    // --- UI Update & Rendering ---
    function renderResults() {
        if (!standardSchedule.length) return;

        const isCompare = DOM.compareToggle.checked;
        const displaySchedule = isCompare && acceleratedSchedule.length > 0 ? acceleratedSchedule : standardSchedule;
        const standardTotalInterest = standardSchedule.reduce((acc, curr) => acc + curr.interest, 0);
        const acceleratedTotalInterest = acceleratedSchedule.reduce((acc, curr) => acc + curr.interest, 0);

        const tax = parseFloat(DOM.propertyTax.value) || 0;
        const insurance = parseFloat(DOM.homeInsurance.value) || 0;
        const totalMonthly = (displaySchedule.length > 0 ? displaySchedule[0].payment : 0) + (tax / 12) + (insurance / 12) + (isCompare ? parseFloat(DOM.extraMonthly.value) || 0 : 0);
        
        DOM.monthlyPayment.textContent = window.mortgageUtils.formatCurrency(totalMonthly, DOM.currency.value, 2);
        DOM.totalInterest.textContent = window.mortgageUtils.formatCurrency(isCompare ? acceleratedTotalInterest : standardTotalInterest, DOM.currency.value, 2);

        const payoff = new Date();
        payoff.setMonth(payoff.getMonth() + displaySchedule.length);
        DOM.payoffDate.textContent = payoff.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        const saved = standardTotalInterest - acceleratedTotalInterest;
        DOM.interestSaved.textContent = window.mortgageUtils.formatCurrency(saved > 0 ? saved : 0, DOM.currency.value, 2);

        const progress = (1 - (displaySchedule.length > 0 ? displaySchedule[displaySchedule.length - 1].balance : parseFloat(DOM.loanAmount.value)) / parseFloat(DOM.loanAmount.value)) * 100;
        DOM.progressBar.style.width = `${progress}%`;
        DOM.progressText.textContent = `${Math.round(progress)}% Paid`;

        renderChart();
        renderTable(displaySchedule);
        renderOpportunityCost();
        DOM.resultsSummary.classList.remove('hidden');
        DOM.tableSection.classList.remove('hidden');
    }

    function renderChart() {
        const isCompare = DOM.compareToggle.checked;
        const labels = standardSchedule.map(p => `Yr ${Math.ceil(p.month / 12)}`).filter((v, i, a) => a.indexOf(v) === i);

        const standardData = standardSchedule.map(p => p.balance);
        const acceleratedData = acceleratedSchedule.map(p => p.balance);
        
        const datasets = [{
            label: 'Loan Balance (Standard)',
            data: standardData,
            borderColor: '#1C768F',
            borderWidth: 3,
            fill: false,
            tension: 0.1,
            pointRadius: 0
        }];

        if (isCompare) {
            datasets.push({
                label: 'Loan Balance (Accelerated)',
                data: acceleratedData,
                borderColor: '#166534',
                borderWidth: 3,
                borderDash: [5, 5],
                fill: false,
                tension: 0.1,
                pointRadius: 0
            });
        }

        if (amortizationChart) {
            amortizationChart.destroy();
        }

        amortizationChart = new Chart(DOM.amortizationChart, {
            type: 'line',
            data: {
                labels: standardSchedule.map(p => p.month -1),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: value => window.mortgageUtils.formatCurrency(value, DOM.currency.value, 2) }
                    },
                    x: {
                         ticks: {
                            callback: function(value, index, values) {
                                const month = value + 1;
                                if (month % 12 === 0 && month > 0) {
                                    return `Year ${month / 12}`;
                                }
                                return undefined;
                            },
                             autoSkip: true,
                             maxRotation: 45,
                             minRotation: 0
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${window.mortgageUtils.formatCurrency(context.raw, DOM.currency.value, 2)}`
                        }
                    }
                }
            }
        });
    }

    function renderTable(schedule) {
        let html = '';
        schedule.forEach(p => {
            html += `
                <tr class="hover:bg-gray-50">
                    <td class="p-2">${p.month}</td>
                    <td class="p-2 text-right">${window.mortgageUtils.formatCurrency(p.payment, DOM.currency.value, 2)}</td>
                    <td class="p-2 text-right">${window.mortgageUtils.formatCurrency(p.principal, DOM.currency.value, 2)}</td>
                    <td class="p-2 text-right">${window.mortgageUtils.formatCurrency(p.interest, DOM.currency.value, 2)}</td>
                    <td class="p-2 text-right text-accent">${p.extraPayment > 0 ? window.mortgageUtils.formatCurrency(p.extraPayment, DOM.currency.value, 2) : '-'}</td>
                    <td class="p-2 text-right font-semibold">${window.mortgageUtils.formatCurrency(p.balance, DOM.currency.value, 2)}</td>
                </tr>
            `;
        });
        DOM.amortizationTableBody.innerHTML = html;
    }

    function validateInputs() {
        DOM.errorMessages.innerHTML = '';
        DOM.errorMessages.classList.add('hidden');
        let errors = [];
        const loanAmount = parseFloat(DOM.loanAmount.value);
        const interestRate = parseFloat(DOM.interestRate.value);
        const loanTerm = parseInt(DOM.loanTerm.value);
        const investmentReturn = parseFloat(DOM.investmentReturn.value);

        if (isNaN(loanAmount) || loanAmount <= 0) errors.push('Loan Principal must be a positive number.');
        if (isNaN(interestRate) || interestRate <= 0) errors.push('Interest Rate must be a positive number.');
        if (isNaN(loanTerm) || loanTerm <= 0) errors.push('Loan Term must be a positive number.');
        if (isNaN(investmentReturn) || investmentReturn < 0) errors.push('Investment Return must be a non-negative number.');
        
        if(errors.length > 0) {
            DOM.errorMessages.innerHTML = errors.join('<br>');
            DOM.errorMessages.classList.remove('hidden');
            return false;
        }
        return true;
    }
    
    function renderTermComparison(activeTerm) {
        if (!DOM.termComparisonChart) return;

        const loanAmount = parseFloat(DOM.loanAmount.value) || 300000;
        const interestRate = parseFloat(DOM.interestRate.value) || 6.5;
        const currency = DOM.currency.value;

        const terms = [15, 20, 30];
        const results = terms.map(term => {
            const { totalInterest, monthlyPayment } = calculateAmortization(loanAmount, interestRate, term, 0, 0, 0);
            return { term, totalInterest, monthlyPayment };
        });

        const activeResult = results.find(r => r.term == activeTerm);

        if (termComparisonChart) {
            termComparisonChart.destroy();
        }

        termComparisonChart = new Chart(DOM.termComparisonChart, {
            type: 'bar',
            data: {
                labels: results.map(r => `${r.term} Years`),
                datasets: [{
                    label: 'Total Interest Paid',
                    data: results.map(r => r.totalInterest),
                    backgroundColor: results.map(r => r.term == activeTerm ? '#166534' : '#a7f3d0'),
                    borderColor: '#166534',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Total Interest Paid by Loan Term' },
                    tooltip: { callbacks: { label: c => `Total Interest: ${window.mortgageUtils.formatCurrency(c.raw, currency)}` } }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => window.mortgageUtils.formatCurrency(v, currency) } }
                }
            }
        });

        if (activeResult) {
            const savingsComparedTo30 = results.find(r => r.term === 30).totalInterest - activeResult.totalInterest;
            DOM.termComparisonSummary.innerHTML = `
                A <strong>${activeResult.term}-year</strong> mortgage has a monthly payment of <strong>${window.mortgageUtils.formatCurrency(activeResult.monthlyPayment, currency, 2)}</strong>. 
                Compared to a 30-year term, you could save <strong>${window.mortgageUtils.formatCurrency(savingsComparedTo30, currency)}</strong> in interest over the life of the loan.
            `;
        }
    }
    
    function renderOpportunityCost() {
        const extraMonthly = parseFloat(DOM.extraMonthly.value) || 0;
        const oneTimePayment = parseFloat(DOM.oneTimePayment.value) || 0;

        if (extraMonthly <= 0 && oneTimePayment <= 0) {
            DOM.opportunityCostSection.classList.add('hidden');
            return;
        }
        DOM.opportunityCostSection.classList.remove('hidden');

        const investmentReturn = parseFloat(DOM.investmentReturn.value) / 100;
        const monthlyReturn = investmentReturn / 12;
        const payoffPeriod = acceleratedSchedule.length;

        let investmentValue = 0;
        const investmentData = [];
        acceleratedSchedule.forEach(p => {
            investmentValue *= (1 + monthlyReturn);
            investmentValue += p.extraPayment;
            if (p.month % 12 === 0 || p.month === payoffPeriod) {
                investmentData.push({x: p.month, y: investmentValue});
            }
        });
        
        const extraEquityData = [];
        for (let i = 0; i < payoffPeriod; i++) {
            const standardBalance = standardSchedule[i] ? standardSchedule[i].balance : 0;
            const acceleratedBalance = acceleratedSchedule[i].balance;
            const extraEquity = standardBalance - acceleratedBalance;
             if (acceleratedSchedule[i].month % 12 === 0 || acceleratedSchedule[i].month === payoffPeriod) {
                extraEquityData.push({x: acceleratedSchedule[i].month, y: extraEquity});
            }
        }
        
        const finalInvestmentValue = investmentValue;
        const finalExtraEquity = extraEquityData.length > 0 ? extraEquityData[extraEquityData.length - 1].y : 0;

        if (opportunityCostChart) opportunityCostChart.destroy();
        opportunityCostChart = new Chart(DOM.opportunityCostChart, {
            type: 'line',
            data: {
                datasets: [
                    { label: 'Investment Growth', data: investmentData, borderColor: '#166534', backgroundColor: 'rgba(22, 101, 52, 0.2)', fill: 'origin', tension: 0.1 },
                    { label: 'Extra Equity from Payments', data: extraEquityData, borderColor: '#1C768F', backgroundColor: 'rgba(28, 118, 143, 0.2)', fill: 'origin', tension: 0.1 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { type: 'linear', title: { display: true, text: 'Months' } },
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
            summaryHTML = `By investing your extra payments, you could potentially have <strong>${window.mortgageUtils.formatCurrency(difference, DOM.currency.value)} more</strong> in net worth by the time your mortgage is paid off.`;
        } else {
            summaryHTML = `By making extra payments on your mortgage, you are <strong>${window.mortgageUtils.formatCurrency(Math.abs(difference), DOM.currency.value)} ahead</strong> compared to investing.`;
        }
        DOM.opportunityCostSummary.innerHTML = summaryHTML;
    }


    // --- Event Handlers ---
    function handleCalculate() {
        if (!validateInputs()) return;

        const loanAmount = parseFloat(DOM.loanAmount.value);
        const interestRate = parseFloat(DOM.interestRate.value);
        const loanTerm = parseInt(DOM.loanTerm.value);
        const extraMonthly = parseFloat(DOM.extraMonthly.value) || 0;
        const oneTimePayment = parseFloat(DOM.oneTimePayment.value) || 0;
        const oneTimePaymentMonth = parseInt(DOM.oneTimePaymentMonth.value) || 0;
        
        const standardResult = calculateAmortization(loanAmount, interestRate, loanTerm, 0, 0, 0);
        standardSchedule = standardResult.schedule;

        const acceleratedResult = calculateAmortization(loanAmount, interestRate, loanTerm, extraMonthly, oneTimePayment, oneTimePaymentMonth);
        acceleratedSchedule = acceleratedResult.schedule;

        renderResults();
        renderTermComparison(loanTerm); // Also update the comparison chart
    }

    function downloadPDF() {
        if (typeof jsPDF === 'undefined') return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const schedule = DOM.compareToggle.checked ? acceleratedSchedule : standardSchedule;
        
        doc.setFontSize(18);
        doc.text("Mortgage Amortisation Schedule", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        
        const head = [['Month', 'Payment', 'Principal', 'Interest', 'Extra', 'Balance']];
        const body = schedule.map(p => [
            p.month,
            window.mortgageUtils.formatCurrency(p.payment, DOM.currency.value, 2),
            window.mortgageUtils.formatCurrency(p.principal, DOM.currency.value, 2),
            window.mortgageUtils.formatCurrency(p.interest, DOM.currency.value, 2),
            window.mortgageUtils.formatCurrency(p.extraPayment, DOM.currency.value, 2),
            window.mortgageUtils.formatCurrency(p.balance, DOM.currency.value, 2)
        ]);
        
        doc.autoTable({
            startY: 30,
            head: head,
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [28, 118, 143] },
        });

        doc.save('amortisation_schedule.pdf');
    }

    function downloadCSV() {
        const schedule = DOM.compareToggle.checked ? acceleratedSchedule : standardSchedule;
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Month,Payment,Principal,Interest,Extra Payment,Ending Balance\n";
        schedule.forEach(p => {
            const row = [p.month, p.payment, p.principal, p.interest, p.extraPayment, p.balance].join(",");
            csvContent += row + "\n";
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "amortisation_schedule.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    function renderExampleChart() {
        if (!DOM.exampleAmortizationChart) return;
        const schedule = calculateAmortization(300000, 6.5, 30, 0, 0, 0).schedule;
        const principalData = [];
        const interestData = [];
        let cumulativePrincipal = 0;
        let cumulativeInterest = 0;
        
        schedule.forEach(p => {
            cumulativePrincipal += p.principal;
            cumulativeInterest += p.interest;
            if (p.month % 12 === 0) { // Plot one point per year
                principalData.push(cumulativePrincipal);
                interestData.push(cumulativeInterest);
            }
        });

        const labels = Array.from({ length: 30 }, (_, i) => `Year ${i + 1}`);

        if (exampleChart) exampleChart.destroy();
        exampleChart = new Chart(DOM.exampleAmortizationChart, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Interest Paid',
                    data: interestData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    fill: 'origin',
                    tension: 0.4,
                }, {
                    label: 'Total Principal Paid',
                    data: principalData,
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(22, 163, 74, 0.2)',
                    fill: 'origin',
                    tension: 0.4,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { callback: (value) => window.mortgageUtils.formatCurrency(value, 'USD') } } },
                plugins: { tooltip: { mode: 'index', intersect: false } }
            },
        });
    }

    function setupFaq() {
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            const chevron = item.querySelector('.faq-chevron');

            question.addEventListener('click', () => {
                const isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';
                
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.querySelector('.faq-answer').style.maxHeight = '0px';
                        otherItem.querySelector('.faq-chevron').classList.remove('rotate-180');
                    }
                });

                if (isOpen) {
                    answer.style.maxHeight = '0px';
                    chevron.classList.remove('rotate-180');
                } else {
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    chevron.classList.add('rotate-180');
                }
            });
        });
    }

    // --- Initialization ---
    function init() {
        // Link sliders with number inputs
        syncSliderAndInput(DOM.loanAmountSlider, DOM.loanAmount);
        syncSliderAndInput(DOM.interestRateSlider, DOM.interestRate);
        syncSliderAndInput(DOM.loanTermSlider, DOM.loanTerm);

        DOM.calculateBtn.addEventListener('click', handleCalculate);
        
        // Add listeners for other inputs to recalculate on change
        [DOM.extraMonthly, DOM.oneTimePayment, DOM.oneTimePaymentMonth, DOM.propertyTax, DOM.homeInsurance, DOM.investmentReturn].forEach(el => {
            el.addEventListener('input', handleCalculate);
        });

        DOM.compareToggle.addEventListener('change', renderResults);
        DOM.downloadPDF.addEventListener('click', downloadPDF);
        DOM.downloadCSV.addEventListener('click', downloadCSV);
        DOM.currency.addEventListener('change', () => {
            updateCurrencySymbols();
            if (standardSchedule.length > 0) { // Re-render if results are visible
                handleCalculate();
            }
        });
        
        DOM.termTabsContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.term-tab');
            if (!button) return;

            DOM.termTabsContainer.querySelectorAll('.term-tab').forEach(tab => tab.classList.remove('active'));
            button.classList.add('active');
            const term = button.dataset.term;
            renderTermComparison(term);
        });

        updateCurrencySymbols(); // Initial call
        handleCalculate(); // Initial calculation on page load
        renderExampleChart();
        setupFaq();
    }

    init();
});
