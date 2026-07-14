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
  carrot: { name: 'Морковь', price: 20, reward: 30, emoji: '🥕' },
  wheat:  { name: 'Пшеница',  price: 30, reward: 50, emoji: '🌾' },
  strawberry: { name: 'Клубника', price: 50, reward: 80, emoji: '🍓' }
};

const questsConfig = [
  {
    id: 'q1',
    title: 'Прополоть первую грядку',
    reward: 50,
    secret: 'Ты делаешь всё правильно. Она точно это заметит.',
    done: false
  },
  {
    id: 'q2',
    title: 'Посадить 3 культуры',
    target: 3,
    reward: 70,
    secret: 'Это как первые слова: неловко, но важно сказать.',
    done: false
  },
  {
    id: 'q3',
    title: 'Собрать первый урожай',
    target: 1,
    reward: 100,
    secret: 'Иногда самое красивое признание — в простых делах.',
    done: false
  },
  {
    id: 'q4',
    title: 'Заработать 200 монет',
    target: 200,
    reward: 150,
    secret: 'Скоро ты сможешь сказать всё, что копил в сердце.',
    done: false
  }
];

// Сброс данных при смене версии
const currentVersion = 'v1.4';
const storedVersion = localStorage.getItem('farm_version');
if (storedVersion !== currentVersion) {
  localStorage.removeItem('farm_coins');
  localStorage.removeItem('farm_plots');
  localStorage.removeItem('farm_quests_progress');
  localStorage.removeItem('farm_guild_name');
  localStorage.removeItem('farm_guild_leader');
  localStorage.removeItem('farm_guild_members');
  localStorage.setItem('farm_version', currentVersion);
  console.log('🧹 Данные сброшены под новую версию игры.');
}

let coins = localStorage.getItem('farm_coins') ? parseInt(localStorage.getItem('farm_coins')) : 100;
let plots = JSON.parse(localStorage.getItem('farm_plots')) || Array(6).fill(null);
let selectedCropKey = 'carrot';

let guildName = localStorage.getItem('farm_guild_name') || null;
let guildLeader = localStorage.getItem('farm_guild_leader') || null;
let guildMembers = JSON.parse(localStorage.getItem('farm_guild_members')) || []; // массив ников
let guildLevel = parseInt(localStorage.getItem('farm_guild_level')) || 0;
let guildPoints = parseInt(localStorage.getItem('farm_guild_points')) || 0;

let questsProgress = JSON.parse(localStorage.getItem('farm_quests_progress')) || {
  planted_total: 0,
  harvested_total: 0,
  earned_coins: 0
};

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

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');
}

fieldBtn.onclick = () => showScreen('field-screen');
shopBtn.onclick = () => { renderShop(); showScreen('shop-screen'); };
questsBtn.onclick = () => { renderQuests(); showScreen('quests-screen'); };
guildBtn.onclick = () => { renderGuildInfo(); showScreen('guild-screen'); };

function renderShop() {
  shopContainer.innerHTML = '';
  for (const key in cropsConfig) {
    const crop = cropsConfig[key];
    const item = document.createElement('div');
    item.className = 'shop-item';
    item.innerHTML = `<span class="shop-name">${crop.name}</span><span class="shop-price">${crop.price} монет</span>`;
    item.onclick = () => {
      selectedCropKey = key;
      showScreen('field-screen');
      tg.showAlert(`Выбрано: ${crop.name}. Теперь сажай на поле!`);
    };
    shopContainer.appendChild(item);
  }
}

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

function checkQuests() {
  let newReward = false;
  let secretText = '';

  const q1 = questsConfig.find(q => q.id === 'q1');
  if (!q1.done && questsProgress['harvested_total'] >= 1) {
    q1.done = true;
    coins += q1.reward;
    secretText = q1.secret;
    newReward = true;
  }

  const q2 = questsConfig.find(q => q.id === 'q2');
  if (!q2.done) {
    const plantedTotal = questsProgress['planted_total'] || 0;
    if (plantedTotal >= q2.target) {
      q2.done = true;
      coins += q2.reward;
      secretText = q2.secret;
      newReward = true;
    }
  }

  const q3 = questsConfig.find(q => q.id === 'q3');
  if (!q3.done) {
    const harvestedTotal = questsProgress['harvested_total'] || 0;
    if (harvestedTotal >= q3.target) {
      q3.done = true;
      coins += q3.reward;
      secretText = q3.secret;
      newReward = true;
    }
  }

  const q4 = questsConfig.find(q => q.id === 'q4');
  if (!q4.done) {
    const earnedTotal = questsProgress['earned_coins'] || 0;
    if (earnedTotal >= q4.target) {
      q4.done = true;
      coins += q4.reward;
      secretText = q4.secret;
      newReward = true;
    }
  }

  if (newReward) {
    saveProgress();
    saveQuests();
    renderField();
    renderQuests();
    tg.showAlert(secretText);
  }
}

function renderQuests() {
  questsContainer.innerHTML = '';
  questsConfig.forEach(q => {
    const isDone = q.done;
    const item = document.createElement('div');
    item.className = `quest-item ${isDone ? 'quest-done' : ''}`;

    let progressText = '';
    if (!isDone) {
      if (q.id === 'q2') {
        const planted = questsProgress['planted_total'] || 0;
        progressText = `${planted}/${q.target}`;
      } else if (q.id === 'q3') {
        const harvested = questsProgress['harvested_total'] || 0;
        progressText = `${harvested}/${q.target}`;
      } else if (q.id === 'q4') {
        const earned = questsProgress['earned_coins'] || 0;
        progressText = `${earned}/${q.target} монет`;
      }
    }

    item.innerHTML = `
      <span class="quest-name">${q.title}</span>
      ${progressText ? `<span class="quest-progress">${progressText}</span>` : ''}
      <span class="quest-reward">${q.reward} монет</span>
    `;
    item.style.cursor = 'default';
    questsContainer.appendChild(item);
  });
}

function renderGuildInfo() {
  guildNameEl.textContent = guildName || 'Не выбрана';
  guildLeaderEl.textContent = guildLeader || 'Не назначен';
  guildMembersCountEl.textContent = guildMembers.length;
  guildLevelEl.textContent = guildLevel;
  guildPointsEl.textContent = guildPoints;
}

// Инициализация
if (plots.length !== 6) {
  plots = Array(6).fill(null);
  saveProgress();
}
renderShop();
renderField();
renderQuests();
renderGuildInfo();

// Посадка
field.addEventListener('click', (e) => {
  const plot = e.target.closest('.plot');
  if (!plot) return;
  const index = Array.from(field.children).indexOf(plot);
  if (plots[index]) return;

  const crop = cropsConfig[selectedCropKey];
  if (coins >= crop.price) {
    coins -= crop.price;
    plots[index] = selectedCropKey;

    questsProgress['planted_total'] = (questsProgress['planted_total'] || 0) + 1;
    saveQuests();

    saveProgress();
    renderField();
    checkQuests();
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

      questsProgress['harvested_total'] = (questsProgress['harvested_total'] || 0) + 1;
      questsProgress['earned_coins'] = (questsProgress['earned_coins'] || 0) + crop.reward;

      plots[i] = null;
      harvested = true;
    }
  });

  if (harvested) {
    saveProgress();
    saveQuests();
    renderField();
    checkQuests();
  } else {
    tg.showAlert('Нечего собирать!');
  }
};

closeBtn.onclick = () => tg.close();

createGuildBtn.onclick = () => {
  const name = prompt('Придумай название гильдии:');
  if (!name || name.trim() === '') return;
  
  // Ты становишься лидером, и сразу 1 участник (ты сам)
  guildName = name.trim();
  const myNick = prompt('Твой никнейм в гильдии:', 'Игрок');
  const finalNick = myNick && myNick.trim() ? myNick.trim() : 'Игрок';
  
  guildLeader = finalNick;
  guildMembers = [finalNick];
  guildLevel = 1;
  
  saveGuild();
  renderGuildInfo();
  tg.showAlert(`Гильдия «${guildName}» создана! Ты — лидер. Участников: 1.`);
};

joinGuildBtn.onclick = () => {
  if (!guildName) {
    tg.showAlert('Сначала создай гильдию, чтобы в неё можно было вступать!');
    return;
  }
  const name = prompt('Введи свой никнейм для вступления в гильдию:', 'Гость');
  const nick = name && name.trim() ? name.trim() : 'Гость';
  
  // Проверяем, нет ли уже такого ника (простая защита от дублей)
  if (guildMembers.includes(nick)) {
    tg.showAlert('Такой ник уже есть в гильдии!');
    return;
  }
  
  guildMembers.push(nick);
  // Лидер остаётся тем же, не меняем
  guildLevel = Math.max(1, guildLevel); // на всякий случай
  
  saveGuild();
  renderGuildInfo();
  tg.showAlert(`Ты вступил в гильдию «${guildName}»! Теперь участников: ${guildMembers.length}.`);
};


