document.addEventListener('DOMContentLoaded', function () {
    const quizContainer = document.getElementById('quiz-container');
    const resultsContainer = document.getElementById('results-container');
    const questionArea = document.getElementById('question-area');
    const restartBtn = document.getElementById('restart-btn');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    const questions = [
        {
            question: "Why are you considering refinancing?",
            key: "goal",
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>`,
            options: [
                { text: "Lower my monthly payment", score: 15, feedback: "Lowering your payment is a primary benefit of refinancing, especially if rates have dropped." },
                { text: "Pay off my loan faster", score: 15, feedback: "Refinancing to a shorter term can save you thousands in interest and help you build equity faster." },
                { text: "Get cash out of my home's equity", score: 10, feedback: "A cash-out refinance is a great way to fund large projects, but ensure the new loan terms make financial sense." },
                { text: "Just exploring my options", score: 5, feedback: "It's always smart to be aware of your financial options and current market rates." }
            ]
        },
        {
            question: "How much equity do you have in your home?",
            key: "equity",
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>`,
            options: [
                { text: "More than 20%", score: 20, feedback: "With over 20% equity, you'll avoid PMI and have the strongest refinancing application." },
                { text: "10-20%", score: 10, feedback: "Having 10-20% equity is good, but you may need to pay for Private Mortgage Insurance (PMI)." },
                { text: "Less than 10%", score: 0, feedback: "With less than 10% equity, refinancing can be challenging. It may be best to wait and build more equity." },
                { text: "I'm not sure", score: 5, feedback: "Determining your equity is a crucial first step. You can estimate it by subtracting your mortgage balance from your home's market value." }
            ]
        },
        {
            question: "What is your approximate credit score?",
            key: "creditScore",
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>`,
            options: [
                { text: "Excellent (740+)", score: 20, feedback: "An excellent credit score will qualify you for the best interest rates available, maximizing your savings." },
                { text: "Good (670-739)", score: 15, feedback: "A good score should still get you competitive rates. It's worth comparing offers." },
                { text: "Fair (580-669)", score: 5, feedback: "You may still be able to refinance, but the interest rate might not be low enough to make it worthwhile." },
                { text: "Needs Improvement (Below 580)", score: 0, feedback: "Improving your credit score before applying to refinance is highly recommended to get better terms." }
            ]
        },
        {
            question: "By how much would the new interest rate be lower than your current one?",
            key: "rateImprovement",
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path></svg>`,
            options: [
                { text: "More than 1%", score: 15, feedback: "A reduction of 1% or more typically leads to significant long-term savings." },
                { text: "0.5% to 1%", score: 10, feedback: "This is a good reduction and likely worth it, especially on a larger loan." },
                { text: "Less than 0.5%", score: 0, feedback: "A small rate reduction may not be enough to offset the closing costs of a refinance." },
                { text: "I'm not sure", score: 5, feedback: "Checking current mortgage rates is a critical next step. This is the main driver of savings." }
            ]
        },
        {
            question: "What is your approximate Debt-to-Income (DTI) ratio?",
            key: "dti",
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>`,
            options: [
                { text: "Below 36% (Excellent)", score: 15, feedback: "A low DTI ratio makes you a very strong candidate for loan approval." },
                { text: "37% to 43% (Acceptable)", score: 10, feedback: "You're in the acceptable range for most lenders, though a lower DTI is always better." },
                { text: "44% to 50% (High)", score: 5, feedback: "Approval may be difficult. Lenders prefer DTI ratios to be under 43%." },
                { text: "Above 50% or Not Sure", score: 0, feedback: "A DTI above 50% makes it very hard to qualify. Calculating your DTI is essential before applying." }
            ]
        },
        {
            question: "How long do you plan to stay in your home?",
            key: "stayDuration",
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`,
            options: [
                { text: "More than 5 years", score: 15, feedback: "Staying long-term makes it very likely you'll pass the 'break-even point' where your savings surpass the closing costs." },
                { text: "3-5 years", score: 10, feedback: "You'll likely break even, but it's important to calculate your specific break-even point with our refinance calculator." },
                { text: "1-2 years", score: 0, feedback: "With a short timeline, it's unlikely you'll save enough to cover the closing costs of a refinance." },
                { text: "I'm not sure", score: 5, feedback: "Your break-even point is critical. If you might move soon, the upfront costs of refinancing may not be worth it." }
            ]
        },
        {
            question: "How stable has your income and employment been recently?",
            key: "stability",
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>`,
            options: [
                { text: "Very stable for 2+ years", score: 10, feedback: "Excellent. Lenders value consistent and reliable income history." },
                { text: "I started a new, higher-paying job within the last year", score: 5, feedback: "This is positive, but some lenders may want to see a longer history in your new role." },
                { text: "My income has been inconsistent or recently decreased", score: 0, feedback: "This can be a major hurdle for refinancing. Lenders need to see that you can reliably make the new payments." }
            ]
        }
    ];

    let currentQuestionIndex = 0;
    let userAnswers = {};

    function showQuestion(index) {
        const question = questions[index];
        let optionsHTML = '<div class="space-y-3">';
        question.options.forEach((option, i) => {
            const isSelected = userAnswers[question.key] === option.text;
            optionsHTML += `
                <div 
                    class="quiz-option p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition ${isSelected ? 'selected' : 'border-gray-200'}" 
                    data-question-key="${question.key}" 
                    data-option-text="${option.text}">
                    ${option.text}
                </div>
            `;
        });
        optionsHTML += '</div>';
        
        questionArea.classList.remove('question-in');
        questionArea.innerHTML = `
            <h2 class="text-base font-bold text-gray-800 mb-4">${index + 1}. ${question.question}</h2>
            ${optionsHTML}
        `;
        questionArea.classList.add('question-in');
        updateProgressBar();
    }
    
    function updateProgressBar() {
        const progress = ((currentQuestionIndex) / questions.length) * 100;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
    }

    questionArea.addEventListener('click', (e) => {
        const selectedOption = e.target.closest('.quiz-option');
        if (selectedOption) {
            const { questionKey, optionText } = selectedOption.dataset;
            userAnswers[questionKey] = optionText;

            questionArea.classList.add('question-out');

            setTimeout(() => {
                questionArea.classList.remove('question-out');
                if (currentQuestionIndex < questions.length - 1) {
                    currentQuestionIndex++;
                    showQuestion(currentQuestionIndex);
                } else {
                    showResults();
                }
            }, 300);
        }
    });

    function showResults() {
        quizContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        let rawScore = 0;
        let breakdownHTML = '';
        const maxScore = questions.reduce((acc, q) => acc + Math.max(...q.options.map(o => o.score)), 0);

        questions.forEach(q => {
            const userAnswerText = userAnswers[q.key];
            const chosenOption = q.options.find(opt => opt.text === userAnswerText);
            if (chosenOption) {
                rawScore += chosenOption.score;
                const scoreColor = chosenOption.score > 10 ? 'text-green-500' : chosenOption.score > 5 ? 'text-yellow-500' : 'text-red-500';
                breakdownHTML += `
                    <div class="p-3 bg-gray-50 rounded-lg border flex items-start gap-3">
                         <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">${q.icon}</div>
                         <div>
                            <p class="font-semibold text-gray-800">${chosenOption.text}</p>
                            <p class="text-gray-600 mt-1 text-xs italic">${chosenOption.feedback}</p>
                        </div>
                    </div>
                `;
            }
        });
        
        const totalScore = Math.round((rawScore / maxScore) * 100);
        document.getElementById('breakdown-list').innerHTML = breakdownHTML;

        // Animate score circle
        const scoreCircleProgress = document.getElementById('score-circle-progress');
        const circumference = 326;
        const offset = circumference - (totalScore / 100) * circumference;
        scoreCircleProgress.style.strokeDashoffset = offset;
        
        const scoreTextEl = document.getElementById('score-text');
        let currentScore = 0;
        const interval = setInterval(() => {
            if(currentScore < totalScore) {
                currentScore++;
                scoreTextEl.textContent = currentScore;
            } else {
                clearInterval(interval);
            }
        }, 15);
        
        let resultTitle = '';
        let resultMessage = '';
        let nextStepsHTML = '<h3 class="font-bold text-sm text-gray-800 mb-2">Recommended Next Steps:</h3><div class="space-y-2">';

        if (totalScore >= 85) {
            resultTitle = "Excellent Candidate!";
            resultMessage = "You appear to be in a strong position to refinance. With your high score, you're likely to qualify for the best rates, maximizing your potential savings.";
            scoreCircleProgress.className.baseVal = "text-accent";
            nextStepsHTML += `
                <a href="./#refinance-tab" class="block p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition">
                    <p class="font-semibold text-green-800">1. Analyze Your Savings</p>
                    <p class="text-xs text-green-700">Use our detailed Refinance Calculator to see your exact break-even point and lifetime savings.</p>
                </a>
                <a href="#" class="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border">
                    <p class="font-semibold text-gray-800">2. Start Comparing Lenders</p>
                    <p class="text-xs text-gray-700">You're in a great position to shop around for the best possible rates and terms.</p>
                </a>`;

        } else if (totalScore >= 60) {
            resultTitle = "Looking Good!";
            resultMessage = "Refinancing could be a great move for you. Your score indicates you're a good candidate, but it's important to run the numbers to confirm your savings will outweigh the costs.";
            scoreCircleProgress.className.baseVal = "text-primary";
            nextStepsHTML += `
                <a href="index.html#refinance-tab" class="block p-3 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition">
                    <p class="font-semibold text-sky-800">1. Calculate Your Break-Even Point</p>
                    <p class="text-xs text-sky-700">Use our Refinance Calculator to ensure your monthly savings will cover the closing costs before you plan to move.</p>
                </a>
                <a href="#" class="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border">
                    <p class="font-semibold text-gray-800">2. Get Pre-Qualified Quotes</p>
                    <p class="text-xs text-gray-700">Contact a few lenders to see what actual rates you qualify for based on your profile.</p>
                </a>`;
        } else if (totalScore >= 40) {
            resultTitle = "Proceed with Caution";
            resultMessage = "Refinancing might be possible, but may not be the most beneficial option right now. Focus on the areas for improvement mentioned in the breakdown before moving forward.";
            scoreCircleProgress.className.baseVal = "text-yellow-500";
             nextStepsHTML += `
                <a href="#" class="block p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg border border-yellow-200 transition">
                    <p class="font-semibold text-yellow-800">1. Focus on Improving Key Areas</p>
                    <p class="text-xs text-yellow-700">Work on boosting your credit score or paying down other debts to lower your DTI ratio.</p>
                </a>
                <a href="index.html#refinance-tab" class="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border">
                    <p class="font-semibold text-gray-800">2. Model Scenarios</p>
                    <p class="text-xs text-gray-700">Use our calculator to see how much a better credit score or lower DTI could save you in the future.</p>
                </a>`;
        } else {
            resultTitle = "Not Recommended at This Time";
            resultMessage = "Based on your answers, now is likely not the best time to refinance. It would be wise to focus on improving your financial situation, such as building more equity or raising your credit score.";
            scoreCircleProgress.className.baseVal = "text-red-500";
            nextStepsHTML += `
                <a href="#" class="block p-3 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition">
                    <p class="font-semibold text-red-800">1. Build a Stronger Financial Foundation</p>
                    <p class="text-xs text-red-700">Focus on increasing your income, paying down your mortgage to build equity, and improving your credit history.</p>
                </a>
                 <a href="${document.referrer || 'index.html'}" class="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border">
                    <p class="font-semibold text-gray-800">2. Explore Other Financial Tools</p>
                    <p class="text-xs text-gray-700">Check out our other calculators to see different ways you can manage your mortgage.</p>
                </a>`;
        }
        nextStepsHTML += `</div>`;

        document.getElementById('result-title').textContent = resultTitle;
        document.getElementById('result-message').textContent = resultMessage;
        document.getElementById('next-steps-section').innerHTML = nextStepsHTML;
    }
    
    restartBtn.addEventListener('click', () => {
        currentQuestionIndex = 0;
        userAnswers = {};
        resultsContainer.classList.add('hidden');
        quizContainer.classList.remove('hidden');
        showQuestion(currentQuestionIndex);
    });

    // Initial load
    showQuestion(currentQuestionIndex);
});
