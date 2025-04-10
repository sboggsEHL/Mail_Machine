# Multi-Provider Architecture Refactor Plan

---

## 1. Introduction & Goals

Transform the current PropertyRadar-centric app into a **flexible, extensible platform** supporting **multiple property data providers**.  
Goals:
- Enable **easy switching** between providers via UI.
- Abstract provider-specific logic on frontend and backend.
- Maintain a **consistent user experience**.
- Facilitate **adding new providers** with minimal changes.
- Preserve existing PropertyRadar functionality during transition.

---

## 2. Current State Analysis

- **Frontend** tightly coupled to PropertyRadar API.
- **Backend** routes and services assume PropertyRadar data formats.
- **Data models** reflect PropertyRadar schema.
- **No abstraction** layer for provider-specific logic.
- **Single hardcoded provider** in UI and API calls.

---

## 3. Target Architecture Overview

- **Provider Selector** in UI controls active provider.
- **Frontend API Layer** abstracts provider-specific API calls.
- **Backend Router/Strategy** dispatches requests to provider-specific services.
- **Normalized Data Model** internally, regardless of provider.
- **Configurable Credentials** for each provider.
- **Extensible** to add new providers with minimal impact.

---

## 4. Phase 1: UI Foundation

### 4.1. Dropdown Design
- Replace static header with **Bootstrap dropdown**.
- Options: PropertyRadar (default), plus placeholders for future providers.
- Use clear labels, e.g., "Select Data Provider".

### 4.2. State Management
- Add `selectedProvider` state in `App.tsx`.
- Use **React Context** to make provider accessible app-wide.
- Initialize from **localStorage** if available.

### 4.3. Persistence
- Save selection to **localStorage** on change.
- On app load, read from storage to persist choice across sessions.

### 4.4. Potential Issues & Mitigations
- **Issue:** Components not aware of provider change.  
  **Mitigation:** Use Context + `useEffect` to react to changes.
- **Issue:** User confusion if provider switch resets data.  
  **Mitigation:** Show confirmation or warning on switch.
- **Issue:** Dropdown clutter as providers grow.  
  **Mitigation:** Group providers or add search/filter in dropdown.

---

## 5. Phase 2: Frontend API Abstraction

### 5.1. Define `ProviderApi` Interface
- Methods:  
  `fetchProperties()`, `insertProperties()`, `searchProperties()`, `createCampaign()`, etc.
- Define **common parameter and return types**.

### 5.2. Implement `PropertyRadarApi`
- Wrap existing API calls inside this class.
- Conform to `ProviderApi` interface.

### 5.3. Refactor Components
- Replace direct Axios calls with calls to `ProviderApi`.
- Pass `selectedProvider` or use Context to get current API instance.

### 5.4. Error Handling
- Standardize error formats across providers.
- Show user-friendly messages regardless of provider.

### 5.5. Potential Issues & Mitigations
- **Issue:** Different providers have different API capabilities.  
  **Mitigation:** Use optional methods or feature flags in interface.
- **Issue:** Data shape differences.  
  **Mitigation:** Normalize data in API implementations.
- **Issue:** Increased bundle size.  
  **Mitigation:** Lazy load provider modules if needed.

---

## 6. Phase 3: Backend Provider Routing

### 6.1. Determine Provider Context
- Pass provider info via **request header**, **query param**, or **user profile**.
- Validate provider on each request.

### 6.2. Define `IProviderService` Interface
- Methods matching frontend interface.
- Consistent input/output types.

### 6.3. Implement `PropertyRadarService`
- Extract existing logic into this service.
- Conform to interface.

### 6.4. Provider Router / Strategy
- Middleware or service factory that dispatches to correct provider service.
- Example:  
  ```ts
  const service = ProviderServiceFactory.get(providerName);
  service.fetchProperties(params);
  ```

### 6.5. Security Considerations
- **Credential isolation**: never mix provider credentials.
- **Access control**: restrict provider access per user/role.
- **Audit logging**: track provider usage.

### 6.6. Potential Issues & Mitigations
- **Issue:** Provider-specific errors leaking to client.  
  **Mitigation:** Normalize and sanitize errors.
- **Issue:** Performance overhead of routing.  
  **Mitigation:** Cache provider service instances.
- **Issue:** Backward compatibility.  
  **Mitigation:** Default to PropertyRadar if no provider specified.

---

## 7. Phase 4: Adding New Providers

### 7.1. Data Normalization
- Map provider-specific fields to internal schema.
- Use adapters or transformers.

### 7.2. Credential Management
- Store securely in environment variables or secrets manager.
- Allow runtime configuration without redeploy.

### 7.3. Testing
- Create **mock providers** for testing.
- Validate data mapping and error handling.

### 7.4. Potential Issues & Mitigations
- **Issue:** Inconsistent data quality.  
  **Mitigation:** Add validation and cleansing layers.
- **Issue:** API rate limits.  
  **Mitigation:** Implement throttling and retries.
- **Issue:** Different auth flows.  
  **Mitigation:** Abstract auth per provider.

---

## 8. Migration & Compatibility

- **Gradually refactor** existing PropertyRadar logic into provider service.
- **Maintain existing API** during transition.
- **Test** with PropertyRadar as default before adding new providers.
- **Communicate** changes to users if API contracts change.

---

## 9. Testing Strategy

- **Unit tests** for each provider API/service.
- **Integration tests** for provider switching.
- **End-to-end tests** simulating user flows with different providers.
- **Regression tests** to ensure PropertyRadar still works.

---

## 10. Future Enhancements

- **Provider-specific UI tweaks** (e.g., hide unsupported features).
- **Provider capability detection**.
- **Multi-provider aggregation** (query multiple sources at once).
- **User preferences** for default provider.
- **Provider onboarding wizard**.

---

## 11. Summary Checklist

- [ ] Add provider dropdown to navbar
- [ ] Implement provider state/context
- [ ] Abstract frontend API calls
- [ ] Refactor components to use API abstraction
- [ ] Define backend provider interface
- [ ] Refactor PropertyRadar backend logic
- [ ] Implement provider router on backend
- [ ] Normalize data formats
- [ ] Add new providers incrementally
- [ ] Test thoroughly at each phase
- [ ] Document provider integration process

---

# Potential Risks & Mitigations Summary

| Risk | Mitigation |
|-------|------------|
| Data inconsistency across providers | Normalize data, validate inputs |
| User confusion switching providers | Clear UI, confirmations |
| Increased complexity | Modular design, clear interfaces |
| Backward compatibility | Default to PropertyRadar, gradual rollout |
| Security issues | Isolate credentials, audit logs |
| Performance overhead | Caching, lazy loading |

---

# End of Plan