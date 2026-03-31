## План записи roadmap и старта реализации (Sprint 1)

### Summary
- Цель этого этапа: зафиксировать план в файле и сразу начать реализацию с `Infra + backend contracts`.
- Первый инкремент должен дать рабочий локальный стенд (`docker compose up`) и базовый end-to-end поток: guest login -> join persistent room -> read/send chat via REST+WS.

### Implementation Changes
- [ ] Создать файл [roadmap.md](X:/Projects/STARTUPS/voicesense/roadmap.md) в корне и перенести туда утвержденный roadmap (без изменений по сути, с чекбоксами и секцией Sprint 1).
- [ ] Поднять базовую структуру backend-микросервисов в `backend/`: `api-gateway`, `auth-service`, `room-service`, `chat-service`, `media-service`, `shared`.
- [ ] Добавить `docker-compose.yml` в корень с сервисами: `postgres`, `redis`, `livekit`, все FastAPI-сервисы, gateway.
- [ ] Добавить `.env.example` с едиными переменными (DB/Redis/JWT/LiveKit/CORS/room defaults).
- [ ] Реализовать минимальные REST-контракты:
1. `POST /api/v1/auth/guest`
2. `GET /api/v1/rooms`
3. `GET /api/v1/rooms/{roomId}/messages`
4. `POST /api/v1/rooms/{roomId}/messages`
5. `POST /api/v1/rooms/{roomId}/media-token`
- [ ] Реализовать WS endpoint `GET /ws/v1/rooms/{roomId}` с событиями `chat.message.created` и базовым presence.
- [ ] Добавить PostgreSQL schema/migrations для `users`, `rooms`, `messages`, `sessions`; seed нескольких постоянных комнат.
- [ ] В Redis вынести presence и pub/sub канал для трансляции новых сообщений.
- [ ] Подключить webhook обработку LiveKit событий join/leave в `media-service`.

### Frontend (FSD) в рамках старта
- [ ] Перестроить `frontend/src` под FSD: `app`, `processes`, `pages`, `widgets`, `features`, `entities`, `shared`.
- [ ] Сделать минимальный вертикальный сценарий UI:
1. guest join
2. выбор постоянной комнаты
3. история чата + отправка сообщения
4. подключение к voice/token (без сложной модерации)
- [ ] Screen sharing с аудио оставить следующим шагом после стабилизации backend-контрактов (но сразу заложить типы `screenAudioOn` и media hooks API).

### Test Plan
- [ ] Smoke: `docker compose up` поднимает все сервисы healthy.
- [ ] Интеграция: сообщение сохраняется в PostgreSQL и мгновенно приходит по WS второму клиенту.
- [ ] Контракт: OpenAPI у каждого сервиса + проверка JWT на gateway.
- [ ] E2E (минимум): guest -> room -> send message -> refresh -> история сохранилась.

### Assumptions
- В этом режиме фиксируем только план; реализация и создание файлов выполняются следующим шагом после выхода из Plan Mode.
- Модель v1: guest-only, несколько постоянных комнат, immutable и бессрочно хранимый чат, без модерации/recording.
