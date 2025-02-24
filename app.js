// Инициализация VK Bridge
if (typeof vkBridge !== 'undefined') {
    try {
        vkBridge.send('VKWebAppInit')
            .then(() => console.log('VK Bridge успешно инициализирован'))
            .catch(e => console.error('Ошибка инициализации VK Bridge:', e));
    } catch (error) {
        console.error('Критическая ошибка:', error);
    }
}

let currentUser = null;
const isTestMode = typeof vkBridge === 'undefined';

// Конфигурация расписания (вторник, четверг, суббота)
const SCHEDULE_CONFIG = {
    2: { start: 11, end: 15 }, // Вторник (0=воскресенье, 1=понедельник, 2=вторник)
    4: { start: 15, end: 20 }, // Четверг
    6: { start: 15, end: 20 }  // Суббота
};

// Инициализация календаря
const datePicker = flatpickr("#datePicker", {
    locale: "ru",
    minDate: "today",
    dateFormat: "d.m.Y",
    disableMobile: true,
    maxDate: new Date().fp_incr(90), // +90 дней от текущей даты
    onChange: function(selectedDates) {
        if (selectedDates[0]) {
            console.log('Выбрана дата:', selectedDates[0]);
            updateSchedule(selectedDates[0]);
        }
    }
});

// Генерация временных слотов с проверкой
function generateTimeSlots(date) {
    try {
        if (!(date instanceof Date)) {
            console.error('Некорректная дата:', date);
            return [];
        }

        const dayOfWeek = date.getDay();
        console.log('День недели для', date.toISOString(), ':', dayOfWeek);

        const config = SCHEDULE_CONFIG[dayOfWeek];
        if (!config) {
            console.log('Для этого дня недели нет расписания');
            return [];
        }

        const slots = [];
        for (let hour = config.start; hour < config.end; hour++) {
            slots.push(
                `${hour.toString().padStart(2, '0')}:00`,
                `${hour.toString().padStart(2, '0')}:30`
            );
        }
        console.log('Сгенерированы слоты:', slots);
        return slots;
    } catch (error) {
        console.error('Ошибка генерации слотов:', error);
        return [];
    }
}

// Обновление интерфейса с дополнительными проверками
function updateSchedule(date) {
    try {
        console.log('Обновление расписания для:', date);

        const titleElement = document.getElementById('scheduleTitle');
        const slotsElement = document.getElementById('timeSlots');

        if (!titleElement || !slotsElement) {
            console.error('Не найдены элементы интерфейса');
            return;
        }

        // Форматирование даты
        const formattedDate = date.toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        titleElement.textContent = `Расписание на ${formattedDate}`;

        // Генерация и отображение слотов
        const timeSlots = generateTimeSlots(date);
        slotsElement.innerHTML = timeSlots.map(time => `
            <div class="time-slot" 
                 data-time="${time}" 
                 data-date="${date.toISOString()}"
                 onclick="handleTimeSelection('${time}', '${date.toISOString()}')">
                <span>${time}</span>
                <span class="user-name" id="user-${date.toISOString()}-${time}"></span>
            </div>
        `).join('');

        loadSavedData(date);
    } catch (error) {
        console.error('Ошибка обновления интерфейса:', error);
    }
}

// Обработка выбора времени с улучшенной логикой
async function handleTimeSelection(time, dateString) {
    try {
        console.log('Выбрано время:', time, 'для даты:', dateString);
        
        const date = new Date(dateString);
        const dateKey = date.toISOString().split('T')[0];
        const userName = await getUsername();

        // Получение текущих данных
        const storedData = localStorage.getItem(dateKey) || '{}';
        const data = JSON.parse(storedData);
        console.log('Текущие данные:', data);

        // Поиск элементов интерфейса
        const userElement = document.getElementById(`user-${dateString}-${time}`);
        const slotElement = document.querySelector(`[data-time="${time}"][data-date="${dateString}"]`);

        if (!userElement || !slotElement) {
            throw new Error('Элементы интерфейса не найдены');
        }

        // Логика выбора/отмены
        if (data[time] === userName) {
            // Отмена выбора
            delete data[time];
            userElement.textContent = '';
            slotElement.classList.remove('selected');
            console.log('Отмена выбора:', time);
        } else {
            // Удаление предыдущего выбора
            Object.keys(data).forEach(t => {
                if (data[t] === userName) {
                    delete data[t];
                    const oldDate = new Date(dateString);
                    const oldElement = document.querySelector(
                        `[data-time="${t}"][data-date="${oldDate.toISOString()}"]`
                    );
                    if (oldElement) {
                        oldElement.classList.remove('selected');
                        document.getElementById(`user-${dateString}-${t}`).textContent = '';
                    }
                }
            });

            // Добавление нового выбора
            data[time] = userName;
            userElement.textContent = userName;
            slotElement.classList.add('selected');
            console.log('Новый выбор:', time);
        }

        // Сохранение данных
        localStorage.setItem(dateKey, JSON.stringify(data));
        console.log('Сохраненные данные:', localStorage.getItem(dateKey));

    } catch (error) {
        console.error('Ошибка обработки выбора:', error);
        alert(`Ошибка: ${error.message}`);
    }
}

// Получение имени пользователя с кешированием
async function getUsername() {
    try {
        if (!currentUser) {
            if (isTestMode) {
                currentUser = { 
                    first_name: 'Тестовый', 
                    last_name: 'Пользователь' 
                };
                console.log('Тестовый пользователь:', currentUser);
            } else {
                currentUser = await vkBridge.send('VKWebAppGetUserInfo');
                console.log('Данные пользователя VK:', currentUser);
            }
        }
        return `${currentUser.first_name} ${currentUser.last_name}`;
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        return 'Неизвестный Пользователь';
    }
}

// Загрузка сохраненных данных с улучшенной обработкой
function loadSavedData(date) {
    try {
        const dateKey = date.toISOString().split('T')[0];
        const storedData = localStorage.getItem(dateKey) || '{}';
        const data = JSON.parse(storedData);
        console.log('Загрузка данных для', dateKey, ':', data);

        Object.entries(data).forEach(([time, name]) => {
            const element = document.getElementById(`user-${date.toISOString()}-${time}`);
            const slot = document.querySelector(
                `[data-time="${time}"][data-date="${date.toISOString()}"]`
            );
            
            if (element && slot) {
                element.textContent = name;
                slot.classList.add('selected');
                console.log('Восстановлен выбор:', time, name);
            }
        });
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// Инициализация при загрузке страницы
window.onload = () => {
    try {
        console.log('Инициализация приложения...');
        datePicker.setDate(new Date());
        
        if (!isTestMode) {
            vkBridge.send('VKWebAppGetUserInfo')
                .then(user => {
                    currentUser = user;
                    console.log('Пользователь VK:', currentUser);
                    updateSchedule(datePicker.selectedDates[0]);
                })
                .catch(console.error);
        } else {
            updateSchedule(new Date());
        }
    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }
};
