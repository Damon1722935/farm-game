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
  dill: {
    name: 'Укроп',
    price: 5,
    reward: 8,
    emoji: '🌿',
    growTime: 30,
    minLevel: 1,
    xpReward: 2
  },
  carrot: {
    name: 'Морковь',
    price: 15,
    reward: 25,
    emoji: '🥕',
    growTime: 60,
    minLevel: 1,
    xpReward: 5
  },
  potato: {
    name: 'Картофель',
    price: 30,
    reward: 55,
    emoji: '🥔',
    growTime: 120,
    minLevel: 2,
    xpReward: 10
  },
  wheat: {
    name: 'Пшеница',
    price: 50,
    reward: 95,
    emoji: '🌾',
    growTime: 300,
    minLevel: 2,
    xpReward: 15
  },
  cucumber: {
    name: 'Огурец',
    price: 80,
    reward: 160,
    emoji: '🥒',
    growTime: 600,
    minLevel: 3,
    xpReward: 30
  },
  strawberry: {
    name: 'Клубника',
    price: 120,
    reward: 250,
    emoji: '🍓',
    growTime: 900,
    minLevel: 3,
    xpReward: 45
  },
  tomato: {
    name: 'Томат',
    price: 200,
    reward: 430,
    emoji: '🍅',
    growTime: 1800,
    minLevel: 4,
    xpReward: 80
  },
  corn: {
    name: 'Кукуруза',
    price: 350,
    reward: 780,
    emoji: '🌽',
    growTime: 3600,
    minLevel: 4,
    xpReward: 150
  },
  eggplant: {
    name: 'Баклажан',
    price: 600,
    reward: 1400,
    emoji: '🍆',
    growTime: 7200,
    minLevel: 5,
    xpReward: 300
  },
  watermelon: {
    name: 'Арбуз',
    price: 1000,
    reward: 2500,
    emoji: '🍉',
    growTime: 14400,
    minLevel: 5,
    xpReward: 600
  }
};
const farmerLevelThresholds = [0, 300, 700, 1500, 3000];

// Сброс данных при смене версии
const currentVersion = 'v2.6';
const storedVersion = localStorage.getItem('farm_version');
if (storedVersion !== currentVersion) {
  localStorage.removeItem('farm_coins');
  localStorage.removeItem('farm_plots');
  localStorage.removeItem('farm_guild_name');
  localStorage.removeItem('farm_guild_leader');
  localStorage.removeItem('farm_guild_members');
  localStorage.removeItem('farm_guild_level');
  localStorage.removeItem('farm_guild_points');
  localStorage.removeItem('farm_inventory');
  localStorage.setItem('farm_version', currentVersion);
  console.log('🧹 Данные сброшены под новую версию игры.');
}

let coins = localStorage.getItem('farm_coins') ? parseInt(localStorage.getItem('farm_coins')) : 100;
let plots = JSON.parse(localStorage.getItem('farm_plots')) || Array(6).fill(null);
let selectedCropKey = 'dill';
// Инвентарь семян (по умолчанию у игрока 0 семян каждого типа)
let inventory = JSON.parse(localStorage.getItem('farm_inventory')) || {};
for (const key in cropsConfig) {
  if (typeof inventory[key] !== 'number') {
    inventory[key] = 0;
  }
}
let farmerPoints = parseInt(localStorage.getItem('farm_farmer_points')) || 0;

function saveInventory() {
  localStorage.setItem('farm_inventory', JSON.stringify(inventory));
}

// Данные гильдии
let guildName = localStorage.getItem('farm_guild_name') || null;
let guildLeader = localStorage.getItem('farm_guild_leader') || null;
let guildMembers = JSON.parse(localStorage.getItem('farm_guild_members')) || [];
let guildLevel = parseInt(localStorage.getItem('farm_guild_level')) || 0;
let guildPoints = parseInt(localStorage.getItem('farm_guild_points')) || 0;
// --- ОБЩАЯ БАЗА ВСЕХ ГИЛЬДИЙ (пока храним локально для тестов) ---
let allGuilds = JSON.parse(localStorage.getItem('farm_all_guilds')) || [];

function saveAllGuilds() {
  localStorage.setItem('farm_all_guilds', JSON.stringify(allGuilds));
}
// ------------------------------------------------------------------

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
  localStorage.setItem('farm_farmer_points', farmerPoints.toString());
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
const farmerLevelEl = document.getElementById('farmerLevel');
const farmerPointsEl = document.getElementById('farmerPoints');

// Элементы КАРТЫ и выпадающего списка
const mapBtn = document.getElementById('mapBtn');
const mapDropdown = document.getElementById('mapDropdown');
const goToFieldBtn = document.getElementById('goToFieldBtn');
const goToGardenBtn = document.getElementById('goToGardenBtn');
const goToPenBtn = document.getElementById('goToPenBtn');

const shopBtn = document.getElementById('shopBtn');
const guildBtn = document.getElementById('guildBtn');
const harvestBtn = document.getElementById('harvestBtn'); // кнопка сбора

const shopContainer = document.getElementById('shop');
const inventoryBtn = document.getElementById('inventoryBtn');
const inventoryContainer = document.getElementById('inventory');

// Элементы гильдии
const guildStatsContainer = document.getElementById('guild-stats'); 
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

// === ЛОГИКА ВЫПАДАЮЩЕГО СПИСКА КАРТЫ ===

// Открытие/закрытие меню по клику на кнопку Карта
if (mapBtn && mapDropdown) {
  mapBtn.onclick = (e) => {
    e.stopPropagation(); // Предотвращаем закрытие при клике на саму кнопку
    mapDropdown.classList.toggle('show');
  };
}

// Закрываем меню, если кликнуть в любую другую область экрана
window.onclick = (event) => {
  if (mapDropdown && mapDropdown.classList.contains('show')) {
    if (!event.target.matches('#mapBtn') && !event.target.closest('#mapBtn')) {
      mapDropdown.classList.remove('show');
    }
  }
};

// Переходы по локациям карты
if (goToFieldBtn) {
  goToFieldBtn.onclick = () => {
    showScreen('field-screen');
    mapDropdown.classList.remove('show');
  };
}

if (goToGardenBtn) {
  goToGardenBtn.onclick = () => {
    showScreen('garden-screen');
    mapDropdown.classList.remove('show');
  };
}

if (goToPenBtn) {
  goToPenBtn.onclick = () => {
    showScreen('pen-screen');
    mapDropdown.classList.remove('show');
  };
}

// Переходы на другие экраны (при переходе закрываем выпадающее меню на всякий случай)
shopBtn.onclick = () => { 
  if (mapDropdown) mapDropdown.classList.remove('show');
  renderShop(); 
  showScreen('shop-screen'); 
};

guildBtn.onclick = () => { 
  if (mapDropdown) mapDropdown.classList.remove('show');
  renderGuildInfo(); 
  showScreen('guild-screen'); 
};

inventoryBtn.onclick = () => { 
  if (mapDropdown) mapDropdown.classList.remove('show');
  renderInventory(); 
  showScreen('inventory-screen'); 
};

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
  const currentLevel = getCurrentFarmerLevel();
  for (const key in cropsConfig) {
    const crop = cropsConfig[key];
    let qty = 1;
    const isUnlocked = currentLevel >= crop.minLevel;
    const item = document.createElement('div');
    item.className = 'shop-item';
    const left = document.createElement('div');
    left.className = 'shop-left';
    const nameEl = document.createElement('span');
    nameEl.className = 'shop-name';
    nameEl.textContent = `${crop.emoji} ${crop.name}`;
    const ownEl = document.createElement('small');
    ownEl.style.opacity = '0.75';
    ownEl.style.fontSize = '11px';
    if (isUnlocked) {
      ownEl.textContent = `У вас: ${inventory[key] || 0} шт. · Ур. ${crop.minLevel}+ · Рост: ${formatTime(crop.growTime)} · XP: +${crop.xpReward}`;
    } else {
      ownEl.textContent = `🔒 Доступно с уровня ${crop.minLevel} · Рост: ${formatTime(crop.growTime)} · XP: +${crop.xpReward}`;
    }
    left.appendChild(nameEl);
    left.appendChild(ownEl);
    const right = document.createElement('div');
    right.className = 'shop-right';
    const qtyControl = document.createElement('div');
    qtyControl.className = 'qty-control';
    const minusBtn = document.createElement('button');
    minusBtn.className = 'qty-btn';
    minusBtn.textContent = '−';
    const qtyValue = document.createElement('span');
    qtyValue.className = 'qty-value';
    qtyValue.textContent = String(qty);
    const plusBtn = document.createElement('button');
    plusBtn.className = 'qty-btn';
    plusBtn.textContent = '+';
    qtyControl.appendChild(minusBtn);
    qtyControl.appendChild(qtyValue);
    qtyControl.appendChild(plusBtn);
    const buyBtn = document.createElement('button');
    buyBtn.className = 'buy-btn';
    const updateControls = () => {
      const totalPrice = qty * crop.price;
      qtyValue.textContent = String(qty);
      buyBtn.textContent = isUnlocked ? `Купить за ${totalPrice}💰` : `Нужен ур. ${crop.minLevel}`;
      minusBtn.disabled = qty <= 1 || !isUnlocked;
      plusBtn.disabled = qty >= 999 || !isUnlocked;
      buyBtn.disabled = !isUnlocked || coins < totalPrice;
    };
    minusBtn.onclick = () => {
      if (qty > 1) {
        qty -= 1;
        updateControls();
      }
    };
    plusBtn.onclick = () => {
      if (qty < 999) {
        qty += 1;
        updateControls();
      }
    };
    buyBtn.onclick = () => {
      if (!isUnlocked) {
        tg.showAlert(`Это семя откроется на уровне ${crop.minLevel}.`);
        return;
      }
      const totalPrice = qty * crop.price;
      if (coins < totalPrice) {
        tg.showAlert(`Не хватает монет! Нужно ${totalPrice}, у вас ${coins}.`);
        return;
      }
      coins -= totalPrice;
      inventory[key] = (inventory[key] || 0) + qty;
      selectedCropKey = key;
      saveProgress();
      saveInventory();
      tg.showAlert(`Вы купили ${qty} шт. семян «${crop.name}». Теперь у вас ${inventory[key]} шт.`);
      renderShop();
    };
    right.appendChild(qtyControl);
    right.appendChild(buyBtn);
    item.appendChild(left);
    item.appendChild(right);
    updateControls();
    shopContainer.appendChild(item);
  }
  coinsEl.textContent = coins;
}

function renderInventory() {
  inventoryContainer.innerHTML = ''; // Очищаем экран перед перерисовкой

  for (const key in cropsConfig) {
    const crop = cropsConfig[key];
    const count = inventory[key] || 0; // Сколько семян этого типа у нас есть
    
    const item = document.createElement('div');
    item.className = 'inventory-item';

    // Если это семечко сейчас активно для посадки — подсветим золотой рамкой
    const isSelected = (selectedCropKey === key);
    if (isSelected) {
      item.style.borderColor = '#f1c40f';
      item.style.boxShadow = '0 0 8px rgba(241, 196, 15, 0.3)';
    }

    // Содержимое карточки семени
    item.innerHTML = `
      <span class="inventory-name">
        ${crop.emoji} ${crop.name} 
        ${isSelected ? '<small style="color: #f1c40f; margin-left: 5px;">(Выбрано)</small>' : ''}
      </span>
      <span class="inventory-count">${count} шт.</span>
    `;

    // При клике на карточку — выбираем семя активным и отправляем игрока на поле
    item.onclick = () => {
      selectedCropKey = key;
      tg.showAlert(`Вы выбрали для посадки: ${crop.name}`);
      renderInventory(); // Перерисовываем инвентарь (чтобы рамка обновилась)
      showScreen('field-screen'); // Перекидываем на поле
      renderField(); // Обновляем поле
    };

    inventoryContainer.appendChild(item);
  }
}
function getFarmerLevelByPoints(points) {
  if (points >= farmerLevelThresholds[4]) return 5;
  if (points >= farmerLevelThresholds[3]) return 4;
  if (points >= farmerLevelThresholds[2]) return 3;
  if (points >= farmerLevelThresholds[1]) return 2;
  return 1;
}
function renderFarmerStats() {
  const level = getFarmerLevelByPoints(farmerPoints);
  if (farmerLevelEl) {
    farmerLevelEl.textContent = `Уровень фермера: ${level}`;
  }
  if (farmerPointsEl) {
    farmerPointsEl.textContent = `Очки развития: ${farmerPoints}`;
  }
}
function getCurrentFarmerLevel() {
  return getFarmerLevelByPoints(farmerPoints);
}
function addFarmerPoints(pointsToAdd) {
  const oldLevel = getCurrentFarmerLevel();
  farmerPoints += pointsToAdd;
  const newLevel = getCurrentFarmerLevel();
  saveProgress();
  renderFarmerStats();
  return {
    oldLevel,
    newLevel,
    leveledUp: newLevel > oldLevel
  };
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
          tg.showAlert('Ещё рано — растение не выросло!');
          return;
        }
plots[i] = null;
coins += crop.reward;
const levelResult = addFarmerPoints(crop.xpReward);
saveProgress();
renderField();
let msg = `Ты собрал ${crop.name}! Получено монет: ${crop.reward}. Очки развития: +${crop.xpReward}.`;
if (levelResult.leveledUp) {
  msg += `\n🎉 Новый уровень фермера: ${levelResult.newLevel}!`;
}
tg.showAlert(msg);
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
      // --- ПУСТАЯ ГРЯДКА — ПОСАДКА С АНИМАЦИЕЙ ---
      plot.textContent = '🌱';
      plot.classList.remove('ready');
      plot.style.cursor = 'pointer';
      plot.style.opacity = '1';

      // Делаем обработчик клика асинхронным (async)
      plot.onclick = async () => {
        const crop = cropsConfig[selectedCropKey];
        const currentLevel = getCurrentFarmerLevel();
if (currentLevel < crop.minLevel) {
  tg.showAlert(`Для посадки ${crop.name} нужен уровень ${crop.minLevel}.`);
  return;
}
        // Проверяем: есть ли выбранные семена в инвентаре?
        if (inventory[selectedCropKey] > 0) {
          
          // Блокируем повторные клики на время анимации
          plot.onclick = null;
          plot.style.cursor = 'wait';

          // Списываем семечко из инвентаря ДО начала анимации, защищая от багов
          inventory[selectedCropKey]--;
          saveInventory();

          // 1. Запускаем нашу красивую анимацию лопаты и полива!
          await runPlantingAnimation(plot);

          // 2. После того, как анимация полностью закончилась, фиксируем посадку
          plots[i] = { cropKey: selectedCropKey, plantedAt: Date.now() }; // Сажаем
          
          saveProgress();
          renderField(); // Перерисовываем поле, чтобы запустить таймер роста
          
          // Уведомление об успешной посадке удалено согласно договоренности!
        } else {
          // Если семян нет — отправляем в магазин
          tg.showAlert(`У вас нет семян ${crop.name}! Купите их сначала в магазине.`);
          showScreen('shop-screen');
          renderShop();
        }
      };
    }

    field.appendChild(plot);
  });

  coinsEl.textContent = coins;
  renderFarmerStats();
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

  // ПРОВЕРКА: Существует ли уже гильдия с таким именем?
  const existingGuild = allGuilds.find(g => g.name.toLowerCase() === cleanName.toLowerCase());
  if (existingGuild) {
    tg.showAlert('Гильдия с таким названием уже существует! Придумайте другое.');
    return;
  }

  // Задаем данные игроку
  guildName = cleanName;
  guildLeader = currentNick;
  guildMembers = [guildLeader];
  guildLevel = 1;
  guildPoints = 0;

  // Добавляем новую гильдию в общую "базу данных"
  allGuilds.push({
    name: guildName,
    leader: guildLeader,
    members: guildMembers,
    level: guildLevel,
    points: guildPoints
  });

  saveGuild();
  saveAllGuilds(); // Сохраняем общую базу
  renderGuildInfo();
  tg.showAlert(`Гильдия "${guildName}" создана! Вы — её лидер.`);
};

joinGuildBtn.onclick = () => {
  const name = prompt('Введите название гильдии для вступления:');
  if (!name || name.trim() === '') return;
  const cleanName = name.trim().substring(0, 20);

  if (guildName) {
    tg.showAlert('Вы уже состоите в гильдии!');
    return;
  }

  // ИЩЕМ гильдию в нашей "базе данных"
  const foundGuild = allGuilds.find(g => g.name.toLowerCase() === cleanName.toLowerCase());

  if (!foundGuild) {
    tg.showAlert('Такой гильдии не существует! Проверьте правильность названия.');
    return;
  }

  // Если гильдия найдена — копируем её данные игроку
  guildName = foundGuild.name;
  guildLeader = foundGuild.leader;
  
  // Если нашего игрока еще нет в списке участников, добавляем его туда
  if (!foundGuild.members.includes(currentNick)) {
    foundGuild.members.push(currentNick);
  }
  guildMembers = foundGuild.members;
  guildLevel = foundGuild.level;
  guildPoints = foundGuild.points;

  saveGuild();
  saveAllGuilds(); // Сохраняем обновленный состав в базу
  renderGuildInfo();
  tg.showAlert(`Вы успешно вступили в гильдию "${guildName}".`);
};

leaveGuildBtn.onclick = () => {
  if (!guildName) return;

  const isLeader = (guildLeader === currentNick);
  if (isLeader && guildMembers.length > 1) {
    tg.showAlert('Лидер не может покинуть гильдию, пока в ней есть другие участники. Распустите гильдию.');
    return;
  }

  // Удаляем игрока из списка участников в общей "базе данных"
  const guildIndex = allGuilds.findIndex(g => g.name === guildName);
  if (guildIndex !== -1) {
    allGuilds[guildIndex].members = allGuilds[guildIndex].members.filter(m => m !== currentNick);
    saveAllGuilds();
  }

  // Очищаем данные у самого игрока
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
  if (!guildName) return;
  if (guildLeader !== currentNick) {
    tg.showAlert('Только лидер может распустить гильдию.');
    return;
  }

  if (!confirm('Вы уверены? Guild будет распущена.')) return;

  // Удаляем саму гильдию из общей "базы данных"
  allGuilds = allGuilds.filter(g => g.name !== guildName);
  saveAllGuilds();

  // Очищаем данные у игрока
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
let totalXp = 0;
    
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
          totalXp += crop.xpReward;
        }
      }
    });

if (harvestedCount > 0) {
  const levelResult = addFarmerPoints(totalXp);
  saveProgress();
  renderField();
  let msg = `Собрано ${harvestedCount} урожая. Получено монет: ${totalReward}. Очки развития: +${totalXp}.`;
  if (levelResult.leveledUp) {
    msg += `\n🎉 Новый уровень фермера: ${levelResult.newLevel}!`;
  }
  tg.showAlert(msg);
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
renderInventory();
renderFarmerStats();
