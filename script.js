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
const currentVersion = 'v2.5';
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
let selectedCropKey = 'carrot';
// Инвентарь семян (по умолчанию у игрока 0 семян каждого типа)
let inventory = JSON.parse(localStorage.getItem('farm_inventory')) || { carrot: 0, wheat: 0, strawberry: 0 };

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
if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
  const user = window.Telegram.WebApp.initDataUnsafe.user;
  // Если у человека есть юзернейм (например, @alex), берем его. Если нет — берем Имя.
  currentNick = user.username ? `@${user.username}` : user.first_name;
  localStorage.setItem('farm_current_nick', currentNick);
} else if (!currentNick) {
  currentNick = 'Игрок'; // Оставляем для тестов в обычном браузере
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
const inventoryBtn = document.getElementById('inventoryBtn');
const inventoryContainer = document.getElementById('inventory');
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

inventoryBtn.onclick = () => { renderInventory(); showScreen('inventory-screen'); };

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

// --- ОБНОВЛЕННЫЙ МАГАЗИН С ВЫБОРОМ КОЛИЧЕСТВА ---

function renderShop() {
  shopContainer.innerHTML = '';
  for (const key in cropsConfig) {
    const crop = cropsConfig[key];
    const item = document.createElement('div');
    item.className = 'shop-item';
    
    // Получаем текущее количество семян в рюкзаке
    const seedCount = inventory[key] || 0;
    
    // Пересобираем верстку: слева инфо, справа — выбор количества и кнопка купить
    item.innerHTML = `
      <div class="shop-info">
        <span class="shop-name">${crop.emoji} ${crop.name}</span>
        <small style="opacity: 0.7; font-size: 11px; color: #aaa;">У вас: ${seedCount} шт.</small>
        <span class="shop-price" style="margin-top: 4px; display: block; font-weight: bold; color: #f1c40f;">${crop.price}💰 / шт.</span>
      </div>
      <div class="shop-actions">
        <div class="quantity-controller">
          <button class="qty-btn" onclick="changeQty('${key}', -1)">-</button>
          <input type="number" class="qty-input" value="1" min="1" id="qty-${key}" onchange="validateQty(this)">
          <button class="qty-btn" onclick="changeQty('${key}', 1)">+</button>
        </div>
        <button class="btn-buy" onclick="buySeeds('${key}')">Купить</button>
      </div>
    `;
    
    shopContainer.appendChild(item);
  }
}

// Функция для изменения количества кнопками +/-
function changeQty(cropKey, delta) {
  const input = document.getElementById(`qty-${cropKey}`);
  if (!input) return;
  let val = parseInt(input.value) || 1;
  val += delta;
  if (val < 1) val = 1; // Защита: нельзя купить меньше 1 семечка
  input.value = val;
}

// Валидация при ручном вводе количества в поле
function validateQty(input) {
  let val = parseInt(input.value);
  if (isNaN(val) || val < 1) {
    val = 1;
  }
  input.value = val;
}

// Функция пакетной покупки семян
function buySeeds(cropKey) {
  const input = document.getElementById(`qty-${cropKey}`);
  const quantity = input ? (parseInt(input.value) || 1) : 1;
  const crop = cropsConfig[cropKey];
  if (!crop) return;

  const totalCost = crop.price * quantity;
  const seedCount = inventory[cropKey] || 0;

  if (coins >= totalCost) {
    coins -= totalCost; // Списываем деньги за все семена разом!
    inventory[cropKey] = seedCount + quantity; // Добавляем семена в инвентарь
    selectedCropKey = cropKey; // Автоматически выбираем это семя для посадки
    
    saveProgress();
    saveInventory(); // Сохраняем рюкзак
    renderShop(); // Перерисовываем магазин, чтобы обновилось "У вас: Х шт."
    
    tg.showAlert(`Вы успешно купили семена: ${crop.name} (${quantity} шт.) за ${totalCost} 🪙! Переходим на поле.`);
    showScreen('field-screen');
    renderField();
  } else {
    tg.showAlert(`Не хватает монет! Нужно ${totalCost} 🪙 на покупку ${quantity} шт., у вас всего ${coins} 🪙.`);
  }
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
      // --- ПУСТАЯ ГРЯДКА — ПОСАДКА С АНИМАЦИЕЙ ---
      plot.textContent = '🌱';
      plot.classList.remove('ready');
      plot.style.cursor = 'pointer';
      plot.style.opacity = '1';

      // Делаем обработчик клика асинхронным (async)
      plot.onclick = async () => {
        const crop = cropsConfig[selectedCropKey];
        
        // Проверяем: есть ли выбранные семена в инвентаре?
        if (inventory[selectedCropKey] > 0) {
          
          // 1. Запускаем нашу красивую анимацию лопаты и полива!
          // Передаем сам DOM-элемент грядки (plot) прямо в функцию анимации.
          await runPlantingAnimation(plot);

          // 2. После того, как анимация полностью закончилась, списываем семечко и сажаем
          inventory[selectedCropKey]--; // Тратим 1 семечко из рюкзака
          plots[i] = { cropKey: selectedCropKey, plantedAt: Date.now() }; // Сажаем
          
          saveProgress();
          saveInventory(); // Сохраняем рюкзак
          renderField(); // Перерисовываем поле, чтобы запустить таймер роста
          
          tg.showAlert(`Ты посадил ${crop.name}! Осталось семян: ${inventory[selectedCropKey]} шт.`);
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
    // Если в гильдии больше не осталось участников, удаляем саму гильдию из общего списка
    if (allGuilds[guildIndex].members.length === 0) {
      allGuilds.splice(guildIndex, 1);
    }
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

  if (!confirm('Вы уверены? Гильдия будет распущена.')) return;

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
renderInventory();
