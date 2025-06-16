# Canonical Field Mapping System

This directory contains the modular field mapping system for the MDM Master Data Cleanse application.

## Architecture

The mapping system has been separated from the main UI components for better maintainability and scalability.

### Files

- **`canonical-field-mapping.ts`** - The core mapping system with field definitions, mapping logic, and utilities

## Field Mapping Configuration

The system uses a comprehensive configuration structure to map various column header formats to standardized logical field names.

### Field Configuration Structure

```typescript
interface FieldMappingConfig {
  exactMatches: string[];     // Perfect 1:1 matches (highest priority)
  partialMatches: string[];   // Require similarity calculation
  aliases: string[];          // Alternative terminology
  exclusions?: string[];      // Terms that should NOT match this field
}
```

### Mapping Priority

1. **Exact Matches** (Score: 1.0) - Perfect string matches after normalization
2. **Partial/Alias Matches** (Score: 0.6-1.0) - Similarity-based matching
3. **Special TPI Logic** (Score: 0.8) - Custom logic for identifier fields
4. **Exclusions** - Prevent false positive mappings

## Adding New Fields

To add a new logical field to the system:

1. **Update LOGICAL_FIELDS array** in `canonical-field-mapping.ts`:
```typescript
export const LOGICAL_FIELDS = [
  // existing fields...
  { key: 'new_field', label: 'New Field Label', required: false },
] as const;
```

2. **Add field configuration** to CANONICAL_FIELD_MAPPING:
```typescript
export const CANONICAL_FIELD_MAPPING = {
  // existing mappings...
  new_field: {
    exactMatches: [
      "new field", "new_field", "newfield",
      // ... more variations
    ],
    partialMatches: [
      "new", "field"
    ],
    aliases: [
      "alternative name", "alt_name"
    ],
    exclusions: [
      "not this field", "exclude this"
    ]
  }
};
```

## Adding Field Variations

To add new variations to existing fields, simply add them to the appropriate arrays:

```typescript
customer_name: {
  exactMatches: [
    // existing matches...
    "neue customer", "client nouveau",  // Add international variants
  ],
  partialMatches: [
    // existing matches...
    "kunde", "cliente",  // Add more language variants
  ],
  aliases: [
    // existing aliases...
    "business partner", "trading partner",  // Add business terms
  ],
  exclusions: [
    // existing exclusions...
    "customer code", "customer type",  // Prevent false matches
  ]
}
```

## Best Practices

### When Adding New Mappings

1. **Start with exact matches** - Add the most common, unambiguous terms first
2. **Use exclusions liberally** - Prevent false positives by excluding ambiguous terms
3. **Test with real data** - Validate with actual customer file headers
4. **Document reasoning** - Add comments for complex or non-obvious mappings

### Naming Conventions

- Use lowercase for all mapping entries
- Include variations with underscores, spaces, and no separators
- Consider international variants (French, Spanish, German, etc.)
- Include common abbreviations and acronyms

### Performance Considerations

- Exact matches are processed first and are very fast
- Partial matches require similarity calculations (slower)
- Keep exclusion lists focused to avoid unnecessary processing

## Testing

The system includes comprehensive logging to help debug mapping decisions:

```typescript
logMappingResults(headers, result);
```

This will output:
- ✅ Successful mappings with reasoning
- ❌ Unmapped fields with explanations  
- 🚫 Excluded headers with reasons
- 📋 Headers that remain unmapped

## Validation

Use the built-in validation function to check required fields:

```typescript
const validation = validateRequiredMappings(mappings);
if (!validation.isValid) {
  console.log("Missing required fields:", validation.missingFields);
}
```

## Extension Points

The system provides hooks for future extensibility:

```typescript
// Add custom field mappings at runtime
addCustomFieldMapping('custom_field', {
  exactMatches: ['custom field'],
  partialMatches: ['custom'],
  aliases: ['custom alias'],
});
```

## Future Enhancements

Planned improvements include:

1. **Machine Learning Integration** - Use ML to improve similarity scoring
2. **User Feedback Loop** - Learn from user corrections
3. **Industry-Specific Mappings** - Banking, healthcare, retail variants
4. **Internationalization** - Better support for non-English headers
5. **Fuzzy Matching** - Advanced string similarity algorithms

## Support

For questions or issues with the mapping system, please contact the MDM development team or create an issue in the project repository. 