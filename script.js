// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, push, get } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAPqsB2htm62GVQxDCoqahv5iErL1JTy7c",
  authDomain: "hydroponics-sprint.firebaseapp.com",
  databaseURL: "https://hydroponics-sprint-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hydroponics-sprint",
  storageBucket: "hydroponics-sprint.appspot.com",
  messagingSenderId: "410983773204",
  appId: "1:410983773204:web:e2649bc8fa75a06e6d6301",
  measurementId: "G-EJSQSQZS1C"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const TOTAL_BUDGET = 25;

let userId = null;
let currentAttemptId = null;
let allUserAttempts = {};
let gameState = {};
let chart = null;

// UI Elements
const loginSection = document.getElementById('login-section');
const mainContent = document.getElementById('main-content');
const guideSection = document.getElementById('guide-section');
const simulationSection = document.getElementById('simulation-section');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const startSimBtn = document.getElementById('start-sim-btn');
const nextDayBtn = document.getElementById('next-day-btn');
const userNameDisplay = document.getElementById('user-name');
const loginError = document.getElementById('login-error');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');

// Game State UI
const simDayDisplay = document.getElementById('sim-day');
const yieldDisplay = document.getElementById('yield-display');
const costDisplay = document.getElementById('cost-display');
const phDisplay = document.getElementById('ph-display');
const nutrientsDisplay = document.getElementById('nutrients-display');
const eventLog = document.getElementById('event-log');
const dailyCostDisplay = document.getElementById('daily-cost-display');
const spentBudgetDisplay = document.getElementById('spent-budget-display');
const remainingBudgetDisplay = document.getElementById('remaining-budget-display');
const hintText = document.getElementById('hint-text');
const previousAttemptsContainer = document.getElementById('previous-attempts-container');
const previousAttemptsList = document.getElementById('previous-attempts-list');

// Controls & Observations
const lightHoursInput = document.getElementById('light-hours');
const nutrientPpmInput = document.getElementById('nutrient-ppm');
const phAdjustInput = document.getElementById('ph-adjust');
const lightHoursValue = document.getElementById('light-hours-value');
const nutrientPpmValue = document.getElementById('nutrient-ppm-value');
const phAdjustValue = document.getElementById('ph-adjust-value');
const observationInput = document.getElementById('observation-input');

// Modals
const nameCaptureModal = document.getElementById('name-capture-modal');
const nameInput = document.getElementById('name-input');
const saveNameBtn = document.getElementById('save-name-btn');
const gameOverModal = document.getElementById('game-over-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const finalYield = document.getElementById('final-yield');
const finalCost = document.getElementById('final-cost');
const restartBtn = document.getElementById('restart-btn');
const summaryOptimization = document.getElementById('summary-optimization');
const summaryAdaptability = document.getElementById('summary-adaptability');
const summaryDiligence = document.getElementById('summary-diligence');
const suggestionsList = document.getElementById('suggestions-list');

const warningModal = document.getElementById('warning-modal');
const warningTitle = document.getElementById('warning-title');
const warningMessage = document.getElementById('warning-message');
const redoDayBtn = document.getElementById('redo-day-btn');
const restartFromWarningBtn = document.getElementById('restart-from-warning-btn');


// --- Authentication ---
setPersistence(auth, browserLocalPersistence);

onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid;
        checkAndHandleUserSetup();
    } else {
        userId = null;
        currentAttemptId = null;
        allUserAttempts = {};
        loginSection.classList.remove('hidden');
        mainContent.classList.add('hidden');
        if (chart) chart.destroy();
    }
});

async function checkAndHandleUserSetup() {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    const userData = snapshot.val() || {};

    loginSection.classList.add('hidden');
    mainContent.classList.remove('hidden');
    guideSection.classList.remove('hidden');
    simulationSection.classList.add('hidden');

    if (!userData.displayName) {
        nameCaptureModal.classList.remove('hidden');
    } else {
        userNameDisplay.textContent = userData.displayName;
        allUserAttempts = userData.attempts || {};
        displayPreviousAttempts();
    }
}

saveNameBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (name) {
        await set(ref(db, `users/${userId}/displayName`), name);
        userNameDisplay.textContent = name;
        nameCaptureModal.classList.add('hidden');
        displayPreviousAttempts();
    }
});

function displayPreviousAttempts() {
    previousAttemptsList.innerHTML = '';
    previousAttemptsContainer.classList.remove('hidden');

    if (!allUserAttempts || Object.keys(allUserAttempts).length === 0) {
        previousAttemptsList.innerHTML = '<p>No previous attempts found. Start your first one!</p>';
        return;
    }
    
    const sortedAttempts = Object.entries(allUserAttempts)
        .sort((a, b) => new Date(b[1].createdAt) - new Date(a[1].createdAt));

    sortedAttempts.forEach(([attemptId, attemptData]) => {
        const attemptEl = document.createElement('div');
        attemptEl.classList.add('attempt-summary-item');
        attemptEl.dataset.attemptId = attemptId; // Store ID for click handling

        const gs = attemptData.gameState;
        const isFinished = gs.gameOver;
        const statusText = isFinished ? 'Finished' : 'In Progress';
        const statusClass = isFinished ? 'status-Finished' : 'status-In-Progress';

        attemptEl.innerHTML = `
            <div class="attempt-details">
                <p class="attempt-date">Attempt on ${new Date(attemptData.createdAt).toLocaleString()}</p>
                <p><strong>Day:</strong> ${gs.day} | <strong>Yield:</strong> ${gs.yield.toFixed(2)} kg | <strong>Cost:</strong> $${gs.cost.toFixed(2)}</p>
            </div>
            <div class="attempt-status ${statusClass}">${statusText}</div>
        `;
        previousAttemptsList.appendChild(attemptEl);
    });
}

async function handleAttemptClick(event) {
    const clickedEl = event.target.closest('.attempt-summary-item');
    if (!clickedEl) return;

    const attemptId = clickedEl.dataset.attemptId;
    const attemptData = allUserAttempts[attemptId];

    if (!attemptData) return;

    if (attemptData.gameState.gameOver) {
        // Show summary for a finished game
        const historySnapshot = await get(ref(db, `users/${userId}/attempts/${attemptId}/history`));
        const history = historySnapshot.val() ? Object.values(historySnapshot.val()) : [];
        showGameOverModal(
            attemptData.gameState.yield,
            attemptData.gameState.cost,
            attemptData.gameState.gameOverReason,
            history
        );
    } else {
        // Continue an in-progress game
        currentAttemptId = attemptId;
        gameState = attemptData.gameState;
        guideSection.classList.add('hidden');
        simulationSection.classList.remove('hidden');
        loadHistoryAndRenderChart();
        updateUI();
    }
}

previousAttemptsList.addEventListener('click', handleAttemptClick);


loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    loginError.textContent = '';
    signInWithEmailAndPassword(auth, email, password)
        .catch(() => loginError.textContent = "Invalid credentials.");
});

logoutBtn.addEventListener('click', () => signOut(auth));


// --- Game Logic & State ---
function initializeGameState() {
    return {
        day: 1,
        yield: 0,
        cost: 0,
        ph: 6.0,
        nutrients: 800,
        gameOver: false,
        gameOverReason: "",
        lastEvent: "Welcome! Set your inputs for the first day."
    };
}

function saveGameState() {
    if (!userId || !currentAttemptId) return;
    const gsRef = ref(db, `users/${userId}/attempts/${currentAttemptId}/gameState`);
    set(gsRef, gameState);
    allUserAttempts[currentAttemptId].gameState = { ...gameState }; // Update local copy
}

function recordHistory(inputs, observation) {
    if (!userId || !currentAttemptId) return;
    const historyRef = ref(db, `users/${userId}/attempts/${currentAttemptId}/history`);
    const historyEntry = {
        day: gameState.day,
        inputs: inputs,
        observation: observation,
        stateAfter: { ...gameState }
    };
    push(historyRef, historyEntry);
}

function updateUI() {
    // Reset controls to reflect current game state
    lightHoursInput.value = 12; // Default, can be improved to save last input
    nutrientPpmInput.value = gameState.nutrients;
    phAdjustInput.value = 0;
    lightHoursValue.textContent = `${lightHoursInput.value} hrs`;
    nutrientPpmValue.textContent = `${nutrientPpmInput.value} PPM`;
    phAdjustValue.textContent = '0.0';

    simDayDisplay.textContent = gameState.day;
    yieldDisplay.textContent = gameState.yield.toFixed(2);
    costDisplay.textContent = gameState.cost.toFixed(2);
    phDisplay.textContent = gameState.ph.toFixed(1);
    nutrientsDisplay.textContent = Math.round(gameState.nutrients);

    const remainingBudget = TOTAL_BUDGET - gameState.cost;
    spentBudgetDisplay.textContent = `$${gameState.cost.toFixed(2)}`;
    remainingBudgetDisplay.textContent = `$${remainingBudget.toFixed(2)}`;
    remainingBudgetDisplay.classList.toggle('low-budget', remainingBudget < 5);

    if (gameState.lastEvent) {
        eventLog.textContent = gameState.lastEvent;
        eventLog.classList.remove('hidden');
    } else {
        eventLog.classList.add('hidden');
    }

    if (gameState.gameOver) {
        // This is now handled by the modal click
    }
    updateDailyCostPreview();
    updateHint();
}

startSimBtn.addEventListener('click', () => {
    // A new attempt can always be started from the guide page.
    const newAttemptRef = push(ref(db, `users/${userId}/attempts`));
    currentAttemptId = newAttemptRef.key;
    
    gameState = initializeGameState();
    
    const newAttemptData = {
        createdAt: new Date().toISOString(),
        gameState: gameState
    };
    
    set(newAttemptRef, newAttemptData).then(() => {
        allUserAttempts[currentAttemptId] = newAttemptData; // Update local copy
        guideSection.classList.add('hidden');
        simulationSection.classList.remove('hidden');
        loadHistoryAndRenderChart();
        updateUI();
    });
});


nextDayBtn.addEventListener('click', () => {
    if (gameState.gameOver) return;

    const observation = observationInput.value;
    if (!observation) {
        alert("Please enter your observation for the day.");
        return;
    }

    const light = parseInt(lightHoursInput.value);
    const nutrientsInput = parseInt(nutrientPpmInput.value);
    const phAdjust = parseFloat(phAdjustInput.value);
    
    const dailyCost = (light * 0.25) + (nutrientsInput / 100 * 0.10);
    const projectedTotalCost = gameState.cost + dailyCost;
    
    if (projectedTotalCost > TOTAL_BUDGET) {
        const overage = projectedTotalCost - TOTAL_BUDGET;
        showWarningModal(
            "Budget Exceeded!",
            `This action will cost $${dailyCost.toFixed(2)}, pushing your total cost to $${projectedTotalCost.toFixed(2)}. You will be $${overage.toFixed(2)} over the $${TOTAL_BUDGET} budget.`
        );
        return;
    }

    const projectedPh = gameState.ph - ((nutrientsInput - gameState.nutrients) * 0.0001) + phAdjust;
    if (projectedPh < 5.5 || projectedPh > 6.5) {
        showWarningModal(
            "pH Out of Range!",
            `This action will likely cause your pH to become ${projectedPh.toFixed(1)}, which is outside the safe range of 5.5-6.5.`
        );
        return;
    }

    gameState.cost += dailyCost;
    
    // Record history *before* state changes for the next day
    recordHistory({light, nutrientsInput, phAdjust}, observation);

    const lightFactor = (light - 8) / 10;
    const nutrientFactor = (gameState.nutrients - 400) / 800;
    const phPenalty = Math.abs(gameState.ph - 6.0) * 2.5;
    let dailyYield = (lightFactor + nutrientFactor) * 7 - phPenalty;
    if (dailyYield < 0) dailyYield = 0;
    gameState.yield += dailyYield;

    gameState.nutrients *= 0.93;
    gameState.nutrients += (nutrientsInput - gameState.nutrients) * 0.6;
    gameState.ph -= (gameState.nutrients / 9000);
    gameState.ph += phAdjust;

    const randomEventRoll = Math.random();
    if (randomEventRoll < 0.15) {
        gameState.lastEvent = "PEST ATTACK! Yield for today was halved.";
        gameState.yield -= dailyYield / 2;
    } else if (randomEventRoll < 0.25) {
        gameState.lastEvent = "ALGAE BLOOM! Costs for today doubled due to cleaning.";
        gameState.cost += dailyCost;
    } else {
        gameState.lastEvent = "A calm day on the farm.";
    }
    
    if (gameState.ph < 5.5 || gameState.ph > 6.5) {
        gameState.gameOver = true;
        gameState.gameOverReason = "pH out of range!";
    } else if (gameState.cost > TOTAL_BUDGET) {
        gameState.gameOver = true;
        gameState.gameOverReason = "Budget exceeded!";
    } else if (gameState.day >= 7) {
        gameState.gameOver = true;
        gameState.gameOverReason = "Challenge Complete! You managed the farm for 7 days.";
    }

    if (!gameState.gameOver) {
        gameState.day++;
    }
    
    observationInput.value = "";
    saveGameState(); // Save the new state

    if(gameState.gameOver) {
        // If game is over, show the summary immediately
        handleAttemptClick({ target: document.querySelector(`[data-attempt-id="${currentAttemptId}"]`) });
    } else {
        updateUI(); 
    }
});

function showWarningModal(title, message) {
    warningTitle.textContent = title;
    warningMessage.textContent = message;
    warningModal.classList.remove('hidden');
}

redoDayBtn.addEventListener('click', () => {
    warningModal.classList.add('hidden');
});

function returnToGuide() {
    currentAttemptId = null;
    gameOverModal.classList.add('hidden');
    warningModal.classList.add('hidden');
    checkAndHandleUserSetup(); // Refresh the attempts list from DB
}

restartBtn.addEventListener('click', returnToGuide);
restartFromWarningBtn.addEventListener('click', returnToGuide);


function showGameOverModal(yieldVal, costVal, reason, history) {
    modalTitle.textContent = reason.includes("Complete") ? "Congratulations!" : "Game Over";
    
    let detailedMessage = reason;
    if (reason.includes("Budget exceeded")) {
        const overage = costVal - TOTAL_BUDGET;
        detailedMessage = `Budget exceeded by $${overage.toFixed(2)}! The limit was $${TOTAL_BUDGET}, but your final cost was $${costVal.toFixed(2)}.`;
    } else if (reason.includes("pH out of range")) {
        const finalPh = history.length > 0 ? history[history.length-1].stateAfter.ph : gameState.ph;
        detailedMessage = `pH out of range! The safe zone is 5.5-6.5, but your pH went to ${finalPh.toFixed(1)}.`;
    }
    modalMessage.textContent = detailedMessage;

    finalYield.textContent = yieldVal.toFixed(2);
    finalCost.textContent = costVal.toFixed(2);
    
    const summary = calculatePerformanceSummary(history, yieldVal, costVal);
    summaryOptimization.textContent = `${summary.optimizationScore.toFixed(0)} / 100`;
    summaryAdaptability.textContent = `${summary.adaptabilityScore.toFixed(0)} / 100`;
    summaryDiligence.textContent = `${summary.diligenceScore.toFixed(0)}%`;

    generateImprovementSuggestions(summary);

    gameOverModal.classList.remove('hidden');
}


// --- Performance & Feedback Logic ---
function calculatePerformanceSummary(history, finalYield, finalCost) {
    if (!history || history.length === 0) {
        return { optimizationScore: 0, adaptabilityScore: 0, diligenceScore: 0 };
    }

    const phScores = history.map(entry => 1 - Math.abs(entry.stateAfter.ph - 6.0) / 1.5);
    const avgPhScore = phScores.reduce((a, b) => a + b, 0) / phScores.length;
    const yieldToCostRatio = finalCost > 0 ? finalYield / finalCost : 0;
    const normalizedYieldScore = Math.min(1, yieldToCostRatio / 3);
    const optimizationScore = (avgPhScore * 0.6 + normalizedYieldScore * 0.4) * 100;

    let adaptationEvents = 0;
    let adaptationOpportunities = 0;
    for (let i = 0; i < history.length - 1; i++) {
        const event = history[i].stateAfter.lastEvent;
        if (event.includes("PEST") || event.includes("ALGAE")) {
            adaptationOpportunities++;
            const inputsBefore = history[i].inputs;
            const inputsAfter = history[i+1].inputs;
            if (inputsAfter.light !== inputsBefore.light || inputsAfter.nutrientsInput !== inputsBefore.nutrientsInput) {
                adaptationEvents++;
            }
        }
    }
    const adaptabilityScore = adaptationOpportunities > 0 ? (adaptationEvents / adaptationOpportunities) * 100 : 100;

    const filledObservations = history.filter(entry => entry.observation && entry.observation.trim() !== "").length;
    const diligenceScore = (filledObservations / history.length) * 100;

    return {
        optimizationScore,
        adaptabilityScore,
        diligenceScore
    };
}

function generateImprovementSuggestions(summary) {
    suggestionsList.innerHTML = ''; // Clear previous suggestions
    const suggestions = [];

    if (summary.optimizationScore < 70) {
        suggestions.push("Focus on stability. Keeping your pH consistently close to 6.0 is key. Try making smaller, more frequent adjustments.");
        suggestions.push("Analyze the cost of each decision. Is that extra hour of light really worth the price in yield? Look for the most efficient settings.");
    }

    if (summary.adaptabilityScore < 100) {
        suggestions.push("Pay close attention to the Event Log. When a problem occurs, try changing your strategy on the next day to recover or mitigate the damage.");
    }

    if (summary.diligenceScore < 100) {
        suggestions.push("Use the Observation Log to its full potential. Explaining *why* you are making a decision helps solidify your strategy.");
    }
    
    if (suggestions.length === 0) {
        suggestions.push("Excellent work! You demonstrated a strong, balanced approach to managing the farm. Keep refining your strategies.");
    }

    suggestions.forEach(text => {
        const li = document.createElement('li');
        li.textContent = text;
        suggestionsList.appendChild(li);
    });
}

function updateHint() {
    if(!gameState) return;
    const day = gameState.day;
    const ph = gameState.ph;
    const cost = gameState.cost;

    let currentHint = "";

    if (day === 1) {
        currentHint = "Day 1 is about establishing a baseline. Your initial settings will give you the first data point on your graph.";
    } else if (Math.abs(ph - 6.0) > 0.3) {
        currentHint = "Your pH is drifting from the optimal 6.0. This can 'lock out' nutrients and slow growth, even if PPM is high.";
    } else if (cost / day > 4) { // If average daily cost is high
        currentHint = "Your costs are rising quickly. Remember to balance the cost of light and nutrients with the yield they produce.";
    } else if (day > 3 && gameState.lastEvent.includes("calm")) {
        currentHint = "Things are stable. This is a good time to experiment by changing just one variable to see its effect on the graph.";
    } else {
        currentHint = "Look at the trends on your graph. What does the data from yesterday tell you about the decision you should make today?";
    }

    hintText.textContent = currentHint;
}


function updateDailyCostPreview() {
    const light = parseInt(lightHoursInput.value);
    const nutrients = parseInt(nutrientPpmInput.value);
    const dailyCost = (light * 0.25) + (nutrients / 100 * 0.10);
    dailyCostDisplay.textContent = `$${dailyCost.toFixed(2)}`;
}


// --- Charting ---
function loadHistoryAndRenderChart() {
    if (!userId || !currentAttemptId) return;
    const historyRef = ref(db, `users/${userId}/attempts/${currentAttemptId}/history`);
    onValue(historyRef, (snapshot) => {
        const historyData = snapshot.val();
        const labels = [0];
        const yieldData = [0];
        const costData = [0];
        const phData = [6.0];
        const nutrientData = [800];

        if (historyData) {
            const sortedHistory = Object.values(historyData).sort((a, b) => a.day - b.day);
            sortedHistory.forEach(entry => {
                labels.push(entry.day);
                yieldData.push(entry.stateAfter.yield);
                costData.push(entry.stateAfter.cost);
                phData.push(entry.stateAfter.ph);
                nutrientData.push(entry.stateAfter.nutrients);
            });
        }
        renderChart(labels, yieldData, costData, phData, nutrientData);
    });
}

function renderChart(labels, yieldData, costData, phData, nutrientData) {
    const ctx = document.getElementById('performance-chart').getContext('2d');
    if (chart) {
        chart.destroy();
    }
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Yield (kg)',
                    data: yieldData,
                    borderColor: 'rgba(34, 197, 94, 1)',
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    yAxisID: 'y',
                },
                {
                    label: 'Total Cost ($)',
                    data: costData,
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    yAxisID: 'y',
                },
                {
                    label: 'pH Level',
                    data: phData,
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    yAxisID: 'y1',
                },
                {
                    label: 'Nutrients (PPM)',
                    data: nutrientData,
                    borderColor: 'rgba(249, 115, 22, 1)',
                    backgroundColor: 'rgba(249, 115, 22, 0.2)',
                    yAxisID: 'y',
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: 'Day' } },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Value (Yield, Cost, Nutrients)' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'pH' },
                    min: 5,
                    max: 7
                }
            }
        }
    });
}

// Update slider value displays and live cost preview
lightHoursInput.addEventListener('input', (e) => {
    lightHoursValue.textContent = `${e.target.value} hrs`;
    updateDailyCostPreview();
});
nutrientPpmInput.addEventListener('input', (e) => {
    nutrientPpmValue.textContent = `${e.target.value} PPM`;
    updateDailyCostPreview();
});
phAdjustInput.addEventListener('input', (e) => {
    phAdjustValue.textContent = e.target.value;
});