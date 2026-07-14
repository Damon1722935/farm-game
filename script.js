// --- Эмуляция Telegram для браузера (чтобы не падало) ---
let tg;
if (window.Telegram && window.Telegram.WebApp) {
  tg = window.Telegram.WebApp;
  tg.ready();
} else {
  console.warn('⚠️ Режим тестирования вне Telegram.');
  tg = {
    ready: () => console.log('Telegram SDK не загружен, эмуляция'),
    showAlert: (text) => alert(text),
    close: () => window.close() || console.log('Закрыть недоступно')
  };
}
// ---------------------------------------------------------

const cropsConfig = {
  carrot: { name: 'Морковь', price: 20, reward: 30, emoji: '🥕' },
  wheat:  { name: 'Пшеница',  price: 30, reward: 50, emoji: '🌾' },
  strawberry: { name: 'Клубника', price: 50, reward: 80, emoji: '🍓' }
};

let coins = localStorage.getItem('farm_coins') ? parseInt(localStorage.getItem('farm_coins')) : 100; // стартовые 100 монет
let plots = JSON.parse(localStorage.getItem('farm_plots')) || Array(6).fill(null);
let selectedCropKey = 'carrot';

let guildName = localStorage.getItem('farm_guild_name') || null;
let guildLevel = parseInt(localStorage.getItem('farm_guild_level')) || 0;
let guildPoints = parseInt(localStorage.getItem('farm_guild_points')) || 0;

// Элементы
const coinsEl = document.getElementById('coins');
const field = document.getElementById('field');
const harvestBtn = document.getElementById('harvestBtn');
const closeBtn = document.getElementById('closeBtn');
const guildBtn = document.getElementById('guildBtn');
const fieldBtn = document.getElementById('fieldBtn');
const shopBtn = document.getElementById('shopBtn');

const guildScreen = document.getElementById('guild-screen');
const guildNameEl = document.getElementById('guild-name');
const guildLevelEl = document.getElementById('guild-level');
const guildPointsEl = document.getElementById('guild-points');
const createGuildBtn = document.getElementById('create-guild-btn');
const joinGuildBtn = document.getElementById('join-guild-btn');

const shopContainer = document.getElementById('shop');
const fieldScreen = document.getElementById('field-screen');
const shopScreen = document.getElementById('shop-screen');

function saveProgress() {
  localStorage.setItem('farm_coins', coins.toString());
  localStorage.setItem('farm_plots', JSON.stringify(plots));
}

function saveGuild() {
  localStorage.setItem('farm_guild_name', guildName);
  localStorage.setItem('farm_guild_level', guildLevel.toString());
  localStorage.setItem('farm_guild_points', guildPoints.toString());
}

// Переключение экранов
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');
}

fieldBtn.onclick = () => showScreen('field-screen');
shopBtn.onclick = () => {
  renderShop();
  showScreen('shop-screen');
};
guildBtn.onclick = () => {
  renderGuildInfo();
  showScreen('guild-screen');
};

// Магазин
function renderShop() {
  shopContainer.innerHTML = '';
  for (const key in cropsConfig) {
    const crop = cropsConfig[key];
    const item = document.createElement('div');
    item.className = 'shop-item';
    item.innerHTML = `
      <span class="shop-name">${crop.name}</span>
      <span class="shop-price">${crop.price} монет</span>
    `;
    item.onclick = () => {
      selectedCropKey = key;
      showScreen('field-screen');
      tg.showAlert(`Выбрано: ${crop.name}. Теперь сажай на поле!`);
    };
    shopContainer.appendChild(item);
  }
}

// Поле
function renderField() {
  field.innerHTML = '';
  plots.forEach((cropKey, i) => {
    const plot = document.createElement('div');
    plot.className = 'plot';
    if (cropKey) {
      const crop = cropsConfig[cropKey];
      plot.textContent = crop.emoji;
      if (cropKey === 'carrot') plot.style.background = '#ffca28';
      if (cropKey === 'wheat') plot.style.background = '#c5e1a5';
      if (cropKey === 'strawberry') plot.style.background = '#ffcdd2';
    }
    field.appendChild(plot);
  });
  coinsEl.textContent = coins;
}

// Гильдия
function renderGuildInfo() {
  guildNameEl.textContent = guildName || 'Не выбрана';
  guildLevelEl.textContent = guildLevel;
  guildPointsEl.textContent = guildPoints;
}

if (plots.length !== 6) {
  plots = Array(6).fill(null);
  saveProgress();
}

renderShop();
renderField();
renderGuildInfo();

// Посадка по клику на грядку
field.addEventListener('click', (e) => {
  const plot = e.target.closest('.plot');
  if (!plot) return;

  const index = Array.from(field.children).indexOf(plot);
  if (plots[index]) return; // уже растёт

  const crop = cropsConfig[selectedCropKey];
  if (coins >= crop.price) {
    coins -= crop.price;
    plots[index] = selectedCropKey;
    saveProgress();
    renderField();
  } else {
    tg.showAlert(`Не хватает монет! Нужно ${crop.price}, у вас ${coins}.`);
  }
});

// Сбор урожая
harvestBtn.onclick = () => {
  let harvested = false;
  plots.forEach((cropKey, i) => {
    if (cropKey) {
      const crop = cropsConfig[cropKey];
      coins += crop.reward;
      plots[i] = null;
      harvested = true;
    }
  });
  if (harvested) {
    saveProgress();
    renderField();
  } else {
    tg.showAlert('Нечего собирать!');
  }
};

closeBtn.onclick = () => tg.close();

// Гильдия: создать/вступить
createGuildBtn.onclick = () => {
  const name = prompt('Придумай название гильдии:');
  if (!name || name.trim() === '') return;
  guildName = name.trim();
  guildLevel = 1;
  saveGuild();
  renderGuildInfo();
  tg.showAlert('Гильдия создана: ' + guildName);
};

joinGuildBtn.onclick = () => {
  const name = prompt('Введи название гильдии для вступления:');
  if (!name || name.trim() === '') return;
  guildName = name.trim();
  guildLevel = 1;
  saveGuild();
  renderGuildInfo();
  tg.showAlert('Ты вступил в гильдию: ' + guildName);
};

