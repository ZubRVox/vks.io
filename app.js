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
    1: { start: 11, end: 15 }, // Понедельник → Вторник
    3: { start: 15, end: 20 }, // Среда → Четверг
    5: { start: 15, end: 20 }  // Пятница → Суббота
};

// Инициализация календаря
const datePicker = flatpickr("#datePicker", {
    locale: "ru",
    minDate: "today",
    dateFormat: "d.m.Y",
    disableMobile: true,
    maxDate: new Date().fp_incr(365), // На год вперед
    onChange: function(selectedDates) {
        updateSchedule(selectedDates[0]);
    }
});

// Генерация временных слотов
function generateTimeSlots(date) {
    const dayOfWeek = date.getDay();
    const config = SCHEDULE_CONFIG[dayOfWeek];
    if (!config) return [];
    
    const slots = [];
    for (let hour = config.start; hour < config.end; hour++) {
        slots.push(
            `${hour.toString().padStart(2, '0')}:00`,
            `${hour.toString().padStart(2, '0')}:30`
        );
    }
    return slots;
}

// Обновление интерфейса
function updateSchedule(date) {
    const titleElement = document.getElementById('scheduleTitle');
    const slotsElement = document.getElementById('timeSlots');
    
    // Форматирование даты
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    titleElement.textContent = `Расписание на ${date.toLocaleDateString('ru-RU', options)}`;
    
    // Генерация слотов
    const timeSlots = generateTimeSlots(date);
    slotsElement.innerHTML = timeSlots.map(time => `
        <div class="time-slot" data-time="${time}" onclick="handleTimeSelection('${time}')">
            <span>${time}</span>
            <span class="user-name" id="user-${time}"></span>
        </div>
    `).join('');

    // Загрузка сохраненных данных
    loadSavedData(date);
}

// Обработка выбора времени
async function handleTimeSelection(time) {
    try {
        const date = datePicker.selectedDates[0];
        if (!date) return;

        const userName = await getUsername();
        const dateKey = date.toISOString().split('T')[0];
        const data = JSON.parse(localStorage.getItem(dateKey)) || {};

        // Отмена выбора
        if (data[time] === userName) {
            delete data[time];
            document.getElementById(`user-${time}`).textContent = '';
            document.querySelector(`[data-time="${time}"]`).classList.remove('selected');
        } 
        // Новый выбор
        else {
            // Удаление предыдущего выбора
            Object.keys(data).forEach(t => {
                if (data[t] === userName) {
                    delete data[t];
                    const oldElement = document.querySelector(`[data-time="${t}"]`);
                    if (oldElement) {
                        oldElement.classList.remove('selected');
                        document.getElementById(`user-${t}`).textContent = '';
                    }
                }
            });
            
            data[time] = userName;
            document.getElementById(`user-${time}`).textContent = userName;
            document.querySelector(`[data-time="${time}"]`).classList.add('selected');
        }

        localStorage.setItem(dateKey, JSON.stringify(data));

    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось сохранить выбор');
    }
}

// Получение имени пользователя
async function getUsername() {
    if (!currentUser) {
        if (isTestMode) {
            currentUser = { first_name: 'Тест', last_name: 'Пользователь' };
        } else {
            currentUser = await vkBridge.send('VKWebAppGetUserInfo');
        }
    }
    return `${currentUser.first_name} ${currentUser.last_name}`;
}

// Загрузка сохраненных данных
function loadSavedData(date) {
    const dateKey = date.toISOString().split('T')[0];
    const data = JSON.parse(localStorage.getItem(dateKey) || {});
    
    Object.entries(data).forEach(([time, name]) => {
        const element = document.getElementById(`user-${time}`);
        if (element) {
            element.textContent = name;
            document.querySelector(`[data-time="${time}"]`).classList.add('selected');
        }
    });
}

// Инициализация при загрузке
window.onload = () => {
    datePicker.setDate(new Date());
    if (!isTestMode) {
        vkBridge.send('VKWebAppGetUserInfo')
            .then(user => currentUser = user)
            .catch(console.error);
    }
};
