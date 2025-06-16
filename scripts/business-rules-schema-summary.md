# Business Rules Database Schema Summary

## Tables Added to init-db.sql

### 1. **business_rules**
Main table storing all business rules with:
- Rule metadata (name, description, author, version, status)
- Rule code and configuration
- Performance metrics (execution count, timing)
- AI generation tracking

### 2. **rule_approvals**
Approval workflow tracking:
- Three-level approval chain (technical, business, governance)
- Approval status and comments
- Automatic rule activation on full approval

### 3. **rule_test_cases**
Test cases for each rule:
- Test data (record1, record2)
- Expected results
- Test types (standard, edge case, performance, regression)

### 4. **rule_test_results**
Test execution results:
- Pass/fail status
- Actual vs expected results
- Execution timing
- Error tracking

### 5. **rule_deployment_history**
Deployment audit trail:
- Version tracking
- Deployment types (deploy, rollback, update, disable)
- Impact assessment
- Success/failure tracking

### 6. **conversation_sessions**
AI conversation tracking:
- Steward interactions
- Business context
- Rules generated count
- Session metadata

### 7. **conversation_messages**
Individual messages in conversations:
- Message types (user, ai, system)
- Content and metadata
- Sequence tracking

### 8. **rule_execution_stats**
Runtime performance tracking:
- Per-execution timing
- Action taken
- Links to sessions and pairs

## Key Features

### Indexes
- Comprehensive indexing for all foreign keys
- Performance indexes on status, dates, and frequently queried fields
- Composite indexes for common query patterns

### Triggers & Functions
1. **update_rule_execution_stats()** - Updates rule performance metrics after each execution
2. **validate_approval_chain()** - Ensures proper approval sequence (technical → business → governance)
3. **update_conversation_metadata()** - Tracks conversation session activity

### Constraints
- CHECK constraints on enums (status, approval levels, etc.)
- UNIQUE constraints on rule names and test case names
- Foreign key constraints with appropriate CASCADE rules
- Priority range constraints (1-10)
- Accuracy percentage constraints (0-100)

## Integration Points

The schema integrates with existing tables:
- Links to `user_sessions` for execution context
- Links to `duplicate_pairs` for rule execution tracking
- Uses same UUID and timestamp patterns as existing schema
- Follows same permission model (mdm_user)

## Next Steps

To use this schema:
1. Run `npm run db:reset` to recreate the database with new tables
2. Or manually run the updated `scripts/init-db.sql` file
3. The tables are ready for the AI Business Rule Engine implementation