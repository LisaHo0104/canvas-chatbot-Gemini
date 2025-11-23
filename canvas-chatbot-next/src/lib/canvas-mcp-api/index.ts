/**
 * Canvas MCP Integration - Main Export File
 * 
 * This file serves as the main entry point for the Canvas MCP Integration,
 * providing a clean and organized interface for all MCP functionality.
 */

// Core MCP Components
export {
  CanvasMCPIntegration,
  CanvasMCPConfig
} from './mcp-integration';

// Function Types and Interfaces
export {
  McpParameter,
  McpFunctionDefinition,
  McpFunctionExample,
  McpFunctionCall,
  McpCallContext,
  McpFunctionResult,
  McpFunctionError,
  McpExecutionOptions,
  McpFunctionRegistry,
  McpFunctionExecutor,
  McpFunctionMiddleware,
  McpFunctionMonitor,
  McpFunctionMetrics,
  McpHealthStatus,
  CanvasFunctionDefinitions,
  CanvasUser,
  CanvasCourse,
  CanvasAssignment,
  CanvasSubmission,
  CanvasSearchResult,
  CanvasPageView,
  CanvasContentExport,
  CanvasAnalytics,
  CanvasRubric,
  CanvasDiscussion,
  CanvasFile
} from './mcp-types';

// Canvas Functions
export {
  canvasFunctions
} from './canvas-functions';

// Registry and Executor
export {
  McpFunctionRegistryImpl
} from './mcp-registry';

// Utility Functions and Helpers
export {
  validateFunctionParameters,
  sanitizeParameterValue,
  isValidParameterType,
  extractRequiredParameters,
  formatFunctionExamples
} from './mcp-utils';

// Error Classes
export {
  CanvasAPIError,
  AuthenticationError,
  ValidationError,
  RateLimitError
} from './errors';

// Logger
export { logger } from './logger';

// Version Information
export const CANVAS_MCP_VERSION = '1.0.0';
export const CANVAS_MCP_BUILD_DATE = new Date().toISOString();

// Integration Metadata
export const CANVAS_MCP_METADATA = {
  name: 'Canvas MCP Integration',
  version: CANVAS_MCP_VERSION,
  description: 'Model Context Protocol integration for Canvas LMS API',
  author: 'Canvas Chatbot Team',
  license: 'MIT',
  repository: 'https://github.com/canvas-chatbot/canvas-mcp-integration',
  features: [
    'Function calling with secure parameter validation',
    'Comprehensive error handling and retry logic',
    'Performance monitoring and execution statistics',
    'Batch function execution support',
    'Intelligent caching system',
    'Extensible function registration',
    'TypeScript support with full type safety',
    'Comprehensive logging and debugging',
    'Canvas API integration with authentication',
    'AI synthesis pipeline integration'
  ],
  supportedCanvasEndpoints: [
    'Users API',
    'Courses API',
    'Assignments API',
    'Submissions API',
    'Search API',
    'Analytics API',
    'Content Exports API',
    'Rubrics API',
    'Discussions API',
    'Files API'
  ],
  functionCategories: [
    'search',
    'users',
    'courses',
    'submissions',
    'content',
    'analytics',
    'assessment'
  ]
};

// Convenience function for quick setup
export async function createCanvasMCPIntegration(config?: any) {
  const integration = new CanvasMCPIntegration(config);
  await integration.initialize();
  return integration;
}

// Default export for easy importing
export default {
  CanvasMCPIntegration,
  canvasFunctions,
  CANVAS_MCP_VERSION,
  CANVAS_MCP_METADATA,
  createCanvasMCPIntegration
};
import { CanvasMCPIntegration } from './mcp-integration';
import { canvasFunctions } from './canvas-functions';