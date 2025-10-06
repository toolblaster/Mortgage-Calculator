document.addEventListener('DOMContentLoaded', function() {
    const quizContainer = document.getElementById('quiz-container');
    const resultsContainer = document.getElementById('results-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    const questions = {
        '1': document.getElementById('question-1'),
        '2': document.getElementById('question-2'),
        '3': document.getElementById('question-3'),
        '4': document.getElementById('question-4'),
        '5': document.getElementById('question-5'),
        '6': document.getElementById('question-6'),
        '7': document.getElementById('question-7'),
        '8': document.getElementById('question-8'),
        '9': document.getElementById('question-9'),
        '10': document.getElementById('question-10'),
        '11': document.getElementById('question-11'),
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
        // Clear answers
        Object.keys(userAnswers).forEach(key => delete userAnswers[key]);

        // Un-select and re-enable all buttons
        document.querySelectorAll('.quiz-option').forEach(button => {
            button.classList.remove('selected');
            button.disabled = false;
        });

        // Show quiz and hide results
        resultsContainer.classList.add('hidden');
        quizContainer.classList.remove('hidden');

        // Restart quiz
        showQuestion('1');
    }

    function showResults() {
        quizContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        progressText.textContent = 'Recommendation Complete!';
        progressBar.style.width = `100%`;
        
        const { goal, current_rate, loan_type, credit, dti, stay_plan, equity, loan_age, closing_cost_tolerance, income_stability, other_goals } = userAnswers;
        const goalText = goal.replace(/_/g, ' ');

        let title = "Here's Your Personalized Recommendation";
        let subtitle = "Based on your answers, here is our analysis of your refinance readiness.";
        let content = '';
        let cta = `<a href="/#refinance-tab" class="inline-block w-full sm:w-auto bg-accent text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-green-800 transition-transform transform hover:scale-105">Analyze My Refinance &rarr;</a>`;
        
        let score = 0;
        let advicePoints = [];

        // --- Scoring Logic & Conditional Handling ---
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
            // --- New, more advanced scoring logic ---
            if (current_rate === 'higher') score += 3;
            if (loan_type === 'arm' || goal === 'rate_switch') score += 2;
            if (credit === 'excellent') score += 3;
            if (credit === 'good') score += 2;
            if (dti === 'low_dti') score += 2;
            if (dti === 'medium_dti') score += 1;
            if (stay_plan === 'long_term') score += 2;
            if (equity === 'high_equity') score += 1;
            if (loan_age === '2_5_years') score += 1;
            if (loan_age === '5_10_years') score += 2;
            if (loan_age === 'over_10_years') score += 3;
            if (income_stability === 'stable_increasing') score += 2;
            if (income_stability === 'stable') score += 1;
            if (other_goals === 'no') score += 1;

            // --- New, more detailed advice points ---
            if (loan_type === 'arm' || goal === 'rate_switch') {
                advicePoints.push(`<p class="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg"><strong>Priority Insight:</strong> Switching from an Adjustable-Rate Mortgage (ARM) to a stable, fixed-rate loan is a powerful strategy to protect yourself from future interest rate hikes. This is a very strong reason to refinance.</p>`);
            }
            if (income_stability === 'uncertain') {
                 advicePoints.push(`<p class="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg"><strong>Income Note:</strong> With a variable income, locking in the lowest possible fixed monthly payment through refinancing could provide valuable financial stability and peace of mind.</p>`);
            }
            if (loan_age === 'under_2_years' && stay_plan !== 'long_term') {
                advicePoints.push(`<p class="mt-4 p-3 bg-red-50 border-l-4 border-red-400 rounded-r-lg"><strong>Critical Consideration:</strong> Your loan is very new. It is crucial that the interest rate savings are significant enough to overcome the closing costs within your short-term plan to stay in the home. The break-even point will be the most important number for you.</p>`);
            }
             if (dti === 'high_dti') {
                advicePoints.push(`<p class="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg"><strong>DTI Consideration:</strong> Lenders look closely at your Debt-to-Income ratio. Since yours is on the higher side, it's crucial to use the calculator to see how a new payment would fit into your budget. Paying down other debts could strengthen your application.</p>`);
            }
            if (goal === 'cash_out' && equity !== 'high_equity') {
                advicePoints.push(`<p class="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg"><strong>Heads-up:</strong> A 'cash-out' refinance usually requires significant equity (more than 20%). You may need to wait until you've built more equity in your home.</p>`);
            }
            if (stay_plan === 'short_term') {
                 advicePoints.push(`<p class="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg"><strong>Important Note:</strong> Since you plan to stay for less than 5 years, pay close attention to the 'break-even point' in our calculator. You need to ensure your monthly savings will cover the closing costs before you move.</p>`);
            }

            if (score >= 12) {
                title = `Your Path to '${goalText}' is Clear! 🎉`;
                subtitle = "Multiple factors align in your favor, making refinancing a very strong option to consider."
                content = `<p>Your goal to <strong>'${goalText}'</strong> combined with your strong financial profile makes you an ideal candidate. The next step is to run the exact numbers.</p>`
            } else if (score >= 7) {
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

        // Inject content into results page
        document.getElementById('results-title').textContent = title;
        document.getElementById('results-subtitle').textContent = subtitle;
        document.getElementById('results-content').innerHTML = content;
        document.getElementById('results-cta').innerHTML = cta;
        
        // --- Setup Social Sharing Links ---
        const pageUrl = encodeURIComponent(window.location.href);
        const pageTitle = encodeURIComponent("I just took the Refinance Readiness Quiz - see if you should refinance!");
        const pageSource = encodeURIComponent("Strategic Mortgage Planner");

        const twitter = document.getElementById('share-twitter-quiz');
        if(twitter) twitter.href = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}`;
        
        const facebook = document.getElementById('share-facebook-quiz');
        if(facebook) facebook.href = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;

        const linkedin = document.getElementById('share-linkedin-quiz');
        if(linkedin) linkedin.href = `https://www.linkedin.com/shareArticle?mini=true&url=${pageUrl}&title=${pageTitle}&source=${pageSource}`;
        
        const whatsapp = document.getElementById('share-whatsapp-quiz');
        if(whatsapp) whatsapp.href = `https://api.whatsapp.com/send?text=${pageTitle}%20${pageUrl}`;

        const email = document.getElementById('share-email-quiz');
        if(email) email.href = `mailto:?subject=${pageTitle}&body=Check out this helpful quiz: ${pageUrl}`;
    }

    quizContainer.addEventListener('click', function(e) {
        const button = e.target.closest('.quiz-option');
        if (!button) return;

        // Disable all buttons in the current card to prevent double-clicking
        const allOptionsInCard = button.closest('.quiz-card').querySelectorAll('.quiz-option');
        allOptionsInCard.forEach(opt => opt.disabled = true);
        
        // Add visual feedback
        button.classList.add('selected');

        const currentCard = button.closest('.quiz-card');
        const questionId = currentCard.id.split('-')[1];
        const nextQuestion = button.dataset.next;
        const answerValue = button.dataset.value;

        // Store answer
        userAnswers[currentCard.dataset.key] = answerValue;

        // Add a delay for a smoother feel
        setTimeout(() => {
            if (nextQuestion === 'results') {
                showResults();
            } else {
                showQuestion(nextQuestion);
            }
        }, 400);
    });

    // Event listener for the retake button
    document.getElementById('retake-quiz-button').addEventListener('click', resetQuiz);

    // Start the quiz
    showQuestion('1');
});
