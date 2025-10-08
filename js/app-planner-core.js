/*
================================================
Strategic Mortgage Planner - Core Calculation Engine
================================================
This file contains the primary financial logic for all tabs
of the mortgage planner.
*/
(function() {
    'use strict';

    // --- Private Helper Functions ---
    // These are not exposed globally, keeping the main scope clean.
    function handleAnnualUpdates(period, periodsPerYear, escalationFactor, periodicAppreciationRate, state) {
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

    function handleRefinancing(period, refiPeriod, refiClosingCosts, refiRate, refiTerm, periodsPerYear, state) {
        if (!state.hasRefinanced && refiPeriod > 0 && period >= refiPeriod) {
            if (state.currentBalance > 0) state.currentBalance += refiClosingCosts;
            state.currentRate = refiRate / 100;
            state.totalPeriodsRemaining = Math.max(0, refiTerm * periodsPerYear);
            state.standardPayment = window.mortgageUtils.calculatePayment(state.currentBalance, state.currentRate * 100, periodsPerYear, state.totalPeriodsRemaining);
            state.hasRefinanced = true;
        }
        return state;
    }

    function calculatePmiForPeriod(state, pmiRate, periodsPerYear, pmiStopThreshold) {
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

    function applyPaymentsForPeriod(state, params) {
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
        return { interest: Math.max(0, interest), principalFromPni: Math.max(0, principalFromPni), extraPrincipal, totalPrincipalPaid: Math.max(0, totalPrincipalPaid) };
    }

    function createScheduleEntry(state, paymentDetails, pmiPayment, periodicDiscountRate, periodsPerYear) {
        const { period, currentPropertyValue, currentBalance, currentAnnualTax, currentAnnualInsurance, currentMonthlyHoa, currentRate, cumulativeInterest, cumulativePrincipal } = state;
        const { interest, principalFromPni, extraPrincipal, totalPrincipalPaid } = paymentDetails;
        const pvInterest = interest / Math.pow(1 + periodicDiscountRate, period);
        const newBalance = Math.max(0, currentBalance - totalPrincipalPaid);
        const totalEquity = Math.max(0, currentPropertyValue - newBalance);
        const periodicPITI = (currentAnnualTax / periodsPerYear) + (currentAnnualInsurance / periodsPerYear) + currentMonthlyHoa + pmiPayment;
        return {
            entry: { period, interest: Math.max(0, interest), principalPaid: Math.max(0, totalPrincipalPaid), balance: newBalance, propertyValue: currentPropertyValue, totalEquity, pniPrincipal: Math.max(0, principalFromPni), extraPayment: extraPrincipal, pmi: pmiPayment, rate: currentRate * 100, periodicPITI, pvInterest, cumulativeInterest, cumulativePrincipal },
            newBalance, pvInterest
        };
    }

    // --- Public API ---
    // All functions available to other scripts are placed on this object.
    window.plannerCore = {
        generateAmortization: function(params) {
            const { principal, annualRate, periodsPerYear, totalPeriods, extraPaymentPerPeriod, lumpSumAmount, lumpSumPeriod, initialLTV, pmiRate, refiPeriod, refiRate, refiTerm, refiClosingCosts, pitiEscalationRate, discountRate, appreciationRate, propertyTax, insurance, hoa } = params;
            const standardPaymentOriginal = window.mortgageUtils.calculatePayment(principal, annualRate * 100, periodsPerYear, totalPeriods);
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
                cumulativeInterest: 0, cumulativePrincipal: 0
            };
            for (let period = 1; loanState.currentBalance > 0 && period <= 50 * periodsPerYear; period++) {
                loanState.period = period;
                loanState = handleAnnualUpdates(period, periodsPerYear, escalationFactor, periodicAppreciationRate, loanState);
                loanState = handleRefinancing(period, refiPeriod, refiClosingCosts, refiRate, refiTerm, periodsPerYear, loanState);
                const paymentDetails = applyPaymentsForPeriod(loanState, params);
                loanState.totalInterestPaid += paymentDetails.interest;
                const pmiResult = calculatePmiForPeriod(loanState, pmiRate, periodsPerYear, pmiStopThreshold);
                loanState.isPMIActive = pmiResult.isPMIActive;
                loanState.pmiDropPeriod = pmiResult.pmiDropPeriod || loanState.pmiDropPeriod;
                loanState.cumulativeInterest += paymentDetails.interest;
                loanState.cumulativePrincipal += paymentDetails.totalPrincipalPaid;
                const scheduleUpdate = createScheduleEntry(loanState, paymentDetails, pmiResult.pmiPayment, periodicDiscountRate, periodsPerYear);
                loanState.currentBalance = scheduleUpdate.newBalance;
                loanState.totalPVInterestPaid += scheduleUpdate.pvInterest;
                loanState.amortizationSchedule.push(scheduleUpdate.entry);
                if (loanState.currentBalance <= 0) {
                    loanState.payoffPeriod = period;
                    break;
                }
            }
            return { schedule: loanState.amortizationSchedule, totalInterest: loanState.totalInterestPaid, totalPVInterest: loanState.totalPVInterestPaid, payoffPeriod: loanState.payoffPeriod, standardPayment: standardPaymentOriginal, firstPeriodPITI: loanState.amortizationSchedule.length > 0 ? loanState.amortizationSchedule[0].periodicPITI * (12 / periodsPerYear) : standardPaymentOriginal, pmiDropPeriod: loanState.pmiDropPeriod, finalPropertyValue: loanState.currentPropertyValue, finalEquity: Math.max(0, loanState.currentPropertyValue) };
        },

        calculateRentVsBuy: function(state) {
            const homePrice = state.loanAmount / (state.initialLTV / 100); const downPayment = homePrice - state.loanAmount;
            const periodsPerYear = 12; const totalPeriods = state.loanTerm * periodsPerYear;
            const buyingParams = { principal: state.loanAmount, annualRate: state.interestRate / 100, periodsPerYear, totalPeriods, extraPaymentPerPeriod: 0, lumpSumAmount: 0, lumpSumPeriod: 0, initialLTV: state.initialLTV, pmiRate: state.pmiRate / 100, refiPeriod: 0, refiRate: 0, refiTerm: 0, refiClosingCosts: 0, pitiEscalationRate: state.pitiEscalationRate / 100, discountRate: state.discountRate / 100, appreciationRate: state.appreciationRate / 100, propertyTax: state.propertyTax, insurance: state.insurance, hoa: state.hoa };
            const buyingResults = this.generateAmortization(buyingParams);
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
        },

        AffordabilityCalculator: {
            calculate: function(state) {
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
        },

        InvestmentCalculator: {
            calculate: function(state) {
                const { purchasePrice, investmentDownPayment, investmentInterestRate, investmentLoanTerm, investmentClosingCosts, monthlyRentalIncome, vacancyRate, propertyTaxes, propertyInsurance, maintenanceCosts, managementFee } = state;
                const downPaymentAmount = purchasePrice * (investmentDownPayment / 100);
                const loanAmount = purchasePrice - downPaymentAmount;
                const totalCashInvested = downPaymentAmount + investmentClosingCosts;
                const mortgagePayment = window.mortgageUtils.calculatePayment(loanAmount, investmentInterestRate, 12, investmentLoanTerm * 12);
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
        },

        calculateRefinance: function(state) {
            const { originalLoanAmount, currentInterestRate, loanTerm, newInterestRate, newLoanTerm, newClosingCosts, loanStartDate } = state;
            const currentRate = currentInterestRate / 100;
            const newRate = newInterestRate / 100;
            const startDate = new Date(loanStartDate + '-01T00:00:00');
            const originalTotalPeriods = loanTerm * 12;
            const monthsPassed = (new Date().getFullYear() - startDate.getFullYear()) * 12 + (new Date().getMonth() - startDate.getMonth());
            if (monthsPassed >= originalTotalPeriods || monthsPassed < 0) return { monthlySavings: 0, breakEvenMonths: Infinity, lifetimeSavings: 0, savingsTimeline: [] };
            const periodicCurrentRate = currentRate / 12;
            const currentPayment = window.mortgageUtils.calculatePayment(originalLoanAmount, currentInterestRate, 12, originalTotalPeriods);
            let remainingBalance = originalLoanAmount;
            for (let i = 0; i < monthsPassed; i++) {
                const interest = remainingBalance * periodicCurrentRate;
                remainingBalance -= (currentPayment - interest);
            }
            const newTotalPeriods = newLoanTerm * 12;
            const newPayment = window.mortgageUtils.calculatePayment(remainingBalance, newInterestRate, 12, newTotalPeriods);
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
    };
})();
