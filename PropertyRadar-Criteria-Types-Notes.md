# PropertyRadar Criteria Types Notes

This document contains detailed information about PropertyRadar criteria types and how they should be implemented in the UI.

## Overview

PropertyRadar endpoints accept a "Criteria object" to define search criteria for operations. The criteria object is structured as an array of objects, each with `name` and `value` properties.

Example:
```json
[
  {
    "name": "ZipFive",
    "value": [97202, 97212]
  },
  {
    "name": "Pool",
    "value": [1]
  },
  {
    "name": "AvailableEquity",
    "value": [[100000, null]]
  },
  {
    "name": "PropertyType",
    "value": [
      {
        "name": "PType",
        "value": ["SFR"]
      }
    ]
  }
]
```

## Criteria Types

### 1. Multiple Values

**Description:**
- Accepts one or more values, which are OR'd together
- Values are provided as an array

**Example:**
```json
{"name":"ZipFive", "value":["97202", "97212"]}
```

**UI Implementation:**
- Multi-select dropdown or tags input
- Allow users to enter multiple values
- Display values as tags or comma-separated list

### 2. Multiple Values Beginning With

**Description:**
- Similar to Multiple Value, except an exact match is not required
- Properties will be found if they merely begin with the given value
- Useful for partial matching

**Example:**
```json
{"name":"APN", "value":["123","910-021-669-000"]}
```

**UI Implementation:**
- Similar to Multiple Values component
- Add clear indication that partial matches are allowed
- Consider adding a "Begins with" prefix or icon

### 3. Boolean

**Description:**
- Accepts either integer 1 or 0
- 1 means the property must have the attribute
- 0 means the property must not have the attribute

**Example:**
```json
{"name":"Pool", "value":[1]}
```

**UI Implementation:**
- Toggle switch or radio buttons (Yes/No)
- Clear labeling for what 1/0 means in context
- Consider using checkboxes with clear labels

### 4. Multiple Range

**Description:**
- Accepts a series of arrays with min and max values
- Use `null` for unbounded ranges
- Can specify multiple ranges

**Examples:**
- `[[100000, 100000]]` - Only properties with exactly $100,000
- `[[null, 100000]]` - Only properties with up to $100,000
- `[[100000, null]]` - Properties from $100,000 to infinity
- `[[null, 100000],[200000, 300000]]` - Properties with less than $100,000 or between $200,000 and $300,000

**UI Implementation:**
- Min/Max inputs with clear labels
- Support for null values (unbounded ranges)
- Option to add multiple ranges
- Consider using sliders for numeric ranges

### 5. Multiple Range Including Unknowns

**Description:**
- Same syntax as Multiple Range
- When `null` is used as the left (minimum) end of the range, unknown values are included in the results

**Example:**
```json
{"name":"SqFt", "value":[[null, 1000]]}
```
This will include properties with square footage less than 1000, as well as properties for which we don't know the square footage.

**UI Implementation:**
- Similar to Multiple Range component
- Add checkbox for "Include Unknown Values"
- When checked, automatically set min value to null

### 6. Relative Date

**Description:**
- Accepts over 20 preset date strings, such as "Next Quarter" or "Last 30 Days"
- Also accepts specific dates and date ranges using a from: to: syntax

**Example:**
```json
{"name":"ForeclosureSaleDate", "value":["Last 7 Days", "from: 1/1/2023 to: 1/31/2023", "1/1/2028", "from: to: 1/1/1999"]}
```

**UI Implementation:**
- Date picker for specific dates
- From/To date pickers for ranges
- Dropdown for preset date strings
- Clear labeling for date format

### 7. Relative Date Including Unknowns

**Description:**
- Accepts the same values as Relative Date
- When the `from:` section is left empty, includes properties for which we don't know the value for that field

**Example:**
```json
{"name":"ForeclosureSaleDate", "value":["from: to: 1/1/1999"]}
```
This will include properties with foreclosure sale dates before 1/1/1999, as well as properties for which we don't know the foreclosure sale date.

**UI Implementation:**
- Similar to Relative Date component
- Add checkbox for "Include Unknown Values"
- When checked, leave the "from:" field empty

### 8. Single Value

**Description:**
- Like Multiple Value but accepts only one value

**Example:**
```json
{"name":"OddEven", "value":["Odd"]}
```

**UI Implementation:**
- Simple text input or dropdown depending on the field
- No multi-select functionality
- Clear validation for single value only

### 9. PropertyType

**Description:**
- A special format combining both simple property types (PType) and AdvancedPropertyTypes
- Requires a nested structure

**Example:**
```json
{
  "name": "PropertyType",
  "value": [
    {
      "name": "PType",
      "value": ["SFR"]
    }
  ]
}
```

**UI Implementation:**
- Specialized component for property type selection
- Hierarchical selection if needed
- Clear categorization of property types
- Consider using a tree-like structure for advanced property types

## UI Implementation Guidelines

### General Guidelines

1. **Consistent Labeling**
   - Use clear, consistent labels for all input fields
   - Include descriptions or tooltips for complex criteria

2. **Validation**
   - Implement appropriate validation for each criteria type
   - Show clear error messages for invalid inputs

3. **Default Values**
   - Provide sensible default values where appropriate
   - For range inputs, consider empty fields rather than zeros

4. **Responsive Design**
   - Ensure all components work well on different screen sizes
   - Consider mobile-friendly alternatives for complex inputs

### Type-Specific Considerations

1. **Date Inputs**
   - Use proper date pickers instead of text inputs
   - Support for date ranges with clear From/To labels
   - Include preset options like "Last 30 Days"
   - Format dates consistently (MM/DD/YYYY)

2. **Range Inputs**
   - Clear Min/Max labels
   - Support for unbounded ranges (null values)
   - Consider using sliders for numeric ranges
   - Add "Include Unknown Values" option where appropriate

3. **Multiple Value Inputs**
   - Support for adding multiple values
   - Clear visual indication of selected values
   - Easy way to remove individual values
   - Consider typeahead/autocomplete for common values

4. **Boolean Inputs**
   - Use toggle switches or radio buttons
   - Clear labels for Yes/No options
   - Consider using checkboxes with descriptive labels

## API Integration

When sending criteria to the PropertyRadar API:

1. Ensure each criterion has the correct format based on its type
2. For date ranges, use the "from: to:" syntax
3. For multiple ranges, use nested arrays
4. For PropertyType, use the nested structure with PType

## Example API Request

```json
{
  "Criteria": [
    {
      "name": "State",
      "value": ["CA"]
    },
    {
      "name": "PropertyType",
      "value": [
        {
          "name": "PType",
          "value": ["SFR", "CND"]
        }
      ]
    },
    {
      "name": "Pool",
      "value": [1]
    },
    {
      "name": "AvailableEquity",
      "value": [[100000, null]]
    },
    {
      "name": "TransferDate",
      "value": ["from: 1/1/2023 to: 12/31/2023"]
    }
  ]
}