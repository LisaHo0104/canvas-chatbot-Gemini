import { McpFunctionRegistryImpl } from './mcp-registry';
import { McpFunctionExecutorImpl } from './mcp-executor';
import { canvasFunctions } from './canvas-functions';
import { logger } from './logger';
import { McpFunctionCall, McpFunctionResult, McpFunctionDefinition } from './mcp-types';
import { generateFunctionCallId } from './mcp-utils';

/**
 * Canvas MCP Integration
 * 
 * This module provides the main integration point for Canvas API functions
 * within the Model Context Protocol (MCP) system. It handles function
 * registration, execution, and provides a unified interface for AI systems
 * to interact with Canvas LMS data.
 */

export interface CanvasMCPConfig {
  /** Enable detailed logging for debugging */
  enableLogging?: boolean;
  /** Maximum number of concurrent function executions */
  maxConcurrentExecutions?: number;
  /** Default timeout for function executions (ms) */
  defaultTimeout?: number;
  /** Enable function result caching */
  enableCaching?: boolean;
  /** Cache TTL in seconds */
  cacheTtl?: number;
}

export interface McpFunctionRegistry {
  register(functionDefinition: McpFunctionDefinition): void;
  unregister(functionName: string): void;
  get(functionName: string): McpFunctionDefinition | undefined;
  list(options?: { category?: string; tags?: string[]; search?: string }): McpFunctionDefinition[];
}

export interface McpFunctionExecutor {
  execute(call: McpFunctionCall, options?: any): Promise<McpFunctionResult>;
  executeBatch(calls: McpFunctionCall[], options?: any): Promise<McpFunctionResult[]>;
}

export class CanvasMCPIntegration {
  private registry: McpFunctionRegistry;
  private executor: McpFunctionExecutor;
  private config: CanvasMCPConfig;
  private isInitialized: boolean = false;

  constructor(config: CanvasMCPConfig = {}) {
    this.config = {
      enableLogging: true,
      maxConcurrentExecutions: 10,
      defaultTimeout: 30000,
      enableCaching: true,
      cacheTtl: 300, // 5 minutes
      ...config
    };

    this.registry = new McpFunctionRegistryImpl();
    this.executor = new McpFunctionExecutorImpl();

    if (this.config.enableLogging) {
      logger.info('Canvas MCP Integration initialized', { config: this.config });
    }
  }

  /**
   * Initialize the Canvas MCP integration by registering all Canvas functions
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Canvas MCP Integration already initialized');
      return;
    }

    try {
      // Register all Canvas functions
      for (const func of canvasFunctions) {
        this.registry.register(func);
        if (func.implementation) {
          // Register implementation with executor
          (this.executor as any).registerImplementation?.(func.name, func.implementation);
        }
      }

      this.isInitialized = true;
      logger.info('Canvas MCP Integration initialized successfully', {
        registeredFunctions: canvasFunctions.length,
        categories: this.getFunctionCategories()
      });
    } catch (error) {
      logger.error('Failed to initialize Canvas MCP Integration', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute a single Canvas function
   */
  async executeFunction(
    functionName: string, 
    parameters: any, 
    context: any
  ): Promise<McpFunctionResult> {
    if (!this.isInitialized) {
      throw new Error('Canvas MCP Integration not initialized. Call initialize() first.');
    }

    const functionCall: McpFunctionCall = {
      id: generateFunctionCallId(functionName),
      function: functionName,
      parameters,
      context
    };

    try {
      if (this.config.enableLogging) {
        logger.info('Executing Canvas function', { 
          functionName, 
          parameters: this.sanitizeParameters(parameters) 
        });
      }

      const result = await this.executor.execute(functionCall);

      if (this.config.enableLogging) {
        logger.info('Canvas function executed successfully', { 
          functionName,
          success: result.success,
          metadata: result.metadata
        });
      }

      return result;
    } catch (error) {
      logger.error('Canvas function execution failed', { 
        functionName, 
        error: error.message,
        parameters: this.sanitizeParameters(parameters)
      });
      throw error;
    }
  }

  /**
   * Execute multiple Canvas functions in batch
   */
  async executeFunctionsBatch(
    functionCalls: Array<{ name: string; parameters: any; context: any }>
  ): Promise<McpFunctionResult[]> {
    if (!this.isInitialized) {
      throw new Error('Canvas MCP Integration not initialized. Call initialize() first.');
    }

    const calls: McpFunctionCall[] = functionCalls.map(call => ({
      id: generateFunctionCallId(call.name),
      function: call.name,
      parameters: call.parameters,
      context: call.context
    }));

    try {
      if (this.config.enableLogging) {
        logger.info('Executing Canvas functions batch', { 
          batchSize: calls.length,
          functions: calls.map(c => c.function)
        });
      }

      const results = await this.executor.executeBatch(calls);

      if (this.config.enableLogging) {
        logger.info('Canvas functions batch executed', { 
          batchSize: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          functions: calls.map(c => c.function)
        });
      }

      return results;
    } catch (error) {
      logger.error('Canvas functions batch execution failed', { 
        batchSize: calls.length,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Discover available Canvas functions
   */
  async discoverFunctions(
    options: {
      category?: string;
      tags?: string[];
      search?: string;
    } = {}
  ): Promise<McpFunctionDefinition[]> {
    if (!this.isInitialized) {
      throw new Error('Canvas MCP Integration not initialized. Call initialize() first.');
    }

    return this.registry.list(options);
  }

  /**
   * Get a specific function definition
   */
  async getFunctionDefinition(functionName: string): Promise<McpFunctionDefinition | null> {
    if (!this.isInitialized) {
      throw new Error('Canvas MCP Integration not initialized. Call initialize() first.');
    }

    return this.registry.get(functionName);
  }

  /**
   * Get available function categories
   */
  getFunctionCategories(): string[] {
    const categories = new Set<string>();
    canvasFunctions.forEach(func => {
      if (func.category) {
        categories.add(func.category);
      }
    });
    return Array.from(categories).sort();
  }

  /**
   * Get function statistics
   */
  async getFunctionStats(): Promise<{
    totalFunctions: number;
    categories: string[];
    executionStats: {
      totalExecutions: number;
      successfulExecutions: number;
      failedExecutions: number;
      averageExecutionTime: number;
    };
  }> {
    if (!this.isInitialized) {
      throw new Error('Canvas MCP Integration not initialized. Call initialize() first.');
    }

    const executionStats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0
    };
    const functions = this.registry.list();

    return {
      totalFunctions: functions.length,
      categories: this.getFunctionCategories(),
      executionStats
    };
  }

  /**
   * Register a custom Canvas function
   */
  async registerFunction(functionDefinition: McpFunctionDefinition): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Canvas MCP Integration not initialized. Call initialize() first.');
    }

    await this.registry.register(functionDefinition);
    
    if (this.config.enableLogging) {
      logger.info('Custom Canvas function registered', { 
        functionName: functionDefinition.name,
        category: functionDefinition.category
      });
    }
  }

  /**
   * Unregister a Canvas function
   */
  async unregisterFunction(functionName: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Canvas MCP Integration not initialized. Call initialize() first.');
    }

    await this.registry.unregister(functionName);
    
    if (this.config.enableLogging) {
      logger.info('Canvas function unregistered', { functionName });
    }
  }

  /**
   * Clear execution cache
   */
  clearCache(): void {
    logger.info('Canvas MCP Integration cache cleared (no-op)');
  }

  /**
   * Shutdown the integration
   */
  async shutdown(): Promise<void> {
    this.isInitialized = false;
    logger.info('Canvas MCP Integration shutdown completed');
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
   */
  private sanitizeParameters(parameters: any): any {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...parameters };
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}

// Export singleton instance for easy usage
export const canvasMCP = new CanvasMCPIntegration();

// Export types and interfaces
export type {
  McpFunctionDefinition,
  McpFunctionCall,
  McpFunctionResult,
  McpParameter
} from './mcp-types';

// Export utility functions
export { canvasFunctions, canvasFunctionsByCategory, canvasFunctionNames } from './canvas-functions';

// Export utility functions
export {
  validateFunctionParameters,
  sanitizeParameterValue,
  isValidParameterType,
  extractRequiredParameters,
  formatFunctionExamples,
  generateFunctionSignature,
  createParameterSchema,
  generateFunctionCallTemplate,
  createFunctionUsageSummary,
  validateFunctionDefinition,
  generateFunctionCallId
} from './mcp-utils';