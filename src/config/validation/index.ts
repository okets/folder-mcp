import { ValidationResult } from './errors.js';
import { NumericValidator } from './numeric.js';
import { PathValidator } from './paths.js';
import { NetworkValidator } from './network.js';
import { ModelValidator } from './model.js';

export class ConfigValidator {
  private numericValidator: NumericValidator;
  private pathValidator: PathValidator;
  private networkValidator: NetworkValidator;
  private modelValidator: ModelValidator;

  constructor() {
    this.numericValidator = new NumericValidator();
    this.pathValidator = new PathValidator();
    this.networkValidator = new NetworkValidator();
    this.modelValidator = new ModelValidator();
  }

  async validate(config: any): Promise<ValidationResult> {
    // Start with a clean result
    const result = new ValidationResult(true);

    // Apply defaults first
    const configWithDefaults = await this.applyDefaults(config);

    // Validate in order of dependency
    // 1. Path validation (most fundamental)
    const pathResult = this.pathValidator.validate(configWithDefaults);
    if (!pathResult.isValid) {
      return pathResult;
    }

    // 2. Model validation (needed for numeric validation)
    const modelResult = await this.modelValidator.validate(configWithDefaults);
    if (!modelResult.isValid) {
      return modelResult;
    }

    // 3. Numeric validation (depends on model validation)
    const numericResult = this.numericValidator.validate(configWithDefaults);
    if (!numericResult.isValid) {
      return numericResult;
    }

    // 4. Network validation (can be done last)
    const networkResult = await this.networkValidator.validate(configWithDefaults);
    if (!networkResult.isValid) {
      return networkResult;
    }

    // Combine all results
    result.errors.push(...pathResult.errors);
    result.errors.push(...modelResult.errors);
    result.errors.push(...numericResult.errors);
    result.errors.push(...networkResult.errors);

    result.warnings.push(...pathResult.warnings);
    result.warnings.push(...modelResult.warnings);
    result.warnings.push(...numericResult.warnings);
    result.warnings.push(...networkResult.warnings);

    // Set final validity
    result.isValid = result.errors.length === 0;

    // If valid, include the validated config
    if (result.isValid) {
      result.config = configWithDefaults;
    }

    return result;
  }

  private async applyDefaults(config: any): Promise<any> {
    let result = { ...config };

    // Apply defaults in order of dependency
    result = this.pathValidator.normalizePaths(result);
    result = this.numericValidator.applyDefaults(result);
    result = this.networkValidator.applyDefaults(result);
    result = await this.modelValidator.applyDefaults(result);

    return result;
  }

  getValidationSummary(result: ValidationResult): string {
    const summary: string[] = [];

    if (result.isValid) {
      summary.push('✅ Configuration is valid');
    } else {
      summary.push('❌ Configuration validation failed');
    }

    if (result.errors.length > 0) {
      summary.push('\nErrors:');
      result.errors.forEach(error => {
        summary.push(`  - ${error.message}`);
        if (error.fix) {
          summary.push(`    Fix: ${error.fix}`);
        }
      });
    }

    if (result.warnings.length > 0) {
      summary.push('\nWarnings:');
      result.warnings.forEach(warning => {
        summary.push(`  - ${warning.message}`);
        if (warning.fix) {
          summary.push(`    Fix: ${warning.fix}`);
        }
      });
    }

    return summary.join('\n');
  }
} 