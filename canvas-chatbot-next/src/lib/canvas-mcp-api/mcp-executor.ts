/**
 * MCP Function Executor Implementation
 * Handles execution of function calls with validation, error handling, and monitoring
 */

import {
  McpFunctionCall,
  McpFunctionResult,
  McpFunctionError,
  McpExecutionOptions,
  McpCallContext,
  McpFunctionExecutor,
  McpFunctionDefinition
} from './mcp-types';
import { functionRegistry } from './mcp-registry';
import { logger } from './logger';

export class McpFunctionExecutorImpl implements McpFunctionExecutor {
  private functionImplementations = new Map<string, Function>();

  /**
   * Register a function implementation
   */
  registerImplementation(functionName: string, implementation: Function): void {
    this.functionImplementations.set(functionName, implementation);
    logger.info('Function implementation registered', { functionName });
  }

  /**
   * Execute a single function call
   */
  async execute(
    call: McpFunctionCall, 
    options: McpExecutionOptions = {}
  ): Promise<McpFunctionResult> {
    const startTime = Date.now();
    const context = call.context || this.createDefaultContext();
    
    logger.info('Executing function', { 
      functionName: call.function, 
      callId: call.id,
      parameters: call.parameters 
    });

    try {
      // Validate function exists
      const functionDef = functionRegistry.get(call.function);
      if (!functionDef) {
        throw new McpFunctionExecutionError(`Function '${call.function}' not found`, 'FUNCTION_NOT_FOUND');
      }

      // Validate parameters
      const validationResult = this.validateParameters(functionDef, call.parameters);
      if (!validationResult.valid) {
        throw new McpFunctionExecutionError(
          `Parameter validation failed: ${validationResult.errors?.join(', ')}`,
          'VALIDATION_ERROR',
          validationResult.errors
        );
      }

      // Apply defaults
      const parametersWithDefaults = this.applyParameterDefaults(functionDef, call.parameters);

      // Execute function with retry logic
      const result = await this.executeWithRetry(
        call.function,
        parametersWithDefaults,
        context,
        options
      );

      const duration = Date.now() - startTime;
      
      logger.info('Function executed successfully', { 
        functionName: call.function, 
        callId: call.id,
        duration 
      });

      return {
        success: true,
        data: result,
        metadata: {
          duration,
          timestamp: new Date().toISOString(),
          functionName: call.function,
          callId: call.id,
          cacheHit: false
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const functionError = this.createFunctionError(error, call.function);
      
      logger.error('Function execution failed', { 
        functionName: call.function, 
        callId: call.id,
        error: functionError.message,
        duration 
      });

      return {
        success: false,
        error: functionError,
        metadata: {
          duration,
          timestamp: new Date().toISOString(),
          functionName: call.function,
          callId: call.id,
          cacheHit: false
        }
      };
    }
  }

  /**
   * Execute multiple function calls in batch
   */
  async executeBatch(
    calls: McpFunctionCall[], 
    options: McpExecutionOptions = {}
  ): Promise<McpFunctionResult[]> {
    logger.info('Executing batch function calls', { 
      batchSize: calls.length 
    });

    // Execute calls in parallel with controlled concurrency
    const batchOptions = { ...options, async: true };
    const results = await Promise.allSettled(
      calls.map(call => this.execute(call, batchOptions))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // Handle failed promises
        const call = calls[index];
        return {
          success: false,
          error: this.createFunctionError(result.reason, call.function),
          metadata: {
            duration: 0,
            timestamp: new Date().toISOString(),
            functionName: call.function,
            callId: call.id,
            cacheHit: false
          }
        };
      }
    });
  }

  /**
   * Validate function parameters
   */
  validate(functionName: string, parameters: Record<string, any>): boolean {
    const functionDef = functionRegistry.get(functionName);
    if (!functionDef) {
      return false;
    }

    const result = this.validateParameters(functionDef, parameters);
    return result.valid;
  }

  /**
   * Execute function with retry logic
   */
  private async executeWithRetry(
    functionName: string,
    parameters: Record<string, any>,
    context: McpCallContext,
    options: McpExecutionOptions
  ): Promise<any> {
    const maxRetries = options.retryCount || 0;
    const retryDelay = options.retryDelay || 1000;
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const implementation = this.functionImplementations.get(functionName);
        if (!implementation) {
          throw new McpFunctionExecutionError(
            `No implementation found for function '${functionName}'`,
            'IMPLEMENTATION_NOT_FOUND'
          );
        }

        // Execute function
        const result = await implementation(parameters, context);
        return result;

      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if this is the last attempt
        if (attempt === maxRetries) {
          throw error;
        }

        // Check if error is retryable
        const functionError = this.createFunctionError(error, functionName);
        if (!functionError.retryable) {
          throw error;
        }

        // Wait before retry
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        logger.warn('Function execution failed, retrying', { 
          functionName, 
          attempt: attempt + 1, 
          maxRetries,
          delay 
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Validate parameters against function definition
   */
  private validateParameters(
    functionDef: McpFunctionDefinition, 
    parameters: Record<string, any>
  ): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    const providedParams = new Set(Object.keys(parameters));
    const requiredParams = new Set<string>();

    // Check required parameters
    for (const [paramName, paramDef] of Object.entries(functionDef.parameters)) {
      if (paramDef.required !== false) { // Default to required
        requiredParams.add(paramName);
      }
    }

    // Validate required parameters are present
    Array.from(requiredParams).forEach((requiredParam) => {
      if (!providedParams.has(requiredParam)) {
        errors.push(`Missing required parameter: ${requiredParam}`);
      }
    });

    // Validate parameter types
    for (const [paramName, paramValue] of Object.entries(parameters)) {
      const paramDef = functionDef.parameters[paramName];
      if (paramDef) {
        const typeValidation = this.validateParameterType(paramName, paramValue, paramDef);
        if (!typeValidation.valid) {
          errors.push(...(typeValidation.errors || []));
        }
      } else {
        errors.push(`Unknown parameter: ${paramName}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate parameter type
   */
  private validateParameterType(
    paramName: string, 
    value: any, 
    paramDef: any
  ): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    
    switch (paramDef.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Parameter '${paramName}' must be a string`);
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`Parameter '${paramName}' must be a number`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Parameter '${paramName}' must be a boolean`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`Parameter '${paramName}' must be an array`);
        } else if (paramDef.items) {
          // Validate array items
          for (let i = 0; i < value.length; i++) {
            const itemValidation = this.validateParameterType(`${paramName}[${i}]`, value[i], paramDef.items);
            if (!itemValidation.valid) {
              errors.push(...(itemValidation.errors || []));
            }
          }
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(`Parameter '${paramName}' must be an object`);
        } else if (paramDef.properties) {
          // Validate object properties
          for (const [propName, propDef] of Object.entries(paramDef.properties)) {
            if (value.hasOwnProperty(propName)) {
              const propValidation = this.validateParameterType(`${paramName}.${propName}`, value[propName], propDef);
              if (!propValidation.valid) {
                errors.push(...(propValidation.errors || []));
              }
            }
          }
        }
        break;
      default:
        errors.push(`Unknown parameter type for '${paramName}': ${paramDef.type}`);
    }

    // Validate enum values
    if (paramDef.enum && !paramDef.enum.includes(value)) {
      errors.push(`Parameter '${paramName}' must be one of: ${paramDef.enum.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Apply parameter defaults
   */
  private applyParameterDefaults(
    functionDef: McpFunctionDefinition, 
    parameters: Record<string, any>
  ): Record<string, any> {
    const result = { ...parameters };

    for (const [paramName, paramDef] of Object.entries(functionDef.parameters)) {
      if (result[paramName] === undefined && paramDef.default !== undefined) {
        result[paramName] = paramDef.default;
      }
    }

    return result;
  }

  /**
   * Create function error from unknown error
   */
  private createFunctionError(error: unknown, functionName: string): McpFunctionError {
    if (error instanceof McpFunctionExecutionError) {
      return {
        code: error.code,
        message: error.message,
        details: error.details,
        retryable: error.retryable,
        fallbackAvailable: error.fallbackAvailable
      };
    }

    if (error instanceof Error) {
      return {
        code: 'EXECUTION_ERROR',
        message: error.message,
        retryable: true,
        fallbackAvailable: true
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      details: error,
      retryable: false,
      fallbackAvailable: false
    };
  }

  /**
   * Create default context
   */
  private createDefaultContext(): McpCallContext {
    return {
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Custom error class for function execution errors
 */
export class McpFunctionExecutionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
    public retryable: boolean = false,
    public fallbackAvailable: boolean = false
  ) {
    super(message);
    this.name = 'McpFunctionExecutionError';
  }
}

// Singleton instance
export const functionExecutor = new McpFunctionExecutorImpl();