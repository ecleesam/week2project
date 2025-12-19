const API_BASE_URL = 'http://localhost:5000'; 

// Auth Functions
async function login(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Login failed');
        }

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

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Registration failed');
        }
        
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

// Shop & Items Functions
async function fetchCredits() {
    const token = localStorage.getItem('jwt_token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/shop/credits`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            const creditsEl = document.getElementById('credits-display');
            if (creditsEl) creditsEl.textContent = data.credits;
        }
    } catch (error) {
        console.error('Error fetching credits:', error);
    }
}

async function earnCredits(amount) {
    const token = localStorage.getItem('jwt_token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/shop/earn-credits`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ amount })
        });

        if (response.ok) {
            const data = await response.json();
            console.log(data.message);
            const creditsEl = document.getElementById('credits-display');
            if (creditsEl) creditsEl.textContent = data.totalCredits;
        }
    } catch (error) {
        console.error('Error earning credits:', error);
    }
}

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

async function buyItem(itemId) {
    const token = localStorage.getItem('jwt_token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/shop/buy/${itemId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            // Update credits display
            const creditsEl = document.getElementById('credits-display');
            if (creditsEl) creditsEl.textContent = data.remainingCredits;
        } else {
            alert('Purchase failed: ' + (data.message || response.statusText));
        }
    } catch (error) {
        console.error('Error buying item:', error);
        alert('Error buying item');
    }
}

function displayItems(items) {
    const list = document.getElementById('items-list');
    list.innerHTML = '';
    
    items.forEach(item => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.marginBottom = '5px';

        // Use item.value for cost, item.name for the cool name
        const infoSpan = document.createElement('span');
        infoSpan.textContent = `${item.name} (${item.category === 0 ? 'Weapon' : 'PowerUp'}) - Cost: ${item.value}`;
        
        const buyBtn = document.createElement('button');
        buyBtn.textContent = 'Buy';
        buyBtn.onclick = () => buyItem(item.id);
        buyBtn.style.marginLeft = '10px';

        li.appendChild(infoSpan);
        li.appendChild(buyBtn);
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
        fetchCredits(); // Fetch credits when logged in
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
