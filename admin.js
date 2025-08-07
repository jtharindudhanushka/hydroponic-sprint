import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getDatabase, ref, onValue, get } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

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

// Set persistence
setPersistence(auth, browserLocalPersistence);

// UI Elements
const adminLoginSection = document.getElementById('admin-login-section');
const adminMainContent = document.getElementById('admin-main-content');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const adminEmailInput = document.getElementById('admin-email');
const adminPasswordInput = document.getElementById('admin-password');
const adminLoginError = document.getElementById('admin-login-error');
const userList = document.getElementById('user-list');
const userDetailsContainer = document.getElementById('user-details-container');
const detailsUsername = document.getElementById('details-username');
const detailsContent = document.getElementById('details-content');

let allUsersData = {};

// --- Authentication ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRoleRef = ref(db, 'users/' + user.uid + '/role');
        get(userRoleRef).then((snapshot) => {
            if (snapshot.val() === 'admin') {
                adminLoginSection.classList.add('hidden');
                adminMainContent.classList.remove('hidden');
                loadAllUsersData();
            } else {
                adminLoginError.textContent = "Access Denied. Admin privileges required.";
                signOut(auth);
            }
        });
    } else {
        adminLoginSection.classList.remove('hidden');
        adminMainContent.classList.add('hidden');
    }
});

adminLoginBtn.addEventListener('click', () => {
    const email = adminEmailInput.value;
    const password = adminPasswordInput.value;
    adminLoginError.textContent = '';
    signInWithEmailAndPassword(auth, email, password)
        .catch(() => adminLoginError.textContent = "Invalid admin credentials.");
});

adminLogoutBtn.addEventListener('click', () => signOut(auth));

// --- Data Loading and Display ---
function loadAllUsersData() {
    const usersRef = ref(db, 'users/');
    onValue(usersRef, (snapshot) => {
        allUsersData = snapshot.val();
        renderUserList();
    });
}

function renderUserList() {
    userList.innerHTML = '';
    if (!allUsersData) {
        userList.innerHTML = '<p>No user data found.</p>';
        return;
    }

    Object.entries(allUsersData).forEach(([userId, userData]) => {
        if (userData.role === 'admin') return; // Don't show admin in the user list

        const userContainer = document.createElement('div');
        userContainer.classList.add('user-container');

        const userName = userData.displayName || `User ${userId.substring(0, 5)}`;
        const userHeader = document.createElement('h4');
        userHeader.textContent = userName;
        userHeader.classList.add('user-header');
        userContainer.appendChild(userHeader);

        if (userData.attempts) {
            const attemptsSubList = document.createElement('ul');
            attemptsSubList.classList.add('attempts-sublist');
            
            // Sort attempts by creation date, newest first
            const sortedAttempts = Object.entries(userData.attempts)
                .sort((a, b) => new Date(b[1].createdAt) - new Date(a[1].createdAt));

            sortedAttempts.forEach(([attemptId, attemptData]) => {
                const attemptItem = document.createElement('li');
                attemptItem.classList.add('attempt-item-admin');
                
                const date = new Date(attemptData.createdAt).toLocaleDateString();
                let status = 'In Progress';
                if (attemptData.gameState.gameOver) {
                    status = attemptData.gameState.gameOverReason.includes('Complete') ? 'Complete' : 'Failed';
                }
                
                attemptItem.textContent = `Attempt on ${date} - ${status}`;
                attemptItem.dataset.userId = userId;
                attemptItem.dataset.attemptId = attemptId;

                attemptItem.addEventListener('click', (e) => {
                    document.querySelectorAll('.attempt-item-admin').forEach(item => item.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    displayUserDetails(userId, attemptId);
                });
                attemptsSubList.appendChild(attemptItem);
            });
            
            userContainer.appendChild(attemptsSubList);
        } else {
             const noAttempts = document.createElement('p');
             noAttempts.textContent = 'No attempts recorded.';
             noAttempts.classList.add('no-attempts-text');
             userContainer.appendChild(noAttempts);
        }
        userList.appendChild(userContainer);
    });
}

function displayUserDetails(userId, attemptId) {
    const attemptData = allUsersData[userId].attempts[attemptId];
    const userName = allUsersData[userId].displayName || `User ${userId.substring(0, 5)}`;
    const attemptDate = new Date(attemptData.createdAt).toLocaleString();
    
    detailsUsername.textContent = `Details for ${userName} (Attempt: ${attemptDate})`;
    detailsContent.innerHTML = '';

    const summary = document.createElement('div');
    summary.classList.add('history-item');
    summary.innerHTML = `
        <h4>Final Status (Day ${attemptData.gameState.day})</h4>
        <p><strong>Yield:</strong> ${attemptData.gameState.yield.toFixed(2)} kg</p>
        <p><strong>Cost:</strong> $${attemptData.gameState.cost.toFixed(2)}</p>
        <p><strong>Final pH:</strong> ${attemptData.gameState.ph.toFixed(1)}</p>
        ${attemptData.gameState.gameOver ? `<p><strong>Status:</strong> <span class="status-text-${attemptData.gameState.gameOverReason.includes('Complete') ? 'complete' : 'failed'}">${attemptData.gameState.gameOverReason}</span></p>` : ''}
    `;
    detailsContent.appendChild(summary);

    if (attemptData.history) {
        Object.values(attemptData.history).forEach(entry => {
            const historyItem = document.createElement('div');
            historyItem.classList.add('history-item');
            historyItem.innerHTML = `
                <h4>Day ${entry.day} Decisions & Log</h4>
                <p><strong>Inputs:</strong> Light: ${entry.inputs.light}h, Nutrients: ${entry.inputs.nutrientsInput} PPM, pH Adj: ${entry.inputs.phAdjust}</p>
                <p><strong>Resulting State:</strong> Yield: ${entry.stateAfter.yield.toFixed(2)}kg, Cost: $${entry.stateAfter.cost.toFixed(2)}, pH: ${entry.stateAfter.ph.toFixed(1)}</p>
                <p><strong>Event:</strong> ${entry.stateAfter.lastEvent}</p>
                <p class="observation"><strong>Observation:</strong> "${entry.observation}"</p>
            `;
            detailsContent.appendChild(historyItem);
        });
    } else {
        detailsContent.innerHTML += '<p>No history recorded for this attempt yet.</p>';
    }

    userDetailsContainer.classList.remove('hidden');
}