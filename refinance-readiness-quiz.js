document.addEventListener('DOMContentLoaded', function() {
    const quizContainer = document.getElementById('quiz-container');
    const resultsContainer = document.getElementById('results-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    const questions = {
        '1': document.getElementById('question-1'), '2': document.getElementById('question-2'), '3': document.getElementById('question-3'),
        '4': document.getElementById('question-4'), '5': document.getElementById('question-5'), '6': document.getElementById('question-6'),
        '7': document.getElementById('question-7'), '8': document.getElementById('question-8'), '9': document.getElementById('question-9'),
        '10': document.getElementById('question-10'), '11': document.getElementById('question-11'),
    };

    const userAnswers = {};
    const totalQuestions = Object.keys(questions).length;

    function updateProgressBar(currentStep) {
        if (currentStep > totalQuestions) currentStep = totalQuestions;
        const progress = (currentStep / totalQuestions) * 100;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `Step ${currentStep} of ${totalQuestions}`;
    }

    function showQuestion(questionNumber) {
        Object.values(questions).forEach(q => q.classList.add('hidden'));
        if (questions[questionNumber]) {
            questions[questionNumber].classList.remove('hidden');
            updateProgressBar(parseInt(questionNumber, 10));
        }
    }
    
    function resetQuiz() {
        Object.keys(userAnswers).forEach(key => delete userAnswers[key]);
        document.querySelectorAll('.quiz-option').forEach(button => {
            button.classList.remove('selected');
            button.disabled = false;
        });
        resultsContainer.classList.add('hidden');
        quizContainer.classList.remove('hidden');
        showQuestion('1');
    }

    function showResults() {
        quizContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        progressText.textContent = 'Recommendation Complete!';
        progressBar.style.width = `100%`;
        
        const { goal, credit } = userAnswers;
        const goalText = goal.replace(/_/g, ' ');

        let title = "Here's Your Personalized Recommendation";
        let subtitle = "Based on your answers, here is our analysis of your refinance readiness.";
        let content = '';
        let cta = `<a href="/#refinance-tab" class="inline-block w-full sm:w-auto bg-accent text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-green-800 transition-transform transform hover:scale-105">Analyze My Refinance &rarr;</a>`;
        
        // --- Special Case Handling ---
        if (goal === 'unsure') {
            title = "Let's Figure Out Your Budget!";
            subtitle = "It's smart to start by understanding your financial picture. Here's our recommendation:";
            content = `<p>Since you're exploring your options, the best place to start is our <strong>Home Affordability Calculator</strong>. This tool will help you understand how a mortgage fits into your budget and what you might qualify for.</p>`;
            cta = `<a href="/#affordability-tab" class="inline-block w-full sm:w-auto bg-accent text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-green-800 transition-transform transform hover:scale-105">Calculate My Affordability &rarr;</a>`;
        } else if (credit === 'poor') {
             title = "Let's Build a Plan for the Future";
             subtitle = "Refinancing might be challenging right now, but here's a recommended path forward."
             content = `<p>With a credit score that needs improvement, the best first step is to focus on strengthening your financial profile. This will put you in a much stronger position to get the best rates in the future.</p><h3 class="font-bold mt-4">Recommended Actions:</h3><ul class="list-disc list-inside space-y-2 pl-4"><li>Review your credit report for any errors.</li><li>Focus on making all payments on time.</li><li>Work on paying down high-interest credit card balances.</li></ul>`;
             cta = `<a href="/#mortgage-tab" class="inline-block w-full sm:w-auto bg-primary text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-sky-700 transition-transform transform hover:scale-105">Explore Scenarios &rarr;</a>`;
        } else {
            // --- Weighted Scoring Logic ---
            const weights = {
                current_rate: { higher: 5, similar: 0, unsure_rate: 1 },
                loan_type: { fixed: 0, arm: 3, other: 1 },
                credit: { excellent: 4, good: 2, fair: 0 },
                dti: { low_dti: 3, medium_dti: 1, high_dti: -1 },
                stay_plan: { long_term: 3, short_term: -3, unsure_stay: 0 },
                equity: { high_equity: 2, low_equity: 0, unsure_equity: 0 },
                loan_age: { under_2_years: -2, '2_5_years': 1, '5_10_years': 3, over_10_years: 4 },
                income_stability: { stable_increasing: 2, stable: 1, uncertain: 0 },
                other_goals: { no: 1, yes: 0 }
            };

            let score = 0;
            for (const key in userAnswers) {
                const answer = userAnswers[key];
                if (weights[key] && weights[key][answer] !== undefined) {
                    score += weights[key][answer];
                }
            }

            // --- Dynamic Advice Points ---
            let advicePoints = [];
            const addAdvice = (condition, message, type = 'note') => {
                if (condition) {
                    const colors = { note: 'blue', warning: 'yellow', critical: 'red' };
                    advicePoints.push(`<p class="mt-4 p-3 bg-${colors[type]}-50 border-l-4 border-${colors[type]}-400 rounded-r-lg">${message}</p>`);
                }
            };
            
            addAdvice(userAnswers.loan_type === 'arm' || goal === 'rate_switch', "<strong>Priority Insight:</strong> Switching from an ARM to a stable, fixed-rate loan is a powerful strategy to protect yourself from future rate hikes. This is a very strong reason to refinance.");
            addAdvice(userAnswers.income_stability === 'uncertain', "<strong>Income Note:</strong> With a variable income, locking in the lowest possible fixed payment could provide valuable financial stability.", 'warning');
            addAdvice(userAnswers.loan_age === 'under_2_years' && userAnswers.stay_plan !== 'long_term', "<strong>Critical Consideration:</strong> Your loan is very new. It's crucial that interest savings are significant enough to overcome closing costs quickly. The break-even point is the most important number for you.", 'critical');
            addAdvice(userAnswers.dti === 'high_dti', "<strong>DTI Consideration:</strong> Lenders look closely at your DTI ratio. Since yours is on the higher side, it's crucial to see how a new payment fits your budget. Paying down other debts could strengthen your application.", 'warning');
            addAdvice(goal === 'cash_out' && userAnswers.equity !== 'high_equity', "<strong>Heads-up:</strong> A 'cash-out' refinance usually requires significant equity (more than 20%). You may need to wait until you've built more equity in your home.", 'warning');
            addAdvice(userAnswers.stay_plan === 'short_term', "<strong>Important Note:</strong> Since you plan to stay for less than 5 years, pay close attention to the 'break-even point' in our calculator. You need to ensure your monthly savings will cover the closing costs before you move.", 'warning');

            // --- Final Recommendation Based on Score ---
            if (score >= 12) {
                title = `Your Path to '${goalText}' is Clear! 🎉`;
                subtitle = "Multiple factors align in your favor, making refinancing a very strong option to consider."
                content = `<p>Your goal to <strong>'${goalText}'</strong> combined with your strong financial profile makes you an ideal candidate. The next step is to run the exact numbers.</p>`
            } else if (score >= 6) {
                title = `Refinancing for '${goalText}' Looks Promising! 👍`;
                subtitle = "You have good reasons to refinance, but be sure to weigh the pros and cons carefully."
                content = `<p>Your goal to <strong>'${goalText}'</strong> is a good reason to explore refinancing. Our calculator will help you see if the benefits outweigh the costs.</p>`
            } else {
                title = `A Strategic Look at Your '${goalText}' Goal 🤔`;
                 subtitle = "Refinancing might still be beneficial, but it's important to be strategic. Here's what to focus on:"
                 content = `<p>While not every factor is perfectly aligned, refinancing could still be the right move, especially depending on your primary goal. Use our calculator to model the specifics.</p>`
            }

            content += `
                <h3 class="font-bold mt-4">Next Steps:</h3>
                <p>Use our <strong>Refinance Calculator</strong> to determine:</p>
                <ul class="list-disc list-inside space-y-2 pl-4">
                    <li>✅ Your potential new monthly payment.</li>
                    <li>✅ Your break-even point on closing costs.</li>
                    <li>✅ Your total lifetime interest savings.</li>
                </ul>
            `;
            content += advicePoints.join('');
        }

        document.getElementById('results-title').textContent = title;
        document.getElementById('results-subtitle').textContent = subtitle;
        document.getElementById('results-content').innerHTML = content;
        document.getElementById('results-cta').innerHTML = cta;
        
        const pageUrl = encodeURIComponent(window.location.href);
        const pageTitle = encodeURIComponent("I just took the Refinance Readiness Quiz - see if you should refinance!");
        const pageSource = encodeURIComponent("Strategic Mortgage Planner");

        document.getElementById('share-twitter-quiz').href = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}`;
        document.getElementById('share-facebook-quiz').href = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
        document.getElementById('share-linkedin-quiz').href = `https://www.linkedin.com/shareArticle?mini=true&url=${pageUrl}&title=${pageTitle}&source=${pageSource}`;
        document.getElementById('share-whatsapp-quiz').href = `https://api.whatsapp.com/send?text=${pageTitle}%20${pageUrl}`;
        document.getElementById('share-email-quiz').href = `mailto:?subject=${pageTitle}&body=Check out this helpful quiz: ${pageUrl}`;
    }

    quizContainer.addEventListener('click', function(e) {
        const button = e.target.closest('.quiz-option');
        if (!button) return;

        const allOptionsInCard = button.closest('.quiz-card').querySelectorAll('.quiz-option');
        allOptionsInCard.forEach(opt => opt.disabled = true);
        button.classList.add('selected');

        const currentCard = button.closest('.quiz-card');
        const nextQuestion = button.dataset.next;
        userAnswers[currentCard.dataset.key] = button.dataset.value;

        setTimeout(() => {
            if (nextQuestion === 'results') {
                showResults();
            } else {
                showQuestion(nextQuestion);
            }
        }, 400);
    });

    document.getElementById('retake-quiz-button').addEventListener('click', resetQuiz);
    showQuestion('1');
});
