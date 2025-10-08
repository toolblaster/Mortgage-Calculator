/*
================================================
Strategic Mortgage Planner - Core Logic
Version: 2.0
Description: This file contains the primary, pure functions for all financial 
             calculations. It is completely decoupled from the DOM and UI, 
             making it scalable, testable, and easy to maintain.
================================================
*/

const PlannerCore = (function() {
    'use strict';

    /**
     * Calculates the periodic payment for a loan.
     * @param {number} principal - The total loan amount.
     * @param {number} annualRate - The annual interest rate (e.g., 6.5 for 6.5%).
     * @param {number} periodsPerYear - How many payments are made per year.
     * @param {number} totalPeriods - The total number of payments over the loan's life.
     * @returns {number} The calculated periodic payment.
     */
    function calculatePayment(principal, annualRate, periodsPerYear, totalPeriods) {
        if (principal <= 0) return 0;
        if (annualRate <= 0 || totalPeriods <= 0) {
            return principal / (totalPeriods > 0 ? totalPeriods : 1);
        }
        const periodicRate = (annualRate / 100) / periodsPerYear;
        const payment = principal * periodicRate / (1 - Math.pow(1 + periodicRate, -totalPeriods));
        return isFinite(payment) ? payment : 0;
    }

    // --- Internal helpers for the amortization generator ---

    function _handleAnnualUpdates(period, periodsPerYear, escalationFactor, periodicAppreciationRate, state) {
        if (period > 1 && (period - 1) % periodsPerYear === 0) {
            state.currentAnnualTax *= escalationFactor;
            state.currentAnnualInsurance *= escalationFactor;
            state.currentMonthlyHoa *= escalationFactor;
        }
        if (period > 1) {
            state.currentPropertyValue *= (1 + periodicAppreciationRate);
        }
        return state;
    }

    function _handleRefinancing(period, refiPeriod, refiClosingCosts, refiRate, refiTerm, periodsPerYear, state) {
        if (!state.hasRefinanced && refiPeriod > 0 && period >= refiPeriod) {
            if (state.currentBalance > 0) state.currentBalance += refiClosingCosts;
            state.currentRate = refiRate / 100;
            state.totalPeriodsRemaining = Math.max(0, refiTerm * periodsPerYear);
            state.standardPayment = calculatePayment(state.currentBalance, state.currentRate * 100, periodsPerYear, state.totalPeriodsRemaining);
            state.hasRefinanced = true;
        }
        return state;
    }
    
    function _calculatePmiForPeriod(state, pmiRate, periodsPerYear, pmiStopThreshold) {
        let pmiPayment = 0;
        let pmiDropPeriod = state.pmiDropPeriod;
        if (state.isPMIActive) {
            pmiPayment = state.currentBalance * (pmiRate / periodsPerYear);
            if (state.currentBalance <= pmiStopThreshold) {
                state.isPMIActive = false;
                pmiDropPeriod = state.period;
            }
        }
        return { pmiPayment, pmiDropPeriod, isPMIActive: state.isPMIActive };
    }

    function _applyPaymentsForPeriod(state, params) {
        const { extraPaymentPerPeriod, lumpSumAmount, lumpSumPeriod, periodsPerYear } = params;
        const { currentBalance, standardPayment, period, currentRate } = state;
        const interest = currentBalance * (currentRate / periodsPerYear);
        let pniPayment = standardPayment;
        if (currentBalance < standardPayment) pniPayment = currentBalance + interest;
        else if (pniPayment <= interest) pniPayment = interest + 1;
        let principalFromPni = pniPayment - interest;
        let extraPrincipal = extraPaymentPerPeriod;
        if (lumpSumAmount > 0 && period === lumpSumPeriod) extraPrincipal += lumpSumAmount;
        let totalPrincipalPaid = principalFromPni + extraPrincipal;
        if (currentBalance < totalPrincipalPaid) {
            totalPrincipalPaid = currentBalance;
            principalFromPni = Math.max(0, totalPrincipalPaid - extraPrincipal);
        }
        return {
            interest: Math.max(0, interest),
            principalFromPni: Math.max(0, principalFromPni),
            extraPrincipal,
            totalPrincipalPaid: Math.max(0, totalPrincipalPaid)
        };
    }
    
    function _createScheduleEntry(state, paymentDetails, pmiPayment, periodicDiscountRate, periodsPerYear) {
        const { period, currentPropertyValue, currentBalance, currentAnnualTax, currentAnnualInsurance, currentMonthlyHoa, currentRate } = state;
        const { interest, principalFromPni, extraPrincipal, totalPrincipalPaid } = paymentDetails;
        const pvInterest = interest / Math.pow(1 + periodicDiscountRate, period);
        const newBalance = Math.max(0, currentBalance - totalPrincipalPaid);
        const totalEquity = Math.max(0, currentPropertyValue - newBalance);
        const periodicPITI = (currentAnnualTax / periodsPerYear) + (currentAnnualInsurance / periodsPerYear) + currentMonthlyHoa + pmiPayment;
        return {
            entry: { period, interest: Math.max(0, interest), principalPaid: Math.max(0, totalPrincipalPaid), balance: newBalance, propertyValue: currentPropertyValue, totalEquity, pniPrincipal: Math.max(0, principalFromPni), extraPayment: extraPrincipal, pmi: pmiPayment, rate: currentRate * 100, periodicPITI, pvInterest },
            newBalance, pvInterest
        };
    }

    /**
     * The main engine for generating a detailed amortization schedule.
     * @param {object} params - A comprehensive object of all loan parameters.
     * @returns {object} An object containing the schedule and summary results.
     */
    function generateAmortization(params) {
        const { principal, annualRate, periodsPerYear, totalPeriods, extraPaymentPerPeriod, lumpSumAmount, lumpSumPeriod, initialLTV, pmiRate, refiPeriod, refiRate, refiTerm, refiClosingCosts, pitiEscalationRate, discountRate, appreciationRate, propertyTax, insurance, hoa } = params;
        const standardPaymentOriginal = calculatePayment(principal, annualRate * 100, periodsPerYear, totalPeriods);
        const initialPropertyValue = (initialLTV > 0 && initialLTV <= 100) ? principal / (initialLTV / 100) : principal;
        const pmiStopThreshold = 0.80 * initialPropertyValue;
        const escalationFactor = 1 + (pitiEscalationRate / 100);
        const periodicDiscountRate = discountRate / periodsPerYear;
        const periodicAppreciationRate = appreciationRate / periodsPerYear;
        let loanState = {
            currentBalance: principal, currentRate: annualRate, totalPeriodsRemaining: totalPeriods,
            standardPayment: standardPaymentOriginal, totalInterestPaid: 0, totalPVInterestPaid: 0,
            payoffPeriod: 0, pmiDropPeriod: null, amortizationSchedule: [],
            currentPropertyValue: initialPropertyValue, isPMIActive: (initialLTV > 80), hasRefinanced: false,
            currentAnnualTax: propertyTax, currentAnnualInsurance: insurance, currentMonthlyHoa: hoa,
        };
        for (let period = 1; loanState.currentBalance > 0 && period <= 50 * periodsPerYear; period++) {
            loanState.period = period;
            loanState = _handleAnnualUpdates(period, periodsPerYear, escalationFactor, periodicAppreciationRate, loanState);
            loanState = _handleRefinancing(period, refiPeriod, refiClosingCosts, refiRate, refiTerm, periodsPerYear, loanState);
            const paymentDetails = _applyPaymentsForPeriod(loanState, params);
            loanState.totalInterestPaid += paymentDetails.interest;
            const pmiResult = _calculatePmiForPeriod(loanState, pmiRate, periodsPerYear, pmiStopThreshold);
            loanState.isPMIActive = pmiResult.isPMIActive;
            loanState.pmiDropPeriod = pmiResult.pmiDropPeriod || loanState.pmiDropPeriod;
            const scheduleUpdate = _createScheduleEntry(loanState, paymentDetails, pmiResult.pmiPayment, periodicDiscountRate, periodsPerYear);
            loanState.currentBalance = scheduleUpdate.newBalance;
            loanState.totalPVInterestPaid += scheduleUpdate.pvInterest;
            loanState.amortizationSchedule.push(scheduleUpdate.entry);
            if (loanState.currentBalance <= 0) {
                loanState.payoffPeriod = period;
                break;
            }
        }
        return { schedule: loanState.amortizationSchedule, totalInterest: loanState.totalInterestPaid, totalPVInterest: loanState.totalPVInterestPaid, payoffPeriod: loanState.payoffPeriod, standardPayment: standardPaymentOriginal, firstPeriodPITI: loanState.amortizationSchedule.length > 0 ? loanState.amortizationSchedule[0].periodicPITI * (12 / periodsPerYear) : standardPaymentOriginal, pmiDropPeriod: loanState.pmiDropPeriod, finalPropertyValue: loanState.currentPropertyValue, finalEquity: Math.max(0, loanState.currentPropertyValue) };
    }

    /**
     * Calculates affordability based on income, debt, and desired DTI ratios.
     * @param {object} state - The current application state.
     * @returns {object} An object with affordable home price, loan amount, and payment breakdown.
     */
    function calculateAffordability(state) {
        const monthlyIncome = state.annualIncome / 12;
        const monthlyTax = state.propertyTax / 12; 
        const monthlyInsurance = state.insurance / 12;
        const maxPaymentFromFrontEnd = monthlyIncome * (state.desiredFrontEndDTI / 100);
        const maxPaymentFromBackEnd = (monthlyIncome * (state.desiredBackEndDTI / 100)) - state.nonMortgageDebt;
        const maxPITI = Math.min(maxPaymentFromFrontEnd, maxPaymentFromBackEnd);
        const maxPI = maxPITI - monthlyTax - monthlyInsurance;
        if (maxPI <= 0) return { homePrice: 0, loanAmount: 0, piti: 0, pi: 0, tax: 0, insurance: 0 };
        const monthlyRate = (state.interestRate/100) / 12;
        const loanAmount = maxPI * (1 - Math.pow(1 + monthlyRate, -(state.loanTerm * 12))) / monthlyRate;
        const homePrice = loanAmount + state.downPaymentAmount;
        return { homePrice, loanAmount, piti: maxPITI, pi: maxPI, tax: monthlyTax, insurance: monthlyInsurance };
    }

    /**
     * Calculates the financial outcomes of renting vs. buying over the loan term.
     * @param {object} state - The current application state.
     * @returns {object} An object comparing net worth outcomes and timelines.
     */
    function calculateRentVsBuy(state) {
        const homePrice = state.loanAmount / (state.initialLTV / 100); const downPayment = homePrice - state.loanAmount;
        const periodsPerYear = 12; const totalPeriods = state.loanTerm * periodsPerYear;
        const buyingParams = { principal: state.loanAmount, annualRate: state.interestRate / 100, periodsPerYear, totalPeriods, extraPaymentPerPeriod: 0, lumpSumAmount: 0, lumpSumPeriod: 0, initialLTV: state.initialLTV, pmiRate: state.pmiRate / 100, refiPeriod: 0, refiRate: 0, refiTerm: 0, refiClosingCosts: 0, pitiEscalationRate: state.pitiEscalationRate / 100, discountRate: state.discountRate / 100, appreciationRate: state.appreciationRate / 100, propertyTax: state.propertyTax, insurance: state.insurance, hoa: state.hoa };
        const buyingResults = generateAmortization(buyingParams);
        const buyingNetWorth = buyingResults.finalEquity - (buyingResults.finalPropertyValue * (state.sellingCosts / 100));
        let investmentPortfolio = downPayment + state.closingCosts; let currentMonthlyRent = state.monthlyRent;
        const monthlyInvestmentReturn = (state.investmentReturn/100) / 12;
        const totalMonthlyOwnershipCost = (buyingResults.standardPayment * (12 / periodsPerYear)) + (state.propertyTax / 12) + (state.insurance / 12) + state.hoa + ((homePrice * (state.annualMaintenance / 100)) / 12) + state.monthlyUtilities;
        let rentingTimeline = [], buyingTimeline = [];
        for (let i = 1; i <= totalPeriods; i++) {
            investmentPortfolio += (totalMonthlyOwnershipCost - currentMonthlyRent);
            investmentPortfolio *= (1 + monthlyInvestmentReturn);
            if (i % 12 === 0) currentMonthlyRent *= (1 + (state.rentIncrease/100));
            const year = Math.ceil(i / 12);
            if (i % 12 === 0 || i === totalPeriods) {
                rentingTimeline.push({ year: year, netWorth: investmentPortfolio });
                const buyingData = buyingResults.schedule[i - 1];
                if(buyingData) {
                    const currentBuyingNetWorth = buyingData.totalEquity - (buyingData.propertyValue * (state.sellingCosts/100));
                    buyingTimeline.push({ year: year, netWorth: currentBuyingNetWorth });
                }
            }
        }
        return { buyingNetWorth, rentingNetWorth: investmentPortfolio, rentingTimeline, buyingTimeline };
    }
    
    /**
     * Analyzes a refinance scenario.
     * @param {object} state - The current application state.
     * @returns {object} An object with savings details and break-even analysis.
     */
    function calculateRefinance(state) {
        const { originalLoanAmount, currentInterestRate, loanTerm, newInterestRate, newLoanTerm, newClosingCosts, loanStartDate } = state;
        const currentRate = currentInterestRate / 100;
        const newRate = newInterestRate / 100;
        const startDate = new Date(loanStartDate + '-01T00:00:00');
        const originalTotalPeriods = loanTerm * 12;
        const monthsPassed = (new Date().getFullYear() - startDate.getFullYear()) * 12 + (new Date().getMonth() - startDate.getMonth());
        
        if (monthsPassed >= originalTotalPeriods || monthsPassed < 0) return { monthlySavings: 0, breakEvenMonths: Infinity, lifetimeSavings: 0, savingsTimeline: [] };
        
        const periodicCurrentRate = currentRate / 12;
        const currentPayment = calculatePayment(originalLoanAmount, currentInterestRate, 12, originalTotalPeriods);
        
        let remainingBalance = originalLoanAmount;
        for (let i = 0; i < monthsPassed; i++) {
            const interest = remainingBalance * periodicCurrentRate;
            remainingBalance -= (currentPayment - interest);
        }
        
        const newTotalPeriods = newLoanTerm * 12;
        const newPayment = calculatePayment(remainingBalance, newInterestRate, 12, newTotalPeriods);
        const monthlySavings = currentPayment - newPayment;
        const breakEvenMonths = monthlySavings > 0 ? newClosingCosts / monthlySavings : Infinity;
        
        let remainingOldInterest = 0; let tempBalanceOld = remainingBalance;
        for (let i = 0; i < (originalTotalPeriods - monthsPassed); i++) {
            const interest = tempBalanceOld * periodicCurrentRate;
            remainingOldInterest += interest;
            tempBalanceOld -= (currentPayment - interest);
        }
        
        let totalNewInterest = 0; let tempBalanceNew = remainingBalance;
        const periodicNewRate = newRate / 12;
        for (let i = 0; i < newTotalPeriods; i++) {
            const interest = tempBalanceNew * periodicNewRate;
            totalNewInterest += interest;
            tempBalanceNew -= (newPayment - interest);
        }
        
        const lifetimeSavings = remainingOldInterest - (totalNewInterest + newClosingCosts);

        const savingsTimeline = [];
        const timelineMonths = Math.min(newTotalPeriods, 120);
        for (let i = 0; i <= timelineMonths; i++) {
            savingsTimeline.push({ month: i, savings: (monthlySavings * i) - newClosingCosts });
        }
        
        return { monthlySavings, breakEvenMonths, lifetimeSavings, savingsTimeline };
    }
    
    /**
     * Calculates the performance of a rental property investment.
     * @param {object} state - The current application state.
     * @returns {object} Key performance indicators like cash flow, cap rate, and ROI.
     */
    function calculateInvestment(state) {
        const { purchasePrice, investmentDownPayment, investmentInterestRate, investmentLoanTerm, investmentClosingCosts, monthlyRentalIncome, vacancyRate, propertyTaxes, propertyInsurance, maintenanceCosts, managementFee } = state;

        const downPaymentAmount = purchasePrice * (investmentDownPayment / 100);
        const loanAmount = purchasePrice - downPaymentAmount;
        const totalCashInvested = downPaymentAmount + investmentClosingCosts;
        const mortgagePayment = calculatePayment(loanAmount, investmentInterestRate, 12, investmentLoanTerm * 12);
        const grossOperatingIncome = monthlyRentalIncome * 12;
        const vacancyLoss = grossOperatingIncome * (vacancyRate / 100);
        const effectiveGrossIncome = grossOperatingIncome - vacancyLoss;
        const maintenance = effectiveGrossIncome * (maintenanceCosts / 100);
        const management = effectiveGrossIncome * (managementFee / 100);
        const operatingExpenses = propertyTaxes + propertyInsurance + maintenance + management;
        const netOperatingIncome = effectiveGrossIncome - operatingExpenses;
        const annualDebtService = mortgagePayment * 12;
        const annualCashFlow = netOperatingIncome - annualDebtService;
        const monthlyCashFlow = annualCashFlow / 12;
        const capRate = (netOperatingIncome / purchasePrice) * 100;
        const cashOnCashROI = (annualCashFlow / totalCashInvested) * 100;
        
        return {
            monthlyCashFlow,
            capRate: isFinite(capRate) ? capRate : 0,
            cashOnCashROI: isFinite(cashOnCashROI) ? cashOnCashROI : 0,
            income: effectiveGrossIncome / 12,
            p_i: mortgagePayment,
            taxes_ins: (propertyTaxes + propertyInsurance) / 12,
            other_exp: (maintenance + management) / 12
        };
    }

    // Publicly exposed methods
    return {
        generateAmortization,
        calculateAffordability,
        calculateRentVsBuy,
        calculateRefinance,
        calculateInvestment,
        calculatePayment,
    };

})();
