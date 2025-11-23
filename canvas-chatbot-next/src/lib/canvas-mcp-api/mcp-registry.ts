/**
 * MCP Function Registry Implementation
 * Manages registration and discovery of available functions
 */

import { 
  McpFunctionDefinition, 
  McpParameter,
  McpParameterType 
} from './mcp-types';
import { logger } from './logger';

export interface McpFunctionRegistry {
  register(functionDef: McpFunctionDefinition): void;
  unregister(functionName: string): void;
  get(functionName: string): McpFunctionDefinition | undefined;
  list(options?: { category?: string; tags?: string[]; search?: string }): McpFunctionDefinition[];
}

export class McpFunctionRegistryImpl implements McpFunctionRegistry {
  private functions = new Map<string, McpFunctionDefinition>();
  private categories = new Map<string, Set<string>>();
  private tags = new Map<string, Set<string>>();

  register(functionDef: McpFunctionDefinition): void {
    // Validate function definition
    this.validateFunctionDefinition(functionDef);
    
    // Check for duplicates
    if (this.functions.has(functionDef.name)) {
      throw new Error(`Function '${functionDef.name}' is already registered`);
    }

    // Register function
    this.functions.set(functionDef.name, functionDef);
    
    // Update category index
    if (!this.categories.has(functionDef.category)) {
      this.categories.set(functionDef.category, new Set());
    }
    this.categories.get(functionDef.category)!.add(functionDef.name);

    // Update tag index
    if (functionDef.tags) {
      for (const tag of functionDef.tags) {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, new Set());
        }
        this.tags.get(tag)!.add(functionDef.name);
      }
    }

    logger.info('Function registered', { 
      functionName: functionDef.name, 
      category: functionDef.category 
    });
  }

  unregister(functionName: string): void {
    const functionDef = this.functions.get(functionName);
    if (!functionDef) {
      logger.warn('Attempted to unregister non-existent function', { functionName });
      return;
    }

    // Remove from main registry
    this.functions.delete(functionName);

    // Remove from category index
    const categorySet = this.categories.get(functionDef.category);
    if (categorySet) {
      categorySet.delete(functionName);
      if (categorySet.size === 0) {
        this.categories.delete(functionDef.category);
      }
    }

    // Remove from tag index
    if (functionDef.tags) {
      for (const tag of functionDef.tags) {
        const tagSet = this.tags.get(tag);
        if (tagSet) {
          tagSet.delete(functionName);
          if (tagSet.size === 0) {
            this.tags.delete(tag);
          }
        }
      }
    }

    logger.info('Function unregistered', { functionName });
  }

  get(functionName: string): McpFunctionDefinition | undefined {
    return this.functions.get(functionName);
  }

  list(): McpFunctionDefinition[] {
    return Array.from(this.functions.values());
  }

  listByCategory(category: string): McpFunctionDefinition[] {
    const functionNames = this.categories.get(category);
    if (!functionNames) {
      return [];
    }
    
    return Array.from(functionNames)
      .map(name => this.functions.get(name))
      .filter((def): def is McpFunctionDefinition => def !== undefined);
  }

  listByTag(tag: string): McpFunctionDefinition[] {
    const functionNames = this.tags.get(tag);
    if (!functionNames) {
      return [];
    }
    
    return Array.from(functionNames)
      .map(name => this.functions.get(name))
      .filter((def): def is McpFunctionDefinition => def !== undefined);
  }

  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  getTags(): string[] {
    return Array.from(this.tags.keys());
  }

  getStats(): {
    totalFunctions: number;
    categories: number;
    tags: number;
    deprecatedFunctions: number;
  } {
    const deprecatedCount = Array.from(this.functions.values())
      .filter(def => def.deprecated).length;

    return {
      totalFunctions: this.functions.size,
      categories: this.categories.size,
      tags: this.tags.size,
      deprecatedFunctions: deprecatedCount
    };
  }

  private validateFunctionDefinition(functionDef: McpFunctionDefinition): void {
    if (!functionDef.name || typeof functionDef.name !== 'string') {
      throw new Error('Function name is required and must be a string');
    }

    if (!functionDef.description || typeof functionDef.description !== 'string') {
      throw new Error('Function description is required and must be a string');
    }

    if (!functionDef.parameters || typeof functionDef.parameters !== 'object') {
      throw new Error('Function parameters are required and must be an object');
    }

    if (!functionDef.returns || typeof functionDef.returns !== 'object') {
      throw new Error('Function return type is required and must be an object');
    }

    if (!functionDef.category || typeof functionDef.category !== 'string') {
      throw new Error('Function category is required and must be a string');
    }

    // Validate parameter definitions
    for (const [paramName, paramDef] of Object.entries(functionDef.parameters)) {
      this.validateParameterDefinition(paramName, paramDef);
    }

    // Validate return type
    this.validateParameterType('return', functionDef.returns.type);
  }

  private validateParameterDefinition(name: string, param: McpParameter): void {
    if (!param.type || !this.isValidParameterType(param.type)) {
      throw new Error(`Parameter '${name}' has invalid type: ${param.type}`);
    }

    if (!param.description || typeof param.description !== 'string') {
      throw new Error(`Parameter '${name}' description is required and must be a string`);
    }

    // Validate array items if type is array
    if (param.type === 'array' && param.items) {
      this.validateParameterDefinition(`${name}.items`, param.items);
    }

    // Validate object properties if type is object
    if (param.type === 'object' && param.properties) {
      for (const [propName, propDef] of Object.entries(param.properties)) {
        this.validateParameterDefinition(`${name}.${propName}`, propDef);
      }
    }
  }

  private validateParameterType(context: string, type: McpParameterType): void {
    if (!this.isValidParameterType(type)) {
      throw new Error(`${context} has invalid type: ${type}`);
    }
  }

  private isValidParameterType(type: any): type is McpParameterType {
    const validTypes: McpParameterType[] = ['string', 'number', 'boolean', 'array', 'object'];
    return validTypes.includes(type);
  }
}

// Singleton instance
export const functionRegistry = new McpFunctionRegistryImpl();