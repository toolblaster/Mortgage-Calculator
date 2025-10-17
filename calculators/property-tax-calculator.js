document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Element Cache ---
    const DOM = {
        propertyValue: document.getElementById('propertyValue'),
        propertyValueSlider: document.getElementById('propertyValueSlider'),
        currency: document.getElementById('currency'),
        locationSelect: document.getElementById('location'),
        manualRate: document.getElementById('manualRate'),
        saveScenarioBtn: document.getElementById('saveScenarioBtn'),
        saveFeedback: document.getElementById('saveFeedback'),

        // Currency Symbols
        currencySymbol: document.getElementById('currency-symbol'),

        // Results
        annualTax: document.getElementById('annualTax'),
        monthlyTax: document.getElementById('monthlyTax'),
        effectiveRate: document.getElementById('effectiveRate'),
    };

    let taxPieChart = null;

    // Data: Average effective property tax rates by US state
    const stateTaxRates = {
        "AL": 0.41, "AK": 1.18, "AZ": 0.62, "AR": 0.61, "CA": 0.76, "CO": 0.51, "CT": 2.14, "DE": 0.57, "FL": 0.89, 
        "GA": 0.92, "HI": 0.28, "ID": 0.65, "IL": 2.27, "IN": 0.85, "IA": 1.53, "KS": 1.41, "KY": 0.86, "LA": 0.55, 
        "ME": 1.30, "MD": 1.09, "MA": 1.23, "MI": 1.54, "MN": 1.12, "MS": 0.79, "MO": 0.97, "MT": 0.83, "NE": 1.73, 
        "NV": 0.60, "NH": 2.18, "NJ": 2.49, "NM": 0.80, "NY": 1.72, "NC": 0.77, "ND": 0.98, "OH": 1.57, "OK": 0.87, 
        "OR": 1.00, "PA": 1.58, "RI": 1.63, "SC": 0.57, "SD": 1.22, "TN": 0.64, "TX": 1.80, "UT": 0.58, "VT": 1.90, 
        "VA": 0.82, "WA": 0.93, "WV": 0.59, "WI": 1.85, "WY": 0.61
    };

    const stateNames = {
        "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", 
        "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", 
        "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", 
        "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", 
        "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", 
        "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming"
    };

    // --- Helper Functions ---
    function animateValue(el, endValue, duration = 500, isPercent = false) {
        if (!el) return;
        let startValue = parseFloat(el.dataset.value) || 0;
        el.dataset.value = endValue;
        let startTime = null;
        const currency = DOM.currency.value;

        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const currentValue = startValue + (endValue - startValue) * progress;
            
            if (isPercent) {
                el.textContent = `${currentValue.toFixed(2)}%`;
            } else {
                el.textContent = window.mortgageUtils.formatCurrency(currentValue, currency);
            }

            if (progress < 1) requestAnimationFrame(animation);
            else {
                 if (isPercent) {
                    el.textContent = `${endValue.toFixed(2)}%`;
                } else {
                    el.textContent = window.mortgageUtils.formatCurrency(endValue, currency);
                }
            }
        }
        requestAnimationFrame(animation);
    }
    
    function updateSliderFill(slider) {
        if (!slider) return;
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 100;
        const val = parseFloat(slider.value) || 0;
        const percentage = ((val - min) * 100) / (max - min);
        slider.style.background = `linear-gradient(to right, #2C98C2 ${percentage}%, #e5e7eb ${percentage}%)`;
    }

    function updateCurrencySymbols() {
        const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$' };
        const symbol = symbols[DOM.currency.value] || '$';
        if (DOM.currencySymbol) DOM.currencySymbol.textContent = symbol;
    }

    // --- Core Calculation & Rendering ---
    function calculateAndRender() {
        const propertyValue = parseFloat(DOM.propertyValue.value) || 0;
        const manualRate = parseFloat(DOM.manualRate.value);
        const selectedState = DOM.locationSelect.value;
        
        let taxRate = 0;

        if (!isNaN(manualRate) && manualRate > 0) {
            taxRate = manualRate;
            // If user types a manual rate, deselect the state
            DOM.locationSelect.value = "";
        } else if (selectedState && stateTaxRates[selectedState]) {
            taxRate = stateTaxRates[selectedState];
        }

        const annualTaxValue = propertyValue * (taxRate / 100);
        const monthlyTaxValue = annualTaxValue / 12;

        animateValue(DOM.annualTax, annualTaxValue);
        animateValue(DOM.monthlyTax, monthlyTaxValue);
        animateValue(DOM.effectiveRate, taxRate, 500, true);

        renderChart(propertyValue, annualTaxValue);
    }
    
    function renderChart(propertyValue, annualTax) {
        const ctx = document.getElementById('taxPieChart').getContext('2d');
        if (taxPieChart) taxPieChart.destroy();
        
        // To make the tax portion visible even if it's small, we can ensure a minimum percentage for display
        const totalForChart = propertyValue + annualTax;
        const taxPercentage = totalForChart > 0 ? (annualTax / totalForChart) * 100 : 0;

        taxPieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Property Value', 'Annual Tax'],
                datasets: [{
                    data: [propertyValue, annualTax],
                    backgroundColor: ['#1C768F', '#ef4444'],
                    borderColor: '#ffffff',
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

    // --- Event Listeners & UI Logic ---
    function setupEventListeners() {
        const inputs = [DOM.propertyValue, DOM.propertyValueSlider, DOM.locationSelect, DOM.manualRate];
        inputs.forEach(input => input.addEventListener('input', calculateAndRender));

        DOM.currency.addEventListener('input', () => {
            updateCurrencySymbols();
            calculateAndRender();
        });

        // Sync Property Value slider and input
        DOM.propertyValueSlider.addEventListener('input', (e) => DOM.propertyValue.value = e.target.value);
        DOM.propertyValue.addEventListener('input', (e) => DOM.propertyValueSlider.value = e.target.value);

        // Update slider fills
        [DOM.propertyValueSlider].forEach(slider => {
            slider.addEventListener('input', () => updateSliderFill(slider));
            document.getElementById(slider.id.replace('Slider', '')).addEventListener('input', () => updateSliderFill(slider));
        });
        
        // FAQ Accordion
        document.querySelectorAll('.faq-question').forEach(button => {
            button.addEventListener('click', () => {
                const answer = button.nextElementSibling;
                const chevron = button.querySelector('.faq-chevron');
                const isOpen = button.getAttribute('aria-expanded') === 'true';

                button.setAttribute('aria-expanded', !isOpen);
                if (isOpen) {
                    answer.style.maxHeight = null;
                } else {
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                }
            });
        });

        // Save & Share
        DOM.saveScenarioBtn.addEventListener('click', () => {
            const params = new URLSearchParams({
                pv: DOM.propertyValue.value,
                loc: DOM.locationSelect.value,
                mr: DOM.manualRate.value,
                cur: DOM.currency.value,
            });
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.pushState({ path: newUrl }, '', newUrl);
            DOM.saveFeedback.textContent = 'Scenario saved to URL! You can copy it.';
            setTimeout(() => { DOM.saveFeedback.textContent = ''; }, 3000);
        });
    }

    // --- Initialization ---
    function populateStates() {
        const sortedStates = Object.keys(stateNames).sort((a, b) => stateNames[a].localeCompare(stateNames[b]));
        sortedStates.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${stateNames[key]} (~${stateTaxRates[key]}%)`;
            DOM.locationSelect.appendChild(option);
        });
    }

    function init() {
        populateStates();
        
        const params = new URLSearchParams(window.location.search);
        if (params.has('pv')) {
            DOM.propertyValue.value = params.get('pv');
            DOM.locationSelect.value = params.get('loc') || '';
            DOM.manualRate.value = params.get('mr') || '';
            DOM.currency.value = params.get('cur') || 'USD';
            
            // Sync slider from URL
            DOM.propertyValueSlider.value = params.get('pv');
        }

        setupEventListeners();
        updateCurrencySymbols();
        updateSliderFill(DOM.propertyValueSlider);
        calculateAndRender();
    }

    init();
});
