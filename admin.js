import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

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

// --- Authentication & Role Check ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, NOW VERIFY THEIR ROLE
        const userRoleRef = ref(db, 'users/' + user.uid + '/role');
        onValue(userRoleRef, (snapshot) => {
            const role = snapshot.val();
            if (role === 'admin') {
                // SUCCESS: User is an admin, show the dashboard
                adminLoginSection.classList.add('hidden');
                adminMainContent.classList.remove('hidden');
                loadAllUsersData();
            } else {
                // FAILURE: User is not an admin, deny access
                adminLoginError.textContent = "Access Denied. Admin privileges required.";
                signOut(auth); // Log them out immediately
            }
        }, {
            // Use onlyOnce to prevent this from running multiple times
            onlyOnce: true 
        });

    } else {
        // Admin is signed out
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
        userList.innerHTML = '<li>No user data found.</li>';
        return;
    }

    Object.keys(allUsersData).forEach(userId => {
        const user = allUsersData[userId];
        if (user.gameState) {
            const listItem = document.createElement('li');
            const userName = user.gameState.userName || `User ${userId.substring(0, 5)}`;
            const statusDot = document.createElement('span');
            statusDot.classList.add('status-dot');
            statusDot.classList.toggle('active', !user.gameState.gameOver);
            statusDot.classList.toggle('game-over', user.gameState.gameOver);
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = userName;
            
            listItem.appendChild(nameSpan);
            listItem.appendChild(statusDot);
            
            listItem.dataset.userId = userId;
            listItem.addEventListener('click', () => {
                document.querySelectorAll('#user-list li').forEach(li => li.classList.remove('active'));
                listItem.classList.add('active');
                displayUserDetails(userId);
            });
            userList.appendChild(listItem);
        }
    });
}

function displayUserDetails(userId) {
    const user = allUsersData[userId];
    const userName = user.gameState.userName || `User ${userId.substring(0, 5)}`;
    detailsUsername.textContent = `Details for ${userName}`;
    detailsContent.innerHTML = '';

    const summary = document.createElement('div');
    summary.classList.add('history-item');
    summary.innerHTML = `
        <h4>Current Status (Day ${user.gameState.day})</h4>
        <p><strong>Yield:</strong> ${user.gameState.yield.toFixed(2)} kg</p>
        <p><strong>Cost:</strong> $${user.gameState.cost.toFixed(2)}</p>
        <p><strong>pH:</strong> ${user.gameState.ph.toFixed(1)}</p>
        <p><strong>Nutrients:</strong> ${Math.round(user.gameState.nutrients)} PPM</p>
        ${user.gameState.gameOver ? `<p><strong>Status:</strong> <span style="color: #ef4444;">Game Over - ${user.gameState.gameOverReason}</span></p>` : ''}
    `;
    detailsContent.appendChild(summary);

    if (user.history) {
        const sortedHistory = Object.values(user.history).sort((a, b) => a.day - b.day);
        sortedHistory.forEach(entry => {
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
        detailsContent.innerHTML += '<p>No history recorded for this user yet.</p>';
    }

    userDetailsContainer.classList.remove('hidden');
}

// Add user's email to their game state upon first login for display purposes
onAuthStateChanged(auth, (user) => {
    if(user && user.email) {
        // This check is primarily for the main app, but doesn't hurt here.
        // It ensures the username is set in the gameState for the admin to see.
        const userStateRef = ref(db, `users/${user.uid}/gameState/userName`);
        onValue(userStateRef, (snapshot) => {
            if(!snapshot.exists()) {
                set(userStateRef, user.email);
            }
        }, { onlyOnce: true });
    }
});
