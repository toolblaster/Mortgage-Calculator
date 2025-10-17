document.addEventListener('DOMContentLoaded', function() {
    const DOM = {
        homePrice: document.getElementById('homePrice'),
        homePriceSlider: document.getElementById('homePriceSlider'),
        downPaymentInput: document.getElementById('downPaymentInput'),
        downPaymentSlider: document.getElementById('downPaymentSlider'),
        dpTypePercent: document.getElementById('dpTypePercent'),
        dpTypeAmount: document.getElementById('dpTypeAmount'),
        loanTerm: document.getElementById('loanTerm'),
        currency: document.getElementById('currency'),
        location: document.getElementById('location'),
        typePurchase: document.getElementById('typePurchase'),
        typeRefinance: document.getElementById('typeRefinance'),
        saveScenarioBtn: document.getElementById('saveScenarioBtn'),
        saveFeedback: document.getElementById('saveFeedback'),
        currencySymbol: document.getElementById('currency-symbol'),
        totalClosingCosts: document.getElementById('totalClosingCosts'),
        closingCostsPercent: document.getElementById('closingCostsPercent'),
        costBreakdownList: document.getElementById('cost-breakdown-list'),
        costsPieChart: document.getElementById('costsPieChart'),
    };

    let costsPieChart = null;
    let dpInputType = '%';
    let transactionType = 'purchase';

    // Data source for estimations
    const costData = {
        lenderFees: {
            origination: 0.0075, // 0.75% of loan amount
            application: 400, // flat fee
            underwriting: 600, // flat fee
        },
        thirdPartyFees: {
            appraisal: 500,
            creditReport: 35,
            titleInsurance: 0.005, // 0.5% of loan amount
            attorney: 800,
            homeInspection: 450,
        },
        prepaids: {
            homeownersInsurance: 1200, // annual premium
            propertyTaxesMonths: 4, // months to prepay
        },
        stateTaxes: {
            // Average transfer tax rates (as a decimal)
            "AL": 0.001, "AK": 0, "AZ": 0, "AR": 0.0033, "CA": 0.0011, "CO": 0.0001, "CT": 0.0075, "DE": 0.04, "FL": 0.007, "GA": 0.001,
            "HI": 0.001, "ID": 0, "IL": 0.0015, "IN": 0, "IA": 0.0008, "KS": 0, "KY": 0.001, "LA": 0, "ME": 0.0022, "MD": 0.015,
            "MA": 0.00456, "MI": 0.0075, "MN": 0.0023, "MS": 0, "MO": 0, "MT": 0, "NE": 0.00225, "NV": 0.0019, "NH": 0.015, "NJ": 0.01,
            "NM": 0, "NY": 0.004, "NC": 0.002, "ND": 0, "OH": 0.001, "OK": 0.0015, "OR": 0, "PA": 0.01, "RI": 0.004, "SC": 0.00185,
            "SD": 0.0015, "TN": 0.0037, "TX": 0, "UT": 0, "VT": 0.0125, "VA": 0.0025, "WA": 0.0128, "WV": 0.0011, "WI": 0.003, "WY": 0
        },
        states: ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"]
    };

    function calculateAndRender() {
        const homePrice = parseFloat(DOM.homePrice.value) || 0;
        const dpValue = parseFloat(DOM.downPaymentInput.value) || 0;
        const selectedState = DOM.location.value;

        let downPaymentAmount = (dpInputType === '%') ? homePrice * (dpValue / 100) : dpValue;
        if (transactionType === 'refinance') downPaymentAmount = 0; // No down payment in a refi
        
        const loanAmount = homePrice - downPaymentAmount;

        let totalCosts = 0;
        const breakdown = {
            lender: 0,
            thirdParty: 0,
            prepaids: 0
        };

        // Lender Fees
        breakdown.lender += loanAmount * costData.lenderFees.origination;
        breakdown.lender += costData.lenderFees.application;
        breakdown.lender += costData.lenderFees.underwriting;

        // Third-Party Fees
        breakdown.thirdParty += costData.thirdPartyFees.appraisal;
        breakdown.thirdParty += costData.thirdPartyFees.creditReport;
        breakdown.thirdParty += loanAmount * costData.thirdPartyFees.titleInsurance;
        breakdown.thirdParty += costData.thirdPartyFees.attorney;
        if (transactionType === 'purchase') {
            breakdown.thirdParty += costData.thirdPartyFees.homeInspection;
        }

        // Government Fees (Transfer Tax)
        if (transactionType === 'purchase' && selectedState && costData.stateTaxes[selectedState] > 0) {
            breakdown.thirdParty += homePrice * costData.stateTaxes[selectedState];
        }

        // Prepaids
        breakdown.prepaids += costData.prepaids.homeownersInsurance;
        const annualPropertyTax = homePrice * 0.0125; // National average estimate
        breakdown.prepaids += (annualPropertyTax / 12) * costData.prepaids.propertyTaxesMonths;

        totalCosts = breakdown.lender + breakdown.thirdParty + breakdown.prepaids;
        
        // Render results
        DOM.totalClosingCosts.textContent = window.mortgageUtils.formatCurrency(totalCosts, DOM.currency.value);
        DOM.totalClosingCosts.dataset.value = totalCosts;
        
        const percentOfLoan = loanAmount > 0 ? (totalCosts / loanAmount) * 100 : 0;
        DOM.closingCostsPercent.textContent = `~${percentOfLoan.toFixed(2)}% of Loan Amount`;
        DOM.closingCostsPercent.dataset.value = percentOfLoan;

        // Render breakdown list
        DOM.costBreakdownList.innerHTML = `
            <li class="flex justify-between items-center py-1">
                <span class="font-semibold text-secondary">Lender Fees</span>
                <span class="font-bold">${window.mortgageUtils.formatCurrency(breakdown.lender, DOM.currency.value)}</span>
            </li>
            <li class="flex justify-between items-center py-1">
                <span class="font-semibold text-accent">Third-Party Fees</span>
                <span class="font-bold">${window.mortgageUtils.formatCurrency(breakdown.thirdParty, DOM.currency.value)}</span>
            </li>
            <li class="flex justify-between items-center py-1">
                <span class="font-semibold text-primary">Prepaids & Escrow</span>
                <span class="font-bold">${window.mortgageUtils.formatCurrency(breakdown.prepaids, DOM.currency.value)}</span>
            </li>
        `;

        renderChart(breakdown);
    }

    function renderChart(breakdown) {
        if (costsPieChart) {
            costsPieChart.destroy();
        }
        costsPieChart = new Chart(DOM.costsPieChart, {
            type: 'doughnut',
            data: {
                labels: ['Lender Fees', 'Third-Party Fees', 'Prepaids & Escrow'],
                datasets: [{
                    data: [breakdown.lender, breakdown.thirdParty, breakdown.prepaids],
                    backgroundColor: ['#b45309', '#166534', '#1C768F'],
                    borderColor: '#f9fafb',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: c => `${c.label}: ${window.mortgageUtils.formatCurrency(c.raw, DOM.currency.value)}` } }
                }
            }
        });
    }

    function setupEventListeners() {
        const inputs = [DOM.homePrice, DOM.homePriceSlider, DOM.downPaymentInput, DOM.downPaymentSlider, DOM.loanTerm, DOM.location, DOM.currency];
        inputs.forEach(input => input.addEventListener('input', () => {
            updateSliderFill(DOM.homePriceSlider);
            updateSliderFill(DOM.downPaymentSlider);
            calculateAndRender();
        }));

        DOM.typePurchase.addEventListener('click', () => setTransactionType('purchase'));
        DOM.typeRefinance.addEventListener('click', () => setTransactionType('refinance'));

        function setTransactionType(type) {
            transactionType = type;
            if (type === 'purchase') {
                DOM.typePurchase.classList.add('bg-primary', 'text-white');
                DOM.typeRefinance.classList.remove('bg-primary', 'text-white');
                DOM.typeRefinance.classList.add('text-gray-600');
                DOM.downPaymentInput.disabled = false;
                DOM.downPaymentSlider.disabled = false;
            } else {
                DOM.typeRefinance.classList.add('bg-primary', 'text-white');
                DOM.typePurchase.classList.remove('bg-primary', 'text-white');
                DOM.typePurchase.classList.add('text-gray-600');
                DOM.downPaymentInput.disabled = true;
                DOM.downPaymentSlider.disabled = true;
            }
            calculateAndRender();
        }

        function setDpType(type) {
            const previousType = dpInputType;
            dpInputType = type;
            const homePrice = parseFloat(DOM.homePrice.value) || 0;
            const dpInputVal = parseFloat(DOM.downPaymentInput.value) || 0;

            if (type === '%' && previousType === '$') {
                DOM.dpTypePercent.classList.add('bg-primary', 'text-white');
                DOM.dpTypeAmount.classList.remove('bg-primary', 'text-white');
                DOM.dpTypeAmount.classList.add('text-gray-600');
                
                DOM.downPaymentSlider.min = "0";
                DOM.downPaymentSlider.max = "50";
                DOM.downPaymentSlider.step = "0.5";
                if(dpInputVal > 0 && homePrice > 0){
                    const newPercent = Math.min(50, (dpInputVal / homePrice) * 100);
                    DOM.downPaymentInput.value = newPercent.toFixed(1);
                    DOM.downPaymentSlider.value = newPercent.toFixed(1);
                }

            } else if (type === '$' && previousType === '%') {
                DOM.dpTypeAmount.classList.add('bg-primary', 'text-white');
                DOM.dpTypePercent.classList.remove('bg-primary', 'text-white');
                DOM.dpTypePercent.classList.add('text-gray-600');
                
                DOM.downPaymentSlider.min = "0";
                DOM.downPaymentSlider.max = homePrice * 0.5;
                DOM.downPaymentSlider.step = "500";
                
                const newAmount = Math.round((homePrice * (dpInputVal / 100)) / 500) * 500;
                DOM.downPaymentInput.value = newAmount;
                DOM.downPaymentSlider.value = newAmount;
            }
            updateSliderFill(DOM.downPaymentSlider);
            calculateAndRender();
        }
        DOM.dpTypePercent.addEventListener('click', () => setDpType('%'));
        DOM.dpTypeAmount.addEventListener('click', () => setDpType('$'));

        DOM.homePriceSlider.addEventListener('input', (e) => DOM.homePrice.value = e.target.value);
        DOM.homePrice.addEventListener('input', (e) => DOM.homePriceSlider.value = e.target.value);
        DOM.downPaymentSlider.addEventListener('input', (e) => DOM.downPaymentInput.value = e.target.value);
        DOM.downPaymentInput.addEventListener('input', (e) => DOM.downPaymentSlider.value = e.target.value);
        
        DOM.saveScenarioBtn.addEventListener('click', () => {
            const params = new URLSearchParams({
                hp: DOM.homePrice.value,
                dp: DOM.downPaymentInput.value,
                dpt: dpInputType,
                lt: DOM.loanTerm.value,
                loc: DOM.location.value,
                cur: DOM.currency.value,
                type: transactionType,
            });
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.pushState({ path: newUrl }, '', newUrl);
            DOM.saveFeedback.textContent = 'Scenario saved to URL! You can copy it.';
            setTimeout(() => { DOM.saveFeedback.textContent = ''; }, 3000);
        });

        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            question.addEventListener('click', () => {
                const isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';
                if (isOpen) {
                    answer.style.maxHeight = '0px';
                    question.setAttribute('aria-expanded', 'false');
                } else {
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    question.setAttribute('aria-expanded', 'true');
                }
            });
        });
    }

    function init() {
        costData.states.forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            DOM.location.appendChild(option);
        });
        
        const params = new URLSearchParams(window.location.search);
        if (params.has('hp')) {
            DOM.homePrice.value = params.get('hp');
            DOM.downPaymentInput.value = params.get('dp');
            DOM.loanTerm.value = params.get('lt');
            DOM.location.value = params.get('loc');
            DOM.currency.value = params.get('cur') || 'USD';
            transactionType = params.get('type') || 'purchase';
            dpInputType = params.get('dpt') || '%';

            DOM.homePriceSlider.value = DOM.homePrice.value;
            DOM.downPaymentSlider.value = DOM.downPaymentInput.value;
        }

        setupEventListeners();
        updateCurrencySymbols();
        updateSliderFill(DOM.homePriceSlider);
        updateSliderFill(DOM.downPaymentSlider);
        calculateAndRender();
    }
    
    function updateCurrencySymbols() {
        const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$' };
        const symbol = symbols[DOM.currency.value] || '$';
        if (DOM.currencySymbol) DOM.currencySymbol.textContent = symbol;
        if (DOM.dpTypeAmount) DOM.dpTypeAmount.textContent = symbol;
    }

     function updateSliderFill(slider) {
        if (!slider) return;
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 100;
        const val = parseFloat(slider.value) || 0;
        const percentage = ((val - min) * 100) / (max - min);
        slider.style.background = `linear-gradient(to right, #2C98C2 ${percentage}%, #e5e7eb ${percentage}%)`;
    }

    init();
});
