# Multi-Provider API Abstraction Refactor Plan

---

## 1. Define `ProviderApi` Interface

- Create `src/services/providerApi.ts`
- Define:

```typescript
export interface ProviderApi {
  fetchProperties(params: any): Promise<any>;
  insertProperties(data: any): Promise<any>;
  createCampaign(data: any): Promise<any>;
  createBatchJob?(data: any): Promise<any>; // optional
  processPropertyFiles?(params: { limit: number; cleanup: boolean }): Promise<any>;
  getCurrentUser?(): Promise<any>; // optional, if provider-specific user info needed
}
```

---

## 2. Implement `PropertyRadarApi` Class

- Create `src/services/propertyRadarApi.ts`
- Implement:

```typescript
import { ProviderApi } from './providerApi';

export class PropertyRadarApi implements ProviderApi {
  async fetchProperties(params) {
    // existing fetch logic here
  }

  async insertProperties(data) {
    // existing insert logic here
  }

  async createCampaign(data) {
    // existing campaign logic here
  }

  async createBatchJob(data) {
    // existing batch job logic here
  }
}
```

- **Copy existing API call logic** from `App.tsx` and service files into these methods.

---

## 3. Create Provider API Factory

- In `providerApi.ts` or a new file:

```typescript
import { PropertyRadarApi } from './propertyRadarApi';

export function getProviderApi(providerName: string): ProviderApi {
  switch(providerName) {
    case 'PropertyRadar':
      return new PropertyRadarApi();
    // case 'ProviderX':
    //   return new ProviderXApi();
    default:
      return new PropertyRadarApi();
  }
}
```

---

## 4. Refactor API Calls in App

- In `App.tsx` and other components/services:
  - Import `useProvider()` and `getProviderApi()`
  - Get the API instance:

```typescript
const { selectedProvider } = useProvider();
const api = getProviderApi(selectedProvider);
```

- Replace direct fetch calls with:

```typescript
await api.fetchProperties(params);
await api.insertProperties(data);
await api.createCampaign(data);
```

---

## Result

- All API calls will be **abstracted behind the provider interface**.
- Switching providers will **automatically switch API implementations**.
- Adding new providers will be **easy and isolated**.
