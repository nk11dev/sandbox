# Документация архитектуры

## Интеграция MobX + TanStack Query

Этот документ описывает архитектурные паттерны, используемые для интеграции MobX с TanStack Query для HTTP и WebSocket транспортов.

## Основные концепции

### 1. Обертка MobxQuery

`MobxQuery` — это обертка вокруг `QueryObserver` из TanStack Query, которая делает запросы реактивными для MobX.

**Ключевые возможности:**
- Использует MobX `atom` для отслеживания реактивности
- Подписывается на изменения query observer
- Автоматически отслеживается при доступе в MobX реакциях
- Поддерживает Suspense выбрасывая промисы

**Пример использования:**

```typescript
class UsersEntityHttp {
    @observable getAllUsersQuery: MobxQuery<UserDto[]>

    constructor() {
        this.getAllUsersQuery = new MobxQuery(() => ({
            queryKey: ['users', 'http'],
            queryFn: this.getAllUsersFn,
            staleTime: 1000 * 60 * 5,
        }))
    }

    private getAllUsersFn = async (): Promise<UserDto[]> => {
        const response = await httpApi.get('/users')
        return response.data
    }
}
```

### 2. Обертка MobxMutation

`MobxMutation` оборачивает `MutationObserver` из TanStack Query для реактивных мутаций.

**Ключевые возможности:**
- Реактивное состояние мутации (isPending, isSuccess, error)
- Поддержка оптимистичных обновлений
- Манипуляция кэшем через `onSuccess`
- Типобезопасные переменные мутации

**Пример использования:**

```typescript
this.createUserMutation = new MobxMutation(() => ({
    mutationFn: this.createUserFn,
    onSuccess: (newUser) => {
        // Обновить кэш немедленно
        queryClient.setQueryData(['users', 'http'], (old = []) => 
            [...old, newUser]
        )
    },
}))
```

### 3. Трехслойная архитектура

```
┌─────────────────────────────────────┐
│   React Component (Представление)   │
│   - UsersList.tsx                   │
│   - Использует HOC observer()       │
│   - Получает state через props      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   State Store (Бизнес-логика)       │
│   - UsersListStateHttp.ts           │
│   - UI состояние (модалки, формы)   │
│   - Computed свойства               │
│   - Actions для взаимодействий      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Entity Store (Слой данных)        │
│   - UsersEntityHttp.ts              │
│   - MobxQuery для запросов          │
│   - MobxMutation для мутаций        │
│   - Единственный источник истины    │
└─────────────────────────────────────┘
```

## Реализации транспортов

### HTTP транспорт

```typescript
// Entity: Использует fetch через httpApi
private getAllUsersFn = async (): Promise<UserDto[]> => {
    const response = await httpApi.get<ApiResponse<UserDto[]>>('/users')
    if (!response.success) throw new Error(response.error)
    return response.data
}
```

**Поток мутации:**
1. Пользователь нажимает "Создать" → `state.createUser()`
2. State вызывает `entity.createUserMutation.mutate()`
3. HTTP запрос через `httpApi.post()`
4. `onSuccess` обновляет кэш через `queryClient.setQueryData()`
5. Сервер отправляет WebSocket событие для других клиентов
6. Компонент перерисовывается с новыми данными

### WebSocket транспорт

```typescript
// Entity: Использует socket.io через webSocketApi
private getAllUsersFn = async (): Promise<UserDto[]> => {
    const response = await webSocketApi.emit<ApiResponse<UserDto[]>>(
        'users:getAll'
    )
    if (!response.success) throw new Error(response.error)
    return response.data
}

// Подписка на события реального времени
constructor() {
    webSocketApi.on('users:created', () => {
        queryClient.invalidateQueries(['users', 'websocket'])
    })
}
```

**Поток реального времени:**
1. Любой клиент изменяет данные (HTTP или WebSocket)
2. Сервер рассылает событие всем подключенным клиентам
3. Обработчик события инвалидирует кэш
4. TanStack Query автоматически перезагружает данные
5. MobX запускает перерисовку компонента

## Ключевые кейсы интеграции

### Кейс 1: HTTP Entity + State

**Демонстрирует:**
- Интеграцию REST API
- Обновления кэша после мутаций
- Типобезопасную обработку запросов/ответов

**Реализовано в:**
- `UsersEntityHttp.ts` + `UsersListStateHttp.ts`
- `RolesEntityHttp.ts` + `RolesListStateHttp.ts`
- `GroupsEntityHttp.ts` + `GroupsPageState.ts`
- `AccessEntityHttp.ts` + `GroupsPageState.ts`

### Кейс 2: WebSocket Entity + State

**Демонстрирует:**
- Интеграцию Socket.io с TanStack Query
- Обновления в реальном времени через слушатели событий
- Автоматическую инвалидацию кэша

**Реализовано в:**
- `UsersEntityWebSocket.ts` + `UsersListStateWebSocket.ts`
- `RolesEntityWebSocket.ts` + `RolesListStateWebSocket.ts`
- `GroupsEntityWebSocket.ts` (готов к использованию)
- `AccessEntityWebSocket.ts` (готов к использованию)

### Кейс 3: Универсальный компонент

**Демонстрирует:**
- Транспортно-агностичные компоненты через интерфейсы
- Паттерн внедрения зависимостей
- Один компонент для множества транспортов

**Реализовано в:**
- `UsersList.tsx` - Работает с HTTP и WebSocket состояниями
- `RolesList.tsx` - Работает с HTTP и WebSocket состояниями

**Пример интерфейса:**

```typescript
interface IUsersListState {
    users: UserDto[]
    isLoading: boolean
    isFetching: boolean
    // ... методы
}
```

**Использование:**

```typescript
// Работает с HTTP
<UsersList state={httpState} title="Пользователи через HTTP" />

// Работает с WebSocket
<UsersList state={wsState} title="Пользователи через WebSocket" />
```

### Кейс 4: Оптимистичные обновления

**Паттерн: Обновление кэша до ответа сервера**

```typescript
onMutate: async (newUser) => {
    // Отменить исходящие перезагрузки
    await queryClient.cancelQueries(['users'])
    
    // Сохранить предыдущее значение
    const previous = queryClient.getQueryData<UserDto[]>(['users'])
    
    // Оптимистично обновить
    queryClient.setQueryData<UserDto[]>(['users'], (old = []) => 
        [...old, { ...newUser, id: Date.now() }]
    )
    
    return { previous }
},
onError: (err, newUser, context) => {
    // Откатиться при ошибке
    if (context?.previous) {
        queryClient.setQueryData(['users'], context.previous)
    }
},
```

### Кейс 5: Чтение кэша

**Паттерн: Читать из кэша чтобы избежать дублирующих запросов**

```typescript
// Получить пользователя из кэша вместо нового запроса
const cachedUser = queryClient.getQueryData<UserDto[]>(['users', 'http'])
    ?.find(u => u.id === userId)
    
if (cachedUser) {
    // Использовать кэшированные данные
    return cachedUser
}

// Загрузить если нет в кэше
return await getUserFn(userId)
```

### Кейс 6: Инвалидация кэша

**Паттерн: Инвалидировать связанные запросы после мутаций**

```typescript
// После создания пользователя, инвалидировать все связанные запросы
onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['access'] }) // Связанные данные
}

// WebSocket события также запускают инвалидацию
socket.on('users:created', () => {
    queryClient.invalidateQueries({ queryKey: ['users', 'websocket'] })
})
```

**Продвинутый пример: Кросс-сущностная инвалидация**

Демонстрируется в `GroupsEntityHttp.ts`:
```typescript
// Когда группа удаляется, матрица доступа должна обновиться
deleteGroupMutation: new MobxMutation(() => ({
    mutationFn: this.deleteGroupFn,
    onSuccess: (data) => {
        // Обновить кэш групп
        queryClient.setQueryData<GroupDto[]>(['groups', 'http'], ...)
        
        // Инвалидировать матрицу доступа (Кейс 6)
        queryClient.invalidateQueries({ queryKey: ['access'] })
    },
}))
```

Когда роли модифицируются, группы, ссылающиеся на эти роли, автоматически
обновляются через цепочку инвалидации кэша.

## Продвинутые паттерны интеграции

### Управление мульти-сущностным состоянием

**Демонстрируется в:** `GroupsPageState.ts`

Страница Groups объединяет множество entity хранилищ:
- `groupsEntityHttp` - CRUD групп
- `accessEntityHttp` - Матрица доступа
- `usersEntityHttp` - Список пользователей для матрицы
- `rolesEntityHttp` - Роли для мультиселекта

```typescript
export class GroupsPageState {
    @computed get groups(): GroupDto[] {
        return groupsEntityHttp.getAllGroupsQuery.data || []
    }
    
    @computed get users(): UserDto[] {
        return usersEntityHttp.getAllUsersQuery.data || []
    }
    
    @computed get accessRecords(): AccessDto[] {
        return accessEntityHttp.getAllAccessQuery.data || []
    }
}
```

### Загрузка данных из кэша сначала

**Демонстрируется в:** `GroupsEntityHttp.getGroupById()`

Перед отправкой запроса на сервер, сначала проверить кэш:

```typescript
getGroupById = async (id: GroupId): Promise<GroupDto | undefined> => {
    // Попробовать кэш сначала (Кейс 5)
    const cachedGroups = queryClient.getQueryData<GroupDto[]>(['groups', 'http'])
    const cachedGroup = cachedGroups?.find((g) => g.id === id)
    
    if (cachedGroup) {
        console.log(`✓ Найдено в кэше: ${id}`)
        return cachedGroup
    }
    
    // Загрузить с сервера только если не закэшировано
    const response = await httpApi.get<ApiResponse<GroupDto>>(`/groups/${id}`)
    return response.data
}
```

### Поиск в реальном времени без запросов

**Демонстрируется в:** `GroupsPageState.filteredUsers`

Поиск реализован используя computed свойства на кэшированных данных:

```typescript
@computed get filteredUsers(): UserDto[] {
    if (!this.searchQuery.trim()) {
        return this.users // Все данные из кэша
    }
    
    const terms = this.searchQuery.toLowerCase().split(' ').filter((t) => t.length > 0)
    
    return this.users.filter((user) => {
        const userName = user.name.toLowerCase()
        const userEmail = user.email.toLowerCase()
        
        return terms.every((term) => userName.includes(term) || userEmail.includes(term))
    })
}
```

API вызовы не нужны - мгновенная фильтрация!

### Кросс-сущностная инвалидация кэша

**Демонстрируется в:** Связь роль/группа

Когда роли модифицируются, группы автоматически обновляются:

```typescript
// В RolesEntityHttp
deleteRoleMutation: new MobxMutation(() => ({
    mutationFn: this.deleteRoleFn,
    onSuccess: (data) => {
        // Обновить кэш ролей
        queryClient.setQueryData<RoleDto[]>(['roles', 'http'], ...)
        
        // Инвалидировать группы (Кейс 6)
        queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
}))
```

Аналогично, когда группы модифицируются, матрица доступа обновляется:

```typescript
// В GroupsEntityHttp
deleteGroupMutation: new MobxMutation(() => ({
    mutationFn: this.deleteGroupFn,
    onSuccess: (data) => {
        // Обновить кэш групп
        queryClient.setQueryData<GroupDto[]>(['groups', 'http'], ...)
        
        // Инвалидировать доступ (Кейс 6)
        queryClient.invalidateQueries({ queryKey: ['access'] })
    },
}))
```

**Цепочка зависимостей:**
```
Роли → Группы → Доступ
  ↓       ↓        ↓
Инвалидация кэша распространяется автоматически
```

### Коллаборативная матрица доступа

**Демонстрируется в:** `GroupsAccess.tsx` + `GroupsPageState.ts`

Коллаборативное редактирование в реальном времени:

1. Пользователь A переключает чекбокс доступа
2. Мутация обновляет кэш немедленно (Кейс 5)
3. Сервер рассылает WebSocket событие
4. Матрица доступа пользователя B обновляется автоматически (Кейс 2 + 6)

```typescript
@action async toggleAccess(userId: UserId, groupId: GroupId) {
    const access = this.accessRecords.find((a) => a.subject === userId)
    
    const hasAccess = access.groups.includes(groupId)
    const updatedGroups = hasAccess
        ? access.groups.filter((g) => g !== groupId)
        : [...access.groups, groupId]
    
    // Мутация с немедленным обновлением кэша
    await accessEntityHttp.updateAccessMutation.mutate({
        subject: userId,
        updates: { groups: updatedGroups },
    })
}
```

## Лучшие практики

### 1. Ключи запросов

Используйте иерархические ключи для простой инвалидации:

```typescript
['users']                    // Все запросы пользователей
['users', 'http']            // HTTP-специфичные
['users', 'websocket']       // WebSocket-специфичные
['users', 'http', id]        // Конкретный пользователь
```

### 2. Обработка ошибок

Всегда обрабатывайте ошибки в query/mutation функциях:

```typescript
if (!response.success) {
    throw new Error(response.error)
}
```

### 3. TypeScript типы

Используйте строгие типы из общего пакета:

```typescript
import { UserDto, ApiResponse } from '@/common'

async getAllUsers(): Promise<UserDto[]> {
    const response = await api.get<ApiResponse<UserDto[]>>('/users')
    return response.data
}
```

### 4. MobX декораторы

Используйте декораторы для observable состояния:

```typescript
@observable getAllUsersQuery: MobxQuery<UserDto[]>
@computed get users(): UserDto[] { ... }
@action createUser(data) { ... }
```

### 5. Паттерны компонентов

Держите компоненты простыми, состояние в хранилищах:

```typescript
// ❌ Плохо: Логика в компоненте
function UsersList() {
    const [users, setUsers] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    // ... много логики
}

// ✅ Хорошо: Логика в хранилище
function UsersList({ state }: { state: IUsersListState }) {
    return observer(() => (
        <div>
            {state.users.map(user => ...)}
        </div>
    ))
}
```

## Соображения производительности

### 1. Время устаревания (Stale Time)

Установите подходящие stale times для уменьшения ненужных загрузок:

```typescript
staleTime: 1000 * 60 * 5 // 5 минут
```

### 2. Время кэша (Cache Time)

Контролируйте как долго неиспользуемые данные остаются в кэше:

```typescript
gcTime: 1000 * 60 * 10 // 10 минут
```

### 3. Селективная инвалидация

Инвалидируйте только то что нужно:

```typescript
// ✅ Хорошо: Специфичная инвалидация
queryClient.invalidateQueries({ queryKey: ['users', transport] })

// ❌ Плохо: Инвалидировать все
queryClient.invalidateQueries()
```

### 4. Реактивность MobX

Обращайтесь к observables только в render или реакциях:

```typescript
// ✅ Хорошо: В observer компоненте
export const UsersList = observer(({ state }) => {
    return <div>{state.users.length}</div>
})

// ❌ Плохо: Вне observer
const count = state.users.length // Не реактивно!
```

## Стратегии тестирования

### Обзор тестового набора

Проект включает комплексные тесты, покрывающие все паттерны интеграции и сценарии использования.

**Статистика тестов:**
- Тесты Entity Store: ~20 тестов на сущность (HTTP + WebSocket)
- Тесты State Store: ~18 тестов на состояние  
- Тесты компонентов: ~15 тестов на компонент
- Интеграционные тесты: ~10 end-to-end сценариев

### 1. Тесты Entity Store

Тестировать query и mutation функции независимо с замоканным API:

```typescript
// Тестировать HTTP транспорт
test('успешно создает пользователя', async () => {
    const mockUser = { id: 1, name: 'Test', email: 'test@test.com' }
    
    ;(httpApi.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockUser,
    })
    
    await entity.createUserMutation.mutate({
        name: 'Test',
        email: 'test@test.com'
    })
    
    expect(entity.createUserMutation.isSuccess).toBe(true)
    expect(httpApi.post).toHaveBeenCalledWith('/users', expect.any(Object))
})

// Тестировать WebSocket подписки на события
test('инвалидирует кэш при событии users:created', () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')
    
    // Вызвать WebSocket событие
    eventHandlers['users:created']({})
    
    expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['users', 'websocket']
    })
})
```

### 2. Тесты State Store

Тестировать бизнес-логику и UI состояние с замоканными entities:

```typescript
test('открывает модалку создания', () => {
    const state = new UsersListStateHttp()
    state.openCreateModal()
    
    expect(state.isModalOpen).toBe(true)
    expect(state.editingUser).toBeNull()
    expect(state.formData).toEqual({ name: '', email: '' })
})

test('вычисляет isMutating из множества мутаций', () => {
    mockCreateUserMutation._isPending = true
    expect(state.isMutating).toBe(true)
    
    mockCreateUserMutation._isPending = false
    mockUpdateUserMutation._isPending = true
    expect(state.isMutating).toBe(true)
})
```

### 3. Тесты компонентов

Тестировать с замоканным state используя `@testing-library/react`:

```typescript
test('отрисовывает список пользователей', () => {
    const mockState = {
        users: [{ id: 1, name: 'Test', email: 'test@test.com' }],
        isLoading: false,
        isFetching: false,
        isMutating: false,
        error: null,
        // ... другие необходимые свойства
    }
    
    renderWithProviders(<UsersList state={mockState} title="Test" />)
    
    expect(screen.getByText('Test')).toBeInTheDocument()
    expect(screen.getByText('test@test.com')).toBeInTheDocument()
})

test('вызывает openEditModal при клике на Edit', () => {
    const user = { id: 1, name: 'User 1', email: 'user1@test.com' }
    mockState.users = [user]
    
    renderWithProviders(<UsersList state={mockState} title="Test" />)
    
    const editButton = screen.getAllByText('Edit')[0]
    fireEvent.click(editButton)
    
    expect(mockState.openEditModal).toHaveBeenCalledWith(user)
})
```

### 4. Интеграционные тесты

Тестировать полные пользовательские потоки через все слои:

```typescript
test('Создание через HTTP обновляет оба кэша HTTP и WebSocket', async () => {
    // Шаг 1: Загрузить начальные данные
    await usersEntityHttp.getAllUsersQuery.refetch()
    await usersEntityWebSocket.getAllUsersQuery.refetch()
    
    // Шаг 2: Отрисовать оба блока
    renderWithProviders(
        <div>
            <UsersList state={httpState} title="Пользователи через HTTP" />
            <UsersList state={wsState} title="Пользователи через WebSocket" />
        </div>
    )
    
    // Шаг 3: Создать пользователя через HTTP
    const newUser = { id: 3, name: 'Новый', email: 'new@test.com' }
    ;(httpApi.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: newUser
    })
    
    fireEvent.click(screen.getAllByText('Create User')[0])
    // ... заполнить форму и отправить
    
    // Шаг 4: Проверить обновление HTTP кэша
    await waitFor(() => {
        const cache = queryClient.getQueryData(['users', 'http'])
        expect(cache).toContainEqual(newUser)
    })
    
    // Шаг 5: Симулировать WebSocket событие
    ;(webSocketApi as any)._triggerEvent('users:created', {})
    
    // Шаг 6: Проверить инвалидацию и перезагрузку WebSocket кэша
    await waitFor(() => {
        expect(webSocketApi.emit).toHaveBeenCalledWith('users:getAll')
    })
})
```

## Советы по отладке

### 1. Включить React Query Devtools

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools />
</QueryClientProvider>
```

### 2. Логирование Query/Mutation событий

```typescript
console.log('→ HTTP: Загрузка пользователей')
console.log('✓ Пользователь создан:', userId)
console.log('🔔 WebSocket событие: users:created')
```

### 3. Мониторинг WebSocket событий

```typescript
socket.on('connect', () => console.log('🔌 Подключено:', socket.id))
socket.on('disconnect', () => console.log('🔌 Отключено'))
```

### 4. MobX Spy

```typescript
import { spy } from 'mobx'

spy(event => {
    if (event.type === 'action') {
        console.log('Action:', event.name)
    }
})
```

## Руководство по миграции

### С обычного HTTP на эту архитектуру

1. **Извлечь API вызовы в Entity stores**
   - Переместить логику fetch в Entity методы
   - Обернуть с MobxQuery/MobxMutation

2. **Переместить UI состояние в State stores**
   - Состояние модалок, форм, выборок
   - Computed свойства для производных данных

3. **Сделать компоненты observers**
   - Обернуть с HOC `observer()`
   - Удалить useState/useEffect для серверных данных

4. **Добавить TypeScript типы**
   - Использовать общие типы для DTO
   - Типизировать все query/mutation функции

### С Redux на MobX + TanStack Query

1. **Заменить Redux слайсы на Entity stores**
   - Actions → Mutation функции
   - Reducers → MobX observables
   - Selectors → Computed свойства

2. **Переместить асинхронную логику в TanStack Query**
   - Redux Thunks → MobxQuery/MobxMutation
   - Middleware → Query/Mutation колбэки

3. **Упростить подключения компонентов**
   - Удалить connect() → Использовать observer()
   - Удалить mapStateToProps → Использовать computed
   - Удалить mapDispatchToProps → Использовать actions

## Заключение

Эта архитектура предоставляет:

✅ Типобезопасную интеграцию между MobX и TanStack Query  
✅ Поддержку множества транспортов (HTTP, WebSocket)  
✅ Синхронизацию в реальном времени между клиентами  
✅ Разделение ответственности (Entity/State/Component)  
✅ Легкое тестирование и поддержку  
✅ Отличный опыт разработчика  

Для вопросов или улучшений, смотрите примеры кода в кодовой базе.
