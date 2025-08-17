# Infinite Loop Fix Documentation

## Issue
The `TechStackSelector` component was experiencing a "Maximum update depth exceeded" error due to infinite re-renders caused by `useEffect` dependencies.

## Root Cause
The issue was in the `useEffect` hooks that had callback functions (`onValidationChange` and `onComplexityChange`) in their dependency arrays:

```typescript
// PROBLEMATIC CODE
useEffect(() => {
  const issues = validateCompatibility(targetStack);
  setCompatibilityIssues(issues);
  onValidationChange(issues);
}, [targetStack, onValidationChange]); // ❌ onValidationChange causes infinite loop

useEffect(() => {
  if (Object.keys(targetStack).length > 0) {
    const estimate = calculateComplexity(currentStack, targetStack, projectSize);
    setComplexityEstimate(estimate);
    onComplexityChange(estimate);
  }
}, [currentStack, targetStack, projectSize, onComplexityChange]); // ❌ onComplexityChange causes infinite loop
```

## Problem Explanation
1. Parent component creates callback functions (`onValidationChange`, `onComplexityChange`)
2. These functions are recreated on every render (new reference each time)
3. `useEffect` sees new function reference and triggers again
4. This causes state updates, which trigger re-renders
5. Re-renders create new callback functions, starting the cycle again

## Solution
Removed the callback functions from the `useEffect` dependency arrays:

```typescript
// FIXED CODE
useEffect(() => {
  const issues = validateCompatibility(targetStack);
  setCompatibilityIssues(issues);
  onValidationChange(issues);
}, [targetStack]); // ✅ Only depend on targetStack

useEffect(() => {
  if (Object.keys(targetStack).length > 0) {
    const estimate = calculateComplexity(currentStack, targetStack, projectSize);
    setComplexityEstimate(estimate);
    onComplexityChange(estimate);
  }
}, [currentStack, targetStack, projectSize]); // ✅ Only depend on actual data
```

## Additional Optimizations
Also added `useCallback` to the parent component (`TechStackSelectionContainer`) to memoize callback functions:

```typescript
const handleSelectionChange = useCallback((newTargetStack: Partial<TechStack>) => {
  setTargetStack(newTargetStack);
}, []);

const handleValidationChange = useCallback((issues: CompatibilityIssue[]) => {
  setCompatibilityIssues(issues);
}, []);

const handleComplexityChange = useCallback((estimate: ComplexityEstimate) => {
  setComplexityEstimate(estimate);
}, []);
```

## Testing
- All 63 tests continue to pass
- Created test page at `/test-selector` to verify no infinite loops
- C# and .NET integration works correctly

## Best Practices
1. **Avoid callback functions in useEffect dependencies** unless absolutely necessary
2. **Use useCallback** to memoize callback functions in parent components
3. **Only include actual data dependencies** in useEffect arrays
4. **Test for infinite loops** during development by monitoring console errors

## Files Modified
- `src/components/selection/TechStackSelector.tsx` - Fixed useEffect dependencies
- `src/components/selection/TechStackSelectionContainer.tsx` - Added useCallback optimization
- `src/app/test-selector/page.tsx` - Created test page for verification