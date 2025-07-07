# Configuration System Impact Summary

## Overview

The Phase 7 configuration overhaul affects nearly every subsequent phase in the roadmap. This document summarizes the key changes and impacts.

## Major Changes

### From (Old System)
- 6-source hierarchy: defaults → system → user → environment → profiles → runtime
- Complex environment variable expansion
- System config at `/etc/folder-mcp/config.yaml`
- Configuration profiles for switching between setups
- Deep hierarchical merging rules
- 28+ configuration-related files

### To (New System)
- 2-file system: `config-defaults.yaml` → `config.yaml`
- Schema-driven configuration and validation
- Flat YAML structure (no deep nesting)
- External data sources (JSON files) for dynamic content
- Automatic UI generation from schemas
- Clear separation: system config (internal) vs user config (exposed)

## Affected Components by Phase

### Phase 8: Enhanced UX & Core Features
Every task in this phase is configuration-driven:
- **Task 1**: Progress/logging configuration via schema
- **Task 2**: Embedding backend configuration with external model data
- **Task 3**: Update system configuration
- **Task 4**: Client configuration management

**Key Changes**: 
- Remove environment variable references
- Add schema definitions for each feature
- Use external JSON for dynamic data (models, providers)

### Phase 9: Remote Access & Production Features
All production features configuration-driven:
- **Task 1**: SSE server configuration
- **Task 2**: Security configuration
- **Task 3**: VSCode integration settings
- **Task 4**: Production readiness settings

**Key Changes**:
- Simplify to flat configuration structure
- Remove complex transport abstractions
- API key management via schema

### Phase 10: Advanced Features & Polish
Advanced features all configurable:
- **Task 1**: Search algorithm configuration
- **Task 2**: File format support toggles
- **Task 3**: Code intelligence settings
- **Task 4**: Performance tuning
- **Task 5**: Chat interface configuration

**Key Changes**:
- Each feature adds its schema items
- TUI automatically shows new options
- No manual UI updates needed

### Phase 11: Release & Documentation
Documentation must reflect new system:
- **Task 1**: Test new configuration system
- **Task 2**: Document schema-driven approach
- **Task 3**: Release automation for config updates

**Key Changes**:
- Remove all references to old system
- Document schema patterns
- Configuration guides for users

## Implementation Strategy

### For Each Affected Task:

1. **Define Schema First**
   ```yaml
   featureName:
     type: 'select' | 'boolean' | 'number' | 'string' | 'array'
     label: 'Human-readable name'
     description: 'Help text'
     validation: { ... }
     ui: { component: 'specific-ui-type' }
   ```

2. **Add to Configuration Files**
   - Default value in `config-defaults.yaml`
   - Schema in configuration schema file
   - Documentation in `configurable-parameters.md`

3. **Remove Old Patterns**
   - No environment variable lookups
   - No profile switching
   - No system config references
   - No deep hierarchical merging

4. **Use New Patterns**
   - Simple config.get('key')
   - Schema validation on set
   - External JSON for dynamic data
   - Flat key structure

## Benefits Realized

1. **Simplicity**: 6 sources → 2 files
2. **Consistency**: One schema drives CLI, TUI, and validation
3. **Maintainability**: Clear boundaries, no duplication
4. **User Experience**: Self-organizing UI from schema
5. **Developer Experience**: Add config = add to schema = done

## Migration Checklist

For each phase/task:
- [ ] Remove environment variable references
- [ ] Remove profile/hierarchy mentions
- [ ] Define configuration schema
- [ ] Add defaults to config-defaults.yaml
- [ ] Document in configurable-parameters.md
- [ ] Test override behavior
- [ ] Verify UI generation

## Timeline Impact

- **Phase 7**: Foundation work (new)
- **Phase 8-10**: Use new system incrementally
- **Phase 11**: Document final system

No delays expected - the new system is simpler to implement than the original plan.