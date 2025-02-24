// Инициализация VK Bridge
if (typeof vkBridge !== 'undefined') {
    try {
        vkBridge.send('VKWebAppInit').then(() => {
            console.log('VK Bridge initialized');
        });
    } catch (error) {
        console.error('Ошибка инициализации VK Bridge:', error);
    }
}

let currentUser = null;
const isTestMode = typeof vkBridge === 'undefined';

// Конфигурация расписания (исправленные дни недели)
const SCHEDULE_CONFIG = {
    2: { start: 11, end: 15 }, // Вторник
    4: { start: 15, end: 20 }, // Четверг
    6: { start: 15, end: 20 }  // Суббота
};

// Инициализация календаря
const datePicker = flatpickr("#datePicker", {
    locale: "ru",
    minDate: "today",
    dateFormat: "d.m.Y",
    disableMobile: true,
    maxDate: new Date().fp_incr(365),
    onChange: function(selectedDates) {
        if (selectedDates[0]) {
            updateSchedule(selectedDates[0]);
        }
    }
});

// Генерация временных слотов (добавлена проверка даты)
function generateTimeSlots(date) {
    if (!(date instanceof Date)) return [];
    
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

// Обновление интерфейса (добавлены проверки)
function updateSchedule(date) {
    if (!date) return;

    const titleElement = document.getElementById('scheduleTitle');
    const slotsElement = document.getElementById('timeSlots');
    
    if (!titleElement || !slotsElement) {
        console.error('Элементы интерфейса не найдены');
        return;
    }

    try {
        titleElement.textContent = `Расписание на ${date.toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        })}`;

        const timeSlots = generateTimeSlots(date);
        slotsElement.innerHTML = timeSlots.map(time => `
            <div class="time-slot" data-time="${time}" onclick="handleTimeSelection('${time}')">
                <span>${time}</span>
                <span class="user-name" id="user-${time}"></span>
            </div>
        `).join('');

        loadSavedData(date);
    } catch (error) {
        console.error('Ошибка обновления расписания:', error);
    }
}

// Обработка выбора времени (оптимизировано)
async function handleTimeSelection(time) {
    try {
        const date = datePicker.selectedDates[0];
        if (!date) return;

        const userName = await getUsername();
        const dateKey = date.toISOString().split('T')[0];
        const data = JSON.parse(localStorage.getItem(dateKey) || '{}');

        // Получаем элементы интерфейса
        const userElement = document.getElementById(`user-${time}`);
        const slotElement = document.querySelector(`[data-time="${time}"]`);

        if (!userElement || !slotElement) {
            throw new Error('Элементы интерфейса не найдены');
        }

        // Логика выбора/отмены
        if (data[time] === userName) {
            delete data[time];
            userElement.textContent = '';
            slotElement.classList.remove('selected');
        } else {
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
            userElement.textContent = userName;
            slotElement.classList.add('selected');
        }

        localStorage.setItem(dateKey, JSON.stringify(data));

    } catch (error) {
        console.error('Ошибка:', error);
        alert(`Ошибка: ${error.message}`);
    }
}

// Получение имени пользователя (кеширование)
async function getUsername() {
    if (!currentUser) {
        if (isTestMode) {
            currentUser = { first_name: 'Тест', last_name: 'Пользователь' };
        } else {
            try {
                currentUser = await vkBridge.send('VKWebAppGetUserInfo');
            } catch (error) {
                console.error('Ошибка получения пользователя:', error);
                currentUser = { first_name: 'Неизвестный', last_name: 'Пользователь' };
            }
        }
    }
    return `${currentUser.first_name} ${currentUser.last_name}`;
}

// Загрузка сохраненных данных (добавлена обработка ошибок)
function loadSavedData(date) {
    try {
        const dateKey = date.toISOString().split('T')[0];
        const data = JSON.parse(localStorage.getItem(dateKey) || {};
        
        Object.entries(data).forEach(([time, name]) => {
            const element = document.getElementById(`user-${time}`);
            const slot = document.querySelector(`[data-time="${time}"]`);
            
            if (element && slot) {
                element.textContent = name;
                slot.classList.add('selected');
            }
        });
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// Инициализация при загрузке (добавлен обработчик ошибок)
window.onload = () => {
    try {
        datePicker.setDate(new Date());
        if (!isTestMode) {
            vkBridge.send('VKWebAppGetUserInfo')
                .then(user => {
                    currentUser = user;
                    updateSchedule(datePicker.selectedDates[0]);
                })
                .catch(error => {
                    console.error('Ошибка инициализации:', error);
                });
        }
    } catch (error) {
        console.error('Критическая ошибка инициализации:', error);
    }
};
