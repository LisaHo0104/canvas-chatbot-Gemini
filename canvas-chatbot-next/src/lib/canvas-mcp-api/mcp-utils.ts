/**
 * Canvas MCP Integration Utilities
 * 
 * This file provides utility functions for parameter validation,
 * function formatting, and other helper operations.
 */

import { z } from 'zod';
import { 
  McpParameter, 
  McpFunctionDefinition,
  McpFunctionExample
} from './mcp-types';

/**
 * Validate function parameters against their definitions
 */
export function validateFunctionParameters(
  parameters: any,
  functionDefinition: McpFunctionDefinition
): { valid: boolean; errors: string[]; sanitized: any } {
  const errors: string[] = [];
  const sanitized: any = {};
  
  // Check required parameters
  for (const [paramName, param] of Object.entries(functionDefinition.parameters)) {
    if (param.required && (parameters[paramName] === undefined || parameters[paramName] === null)) {
      errors.push(`Missing required parameter: ${paramName}`);
      continue;
    }
    
    // If parameter is provided, validate it
    if (parameters[paramName] !== undefined && parameters[paramName] !== null) {
      const validation = validateParameterValue(parameters[paramName], param, paramName);
      if (!validation.valid) {
        errors.push(...validation.errors);
      } else {
        sanitized[paramName] = validation.sanitized;
      }
    } else if (param.default !== undefined) {
      // Use default value
      sanitized[paramName] = param.default;
    }
  }
  
  // Check for unknown parameters
  const knownParams = new Set(Object.keys(functionDefinition.parameters));
  for (const paramName of Object.keys(parameters)) {
    if (!knownParams.has(paramName)) {
      errors.push(`Unknown parameter: ${paramName}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : parameters
  };
}

/**
 * Validate a single parameter value
 */
export function validateParameterValue(
  value: any,
  parameter: McpParameter,
  paramName: string
): { valid: boolean; errors: string[]; sanitized: any } {
  const errors: string[] = [];
  let sanitized = value;
  
  // Type validation
  if (!isValidParameterType(value, parameter.type)) {
    errors.push(`Invalid type for parameter ${paramName}: expected ${parameter.type}, got ${typeof value}`);
    return { valid: false, errors, sanitized };
  }
  
  // String validation
  if (parameter.type === 'string' && typeof value === 'string') {
    if (parameter.validation?.minLength && value.length < parameter.validation.minLength) {
      errors.push(`Parameter ${paramName} must be at least ${parameter.validation.minLength} characters`);
    }
    if (parameter.validation?.maxLength && value.length > parameter.validation.maxLength) {
      errors.push(`Parameter ${paramName} must be at most ${parameter.validation.maxLength} characters`);
    }
    if (parameter.enum && !parameter.enum.includes(value)) {
      errors.push(`Parameter ${paramName} must be one of: ${parameter.enum.join(', ')}`);
    }
  }
  
  // Number validation
  if (parameter.type === 'number' && typeof value === 'number') {
    if (parameter.validation?.min !== undefined && value < parameter.validation.min) {
      errors.push(`Parameter ${paramName} must be at least ${parameter.validation.min}`);
    }
    if (parameter.validation?.max !== undefined && value > parameter.validation.max) {
      errors.push(`Parameter ${paramName} must be at most ${parameter.validation.max}`);
    }
  }
  
  // Array validation
  if (parameter.type === 'array' && Array.isArray(value)) {
    if (parameter.validation?.minItems && value.length < parameter.validation.minItems) {
      errors.push(`Parameter ${paramName} must have at least ${parameter.validation.minItems} items`);
    }
    if (parameter.validation?.maxItems && value.length > parameter.validation.maxItems) {
      errors.push(`Parameter ${paramName} must have at most ${parameter.validation.maxItems} items`);
    }
    
    // Validate array items if schema is provided
    if (parameter.items) {
      for (let i = 0; i < value.length; i++) {
        const itemValidation = validateParameterValue(value[i], parameter.items, `${paramName}[${i}]`);
        if (!itemValidation.valid) {
          errors.push(...itemValidation.errors.map(err => `Item ${i}: ${err}`));
        }
      }
    }
  }
  
  // Object validation
  if (parameter.type === 'object' && typeof value === 'object' && value !== null) {
    // Additional object validation can be added here
    sanitized = sanitizeParameterValue(value, parameter);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Check if a value matches the expected parameter type
 */
export function isValidParameterType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'float':
      return typeof value === 'number' && !Number.isInteger(value);
    default:
      return true; // Unknown types are accepted
  }
}

/**
 * Sanitize parameter values to prevent security issues
 */
export function sanitizeParameterValue(value: any, parameter: McpParameter): any {
  if (parameter.type === 'string' && typeof value === 'string') {
    // Basic XSS prevention
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
  
  if (parameter.type === 'object' && typeof value === 'object' && value !== null) {
    // Deep sanitize objects
    const sanitized: any = {};
    for (const [key, val] of Object.entries(value)) {
      // Only sanitize string values in objects
      if (typeof val === 'string') {
        sanitized[key] = sanitizeParameterValue(val, { type: 'string' } as McpParameter);
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }
  
  return value;
}

/**
 * Extract required parameters from function definition
 */
export function extractRequiredParameters(functionDefinition: McpFunctionDefinition): string[] {
  return Object.entries(functionDefinition.parameters)
    .filter(([, param]) => param.required)
    .map(([paramName]) => paramName);
}

/**
 * Format function examples for display
 */
export function formatFunctionExamples(examples: McpFunctionExample[]): string {
  if (!examples || examples.length === 0) {
    return 'No examples available';
  }
  
  return examples.map((example, index) => {
    const paramsStr = JSON.stringify(example.parameters, null, 2);
    return `${index + 1}. ${example.description}:\n\`\`\`json\n${paramsStr}\n\`\`\``;
  }).join('\n\n');
}

/**
 * Generate function signature from definition
 */
export function generateFunctionSignature(functionDefinition: McpFunctionDefinition): string {
  const requiredParams = extractRequiredParameters(functionDefinition);
  const optionalParams = Object.entries(functionDefinition.parameters)
    .filter(([, param]) => !param.required)
    .map(([paramName]) => `${paramName}?`);
  
  const allParams = [...requiredParams, ...optionalParams];
  const paramsStr = allParams.join(', ');
  
  return `${functionDefinition.name}(${paramsStr}): ${functionDefinition.returns.type}`;
}

/**
 * Create a parameter validation schema using Zod
 */
export function createParameterSchema(parameters: Record<string, McpParameter>): z.ZodObject<any> {
  const schemaShape: any = {};
  
  for (const [paramName, param] of Object.entries(parameters)) {
    let fieldSchema: z.ZodTypeAny;
    
    // Base type schema
    switch (param.type) {
      case 'string':
        fieldSchema = z.string();
        if (param.validation?.minLength) {
          fieldSchema = z.string().min(param.validation.minLength);
        }
        if (param.validation?.maxLength) {
          fieldSchema = z.string().max(param.validation.maxLength);
        }
        if (param.enum) {
          fieldSchema = z.enum(param.enum as [string, ...string[]]);
        }
        break;
        
      case 'number':
        fieldSchema = z.number();
        if (param.validation?.min !== undefined) {
          fieldSchema = z.number().min(param.validation.min);
        }
        if (param.validation?.max !== undefined) {
          fieldSchema = z.number().max(param.validation.max);
        }
        break;
        
      case 'boolean':
        fieldSchema = z.boolean();
        break;
        
      case 'array':
        if (param.items) {
          const itemSchema = createParameterSchema({ items: param.items });
          fieldSchema = z.array(itemSchema.shape.items);
        } else {
          fieldSchema = z.array(z.any());
        }
        if (param.validation?.minItems) {
          fieldSchema = z.array(z.any()).min(param.validation.minItems);
        }
        if (param.validation?.maxItems) {
          fieldSchema = z.array(z.any()).max(param.validation.maxItems);
        }
        break;
        
      case 'object':
        if (param.properties) {
          fieldSchema = createParameterSchema(param.properties);
        } else {
          fieldSchema = z.object({});
        }
        break;
        
      // duplicate 'number' case removed
        
      default:
        fieldSchema = z.any();
    }
    
    // Handle default values and requirements
    if (param.default !== undefined) {
      fieldSchema = fieldSchema.default(param.default);
    }
    
    if (!param.required) {
      fieldSchema = fieldSchema.optional();
    }
    
    schemaShape[paramName] = fieldSchema;
  }
  
  return z.object(schemaShape);
}

/**
 * Generate a function call template
 */
export function generateFunctionCallTemplate(functionDefinition: McpFunctionDefinition): any {
  const template: any = {};
  
  for (const [paramName, param] of Object.entries(functionDefinition.parameters)) {
    if (param.required) {
      // Provide example values for required parameters
      switch (param.type) {
        case 'string':
          template[paramName] = param.enum ? param.enum[0] : 'example-string';
          break;
        case 'number':
          template[paramName] = param.validation?.min || 1;
          break;
        case 'boolean':
          template[paramName] = true;
          break;
        case 'array':
          template[paramName] = [];
          break;
        case 'object':
          template[paramName] = {};
          break;
        default:
          template[paramName] = null;
      }
    } else if (param.default !== undefined) {
      template[paramName] = param.default;
    }
  }
  
  return template;
}

/**
 * Create a function usage summary
 */
export function createFunctionUsageSummary(functionDefinition: McpFunctionDefinition): string {
  const requiredCount = Object.values(functionDefinition.parameters).filter(p => p.required).length;
  const optionalCount = Object.values(functionDefinition.parameters).filter(p => !p.required).length;
  
  return `
Function: ${functionDefinition.name}
Category: ${functionDefinition.category || 'uncategorized'}
Description: ${functionDefinition.description}
Parameters: ${requiredCount} required, ${optionalCount} optional
Return Type: ${functionDefinition.returns.type}
Examples: ${functionDefinition.examples?.length || 0} available
  `.trim();
}

/**
 * Validate function definition for completeness
 */
export function validateFunctionDefinition(functionDefinition: McpFunctionDefinition): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!functionDefinition.name || functionDefinition.name.trim() === '') {
    errors.push('Function name is required');
  }
  
  if (!functionDefinition.description || functionDefinition.description.trim() === '') {
    errors.push('Function description is required');
  }
  
  if (!functionDefinition.returns || !functionDefinition.returns.type || functionDefinition.returns.type.trim() === '') {
    errors.push('Return type is required');
  }
  
  if (!functionDefinition.parameters || typeof functionDefinition.parameters !== 'object') {
    errors.push('Parameters must be an object');
  } else {
    // Validate parameter definitions
    const params = Object.values(functionDefinition.parameters);
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      const paramErrors = validateParameterDefinition(param);
      if (paramErrors.length > 0) {
        errors.push(...paramErrors.map(err => `Parameter ${i}: ${err}`));
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate parameter definition
 */
function validateParameterDefinition(parameter: McpParameter): string[] {
  const errors: string[] = [];
  
  if (!parameter.type) {
    errors.push('Parameter type is required');
  }
  
  if (parameter.enum && !Array.isArray(parameter.enum)) {
    errors.push('Parameter enum must be an array');
  }
  
  if (parameter.items && typeof parameter.items !== 'object') {
    errors.push('Parameter items must be an object');
  }
  
  return errors;
}

/**
 * Generate a unique function call ID
 */
export function generateFunctionCallId(functionName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${functionName}_${timestamp}_${random}`;
}

/**
 * Calculate function execution metrics
 */
export function calculateExecutionMetrics(startTime: number, endTime: number, success: boolean) {
  const duration = endTime - startTime;
  
  return {
    duration,
    success,
    timestamp: new Date().toISOString(),
    performance: {
      fast: duration < 100,      // < 100ms
      normal: duration >= 100 && duration < 1000,  // 100ms - 1s
      slow: duration >= 1000 && duration < 5000, // 1s - 5s
      verySlow: duration >= 5000  // > 5s
    }
  };
}