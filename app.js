// Инициализация VK Bridge
if (typeof vkBridge !== 'undefined') {
  try {
    vkBridge.send('VKWebAppInit');
  } catch (error) {
    console.error('Ошибка инициализации VK Bridge:', error);
  }
}

let currentUser = null;
const isTestMode = typeof vkBridge === 'undefined';

// Конфигурация расписания
const SCHEDULE_CONFIG = {
  2: { // Вторник
    start: 11,
    end: 15
  },
  4: { // Четверг
    start: 15,
    end: 20
  },
  6: { // Суббота
    start: 15,
    end: 20
  }
};

// Генерация временных слотов
function generateTimeSlots(dayOfWeek) {
  const config = SCHEDULE_CONFIG[dayOfWeek];
  if (!config) return [];
  
  const slots = [];
  for (let hour = config.start; hour < config.end; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  return slots;
}

// Получение даты ближайшего занятия
function getNextClassDate() {
  const today = new Date();
  const currentDay = today.getDay(); // 0-6 (воскресенье=0)
  
  let targetDay;
  if (currentDay === 1) targetDay = 2; // Пн → Вт
  else if (currentDay === 3) targetDay = 4; // Ср → Чт
  else if (currentDay === 5) targetDay = 6; // Пт → Сб
  else return null; // Нет занятий

  const date = new Date(today);
  date.setDate(today.getDate() + (targetDay - currentDay));
  return date;
}

// Форматирование даты
function formatDate(date) {
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  return date.toLocaleDateString('ru-RU', options);
}

// Загрузка данных из LocalStorage
function loadData(date) {
  try {
    return JSON.parse(localStorage.getItem(`schedule_${date}`) || {});
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
    return {};
  }
}

// Сохранение данных
function saveData(date, time, userName) {
  const data = loadData(date);
  
  // Удаляем предыдущий выбор
  Object.keys(data).forEach(t => {
    if (data[t] === userName) delete data[t];
  });

  // Добавляем новый выбор
  if (time) data[time] = userName;
  
  try {
    localStorage.setItem(`schedule_${date}`, JSON.stringify(data));
  } catch (error) {
    console.error('Ошибка сохранения:', error);
    alert('Не удалось сохранить');
  }
}

// Обновление интерфейса
function updateUI(date) {
  const dateElement = document.getElementById('classDate');
  const slotsElement = document.getElementById('timeSlots');
  
  if (!date) {
    dateElement.textContent = 'Занятий на этой неделе нет';
    slotsElement.innerHTML = '';
    return;
  }

  // Отображаем дату
  dateElement.textContent = `Расписание на ${formatDate(date)}`;
  
  // Генерируем слоты
  const timeSlots = generateTimeSlots(date.getDay());
  slotsElement.innerHTML = timeSlots.map(time => `
    <div class="time-slot" onclick="selectTime('${time}')">
      ${time}
      <span class="user-name" id="user-${time}"></span>
    </div>
  `).join('');

  // Загружаем сохраненные данные
  const data = loadData(date.toISOString().split('T')[0]);
  Object.entries(data).forEach(([time, name]) => {
    const userElement = document.getElementById(`user-${time}`);
    if (userElement) userElement.textContent = name;
    document.querySelector(`[onclick="selectTime('${time}')"]`).classList.add('selected');
  });
}

// Выбор времени
async function selectTime(selectedTime) {
  try {
    const classDate = getNextClassDate();
    if (!classDate) return;

    if (!currentUser) {
      currentUser = isTestMode 
        ? { first_name: 'Test', last_name: 'User' } 
        : await vkBridge.send('VKWebAppGetUserInfo');
    }

    const userName = `${currentUser.first_name} ${currentUser.last_name}`;
    const dateKey = classDate.toISOString().split('T')[0];
    const data = loadData(dateKey);
    const currentSelection = Object.keys(data).find(t => data[t] === userName);

    // Отмена выбора
    if (currentSelection === selectedTime) {
      saveData(dateKey, null, userName);
      document.getElementById(`user-${selectedTime}`).textContent = '';
      document.querySelector(`[onclick="selectTime('${selectedTime}')"]`).classList.remove('selected');
      return;
    }

    // Обновляем данные
    saveData(dateKey, selectedTime, userName);
    
    // Обновляем UI
    if (currentSelection) {
      document.getElementById(`user-${currentSelection}`).textContent = '';
      document.querySelector(`[onclick="selectTime('${currentSelection}')"]`).classList.remove('selected');
    }
    
    document.getElementById(`user-${selectedTime}`).textContent = userName;
    document.querySelector(`[onclick="selectTime('${selectedTime}')"]`).classList.add('selected');

  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка сохранения');
  }
}

// Инициализация
window.onload = () => {
  const classDate = getNextClassDate();
  updateUI(classDate);
};
