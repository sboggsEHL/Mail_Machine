# Multi-Provider Global Context & API Refactor Plan

---

## 1. Create Global Provider Context

- Create `ProviderContext.tsx` with:
  - `selectedProvider`
  - `setSelectedProvider`
- Wrap entire app in `<ProviderContextProvider>` (in `index.tsx`)
- Replace all local provider state in `App.tsx` with `useProvider()`

---

## 2. Abstract All API Calls Behind a Provider API Interface

### 2.1. Define `ProviderApi` interface

```typescript
interface ProviderApi {
  fetchProperties(params): Promise<any>;
  insertProperties(data): Promise<any>;
  createCampaign(data): Promise<any>;
  // ... other API calls
}
```

### 2.2. Implement `PropertyRadarApi` class

- Wrap all existing PropertyRadar API calls inside this class
- Conform to `ProviderApi` interface

### 2.3. (Later) Implement other provider classes

- e.g., `ProviderXApi`, `ProviderYApi`

---

## 3. Create a Provider API Factory

```typescript
function getProviderApi(providerName: string): ProviderApi {
  switch(providerName) {
    case 'PropertyRadar':
      return new PropertyRadarApi();
    case 'ProviderX':
      return new ProviderXApi();
    default:
      return new PropertyRadarApi();
  }
}
```

---

## 4. Refactor All API Calls in the App

- Replace all direct fetch/axios calls with calls to the **current provider API instance**
- Use:

```typescript
const { selectedProvider } = useProvider();
const api = getProviderApi(selectedProvider);
```

- Then call:

```typescript
api.fetchProperties(params);
api.insertProperties(data);
api.createCampaign(data);
```

---

## 5. Identify ALL PropertyRadar API Calls to Refactor

- **In `App.tsx`:**
  - `handleFetchProperties()`
  - `handleInsertProperties()`
  - `handleCreateBatchJob()`
- **In components:**
  - `ApiParamsForm.tsx`
- **In services:**
  - `batchJob.service.ts`
  - `list.service.ts`
  - `api.ts`
  - Any other service calling PropertyRadar endpoints

---

## 6. Backend Coordination (Future Step)

- Pass selected provider to backend via headers or params
- Backend dispatches to correct provider service

---

## 7. Summary Checklist

- [x] Provider dropdown UI
- [x] ProviderContext (in progress)
- [ ] Wrap app in ProviderContextProvider
- [ ] Remove local provider state in App.tsx
- [ ] Define `ProviderApi` interface
- [ ] Implement `PropertyRadarApi` class
- [ ] Create provider API factory
- [ ] Refactor all API calls to use provider API
- [ ] Test switching providers dynamically
- [ ] Prepare for backend routing (future)

---

## Result

Switching the provider in the dropdown will **automatically switch all API calls** to the correct implementation, enabling true multi-provider support.
