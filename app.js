// Инициализация VK Bridge
if (typeof vkBridge !== 'undefined') {
  try {
    vkBridge.send('VKWebAppInit');
  } catch (error) {
    console.error('Ошибка инициализации VK Bridge:', error);
  }
}

let currentUser = null;
const timeSlots = ['15:00', '15:30', '16:00', '16:30'];
const isTestMode = typeof vkBridge === 'undefined'; // Флаг тестового режима

// Загрузка данных из LocalStorage
function loadData() {
  try {
    return JSON.parse(localStorage.getItem('schedule') || '{}';
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
    return {};
  }
}

// Сохранение данных с учетом одного выбора
function saveData(time, userName) {
  const data = loadData();
  
  // Удаляем предыдущий выбор пользователя
  Object.keys(data).forEach(t => {
    if (data[t] === userName) {
      delete data[t];
    }
  });
  
  // Добавляем новый выбор (если время указано)
  if (time) {
    data[time] = userName;
  }
  
  try {
    localStorage.setItem('schedule', JSON.stringify(data));
  } catch (error) {
    console.error('Ошибка сохранения данных:', error);
    alert('Не удалось сохранить выбор');
  }
}

// Обновление интерфейса
function updateUI(time, userName, isSelected) {
  const userElement = document.getElementById(`user-${time}`);
  const timeSlotElement = document.querySelector(`[onclick="selectTime('${time}')"]`);
  
  if (userElement && timeSlotElement) {
    userElement.textContent = isSelected ? userName : '';
    timeSlotElement.classList.toggle('selected', isSelected);
  }
}

// Основная функция выбора времени
async function selectTime(selectedTime) {
  try {
    if (!currentUser) {
      if (isTestMode) {
        currentUser = { first_name: 'Test', last_name: 'User' };
      } else {
        currentUser = await vkBridge.send('VKWebAppGetUserInfo');
      }
    }

    const userName = `${currentUser.first_name} ${currentUser.last_name}`;
    const data = loadData();
    const currentSelection = Object.keys(data).find(t => data[t] === userName);

    // Отмена выбора
    if (currentSelection === selectedTime) {
      saveData(null, userName);
      updateUI(selectedTime, userName, false);
      return;
    }

    // Замена выбора
    if (currentSelection) {
      saveData(selectedTime, userName);
      updateUI(currentSelection, userName, false);
    }

    // Новый выбор
    saveData(selectedTime, userName);
    updateUI(selectedTime, userName, true);

  } catch (error) {
    console.error('Ошибка:', error);
    alert('Не удалось сохранить выбор');
  }
}

// Инициализация при загрузке страницы
window.onload = () => {
  // Рендер списка времени
  const container = document.getElementById('timeSlots');
  if (container) {
    container.innerHTML = timeSlots.map(time => `
      <div class="time-slot" onclick="selectTime('${time}')">
        ${time}
        <span class="user-name" id="user-${time}"></span>
      </div>
    `).join('');
  }

  // Загрузка сохраненных данных
  const data = loadData();
  Object.entries(data).forEach(([time, name]) => {
    updateUI(time, name, true);
  });
};
