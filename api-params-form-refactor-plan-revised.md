# Revised Plan to Refactor ApiParamsForm.tsx

## 1. Initial Analysis Phase

Before making any changes:
1. Map out all component relationships and data flow
2. Document all state usage and side effects
3. Identify which lint warnings are safe to fix vs. which need careful handling

## 2. Safe Changes First

Start with changes that don't risk breaking functionality:
1. Add eslint-disable comments for legitimate cases where the rule should be ignored
2. Extract pure functions and constants that don't affect component behavior

## 3. Component Breakdown (In Order)

Break down the large component in this sequence:

1. **Extract Constants** (Lowest Risk)
   - Move to `src/constants/formConstants.ts`
   - Verify imports work before proceeding

2. **Extract Pure Utility Functions** (Low Risk)
   - Move to `src/utils/formUtils.ts`
   - Functions like `getCategoryColor`, `formatCriteriaValue`, `getCriterionExplanation`
   - Verify they work in isolation before proceeding

3. **Create Input Components** (Medium Risk)
   - One component at a time, starting with simplest (BooleanInput)
   - Test each component thoroughly before moving to next
   - Keep original code until new component is verified

4. **Create Wrapper Components** (Higher Risk)
   - BasicParamsForm
   - CriteriaSelector
   - CriteriaInputRenderer
   - ActiveCriteriaDisplay
   - Test each thoroughly before proceeding

5. **Refactor Main Component** (Highest Risk)
   - Keep original functionality
   - Replace sections with new components one at a time
   - Maintain all existing props and state management

## 4. Testing Strategy

For each change:
1. Verify compilation succeeds
2. Check runtime behavior
3. Ensure no regressions in functionality
4. Only proceed to next change after current change is stable

## 5. Handling Lint Warnings

Categorize each warning:
1. **Safe to Fix:**
   - Truly unused imports
   - Dead code

2. **Needs Careful Handling:**
   - React hooks dependencies
   - Typescript generics
   - State variables that appear unused

3. **Leave with Comment:**
   - Cases where the lint rule doesn't understand the usage pattern
   - Document why the warning is being ignored

## 6. Specific Cases

1. **State Variables:**
   - Keep `duplicates` and `allProperties` as they're needed for setters
   - Document their usage with comments

2. **Generic Types:**
   - Keep `ApiResponse<T>` as it's used by extending interfaces
   - Consider adding explicit type usage to satisfy linter

3. **React Hooks:**
   - Add eslint-disable comments with clear explanations
   - Plan future refactoring with useCallback/useMemo if needed

## 7. Rollback Strategy

For each change:
1. Create a save point (commit)
2. Make the change
3. If problems occur, revert to save point
4. Analyze what went wrong before trying again

This approach should help us avoid the issues we encountered and make the refactoring more stable and maintainable.