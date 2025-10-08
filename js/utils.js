/**
 * Shared Utility functions for mortgage calculations.
 * This avoids code duplication across different calculator files.
 */
window.mortgageUtils = {
    /**
     * Formats a number into a currency string.
     * @param {number} amount The number to format.
     * @param {string} currency The currency code (e.g., 'USD', 'GBP').
     * @param {number} fractionDigits The number of decimal places to show.
     * @returns {string} A formatted currency string.
     */
    formatCurrency: (amount, currency = 'USD', fractionDigits = 0) => {
        const locale = ['EUR', 'GBP'].includes(currency) ? 'de-DE' : 'en-US';
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        }).format(amount);
    },

    /**
     * Calculates the periodic payment for a loan.
     * @param {number} principal The total loan amount.
     * @param {number} annualRate The annual interest rate in percent (e.g., 5 for 5%).
     * @param {number} periodsPerYear The number of payments per year.
     * @param {number} totalPeriods The total number of payments over the life of the loan.
     * @returns {number} The calculated periodic payment amount.
     */
    calculatePayment: (principal, annualRate, periodsPerYear, totalPeriods) => {
        if (principal <= 0) return 0;
        if (annualRate <= 0 || totalPeriods <= 0) return principal / (totalPeriods > 0 ? totalPeriods : 1);
        const periodicRate = (annualRate / 100) / periodsPerYear;
        const payment = principal * periodicRate / (1 - Math.pow(1 + periodicRate, -totalPeriods));
        return isFinite(payment) ? payment : 0;
    }
};
