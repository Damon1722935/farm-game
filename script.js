// --- Эмуляция Telegram ---
let tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : { 
    ready: () => {}, 
    showAlert: (t) => alert(t) 
};
tg.ready();

// --- Конфигурация ---
const cropsConfig = {
  carrot: { name: 'Морковь', price: 20, reward: 30, emoji: '🥕', growTime: 10 },
  wheat:  { name: 'Пшеница',  price: 30, reward: 50, emoji: '🌾', growTime: 20 },
  strawberry: { name: 'Клубника', price: 50, reward: 80, emoji: '🍓', growTime: 30 }
};

let coins = parseInt(localStorage.getItem('farm_coins')) || 100;
let inventory = JSON.parse(localStorage.getItem('farm_inventory')) || { carrot: 0, wheat: 0, strawberry: 0 };
let plots = JSON.parse(localStorage.getItem('farm_plots')) || Array(6).fill(null);
let buyQuantities = { carrot: 1, wheat: 1, strawberry: 1 }; // Состояние выбора количества

// --- Сохранение ---
function saveProgress() {
  localStorage.setItem('farm_coins', coins);
  localStorage.setItem('farm_inventory', JSON.stringify(inventory));
  localStorage.setItem('farm_plots', JSON.stringify(plots));
}

// --- Управление экранами ---
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  document.getElementById('mapDropdown').classList.remove('show');
}

document.getElementById('shopBtn').onclick = () => { showScreen('shop-screen'); renderShop(); };
document.getElementById('inventoryBtn').onclick = () => { showScreen('inventory-screen'); renderInventory(); };
document.getElementById('mapBtn').onclick = () => document.getElementById('mapDropdown').classList.toggle('show');

// --- Магазин ---
function renderShop() {
  const shopEl = document.getElementById('shop');
  shopEl.innerHTML = '';
  for (const key in cropsConfig) {
    const crop = cropsConfig[key];
    const qty = buyQuantities[key];
    const cost = qty * crop.price;
    
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `
      <span>${crop.emoji} ${crop.name} (${crop.price}💰)</span>
      <div class="shop-controls">
        <button class="qty-btn" onclick="changeQty('${key}', -1)">-</button>
        <span style="font-weight:bold; width:20px; text-align:center;">${qty}</span>
        <button class="qty-btn" onclick="changeQty('${key}', 1)">+</button>
        <button class="buy-btn" onclick="buyCrop('${key}')">Купить ${cost}💰</button>
      </div>
    `;
    shopEl.appendChild(div);
  }
}

window.changeQty = (key, delta) => {
  buyQuantities[key] = Math.max(1, buyQuantities[key] + delta);
  renderShop();
};

window.buyCrop = (key) => {
  const crop = cropsConfig[key];
  const qty = buyQuantities[key];
  const totalCost = qty * crop.price;
  if (coins >= totalCost) {
    coins -= totalCost;
    inventory[key] = (inventory[key] || 0) + qty;
    saveProgress();
    document.getElementById('coins').textContent = coins;
    tg.showAlert(`Куплено ${qty} шт.`);
    renderShop();
  } else {
    tg.showAlert('Не хватает монет!');
  }
};

// --- Инвентарь ---
function renderInventory() {
  const invEl = document.getElementById('inventory');
  invEl.innerHTML = '';
  for (const key in inventory) {
    if (inventory[key] > 0) {
      const div = document.createElement('div');
      div.className = 'inventory-item';
      div.innerHTML = `<span>${cropsConfig[key].emoji} ${cropsConfig[key].name}</span> <span>${inventory[key]} шт.</span>`;
      invEl.appendChild(div);
    }
  }
}

// --- Поле (упрощенная логика для примера) ---
function renderField() {
  const fieldEl = document.getElementById('field');
  fieldEl.innerHTML = '';
  plots.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'plot';
    div.textContent = p ? '🌱' : '+';
    div.onclick = () => { /* логика посадки */ };
    fieldEl.appendChild(div);
  });
}

// Инициализация
renderField();
renderShop();
