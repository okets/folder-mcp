/**
 * Logging Standards Linter
 * 
 * Development-time linting and validation for logging standards compliance.
 * Integrates with the build process to enforce logging guidelines.
 */

import { LogLevel, LogMetadata } from './index.js';
import { LoggingStandardsChecker, LogContext } from './standards.js';

/**
 * ESLint-style rule for logging standards
 */
export interface LoggingRule {
  name: string;
  severity: 'error' | 'warn' | 'info';
  description: string;
  check: (context: LogStatementContext) => RuleViolation[];
}

export interface LogStatementContext {
  level: LogLevel;
  message: string;
  metadata?: LogMetadata;
  location: {
    file: string;
    line: number;
    column: number;
  };
  surrounding: {
    function?: string;
    class?: string;
    context?: Partial<LogContext>;
  };
}

export interface RuleViolation {
  rule: string;
  severity: 'error' | 'warn' | 'info';
  message: string;
  suggestion?: string;
  line: number;
  column: number;
}

/**
 * Built-in logging standards rules
 */
export const LOGGING_RULES: LoggingRule[] = [
  {
    name: 'appropriate-log-level',
    severity: 'error',
    description: 'Ensures log levels match the operation type',
    check: (context) => {
      const violations: RuleViolation[] = [];
      
      // Protocol details should be DEBUG
      if (context.message.toLowerCase().includes('websocket') && 
          (context.message.includes('connected') || context.message.includes('message')) &&
          context.level !== 'debug') {
        violations.push({
          rule: 'appropriate-log-level',
          severity: 'error',
          message: 'WebSocket protocol details should use DEBUG level',
          suggestion: 'Change to logger.debug()',
          line: context.location.line,
          column: context.location.column
        });
      }
      
      // Errors should use ERROR level
      if (context.surrounding.function?.includes('error') || 
          context.message.toLowerCase().includes('failed') ||
          context.message.toLowerCase().includes('error')) {
        if (context.level !== 'error' && context.level !== 'fatal') {
          violations.push({
            rule: 'appropriate-log-level',
            severity: 'error',
            message: 'Error conditions should use ERROR or FATAL level',
            suggestion: 'Change to logger.error()',
            line: context.location.line,
            column: context.location.column
          });
        }
      }
      
      // User-facing operations should be INFO
      if ((context.message.includes('completed') || context.message.includes('started')) &&
          context.level === 'debug') {
        violations.push({
          rule: 'appropriate-log-level',
          severity: 'warn',
          message: 'User-facing operations should use INFO level',
          suggestion: 'Change to logger.info() if this is visible to users',
          line: context.location.line,
          column: context.location.column
        });
      }
      
      return violations;
    }
  },
  
  {
    name: 'require-correlation-id',
    severity: 'warn',
    description: 'Major operations should include correlation/request IDs',
    check: (context) => {
      const violations: RuleViolation[] = [];
      
      const isStartOperation = context.message.includes('started') || context.message.includes('beginning');
      const hasCorrelationId = context.metadata?.requestId || 
                              context.metadata?.correlationId ||
                              context.metadata?.operationId;
      
      if (isStartOperation && !hasCorrelationId && context.level === 'info') {
        violations.push({
          rule: 'require-correlation-id',
          severity: 'warn',
          message: 'Operation start logs should include requestId or correlationId',
          suggestion: 'Add requestId to metadata for operation tracking',
          line: context.location.line,
          column: context.location.column
        });
      }
      
      return violations;
    }
  },
  
  {
    name: 'meaningful-messages',
    severity: 'error',
    description: 'Log messages should be specific and actionable',
    check: (context) => {
      const violations: RuleViolation[] = [];
      
      const vagueMessages = [
        'processing',
        'handling',
        'doing something',
        'operation',
        'finished',
        'done'
      ];
      
      const message = context.message.toLowerCase();
      const isVague = vagueMessages.some(vague => message === vague || message.startsWith(vague + ' '));
      
      if (isVague) {
        violations.push({
          rule: 'meaningful-messages',
          severity: 'error',
          message: 'Log message is too vague - be specific about what is happening',
          suggestion: 'Include specific operation name, parameters, or outcome',
          line: context.location.line,
          column: context.location.column
        });
      }
      
      // Check for console.log usage
      if (context.surrounding.function?.includes('console.log')) {
        violations.push({
          rule: 'meaningful-messages',
          severity: 'error',
          message: 'Use structured logger instead of console.log',
          suggestion: 'Replace with appropriate logger method (debug, info, warn, error)',
          line: context.location.line,
          column: context.location.column
        });
      }
      
      return violations;
    }
  },
  
  {
    name: 'performance-logging',
    severity: 'info',
    description: 'Performance-sensitive operations should include timing',
    check: (context) => {
      const violations: RuleViolation[] = [];
      
      const performanceOperations = [
        'indexing',
        'searching', 
        'embedding',
        'parsing',
        'processing'
      ];
      
      const isPerformanceOperation = performanceOperations.some(op => 
        context.message.toLowerCase().includes(op)
      );
      
      const hasTimingInfo = context.metadata?.duration !== undefined ||
                           context.metadata?.elapsed !== undefined ||
                           context.metadata?.processingTime !== undefined;
      
      if (isPerformanceOperation && context.message.includes('completed') && !hasTimingInfo) {
        violations.push({
          rule: 'performance-logging',
          severity: 'info',
          message: 'Performance-sensitive operations should include timing information',
          suggestion: 'Add duration or elapsed time to metadata',
          line: context.location.line,
          column: context.location.column
        });
      }
      
      return violations;
    }
  },
  
  {
    name: 'error-context',
    severity: 'error',
    description: 'Error logs should include sufficient context for diagnosis',
    check: (context) => {
      const violations: RuleViolation[] = [];
      
      if (context.level === 'error' || context.level === 'fatal') {
        const hasRecoveryInfo = context.metadata?.willRetry ||
                               context.metadata?.recommendedAction ||
                               context.metadata?.userImpact;
        
        const hasContextInfo = context.metadata?.operation ||
                              context.metadata?.component ||
                              context.metadata?.requestId;
        
        if (!hasRecoveryInfo) {
          violations.push({
            rule: 'error-context',
            severity: 'warn',
            message: 'Error logs should include recovery information',
            suggestion: 'Add recommendedAction, userImpact, or retry information',
            line: context.location.line,
            column: context.location.column
          });
        }
        
        if (!hasContextInfo) {
          violations.push({
            rule: 'error-context',
            severity: 'error',
            message: 'Error logs should include operation context',
            suggestion: 'Add component, operation, or requestId to metadata',
            line: context.location.line,
            column: context.location.column
          });
        }
      }
      
      return violations;
    }
  }
];

/**
 * Main logging linter class
 */
export class LoggingLinter {
  private rules: LoggingRule[];
  private checker: LoggingStandardsChecker;
  
  constructor(customRules: LoggingRule[] = []) {
    this.rules = [...LOGGING_RULES, ...customRules];
    this.checker = new LoggingStandardsChecker();
  }
  
  /**
   * Lint a single log statement
   */
  lintLogStatement(context: LogStatementContext): LintResult {
    const violations: RuleViolation[] = [];
    
    // Apply all rules
    for (const rule of this.rules) {
      const ruleViolations = rule.check(context);
      violations.push(...ruleViolations);
    }
    
    // Check general standards compliance
    const compliance = this.checker.checkLogStatement(
      context.level,
      context.message,
      context.metadata,
      context.surrounding.context
    );
    
    // Convert compliance violations to rule violations
    if (!compliance.isCompliant) {
      violations.push(...compliance.violations.map(violation => ({
        rule: 'standards-compliance',
        severity: 'warn' as const,
        message: violation,
        line: context.location.line,
        column: context.location.column
      })));
    }
    
    return {
      file: context.location.file,
      violations,
      suggestions: compliance.suggestions
    };
  }
  
  /**
   * Generate lint report for multiple files
   */
  generateReport(results: LintResult[]): LintReport {
    const totalViolations = results.reduce((sum, result) => sum + result.violations.length, 0);
    const errorCount = results.reduce((sum, result) => 
      sum + result.violations.filter(v => v.severity === 'error').length, 0);
    const warningCount = results.reduce((sum, result) => 
      sum + result.violations.filter(v => v.severity === 'warn').length, 0);
    
    const violationsByRule = new Map<string, number>();
    results.forEach(result => {
      result.violations.forEach(violation => {
        violationsByRule.set(violation.rule, (violationsByRule.get(violation.rule) || 0) + 1);
      });
    });
    
    return {
      summary: {
        filesLinted: results.length,
        totalViolations,
        errorCount,
        warningCount,
        infoCount: totalViolations - errorCount - warningCount
      },
      violationsByRule: Array.from(violationsByRule.entries()).map(([rule, count]) => ({ rule, count })),
      results
    };
  }
  
  /**
   * Add custom rule
   */
  addRule(rule: LoggingRule): void {
    this.rules.push(rule);
  }
  
  /**
   * Remove rule by name
   */
  removeRule(ruleName: string): void {
    this.rules = this.rules.filter(rule => rule.name !== ruleName);
  }
}

export interface LintResult {
  file: string;
  violations: RuleViolation[];
  suggestions: string[];
}

export interface LintReport {
  summary: {
    filesLinted: number;
    totalViolations: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  violationsByRule: Array<{ rule: string; count: number }>;
  results: LintResult[];
}

/**
 * Utility functions for development-time logging validation
 */
export class LoggingValidator {
  private static linter = new LoggingLinter();
  
  /**
   * Validate a log statement during development
   */
  static validateLogStatement(
    level: LogLevel,
    message: string,
    metadata?: LogMetadata,
    location?: { file: string; line: number; column: number }
  ): void {
    if (process.env.NODE_ENV !== 'development') {
      return; // Skip validation in production
    }
    
    const context: LogStatementContext = {
      level,
      message,
      ...(metadata && { metadata }),
      location: location || { file: 'unknown', line: 0, column: 0 },
      surrounding: {}
    };
    
    const result = this.linter.lintLogStatement(context);
    
    if (result.violations.length > 0) {
      const errors = result.violations.filter(v => v.severity === 'error');
      const warnings = result.violations.filter(v => v.severity === 'warn');
      
      if (errors.length > 0) {
        console.warn('🚨 Logging Standards Violations (ERRORS):');
        errors.forEach(error => {
          console.warn(`  - ${error.message}`);
          if (error.suggestion) {
            console.warn(`    💡 ${error.suggestion}`);
          }
        });
      }
      
      if (warnings.length > 0 && process.env.LOG_LINT_SHOW_WARNINGS === 'true') {
        console.warn('⚠️ Logging Standards Warnings:');
        warnings.forEach(warning => {
          console.warn(`  - ${warning.message}`);
          if (warning.suggestion) {
            console.warn(`    💡 ${warning.suggestion}`);
          }
        });
      }
    }
  }
  
  /**
   * Create a development logger wrapper that validates calls
   */
  static createValidatingLogger(baseLogger: any, component: string = 'unknown'): any {
    if (process.env.NODE_ENV !== 'development') {
      return baseLogger; // No wrapping in production
    }
    
    return {
      debug: (message: string, metadata?: LogMetadata) => {
        this.validateLogStatement('debug', message, metadata);
        return baseLogger.debug(message, metadata);
      },
      info: (message: string, metadata?: LogMetadata) => {
        this.validateLogStatement('info', message, metadata);
        return baseLogger.info(message, metadata);
      },
      warn: (message: string, metadata?: LogMetadata) => {
        this.validateLogStatement('warn', message, metadata);
        return baseLogger.warn(message, metadata);
      },
      error: (message: string, error?: Error, metadata?: LogMetadata) => {
        this.validateLogStatement('error', message, metadata);
        return baseLogger.error(message, error, metadata);
      },
      fatal: (message: string, error?: Error, metadata?: LogMetadata) => {
        this.validateLogStatement('fatal', message, metadata);
        return baseLogger.fatal(message, error, metadata);
      }
    };
  }
}

/**
 * Export main linter instance for CLI usage
 */
export const loggingLinter = new LoggingLinter();