// --- Эмуляция Telegram для браузера ---
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
// --------------------------------------

const cropsConfig = {
  carrot: { name: 'Морковь', price: 20, reward: 30, emoji: '🥕', growTime: 120 },
  wheat:  { name: 'Пшеница',  price: 30, reward: 50, emoji: '🌾', growTime: 300 },
  strawberry: { name: 'Клубника', price: 50, reward: 80, emoji: '🍓', growTime: 480 }
};

// Сброс данных при смене версии
const currentVersion = 'v2.2';
const storedVersion = localStorage.getItem('farm_version');
if (storedVersion !== currentVersion) {
  localStorage.removeItem('farm_coins');
  localStorage.removeItem('farm_plots');
  localStorage.removeItem('farm_guild_name');
  localStorage.removeItem('farm_guild_leader');
  localStorage.removeItem('farm_guild_members');
  localStorage.removeItem('farm_guild_level');
  localStorage.removeItem('farm_guild_points');
  localStorage.setItem('farm_version', currentVersion);
  console.log('🧹 Данные сброшены под новую версию игры (гильдии сохранены в структуре).');
}

let coins = localStorage.getItem('farm_coins') ? parseInt(localStorage.getItem('farm_coins')) : 100;
let plots = JSON.parse(localStorage.getItem('farm_plots')) || Array(6).fill(null);
let selectedCropKey = 'carrot';

// Данные гильдии
let guildName = localStorage.getItem('farm_guild_name') || null;
let guildLeader = localStorage.getItem('farm_guild_leader') || null;
let guildMembers = JSON.parse(localStorage.getItem('farm_guild_members')) || [];
let guildLevel = parseInt(localStorage.getItem('farm_guild_level')) || 0;
let guildPoints = parseInt(localStorage.getItem('farm_guild_points')) || 0;

// Элементы DOM
const coinsEl = document.getElementById('coins');
const field = document.getElementById('field');
const fieldBtn = document.getElementById('fieldBtn');
const shopBtn = document.getElementById('shopBtn');
const guildBtn = document.getElementById('guildBtn');

const shopContainer = document.getElementById('shop');

// Элементы гильдии
const guildNameEl = document.getElementById('guild-name');
const guildLeaderEl = document.getElementById('guild-leader');
const guildMembersCountEl = document.getElementById('guild-members-count');
const guildLevelEl = document.getElementById('guild-level');
const guildPointsEl = document.getElementById('guild-points');
const guildActions = document.getElementById('guild-actions');

const createGuildBtn = document.getElementById('create-guild-btn');
const joinGuildBtn = document.getElementById('join-guild-btn');
const leaveGuildBtn = document.getElementById('leave-guild-btn');
const disbandGuildBtn = document.getElementById('disband-guild-btn');

function saveProgress() {
  localStorage.setItem('farm_coins', coins.toString());
  localStorage.setItem('farm_plots', JSON.stringify(plots));
}

function saveGuild() {
  localStorage.setItem('farm_guild_name', guildName);
  localStorage.setItem('farm_guild_leader', guildLeader);
  localStorage.setItem('farm_guild_members', JSON.stringify(guildMembers));
  localStorage.setItem('farm_guild_level', guildLevel.toString());
  localStorage.setItem('farm_guild_points', guildPoints.toString());
}

function saveCurrentNick() {
  // Если понадобится никнейм игрока
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');
}

fieldBtn.onclick = () => showScreen('field-screen');
shopBtn.onclick = () => { renderShop(); showScreen('shop-screen'); };
guildBtn.onclick = () => { renderGuildInfo(); showScreen('guild-screen'); };

function getTimeLeft(plantedAt, growTimeSeconds) {
  const now = Date.now();
  const elapsed = Math.floor((now - plantedAt) / 1000);
  const left = Math.max(0, growTimeSeconds - elapsed);
  return left;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function renderShop() {
  shopContainer.innerHTML = '';
  for (const key in cropsConfig) {
    const crop = cropsConfig[key];
    const item = document.createElement('div');
    item.className = 'shop-item';
    item.innerHTML = `<span class="shop-name">${crop.name}</span><span class="shop-price">${crop.price}💰</span>`;
    item.onclick = () => {
      if (coins >= crop.price) {
        coins -= crop.price;
        selectedCropKey = key;
        tg.showAlert(`Вы выбрали: ${crop.name}. Теперь сажайте на поле.`);
        showScreen('field-screen');
        renderField();
      } else {
        tg.showAlert(`Не хватает монет! Нужно ${crop.price}, у вас ${coins}.`);
      }
    };
    shopContainer.appendChild(item);
  }
}

// --- ГЛАВНАЯ ОТРИСОВКА ПОЛЯ (грядок) ---
function renderField() {
  field.innerHTML = '';

  plots.forEach((plotData, i) => {
    const plot = document.createElement('div');
    plot.className = 'plot';

    if (plotData) {
      const { cropKey, plantedAt } = plotData;
      const crop = cropsConfig[cropKey];

      plot.textContent = crop.emoji;

      const timeLeft = getTimeLeft(plantedAt, crop.growTime);
      const isReady = timeLeft <= 0;

      const timerEl = document.createElement('span');
      timerEl.className = 'plot-timer';
      timerEl.textContent = isReady ? 'ГОТОВО' : formatTime(timeLeft);
      plot.appendChild(timerEl);

      plot.onclick = () => {
        if (!isReady) {
          tg.showAlert('Ещё рано — растение не выросло!');
          return;
        }
        plots[i] = null;
        coins += crop.reward;
        saveProgress();
        renderField();
        tg.showAlert(`Ты собрал ${crop.name}! Получено монет: ${crop.reward}.`);
      };

      if (!isReady) {
        plot.style.cursor = 'not-allowed';
        plot.style.opacity = '0.85';
      }
    } else {
      plot.textContent = '🌱';
      plot.onclick = () => {
        const crop = cropsConfig[selectedCropKey];
        if (coins >= crop.price) {
          coins -= crop.price;
          plots[i] = { cropKey: selectedCropKey, plantedAt: Date.now() };
          saveProgress();
          renderField();
          tg.showAlert(`Ты посадил ${crop.name}!`);
        } else {
          tg.showAlert(`Не хватает монет! Нужно ${crop.price}, у тебя ${coins}.`);
        }
      };
    }

    field.appendChild(plot);
  });

  coinsEl.textContent = coins;
}
// --- ОТРИСОВКА И ЛОГИКА ГИЛЬДИИ ---

function renderGuildInfo() {
  if (guildName) {
    guildNameEl.textContent = guildName;
    guildLeaderEl.textContent = guildLeader;
    guildMembersCountEl.textContent = guildMembers.length;
    guildLevelEl.textContent = guildLevel;
    guildPointsEl.textContent = guildPoints;
    guildActions.style.display = 'block';
  } else {
    guildNameEl.textContent = '—';
    guildLeaderEl.textContent = '—';
    guildMembersCountEl.textContent = '0';
    guildLevelEl.textContent = '0';
    guildPointsEl.textContent = '0';
    guildActions.style.display = 'none';
  }
}

// Создание гильдии
createGuildBtn.onclick = () => {
  const name = prompt('Придумайте название гильдии (до 20 символов):');
  if (!name || name.trim() === '') return;
  const cleanName = name.trim().substring(0, 20);

  if (guildName) {
    tg.showAlert('Вы уже состоите в гильдии! Сначала покиньте её.');
    return;
  }

  guildName = cleanName;
  guildLeader = currentNick || 'Игрок';
  guildMembers = [guildLeader];
  guildLevel = 1;
  guildPoints = 0;

  saveGuild();
  renderGuildInfo();
  tg.showAlert(`Гильдия "${guildName}" создана! Вы — её лидер.`);
};

// Вступление в гильдию (упрощённо: сразу вступает, без кода приглашения)
joinGuildBtn.onclick = () => {
  const name = prompt('Введите название гильдии для вступления:');
  if (!name || name.trim() === '') return;
  const cleanName = name.trim().substring(0, 20);

  if (guildName) {
    tg.showAlert('Вы уже состоите в гильдии!');
    return;
  }

  // В рамках этой версии: просто «вступаем» в указанную гильдию
  guildName = cleanName;
  guildLeader = 'Лидер'; // условно
  guildMembers = ['Лидер', currentNick || 'Игрок'];
  guildLevel = 1;
  guildPoints = 0;

  saveGuild();
  renderGuildInfo();
  tg.showAlert(`Вы вступили в гильдию "${guildName}".`);
};

// Покинуть гильдию
leaveGuildBtn.onclick = () => {
  if (!guildName) {
    tg.showAlert('Вы не состоите в гильдии.');
    return;
  }

  const isLeader = (guildLeader === (currentNick || 'Игрок'));

  if (isLeader && guildMembers.length > 1) {
    tg.showAlert('Лидер не может покинуть гильдию, пока в ней есть другие участники. Распустите гильдию или передайте лидерство (в текущей версии — только распустить).');
    return;
  }

  guildName = null;
  guildLeader = null;
  guildMembers = [];
  guildLevel = 0;
  guildPoints = 0;

  saveGuild();
  renderGuildInfo();
  tg.showAlert('Вы покинули гильдию.');
};

// Распустить гильдию
disbandGuildBtn.onclick = () => {
  if (!guildName) {
    tg.showAlert('Нет гильдии для роспуска.');
    return;
  }
  if (guildLeader !== (currentNick || 'Игрок')) {
    tg.showAlert('Только лидер может распустить гильдию.');
    return;
  }

  if (!confirm('Вы уверены? Гильдия будет распущена, все участники выйдут.')) return;

  guildName = null;
  guildLeader = null;
  guildMembers = [];
  guildLevel = 0;
  guildPoints = 0;

  saveGuild();
  renderGuildInfo();
  tg.showAlert('Гильдия распущена.');
};

// Таймер обновления времени на грядках (каждую секунду)
setInterval(() => {
  const plotsInDom = document.querySelectorAll('.plot');
  plotsInDom.forEach((el, idx) => {
    const data = plots[idx];
    if (data) {
      const crop = cropsConfig[data.cropKey];
      const timeLeft = getTimeLeft(data.plantedAt, crop.growTime);
      const timerEl = el.querySelector('.plot-timer');
      if (timerEl) {
        timerEl.textContent = timeLeft <= 0 ? 'ГОТОВО' : formatTime(timeLeft);
        if (timeLeft <= 0) {
          el.style.opacity = '1';
          el.style.cursor = 'pointer';
        } else {
          el.style.opacity = '0.85';
          el.style.cursor = 'not-allowed';
        }
      }
    }
  });
}, 1000);

// Инициализация
renderField();
renderShop();
renderGuildInfo();
