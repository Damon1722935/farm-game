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

const questsConfig = [
  { id: 'q1', title: 'Прополоть первую грядку', reward: 50, secret: 'Ты делаешь всё правильно. Она точно это заметит.', done: false },
  { id: 'q2', title: 'Посадить 3 культуры', target: 3, reward: 70, secret: 'Это как первые слова: неловко, но важно сказать.', done: false },
  { id: 'q3', title: 'Собрать первый урожай', target: 1, reward: 100, secret: 'Иногда самое красивое признание — в простых делах.', done: false },
  { id: 'q4', title: 'Заработать 200 монет', target: 200, reward: 150, secret: 'Скоро ты сможешь сказать всё, что копил в сердце.', done: false }
];

// Сброс данных при смене версии
const currentVersion = 'v1.9';
const storedVersion = localStorage.getItem('farm_version');
if (storedVersion !== currentVersion) {
  localStorage.removeItem('farm_coins');
  localStorage.removeItem('farm_plots');
  localStorage.removeItem('farm_quests_progress');
  localStorage.removeItem('farm_guild_name');
  localStorage.removeItem('farm_guild_leader');
  localStorage.removeItem('farm_guild_members');
  localStorage.removeItem('farm_current_nick');
  localStorage.setItem('farm_version', currentVersion);
  console.log('🧹 Данные сброшены под новую версию игры.');
}

let coins = localStorage.getItem('farm_coins') ? parseInt(localStorage.getItem('farm_coins')) : 100;
let plots = JSON.parse(localStorage.getItem('farm_plots')) || Array(6).fill(null);
let selectedCropKey = 'carrot';

let guildName = localStorage.getItem('farm_guild_name') || null;
let guildLeader = localStorage.getItem('farm_guild_leader') || null;
let guildMembers = JSON.parse(localStorage.getItem('farm_guild_members')) || [];
let guildLevel = parseInt(localStorage.getItem('farm_guild_level')) || 0;
let guildPoints = parseInt(localStorage.getItem('farm_guild_points')) || 0;

let questsProgress = JSON.parse(localStorage.getItem('farm_quests_progress')) || {
  planted_total: 0,
  harvested_total: 0,
  earned_coins: 0
};

let currentNick = localStorage.getItem('farm_current_nick') || 'Игрок';

// Элементы DOM
const coinsEl = document.getElementById('coins');
const field = document.getElementById('field');
const harvestBtn = document.getElementById('harvestBtn');
const closeBtn = document.getElementById('closeBtn');
const guildBtn = document.getElementById('guildBtn');
const fieldBtn = document.getElementById('fieldBtn');
const shopBtn = document.getElementById('shopBtn');
const questsBtn = document.getElementById('questsBtn');

const guildScreen = document.getElementById('guild-screen');
const guildNameEl = document.getElementById('guild-name');
const guildLeaderEl = document.getElementById('guild-leader');
const guildMembersCountEl = document.getElementById('guild-members-count');
const guildLevelEl = document.getElementById('guild-level');
const guildPointsEl = document.getElementById('guild-points');
const createGuildBtn = document.getElementById('create-guild-btn');
const joinGuildBtn = document.getElementById('join-guild-btn');
const leaveGuildBtn = document.getElementById('leave-guild-btn');
const disbandGuildBtn = document.getElementById('disband-guild-btn');
const guildActions = document.getElementById('guild-actions');

const shopContainer = document.getElementById('shop');
const questsContainer = document.getElementById('quests');
const fieldScreen = document.getElementById('field-screen');
const shopScreen = document.getElementById('shop-screen');
const questsScreen = document.getElementById('quests-screen');

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
function saveQuests() {
  localStorage.setItem('farm_quests_progress', JSON.stringify(questsProgress));
}
function saveCurrentNick() {
  localStorage.setItem('farm_current_nick', currentNick);
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');
}

fieldBtn.onclick = () => showScreen('field-screen');
shopBtn.onclick = () => { renderShop(); showScreen('shop-screen'); };
questsBtn.onclick = () => { renderQuests(); showScreen('quests-screen'); };
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

function renderQuests() {
  questsContainer.innerHTML = '';
  questsConfig.forEach((q, idx) => {
    const progress = q.target ? questsProgress[q.targetKey || 'planted_total'] : 0;
    const isDone = q.done || (q.target && progress >= q.target);

    const el = document.createElement('div');
    el.className = 'shop-item';
    el.style.borderLeft = isDone ? '4px solid #2ecc71' : '4px solid #f39c12';
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:bold;">${q.title}</span>
        ${q.target ? `<span>${progress}/${q.target}</span>` : ''}
      </div>
      <small style="color:#95a5a6;margin-top:4px;display:block;">${q.secret}</small>
    `;
    if (!isDone && q.target) {
      el.style.opacity = '0.9';
      el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))';
    }
    questsContainer.appendChild(el);
  });
}

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

// --- ГЛАВНАЯ ОТРИСОВКА ПОЛЯ (грядок) ---
function renderField() {
  field.innerHTML = '';

  plots.forEach((plotData, i) => {
    const plot = document.createElement('div');
    plot.className = 'plot'; // класс, к которому привязан background-image в CSS

    if (plotData) {
      const { cropKey, plantedAt } = plotData;
      const crop = cropsConfig[cropKey];

      // Показываем эмодзи культуры
      plot.textContent = crop.emoji;

      const timeLeft = getTimeLeft(plantedAt, crop.growTime);
      const isReady = timeLeft <= 0;

      // Таймер
      const timerEl = document.createElement('span');
      timerEl.className = 'plot-timer';
      timerEl.textContent = isReady ? 'ГОТОВО' : formatTime(timeLeft);
      plot.appendChild(timerEl);

      plot.onclick = () => {
        if (!isReady) {
          tg.showAlert('Ещё рано — растение не выросло!');
          return;
        }
        // Сбор урожая
        plots[i] = null;
        coins += crop.reward;

        questsProgress.harvested_total = (questsProgress.harvested_total || 0) + 1;
        questsProgress.earned_coins = (questsProgress.earned_coins || 0) + crop.reward;

        saveProgress();
        saveQuests();
        renderField();
        checkQuests();

        tg.showAlert(`Ты собрал ${crop.name}! Получено монет: ${crop.reward}.`);
      };

      if (!isReady) {
        plot.style.cursor = 'not-allowed';
        plot.style.opacity = '0.85';
      }
    } else {
      // Пустая грядка
      plot.textContent = '🌱';
      plot.onclick = () => {
        const crop = cropsConfig[selectedCropKey];
        if (coins >= crop.price) {
          coins -= crop.price;
          plots[i] = { cropKey: selectedCropKey, plantedAt: Date.now() };

          questsProgress.planted_total = (questsProgress.planted_total || 0) + 1;
          saveQuests();
          saveProgress();
          renderField();
          checkQuests();

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

function checkQuests() {
  let changed = false;
  questsConfig.forEach(q => {
    if (!q.done) {
      let progress = 0;
      if (q.targetKey) progress = questsProgress[q.targetKey] || 0;
      else if (q.target === 3) progress = questsProgress.planted_total || 0;
      else if (q.target === 1 && q.id === 'q3') progress = questsProgress.harvested_total || 0;
      else if (q.target === 200 && q.id === 'q4') progress = questsProgress.earned_coins || 0;

      if (progress >= (q.target || 0)) {
        q.done = true;
        changed = true;
        saveQuests();
        tg.showAlert(q.secret);
      }
    }
  });
  if (changed) renderQuests();
}

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
renderQuests();
renderGuildInfo();


