# Руководство по тестированию

## Философия тестирования

Этот проект следует **послойному подходу к тестированию**, который отражает архитектуру приложения:

```
Интеграционные тесты (E2E сценарии)
        ↑
Тесты компонентов (UI поведение)
        ↑
Тесты State хранилищ (Бизнес-логика)
        ↑
Тесты Entity хранилищ (Слой данных)
```

## Принципы тестирования

### 1. Изоляция тестов

Каждый слой тестируется независимо с замоканными зависимостями:

- **Entity stores** - Мокируем HTTP/WebSocket API
- **State stores** - Мокируем entity хранилища
- **Components** - Мокируем state объекты
- **Integration** - Используем реальные stores с замоканным транспортом

### 2. Тестируйте то что важно

Фокусируйтесь на поведении, а не на реализации:

```typescript
// ✅ Хорошо: Тестировать поведение
test('создает пользователя и показывает в списке', () => {
    state.createUser({ name: 'Test', email: 'test@test.com' })
    expect(state.users).toContainEqual(expect.objectContaining({ name: 'Test' }))
})

// ❌ Плохо: Тестировать реализацию
test('вызывает httpApi.post с правильными параметрами', () => {
    // Слишком привязано к реализации
})
```

### 3. Избегайте чрезмерного мокирования

Мокируйте только внешние зависимости, а не внутреннюю логику:

```typescript
// ✅ Хорошо: Мокировать внешнее API
jest.mock('@/services/http/HttpApi')

// ❌ Плохо: Мокировать внутренние stores
jest.mock('@/stores/entities/UsersEntityHttp')
// Это ломает интеграцию, которую вы пытаетесь протестировать!
```

## Структура тестов

### Расположение директорий

```
packages/client/src/
├── __tests__/
│   ├── testUtils.tsx              # Общие тестовые утилиты
│   └── integration/               # End-to-end сценарии
│       └── usersFlow.test.tsx
├── stores/
│   ├── entities/__tests__/       # Тесты слоя Entity
│   │   ├── UsersEntityHttp.test.ts
│   │   └── UsersEntityWebSocket.test.ts
│   └── state/__tests__/          # Тесты слоя State
│       └── UsersListStateHttp.test.ts
└── components/
    └── users/__tests__/          # Тесты компонентов
        └── UsersList.test.tsx
```

### Именование файлов

- Файлы тестов: `*.test.ts` или `*.test.tsx`
- Тестовые утилиты: `testUtils.ts`
- Файлы настройки: `setupTests.ts`

## Написание тестов Entity Store

Entity stores управляют загрузкой данных и мутациями. Тестируйте их с замоканными API.

### Настройка

```typescript
import { QueryClient } from '@tanstack/react-query'
import { createTestQueryClient } from '@/__tests__/testUtils'
import { httpApi, queryClient as importedQueryClient } from '@/services'
import { UsersEntityHttp } from '@/stores/entities/UsersEntityHttp'

// Мокируем HTTP API
jest.mock('@/services/http/HttpApi', () => ({
    httpApi: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
}))

describe('UsersEntityHttp', () => {
    let entity: UsersEntityHttp
    let queryClient: QueryClient

    beforeAll(() => {
        // Заменить глобальный queryClient тестовым клиентом
        queryClient = createTestQueryClient()
        Object.assign(importedQueryClient, queryClient)
    })

    beforeEach(() => {
        entity = new UsersEntityHttp()
        jest.clearAllMocks()
    })

    afterEach(() => {
        queryClient.clear()
    })
})
```

### Тестирование Queries

```typescript
test('успешно загружает всех пользователей', async () => {
    const mockUsers: UserDto[] = [
        { id: 1, name: 'User 1', email: 'user1@test.com' },
        { id: 2, name: 'User 2', email: 'user2@test.com' },
    ]

    ;(httpApi.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockUsers,
    })

    await entity.getAllUsersQuery.refetch()

    expect(httpApi.get).toHaveBeenCalledWith('/users')
    expect(entity.getAllUsersQuery.data).toEqual(mockUsers)
    expect(entity.getAllUsersQuery.isSuccess).toBe(true)
    expect(entity.getAllUsersQuery.isError).toBe(false)
})

test('обрабатывает ошибку загрузки', async () => {
    ;(httpApi.get as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Ошибка сети',
    })

    await entity.getAllUsersQuery.refetch()

    expect(entity.getAllUsersQuery.isError).toBe(true)
    expect(entity.getAllUsersQuery.error).toBeTruthy()
})
```

### Тестирование Mutations

```typescript
test('создает пользователя и обновляет состояние мутации', async () => {
    const newUser: UserDto = {
        id: 3,
        name: 'Новый пользователь',
        email: 'new@test.com',
    }

    ;(httpApi.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: newUser,
    })

    await entity.createUserMutation.mutate({
        name: newUser.name,
        email: newUser.email,
    })

    expect(httpApi.post).toHaveBeenCalledWith('/users', {
        name: newUser.name,
        email: newUser.email,
    })
    
    expect(entity.createUserMutation.isSuccess).toBe(true)
    expect(entity.createUserMutation.data).toEqual(newUser)
})

test('обрабатывает ошибку мутации', async () => {
    ;(httpApi.post as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Ошибка валидации',
    })

    await expect(
        entity.createUserMutation.mutate({
            name: '',
            email: 'invalid',
        })
    ).rejects.toThrow('Ошибка валидации')

    expect(entity.createUserMutation.isError).toBe(true)
})
```

### Тестирование WebSocket подписок на события

```typescript
describe('WebSocket подписки на события', () => {
    test('подписывается на все WebSocket события', () => {
        expect(webSocketApi.on).toHaveBeenCalledWith(
            'users:created',
            expect.any(Function)
        )
        expect(webSocketApi.on).toHaveBeenCalledWith(
            'users:updated',
            expect.any(Function)
        )
        expect(webSocketApi.on).toHaveBeenCalledWith(
            'users:deleted',
            expect.any(Function)
        )
    })
})
```

## Написание тестов State Store

State stores управляют UI состоянием и бизнес-логикой. Тестируйте их с замоканными entities.

### Настройка

```typescript
import type { UserDto } from '@/common'
import type { UsersListStateHttp } from '@/stores/state/UsersListStateHttp'

// Создать мок entity с геттерами
const createMockQuery = () => ({
    get data() { return this._data },
    get isLoading() { return this._isLoading },
    get isFetching() { return this._isFetching },
    get error() { return this._error },
    _data: undefined as UserDto[] | undefined,
    _isLoading: false,
    _isFetching: false,
    _error: null as Error | null,
    refetch: jest.fn(),
})

const mockGetAllUsersQuery = createMockQuery()

// Мокируем entity
jest.mock('@/stores/entities/UsersEntityHttp', () => ({
    usersEntityHttp: {
        get getAllUsersQuery() { return mockGetAllUsersQuery },
        get createUserMutation() { return mockCreateUserMutation },
    },
}))

describe('UsersListStateHttp', () => {
    let UsersListStateHttpClass: typeof UsersListStateHttp
    let state: UsersListStateHttp

    beforeAll(async () => {
        const module = await import('@/stores/state/UsersListStateHttp')
        UsersListStateHttpClass = module.UsersListStateHttp
    })

    beforeEach(() => {
        state = new UsersListStateHttpClass()
        mockGetAllUsersQuery._data = undefined
        mockGetAllUsersQuery._isLoading = false
        jest.clearAllMocks()
    })
})
```

### Тестирование UI состояния

```typescript
test('открывает модалку создания', () => {
    state.openCreateModal()

    expect(state.isModalOpen).toBe(true)
    expect(state.editingUser).toBeNull()
    expect(state.formData).toEqual({ name: '', email: '' })
})

test('открывает модалку редактирования с данными пользователя', () => {
    const user: UserDto = {
        id: 1,
        name: 'Тестовый пользователь',
        email: 'test@test.com',
    }

    state.openEditModal(user)

    expect(state.isModalOpen).toBe(true)
    expect(state.editingUser).toEqual(user)
    expect(state.formData).toEqual({
        name: user.name,
        email: user.email,
    })
})

test('закрывает модалку и сбрасывает состояние', () => {
    state.openCreateModal()
    state.formData.name = 'Test'
    state.closeModal()

    expect(state.isModalOpen).toBe(false)
    expect(state.editingUser).toBeNull()
    expect(state.formData).toEqual({ name: '', email: '' })
})
```

### Тестирование Computed свойств

```typescript
test('возвращает пользователей из entity', () => {
    const mockUsers: UserDto[] = [
        { id: 1, name: 'User 1', email: 'user1@test.com' },
    ]
    mockGetAllUsersQuery._data = mockUsers

    expect(state.users).toEqual(mockUsers)
})

test('возвращает пустой массив когда нет данных', () => {
    mockGetAllUsersQuery._data = undefined

    expect(state.users).toEqual([])
})

test('вычисляет isMutating из нескольких мутаций', () => {
    mockCreateUserMutation._isPending = true
    expect(state.isMutating).toBe(true)

    mockCreateUserMutation._isPending = false
    mockUpdateUserMutation._isPending = true
    expect(state.isMutating).toBe(true)
})
```

### Тестирование Actions

```typescript
test('создает пользователя через entity', async () => {
    mockCreateUserMutation.mutate.mockResolvedValue(undefined)

    await state.createUser({
        name: 'Новый пользователь',
        email: 'new@test.com',
    })

    expect(mockCreateUserMutation.mutate).toHaveBeenCalledWith({
        name: 'Новый пользователь',
        email: 'new@test.com',
    })
})

test('удаляет пользователя с подтверждением', async () => {
    mockDeleteUserMutation.mutate.mockResolvedValue(undefined)
    ;(global.confirm as jest.Mock).mockReturnValue(true)

    await state.deleteUser(1)

    expect(global.confirm).toHaveBeenCalled()
    expect(mockDeleteUserMutation.mutate).toHaveBeenCalledWith(1)
})
```

## Написание тестов компонентов

Компоненты - это чистое представление. Тестируйте их с замоканным state.

### Настройка

```typescript
import { fireEvent, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { renderWithProviders } from '@/__tests__/testUtils'
import { UserDto } from '@/common'
import { IUsersListState, UsersList } from '@/components/users/UsersList'

describe('Компонент UsersList', () => {
    let mockState: IUsersListState

    beforeEach(() => {
        mockState = {
            users: [],
            isLoading: false,
            isFetching: false,
            isMutating: false,
            error: null,
            isModalOpen: false,
            editingUser: null,
            formData: { name: '', email: '' },
            openCreateModal: jest.fn(),
            openEditModal: jest.fn(),
            closeModal: jest.fn(),
            updateFormField: jest.fn(),
            submitForm: jest.fn(),
            deleteUser: jest.fn(),
            refetch: jest.fn(),
        }
    })
})
```

### Тестирование отрисовки

```typescript
test('отрисовывает заголовок', () => {
    renderWithProviders(<UsersList state={mockState} title="Тестовые пользователи" />)

    expect(screen.getByText('Тестовые пользователи')).toBeInTheDocument()
})

test('отрисовывает состояние загрузки', () => {
    mockState.isLoading = true

    renderWithProviders(<UsersList state={mockState} title="Тестовые пользователи" />)

    expect(screen.getByText(/loading users/i)).toBeInTheDocument()
})

test('отрисовывает список пользователей', () => {
    const users: UserDto[] = [
        { id: 1, name: 'User 1', email: 'user1@test.com' },
        { id: 2, name: 'User 2', email: 'user2@test.com' },
    ]
    mockState.users = users

    renderWithProviders(<UsersList state={mockState} title="Тестовые пользователи" />)

    expect(screen.getByText('User 1')).toBeInTheDocument()
    expect(screen.getByText('User 2')).toBeInTheDocument()
})
```

### Тестирование взаимодействий пользователя

```typescript
test('вызывает refetch при клике на кнопку', () => {
    renderWithProviders(<UsersList state={mockState} title="Тестовые пользователи" />)

    const refetchButton = screen.getByText('Refetch')
    fireEvent.click(refetchButton)

    expect(mockState.refetch).toHaveBeenCalled()
})

test('вызывает openEditModal при клике на Edit', () => {
    const user: UserDto = {
        id: 1,
        name: 'User 1',
        email: 'user1@test.com',
    }
    mockState.users = [user]

    renderWithProviders(<UsersList state={mockState} title="Тестовые пользователи" />)

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    expect(mockState.openEditModal).toHaveBeenCalledWith(user)
})
```

### Тестирование поведения модалки

```typescript
test('отрисовывает модалку когда открыта', () => {
    mockState.isModalOpen = true

    renderWithProviders(<UsersList state={mockState} title="Тестовые пользователи" />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
})

test('вызывает updateFormField при изменении input', () => {
    mockState.isModalOpen = true
    mockState.formData = { name: '', email: '' }

    renderWithProviders(<UsersList state={mockState} title="Тестовые пользователи" />)

    const nameInput = screen.getByLabelText('Name')
    fireEvent.change(nameInput, { target: { value: 'Новое имя' } })

    expect(mockState.updateFormField).toHaveBeenCalledWith('name', 'Новое имя')
})
```

## Написание интеграционных тестов

Интеграционные тесты проверяют полные потоки через все слои.

### Настройка

```typescript
import { QueryClient } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { createTestQueryClient, renderWithProviders } from '@/__tests__/testUtils'
import { UserDto } from '@/common'
import { UsersList } from '@/components/users/UsersList'
import { httpApi } from '@/services/http/HttpApi'
import { webSocketApi } from '@/services/websocket/WebSocketApi'
import { usersEntityHttp } from '@/stores/entities/UsersEntityHttp'
import { usersEntityWebSocket } from '@/stores/entities/UsersEntityWebSocket'
import { UsersListStateHttp } from '@/stores/state/UsersListStateHttp'
import { UsersListStateWebSocket } from '@/stores/state/UsersListStateWebSocket'

// Мокируем только API
jest.mock('@/services/http/HttpApi')
jest.mock('@/services/websocket/WebSocketApi')

describe('Интеграционный поток Users', () => {
    let queryClient: QueryClient
    let httpState: UsersListStateHttp
    let wsState: UsersListStateWebSocket

    beforeEach(() => {
        queryClient = createTestQueryClient()
        httpState = new UsersListStateHttp()
        wsState = new UsersListStateWebSocket()
        jest.clearAllMocks()
    })

    afterEach(() => {
        queryClient.clear()
    })
})
```

### Тестирование полных сценариев

```typescript
test('создает пользователя через HTTP и синхронизирует с WebSocket', async () => {
    const initialUsers: UserDto[] = [
        { id: 1, name: 'User 1', email: 'user1@test.com' },
    ]

    // Мокируем начальную загрузку
    ;(httpApi.get as jest.Mock).mockResolvedValue({
        success: true,
        data: initialUsers,
    })

    // Загружаем начальные данные
    await usersEntityHttp.getAllUsersQuery.refetch()

    // Отрисовываем оба блока
    renderWithProviders(
        <div>
            <UsersList state={httpState} title="Пользователи через HTTP" />
            <UsersList state={wsState} title="Пользователи через WebSocket" />
        </div>,
        { queryClient }
    )

    // Проверяем начальное состояние
    await waitFor(() => {
        expect(screen.getAllByText('User 1')).toHaveLength(2)
    })

    // Создаем нового пользователя
    const newUser: UserDto = {
        id: 2,
        name: 'Новый пользователь',
        email: 'new@test.com',
    }

    ;(httpApi.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: newUser,
    })

    // Кликаем создать в HTTP блоке
    const createButtons = screen.getAllByText('Create User')
    fireEvent.click(createButtons[0])

    // Заполняем форму
    const nameInput = screen.getByLabelText('Name')
    const emailInput = screen.getByLabelText('Email')
    fireEvent.change(nameInput, { target: { value: 'Новый пользователь' } })
    fireEvent.change(emailInput, { target: { value: 'new@test.com' } })

    // Отправляем
    const form = document.querySelector('form')
    if (form) {
        fireEvent.submit(form)
    }

    // Проверяем обновление HTTP кэша
    await waitFor(() => {
        const cache = queryClient.getQueryData<UserDto[]>(['users', 'http'])
        expect(cache).toHaveLength(2)
        expect(cache).toContainEqual(newUser)
    })
})
```

## Тестовые утилиты

### renderWithProviders

Оборачивает компоненты необходимыми провайдерами:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, RenderOptions } from '@testing-library/react'
import { observer } from 'mobx-react'
import { ReactElement, ReactNode } from 'react'

export function createTestQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
                staleTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    })
}

export const TestProviders = observer(function TestProviders({
    children,
    queryClient = createTestQueryClient(),
}: {
    children: ReactNode
    queryClient?: QueryClient
}) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
})

export function renderWithProviders(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'> & {
        queryClient?: QueryClient
    }
) {
    const { queryClient, ...renderOptions } = options || {}

    return render(ui, {
        wrapper: ({ children }) => (
            <TestProviders queryClient={queryClient}>{children}</TestProviders>
        ),
        ...renderOptions,
    })
}
```

### waitForAsync

Ожидать разрешения промисов:

```typescript
export function waitForAsync(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0))
}
```

## Общие паттерны тестирования

### Тестирование асинхронных операций

```typescript
test('обрабатывает асинхронную операцию', async () => {
    await entity.mutation.mutate(data)
    
    await waitFor(() => {
        expect(entity.mutation.isSuccess).toBe(true)
    })
})
```

### Тестирование состояний ошибок

```typescript
test('отображает сообщение об ошибке', () => {
    mockState.error = new Error('Тестовая ошибка')

    renderWithProviders(<Component state={mockState} />)

    expect(screen.getByText(/error: тестовая ошибка/i)).toBeInTheDocument()
})
```

### Тестирование условной отрисовки

```typescript
test('показывает спиннер загрузки при загрузке', () => {
    mockState.isLoading = true

    const { container } = renderWithProviders(<Component state={mockState} />)

    const spinner = container.querySelector('.spinner')
    expect(spinner).toBeInTheDocument()
})
```

### Тестирование состояний кнопок

```typescript
test('отключает кнопки при мутации', () => {
    mockState.isMutating = true

    renderWithProviders(<Component state={mockState} />)

    const button = screen.getByText('Submit')
    expect(button).toBeDisabled()
})
```

## Лучшие практики

### 1. Четкие названия тестов

```typescript
// ✅ Хорошо: Описательно и конкретно
test('создает пользователя и обновляет кэш при успешной мутации')

// ❌ Плохо: Расплывчато
test('работает')
```

### 2. Паттерн Arrange-Act-Assert

```typescript
test('открывает модалку редактирования с данными пользователя', () => {
    // Arrange (Подготовка)
    const user = { id: 1, name: 'Test', email: 'test@test.com' }
    
    // Act (Действие)
    state.openEditModal(user)
    
    // Assert (Проверка)
    expect(state.isModalOpen).toBe(true)
    expect(state.editingUser).toEqual(user)
})
```

### 3. Тестируйте одну вещь

```typescript
// ✅ Хорошо: Одна ответственность
test('открывает модалку при клике на кнопку', () => {
    fireEvent.click(button)
    expect(state.isModalOpen).toBe(true)
})

test('загружает данные пользователя при открытии модалки', () => {
    state.openEditModal(user)
    expect(state.formData).toEqual({ name: user.name, email: user.email })
})

// ❌ Плохо: Тестирование слишком многого
test('модалка работает корректно', () => {
    // Тестирует открытие, загрузку, отправку, закрытие...
})
```

### 4. Избегайте деталей реализации

```typescript
// ✅ Хорошо: Тестировать поведение
test('отображает пользователя в списке после создания', () => {
    state.createUser(data)
    expect(state.users).toContainEqual(expect.objectContaining(data))
})

// ❌ Плохо: Тестировать реализацию
test('вызывает setUsers с новым массивом', () => {
    const spy = jest.spyOn(state, '_updateUsersArray')
    state.createUser(data)
    expect(spy).toHaveBeenCalled()
})
```

### 5. Правильно используйте запросы Testing Library

```typescript
// ✅ Хорошо: Семантические запросы
screen.getByRole('button', { name: 'Submit' })
screen.getByLabelText('Email')
screen.getByText('Welcome')

// ❌ Плохо: Запросы по реализации
screen.getByClassName('btn-submit')
container.querySelector('#email-input')
```

## Запуск тестов

```bash
# Запустить все тесты
npm test

# Запустить конкретный тестовый файл
npm test -- UsersEntityHttp.test.ts

# Запустить тесты соответствующие паттерну
npm test -- -t "создает пользователя"

# Запустить тесты в режиме отслеживания
npm test -- --watch

# Запустить с покрытием
npm test -- --coverage

# Запустить в конкретном пакете
npm test --workspace=packages/client
```

## Отладка тестов

### Включить логи консоли

```typescript
test('отладка вывода', () => {
    screen.debug() // Вывести весь DOM
    screen.debug(element) // Вывести конкретный элемент
})
```

### Использовать logTestingPlaygroundURL

```typescript
import { logTestingPlaygroundURL } from '@testing-library/react'

test('помощь с запросами', () => {
    renderWithProviders(<Component />)
    logTestingPlaygroundURL() // Открывает браузер с предложениями запросов
})
```

### Проверить провалы запросов

```typescript
// Показывает все доступные запросы когда тест проваливается
screen.getByRole('button', { name: /submit/i })
// Ошибка покажет все доступные роли и имена
```

## Непрерывная интеграция

Тесты запускаются автоматически при:
- Pull requests
- Коммитах в main ветку
- Перед деплоем

**Требования:**
- Все тесты должны проходить
- Покрытие должно быть ≥80%
- Нет TypeScript ошибок
- Нет ESLint ошибок

## Заключение

Следуйте этим принципам для поддерживаемых, надежных тестов:

1. **Тестируйте поведение, а не реализацию**
2. **Мокируйте только внешние зависимости**
3. **Используйте семантические запросы**
4. **Держите тесты простыми и сфокусированными**
5. **Пишите описательные названия тестов**
6. **Следуйте AAA паттерну**
7. **Тестируйте одну вещь на тест**

Для большего количества примеров, смотрите существующие тесты в кодовой базе.
