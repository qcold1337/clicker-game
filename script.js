// Game state
const state = {
    points: 0,
    clickPower: 1,
    clickMultiplier: 1,
    autoClickPower: 0,
    upgrades: {
        clickPower: { level: 0, baseCost: 10, costMultiplier: 1.5 },
        autoClicker: { level: 0, baseCost: 50, costMultiplier: 2.0 },
        clickMultiplier: { level: 0, baseCost: 200, costMultiplier: 2.5 }
    }
};

// DOM elements
const elements = {
    points: document.getElementById('points'),
    cps: document.getElementById('cps'),
    clickBtn: document.getElementById('clickBtn'),
    clickBonus: document.getElementById('clickBonus'),
    clickArea: document.getElementById('clickArea'),
    floatingNumbers: document.getElementById('floatingNumbers'),
    upgradeList: document.getElementById('upgradeList'),
    resetBtn: document.getElementById('resetBtn')
};

// Upgrade definitions
const upgradeDefs = [
    {
        id: 'clickPower',
        name: 'Сила клика',
        desc: 'Увеличивает очки за клик на +1',
        getEffect: (level) => level,
        getNextEffect: (level) => level + 1,
        formatEffect: (level) => `+${level}/клик`
    },
    {
        id: 'autoClicker',
        name: 'Автокликер',
        desc: 'Автоматически кликает за вас',
        getEffect: (level) => level,
        getNextEffect: (level) => level + 1,
        formatEffect: (level) => `${level}/сек`
    },
    {
        id: 'clickMultiplier',
        name: 'Множитель',
        desc: 'Умножает все получаемые очки',
        getEffect: (level) => 1 + level * 0.5,
        getNextEffect: (level) => 1 + (level + 1) * 0.5,
        formatEffect: (level) => `x${(1 + level * 0.5).toFixed(1)}`
    }
];

// Initialize game
function init() {
    loadGame();
    renderUpgrades();
    updateDisplay();
    setupEventListeners();
    startAutoClicker();
    requestAnimationFrame(gameLoop);
}

// Load from localStorage
function loadGame() {
    try {
        const saved = localStorage.getItem('clickerSave');
        if (saved) {
            const data = JSON.parse(saved);
            state.points = data.points || 0;
            state.clickPower = data.clickPower || 1;
            state.clickMultiplier = data.clickMultiplier || 1;
            state.autoClickPower = data.autoClickPower || 0;
            if (data.upgrades) {
                Object.keys(state.upgrades).forEach(key => {
                    if (data.upgrades[key]) {
                        state.upgrades[key].level = data.upgrades[key].level || 0;
                    }
                });
            }
            // Recalculate derived values
            recalculateStats();
        }
    } catch (e) {
        console.warn('Failed to load save:', e);
    }
}

// Save to localStorage
function saveGame() {
    try {
        const data = {
            points: state.points,
            clickPower: state.clickPower,
            clickMultiplier: state.clickMultiplier,
            autoClickPower: state.autoClickPower,
            upgrades: {}
        };
        Object.keys(state.upgrades).forEach(key => {
            data.upgrades[key] = { level: state.upgrades[key].level };
        });
        localStorage.setItem('clickerSave', JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save game:', e);
    }
}

// Recalculate derived stats from upgrade levels
function recalculateStats() {
    state.clickPower = 1 + state.upgrades.clickPower.level;
    state.autoClickPower = state.upgrades.autoClicker.level;
    state.clickMultiplier = 1 + state.upgrades.clickMultiplier.level * 0.5;
}

// Get current upgrade cost
function getUpgradeCost(upgradeId) {
    const upgrade = state.upgrades[upgradeId];
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
}

// Check if can afford upgrade
function canAfford(upgradeId) {
    return state.points >= getUpgradeCost(upgradeId);
}

// Buy upgrade
function buyUpgrade(upgradeId) {
    const cost = getUpgradeCost(upgradeId);
    if (state.points >= cost) {
        state.points -= cost;
        state.upgrades[upgradeId].level++;
        recalculateStats();
        saveGame();
        updateDisplay();
        renderUpgrades();
        return true;
    }
    return false;
}

// Format number for display
function formatNumber(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return Math.floor(num).toLocaleString();
}

// Update display elements
function updateDisplay() {
    elements.points.textContent = formatNumber(state.points);
    elements.cps.textContent = formatNumber(getCPS());
    elements.clickBonus.textContent = `+${formatNumber(getClickGain())}`;
}

// Get current click gain
function getClickGain() {
    return state.clickPower * state.clickMultiplier;
}

// Get current CPS (clicks per second from auto-clicker)
function getCPS() {
    return state.autoClickPower * state.clickMultiplier;
}

// Render upgrade cards
function renderUpgrades() {
    elements.upgradeList.innerHTML = '';
    
    upgradeDefs.forEach(def => {
        const upgrade = state.upgrades[def.id];
        const cost = getUpgradeCost(def.id);
        const canBuy = canAfford(def.id);
        const currentEffect = def.getEffect(upgrade.level);
        const nextEffect = def.getNextEffect(upgrade.level);
        
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `
            <div class="upgrade-header">
                <div class="upgrade-info">
                    <div class="upgrade-name">${def.name}</div>
                    <div class="upgrade-desc">${def.desc}</div>
                </div>
                <span class="upgrade-level">Ур. ${upgrade.level}</span>
            </div>
            <div class="upgrade-footer">
                <span class="upgrade-cost">${formatNumber(cost)}</span>
                <button class="upgrade-btn" data-upgrade="${def.id}" ${!canBuy ? 'disabled' : ''}>
                    Купить
                </button>
            </div>
        `;
        elements.upgradeList.appendChild(card);
    });
    
    // Add click listeners to upgrade buttons
    document.querySelectorAll('.upgrade-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const upgradeId = e.target.dataset.upgrade;
            if (buyUpgrade(upgradeId)) {
                // Visual feedback
                e.target.style.transform = 'scale(0.95)';
                setTimeout(() => e.target.style.transform = '', 100);
            }
        });
    });
}

// Create floating number animation
function createFloatingNumber(x, y, value) {
    const number = document.createElement('div');
    number.className = 'floating-number';
    number.textContent = `+${formatNumber(value)}`;
    
    // Position relative to click area
    const rect = elements.clickArea.getBoundingClientRect();
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;
    
    number.style.left = `${relativeX}px`;
    number.style.top = `${relativeY}px`;
    
    elements.floatingNumbers.appendChild(number);
    
    // Remove after animation
    setTimeout(() => {
        number.remove();
    }, 1000);
}

// Handle click on main button
function handleClick(e) {
    const gain = getClickGain();
    state.points += gain;
    saveGame();
    updateDisplay();
    
    // Create floating number at click position
    createFloatingNumber(e.clientX, e.clientY, gain);
    
    // Button press animation
    elements.clickBtn.style.transform = 'scale(0.92)';
    setTimeout(() => {
        elements.clickBtn.style.transform = '';
    }, 80);
}

// Auto-clicker loop
let lastAutoClick = 0;
function gameLoop(timestamp) {
    if (state.autoClickPower > 0 && timestamp - lastAutoClick >= 1000) {
        const gain = getCPS();
        state.points += gain;
        saveGame();
        updateDisplay();
        lastAutoClick = timestamp;
    }
    requestAnimationFrame(gameLoop);
}

// Start auto-clicker (just initializes the timer)
function startAutoClicker() {
    lastAutoClick = performance.now();
}

// Setup event listeners
function setupEventListeners() {
    // Main click button
    elements.clickBtn.addEventListener('click', handleClick);
    
    // Touch support for mobile
    elements.clickBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        handleClick({ clientX: touch.clientX, clientY: touch.clientY });
    }, { passive: false });
    
    // Reset button
    elements.resetBtn.addEventListener('click', () => {
        if (confirm('Вы уверены? Весь прогресс будет удален навсегда.')) {
            localStorage.removeItem('clickerSave');
            location.reload();
        }
    });
    
    // Save on page unload
    window.addEventListener('beforeunload', saveGame);
    
    // Keyboard support - space to click
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !e.repeat && document.activeElement === document.body) {
            e.preventDefault();
            const rect = elements.clickBtn.getBoundingClientRect();
            handleClick({ 
                clientX: rect.left + rect.width / 2, 
                clientY: rect.top + rect.height / 2 
            });
        }
    });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}