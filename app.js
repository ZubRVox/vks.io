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

// Инициализация календаря
const datePicker = flatpickr("#datePicker", {
    locale: "ru",
    minDate: "today",
    dateFormat: "d.m.Y",
    disableMobile: true,
    onChange: function(selectedDates) {
        const selectedDate = selectedDates[0];
        updateSchedule(selectedDate);
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
    const formattedDate = date.toLocaleDateString('ru-RU', options);
    titleElement.textContent = `Расписание на ${formattedDate}`;
    
    // Генерация слотов
    const timeSlots = generateTimeSlots(date);
    slotsElement.innerHTML = timeSlots.map(time => `
        <div class="time-slot" onclick="selectTime('${time}', '${date.toISOString()}')">
            <span>${time}</span>
            <span class="user-name" id="user-${date.toISOString()}-${time}"></span>
        </div>
    `).join('');

    // Загрузка сохраненных данных
    loadSavedData(date);
}

// Сохранение данных
function saveData(date, time, userName) {
    const dateKey = date.toISOString().split('T')[0];
    const data = JSON.parse(localStorage.getItem(dateKey) || '{}');
    
    // Удаляем предыдущий выбор
    Object.keys(data).forEach(t => {
        if (data[t] === userName) delete data[t];
    });
    
    // Добавляем новый выбор
    if (time) data[time] = userName;
    
    localStorage.setItem(dateKey, JSON.stringify(data));
}

// Загрузка данных
function loadSavedData(date) {
    const dateKey = date.toISOString().split('T')[0];
    const data = JSON.parse(localStorage.getItem(dateKey) || '{}');
    
    Object.entries(data).forEach(([time, name]) => {
        const element = document.getElementById(`user-${date.toISOString()}-${time}`);
        if (element) {
            element.textContent = name;
            element.parentElement.classList.add('selected');
        }
    });
}

// Обработка выбора времени
async function selectTime(time, dateString) {
    try {
        const date = new Date(dateString);
        const dateKey = date.toISOString().split('T')[0];
        
        // Получаем данные пользователя
        if (!currentUser) {
            currentUser = isTestMode 
                ? { first_name: 'Test', last_name: 'User' } 
                : await vkBridge.send('VKWebAppGetUserInfo');
        }
        const userName = `${currentUser.first_name} ${currentUser.last_name}`;

        // Загружаем текущие данные
        const data = JSON.parse(localStorage.getItem(dateKey) || {});
        const currentSelection = Object.keys(data).find(t => data[t] === userName);

        // Если кликнули на уже выбранное время - отмена
        if (currentSelection === time) {
            delete data[time];
            localStorage.setItem(dateKey, JSON.stringify(data));
            
            // Обновляем интерфейс
            const selectedSlot = document.getElementById(`user-${dateString}-${time}`);
            if (selectedSlot) {
                selectedSlot.textContent = '';
                selectedSlot.parentElement.classList.remove('selected');
            }
            return;
        }

        // Удаляем предыдущий выбор
        if (currentSelection) {
            delete data[currentSelection];
            
            // Обновляем старый слот
            const oldSlot = document.getElementById(`user-${dateString}-${currentSelection}`);
            if (oldSlot) {
                oldSlot.textContent = '';
                oldSlot.parentElement.classList.remove('selected');
            }
        }

        // Добавляем новый выбор
        data[time] = userName;
        localStorage.setItem(dateKey, JSON.stringify(data));

        // Обновляем новый слот
        const newSlot = document.getElementById(`user-${dateString}-${time}`);
        if (newSlot) {
            newSlot.textContent = userName;
            newSlot.parentElement.classList.add('selected');
        }

    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось сохранить выбор');
    }
}

// Инициализация пользователя
window.onload = async () => {
    if (!isTestMode) {
        try {
            currentUser = await vkBridge.send('VKWebAppGetUserInfo');
        } catch (error) {
            console.error('Ошибка получения пользователя:', error);
        }
    }
};
