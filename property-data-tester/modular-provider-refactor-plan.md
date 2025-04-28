# Modular Provider Data Refactor Plan & Checklist

**Goal:** Refactor the application to load provider-specific configurations (fields, criteria, API parameters) from a modular directory structure under `property-data-tester/src/providers/`.

**Confidence Check:** This plan utilizes standard ES Module patterns and TypeScript for robustness. Key risks involve implementation consistency (naming, types, file presence), which are addressed through specific checklist items.

---

## Checklist

**Phase 1: Setup Provider Structure & Types**

*   [ ] **1. Create Base Directory:**
    *   Create `property-data-tester/src/providers/`
*   [ ] **2. Create Provider Subdirectories:**
    *   Create `property-data-tester/src/providers/PropertyRadar/`
    *   Create `property-data-tester/src/providers/FirstAmerican/`
    *   *(Add directories for any other existing providers)*
*   [ ] **3. Define Shared Types:**
    *   Create `property-data-tester/src/providers/types.ts`.
    *   Define interfaces (e.g., `FieldDefinition`, `CriteriaDefinition`, `ParameterDefinition`) representing the expected structure of data in `fields.ts`, `criteria.ts`, `parameters.ts`.
*   [ ] **4. Define Provider Identifiers:**
    *   **CRITICAL:** Ensure consistent provider identifiers (e.g., `"PropertyRadar"`, `"FirstAmerican"`).
    *   Strongly recommended: Define these as a TypeScript `enum` or `const` assertion in a shared location (e.g., `src/constants/providers.ts` or within `src/providers/types.ts`) and use this enum/const throughout the application (context, registry keys, etc.).

**Phase 2: Populate Provider Data**

*   **For EACH provider directory (e.g., `PropertyRadar/`):**
    *   [ ] **5. Create `fields.ts`:**
        *   Create the file (e.g., `PropertyRadar/fields.ts`).
        *   Define and export a constant array (e.g., `export const fields: FieldDefinition[] = [...]`) using the shared interface.
    *   [ ] **6. Create `criteria.ts`:**
        *   Create the file (e.g., `PropertyRadar/criteria.ts`).
        *   Define and export a constant array (e.g., `export const criteria: CriteriaDefinition[] = [...]`) using the shared interface.
    *   [ ] **7. Create `parameters.ts`:**
        *   Create the file (e.g., `PropertyRadar/parameters.ts`).
        *   Define and export a constant array (e.g., `export const parameters: ParameterDefinition[] = [...]`) using the shared interface.
    *   [ ] **8. Create `index.ts` (Barrel File):**
        *   Create the file (e.g., `PropertyRadar/index.ts`).
        *   Add exports for all data files:
            ```typescript
            export * from './fields';
            export * from './criteria';
            export * from './parameters';
            ```
*   [ ] **9. Repeat steps 5-8 for `FirstAmerican/` and any other provider directories.**

**Phase 3: Implement Central Registry**

*   [ ] **10. Create Registry File:**
    *   Create `property-data-tester/src/providers/index.ts`.
*   [ ] **11. Import Provider Modules:**
    *   In `providers/index.ts`, import each provider's barrel file:
        ```typescript
        import * as PropertyRadar from './PropertyRadar';
        import * as FirstAmerican from './FirstAmerican';
        // import * as NewProvider from './NewProvider';
        ```
*   [ ] **12. Create and Export `PROVIDER_MODULES`:**
    *   In `providers/index.ts`, define and export the registry object, using the consistent identifiers (from step 4) as keys:
        ```typescript
        // Assuming ProviderId is the enum/type defined in step 4
        import { ProviderId } from '../constants/providers'; // Or './types'

        export const PROVIDER_MODULES: { [key in ProviderId]?: typeof PropertyRadar } = { // Adjust type as needed
          [ProviderId.PropertyRadar]: PropertyRadar,
          [ProviderId.FirstAmerican]: FirstAmerican,
          // [ProviderId.NewProvider]: NewProvider,
        };
        ```
*   [ ] **13. (Optional) Re-export Shared Types:**
    *   In `providers/index.ts`, add `export * from './types';` if desired for easier imports elsewhere.

**Phase 4: Refactor UI Components**

*   **Identify UI components currently using old/hardcoded provider data (e.g., `FieldSelector`, `CriteriaSelector`, API params form).**
*   **For EACH identified component:**
    *   [ ] **14. Import Hook and Registry:**
        *   Import `useProvider` from the context.
        *   Import `PROVIDER_MODULES` from `src/providers`.
        *   Import `ProviderId` enum/type if used.
    *   [ ] **15. Get Selected Provider & Module:**
        *   `const { selectedProvider } = useProvider();`
        *   `const providerModule = PROVIDER_MODULES[selectedProvider as ProviderId];` (Use type assertion if necessary).
    *   [ ] **16. Access Provider-Specific Data:**
        *   `const fields = providerModule?.fields || [];`
        *   `const criteria = providerModule?.criteria || [];`
        *   `const parameters = providerModule?.parameters || [];`
    *   [ ] **17. Update Rendering Logic:**
        *   Modify the component to map over/use the `fields`, `criteria`, or `parameters` arrays obtained above.
        *   Ensure graceful handling of empty arrays (e.g., display "No data available").

**Phase 5: Cleanup & Testing**

*   [ ] **18. Remove Old Data Structures:**
    *   Delete or comment out the previous centralized `PROVIDER_CONFIG` or hardcoded arrays.
    *   Remove unused imports related to the old structures.
*   [ ] **19. TypeScript Check:**
    *   Run `tsc` (or your build process) to catch any type errors introduced during the refactor.
*   [ ] **20. Functional Testing:**
    *   Run the application.
    *   Switch between *all* available providers in the UI.
    *   Verify that the correct fields, criteria, and parameters are displayed for each provider.
    *   Verify that providers with intentionally empty data arrays show the appropriate "No data" message.
    *   Test edge cases (e.g., initial load).

---