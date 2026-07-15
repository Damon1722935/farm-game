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
const currentVersion = 'v2.4';
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
  console.log('🧹 Данные сброшены под новую версию игры.');
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

// Никнейм игрока (автоматически берем из Telegram, если он доступен)
let currentNick = localStorage.getItem('farm_current_nick');
if (!currentNick) {
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
    const user = window.Telegram.WebApp.initDataUnsafe.user;
    // Если у человека есть юзернейм (например, @alex), берем его. Если нет — берем Имя.
    currentNick = user.username ? `@${user.username}` : user.first_name;
  } else {
    currentNick = 'Игрок'; // Оставляем для тестов в обычном браузере
  }
  localStorage.setItem('farm_current_nick', currentNick);
}

function saveCurrentNick() {
  localStorage.setItem('farm_current_nick', currentNick);
}

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

// Элементы DOM
const coinsEl = document.getElementById('coins');
const field = document.getElementById('field');
const fieldBtn = document.getElementById('fieldBtn');
const shopBtn = document.getElementById('shopBtn');
const guildBtn = document.getElementById('guildBtn');
const harvestBtn = document.getElementById('harvestBtn'); // кнопка сбора

const shopContainer = document.getElementById('shop');

// Элементы гильдии
const guildStatsContainer = document.getElementById('guild-stats'); // Находим сам блок статистики
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

      // Таймер
      const timerEl = document.createElement('span');
      timerEl.className = 'plot-timer';
      timerEl.textContent = isReady ? 'ГОТОВО' : formatTime(timeLeft);
      plot.appendChild(timerEl);

      // Клик по готовой грядке — поштучный сбор
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

      // Подсветка готовой грядки
      if (isReady) {
        plot.classList.add('ready');
        plot.style.cursor = 'pointer';
        plot.style.opacity = '1';
      } else {
        plot.classList.remove('ready');
        plot.style.cursor = 'not-allowed';
        plot.style.opacity = '0.85';
      }

    } else {
      // Пустая грядка — посадка
      plot.textContent = '🌱';
      plot.classList.remove('ready');
      plot.style.cursor = 'pointer';
      plot.style.opacity = '1';

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

// --- Гильдия ---
function renderGuildInfo() {
  if (guildName) {
    // === СЦЕНАРИЙ 1: ИГРОК В ГИЛЬДИИ ===
    
    // 1. Показываем блок со статистикой
    guildStatsContainer.style.display = 'block';
    
    // Заполняем статистику данными
    guildNameEl.textContent = guildName;
    guildLeaderEl.textContent = guildLeader;
    guildMembersCountEl.textContent = guildMembers.length;
    guildLevelEl.textContent = guildLevel;
    guildPointsEl.textContent = guildPoints;

    // 2. Управляем кнопками действий
    guildActions.style.display = 'block';
    createGuildBtn.style.display = 'none'; // Скрываем "Создать"
    joinGuildBtn.style.display = 'none';   // Скрываем "Вступить"

    // Проверяем: лидер игрок или нет
    if (guildLeader === currentNick) {
      // Если ЛИДЕР: показываем "Распустить", скрываем "Покинуть"
      disbandGuildBtn.style.display = 'inline-block';
      leaveGuildBtn.style.display = 'none';
    } else {
      // Если УЧАСТНИК: скрываем "Распустить", показываем "Покинуть"
      disbandGuildBtn.style.display = 'none';
      leaveGuildBtn.style.display = 'inline-block';
    }

  } else {
    // === СЦЕНАРИЙ 2: У ИГРОКА НЕТ ГИЛЬДИИ ===
    
    // 1. Полностью скрываем блок статистики
    guildStatsContainer.style.display = 'none';
    
    // 2. Показываем только кнопки "Создать" и "Вступить"
    guildActions.style.display = 'block';
    createGuildBtn.style.display = 'inline-block';
    joinGuildBtn.style.display = 'inline-block';
    
    // Скрываем кнопки выхода и роспуска
    leaveGuildBtn.style.display = 'none';
    disbandGuildBtn.style.display = 'none';
  }
}

createGuildBtn.onclick = () => {
  const name = prompt('Придумайте название гильдии (до 20 символов):');
  if (!name || name.trim() === '') return;
  const cleanName = name.trim().substring(0, 20);

  if (guildName) {
    tg.showAlert('Вы уже состоите в гильдии! Сначала покиньте её.');
    return;
  }

  guildName = cleanName;
  guildLeader = currentNick;
  guildMembers = [guildLeader];
  guildLevel = 1;
  guildPoints = 0;

  saveGuild();
  renderGuildInfo();
  tg.showAlert(`Гильдия "${guildName}" создана! Вы — её лидер.`);
};

joinGuildBtn.onclick = () => {
  const name = prompt('Введите название гильдии для вступления:');
  if (!name || name.trim() === '') return;
  const cleanName = name.trim().substring(0, 20);

  if (guildName) {
    tg.showAlert('Вы уже состоите в гильдии!');
    return;
  }

  guildName = cleanName;
  guildLeader = 'Лидер';
  guildMembers = ['Лидер', currentNick];
  guildLevel = 1;
  guildPoints = 0;

  saveGuild();
  renderGuildInfo();
  tg.showAlert(`Вы вступили в гильдию "${guildName}".`);
};

leaveGuildBtn.onclick = () => {
  if (!guildName) {
    tg.showAlert('Вы не состоите в гильдии.');
    return;
  }

  const isLeader = (guildLeader === currentNick);

  if (isLeader && guildMembers.length > 1) {
    tg.showAlert('Лидер не может покинуть гильдию, пока в ней есть другие участники. Распустите гильдию.');
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

disbandGuildBtn.onclick = () => {
  if (!guildName) {
    tg.showAlert('Нет гильдии для роспуска.');
    return;
  }
  if (guildLeader !== currentNick) {
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

// Кнопка «Собрать урожай» — собрать всё готовое
if (harvestBtn) {
  harvestBtn.onclick = () => {
    let harvestedCount = 0;
    let totalReward = 0;

    plots.forEach((plotData, i) => {
      if (plotData) {
        const { cropKey, plantedAt } = plotData;
        const crop = cropsConfig[cropKey];
        const timeLeft = getTimeLeft(plantedAt, crop.growTime);

        if (timeLeft <= 0) {
          plots[i] = null;
          coins += crop.reward;
          totalReward += crop.reward;
          harvestedCount++;
        }
      }
    });

    if (harvestedCount > 0) {
      saveProgress();
      renderField();
      tg.showAlert(`Собрано ${harvestedCount} урожая. Получено монет: ${totalReward}.`);
    } else {
      tg.showAlert('Нет готового урожая для сбора.');
    }
  };
}

// Таймер обновления времени на грядках
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
          el.classList.add('ready');
          el.style.opacity = '1';
          el.style.cursor = 'pointer';
        } else {
          el.classList.remove('ready');
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
