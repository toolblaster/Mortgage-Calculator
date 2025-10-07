document.addEventListener('DOMContentLoaded', function () {
    // --- DOM Element Cache ---
    const DOM = {
        loanAmount: document.getElementById('loanAmount'),
        interestRate: document.getElementById('interestRate'),
        loanTerm: document.getElementById('loanTerm'),
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
        currencySymbolSmalls: document.querySelectorAll('.currency-symbol-small')
    };

    let amortizationChart = null;
    let standardSchedule = [], acceleratedSchedule = [];

    // --- Helper Functions ---
    const formatCurrency = (amount) => {
        const currency = DOM.currency.value || 'USD';
        const locale = ['EUR', 'GBP'].includes(currency) ? 'de-DE' : 'en-US';
        return new Intl.NumberFormat(locale, { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(amount);
    };

    const updateCurrencySymbols = () => {
        const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$' };
        const symbol = symbols[DOM.currency.value] || '$';
        if (DOM.currencySymbol) DOM.currencySymbol.textContent = symbol;
        DOM.currencySymbolSmalls.forEach(span => span.textContent = symbol);
    };

    // --- Core Calculation Logic ---
    function calculateAmortization(loanAmount, annualRate, years, extraMonthly, oneTimePayment, oneTimePaymentMonth) {
        const monthlyRate = annualRate / 12 / 100;
        const totalMonths = years * 12;
        const monthlyPayment = (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths));

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

            if (balance < monthlyPayment + currentExtra) {
                principal = balance - interest;
                currentExtra = 0; // No extra payment if the balance is less than a regular payment
            }
            
            let principalPaid = principal + currentExtra;
            if (balance < principalPaid) {
                principalPaid = balance;
            }
            
            balance -= principalPaid;
            totalInterest += interest;

            schedule.push({
                month,
                payment: monthlyPayment,
                principal: principalPaid - currentExtra,
                interest,
                extraPayment: currentExtra,
                balance: balance > 0 ? balance : 0
            });
        }
        return { schedule, monthlyPayment, totalInterest };
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
        const totalMonthly = displaySchedule[0].payment + (tax / 12) + (insurance / 12) + (isCompare ? parseFloat(DOM.extraMonthly.value) || 0 : 0);
        
        DOM.monthlyPayment.textContent = formatCurrency(totalMonthly);
        DOM.totalInterest.textContent = formatCurrency(isCompare ? acceleratedTotalInterest : standardTotalInterest);

        const payoff = new Date();
        payoff.setMonth(payoff.getMonth() + displaySchedule.length);
        DOM.payoffDate.textContent = payoff.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        const saved = standardTotalInterest - acceleratedTotalInterest;
        DOM.interestSaved.textContent = formatCurrency(saved > 0 ? saved : 0);

        const progress = (1 - (displaySchedule[displaySchedule.length - 1].balance / parseFloat(DOM.loanAmount.value))) * 100;
        DOM.progressBar.style.width = `${progress}%`;
        DOM.progressText.textContent = `${Math.round(progress)}% Paid`;

        renderChart();
        renderTable(displaySchedule);
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
                labels: standardSchedule.map(p => p.month),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: value => formatCurrency(value) }
                    },
                    x: {
                         ticks: {
                            callback: function(value, index, values) {
                                // Display label for every 12 months (1 year)
                                return (value + 1) % 12 === 0 ? `Year ${(value + 1) / 12}` : null;
                            },
                             autoSkip: false,
                             maxRotation: 0,
                             minRotation: 0
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
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
                    <td class="p-2 text-right">${formatCurrency(p.payment)}</td>
                    <td class="p-2 text-right">${formatCurrency(p.principal)}</td>
                    <td class="p-2 text-right">${formatCurrency(p.interest)}</td>
                    <td class="p-2 text-right text-accent">${p.extraPayment > 0 ? formatCurrency(p.extraPayment) : '-'}</td>
                    <td class="p-2 text-right font-semibold">${formatCurrency(p.balance)}</td>
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

        if (isNaN(loanAmount) || loanAmount <= 0) errors.push('Loan Principal must be a positive number.');
        if (isNaN(interestRate) || interestRate <= 0) errors.push('Interest Rate must be a positive number.');
        if (isNaN(loanTerm) || loanTerm <= 0) errors.push('Loan Term must be a positive number.');
        
        if(errors.length > 0) {
            DOM.errorMessages.innerHTML = errors.join('<br>');
            DOM.errorMessages.classList.remove('hidden');
            return false;
        }
        return true;
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
    }

    function downloadPDF() {
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
            formatCurrency(p.payment),
            formatCurrency(p.principal),
            formatCurrency(p.interest),
            formatCurrency(p.extraPayment),
            formatCurrency(p.balance)
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

    // --- Initialization ---
    DOM.calculateBtn.addEventListener('click', handleCalculate);
    DOM.compareToggle.addEventListener('change', renderResults);
    DOM.downloadPDF.addEventListener('click', downloadPDF);
    DOM.downloadCSV.addEventListener('click', downloadCSV);
    DOM.currency.addEventListener('change', () => {
        updateCurrencySymbols();
        if (standardSchedule.length > 0) { // Re-render if results are visible
            renderResults();
        }
    });

    updateCurrencySymbols(); // Initial call
    handleCalculate(); // Initial calculation on page load
});
