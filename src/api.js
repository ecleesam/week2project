const API_BASE_URL = 'http://localhost:5000'; 

// Auth Functions
async function login(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) throw new Error('Login failed');

        const data = await response.json();
        localStorage.setItem('jwt_token', data.token);
        localStorage.setItem('username', username);
        updateAuthUI();
        alert('Login successful!');
    } catch (error) {
        console.error('Error:', error);
        alert('Login failed: ' + error.message);
    }
}

async function register(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) throw new Error('Registration failed');
        
        alert('Registration successful! Please login.');
    } catch (error) {
        console.error('Error:', error);
        alert('Registration failed: ' + error.message);
    }
}

function logout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('username');
    updateAuthUI();
}

// Items Functions
async function fetchItems() {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        alert('Please login first to view items.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/items`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                logout();
                throw new Error('Session expired. Please login again.');
            }
            throw new Error('Failed to fetch items');
        }

        const items = await response.json();
        displayItems(items);
    } catch (error) {
        console.error('Error:', error);
        alert('Error loading items: ' + error.message);
    }
}

function displayItems(items) {
    const list = document.getElementById('items-list');
    list.innerHTML = '';
    
    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.name} - Cost: ${item.cost}`;
        list.appendChild(li);
    });
}

// UI Updates
function updateAuthUI() {
    const token = localStorage.getItem('jwt_token');
    const username = localStorage.getItem('username');
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    const displayUsername = document.getElementById('display-username');

    if (token) {
        loginForm.classList.add('hidden');
        userInfo.classList.remove('hidden');
        displayUsername.textContent = username;
    } else {
        loginForm.classList.remove('hidden');
        userInfo.classList.add('hidden');
        displayUsername.textContent = '';
        document.getElementById('items-list').innerHTML = '';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();

    document.getElementById('btn-login').addEventListener('click', () => {
        const u = document.getElementById('username').value;
        const p = document.getElementById('password').value;
        if(u && p) login(u, p);
    });

    document.getElementById('btn-register').addEventListener('click', () => {
        const u = document.getElementById('username').value;
        const p = document.getElementById('password').value;
        if(u && p) register(u, p);
    });

    document.getElementById('btn-logout').addEventListener('click', logout);
    
    document.getElementById('btn-load-items').addEventListener('click', fetchItems);
});
