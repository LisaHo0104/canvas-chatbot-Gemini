/**
 * Canvas MCP Integration Examples
 * 
 * This file provides comprehensive examples demonstrating how to use
 * the Canvas MCP (Model Context Protocol) Integration for AI data synthesis.
 */

import { 
  canvasMCP, 
  CanvasMCPIntegration,
  canvasFunctionsByCategory 
} from './mcp-integration';
import { McpFunctionDefinition } from './mcp-types';
import { logger } from './logger';

/**
 * Example 1: Basic Function Execution
 * Demonstrates how to execute a single Canvas function
 */
async function basicFunctionExecution() {
  console.log('=== Example 1: Basic Function Execution ===');
  
  try {
    // Initialize the integration
    await canvasMCP.initialize();
    
    // Set up authentication context
    const context = {
      canvasToken: process.env.CANVAS_API_TOKEN || 'demo-token'
    };
    
    // Execute a simple function
    const userResult = await canvasMCP.executeFunction(
      'get_user',
      { id: '123' },
      context
    );
    
    if (userResult.success) {
      console.log('User data retrieved successfully:');
      console.log(JSON.stringify(userResult.data, null, 2));
      console.log('Metadata:', userResult.metadata);
    } else {
      console.error('Function execution failed:', userResult.error);
    }
    
  } catch (error) {
    console.error('System error:', error.message);
  }
}

/**
 * Example 2: Batch Function Execution
 * Demonstrates how to execute multiple functions concurrently
 */
async function batchFunctionExecution() {
  console.log('\n=== Example 2: Batch Function Execution ===');
  
  try {
    const context = { canvasToken: process.env.CANVAS_API_TOKEN || 'demo-token' };
    
    // Define multiple function calls
    const functionCalls = [
      {
        name: 'get_user',
        parameters: { id: '123' },
        context
      },
      {
        name: 'get_course',
        parameters: { id: '456' },
        context
      },
      {
        name: 'get_course_assignments',
        parameters: { course_id: '456' },
        context
      }
    ];
    
    // Execute all functions in batch
    const results = await canvasMCP.executeFunctionsBatch(functionCalls);
    
    // Process results
    results.forEach((result, index) => {
      const call = functionCalls[index];
      console.log(`\nFunction: ${call.name}`);
      
      if (result.success) {
        console.log('✓ Success');
        console.log('Data preview:', JSON.stringify(result.data).substring(0, 100) + '...');
      } else {
        console.log('✗ Failed:', result.error?.message);
      }
    });
    
  } catch (error) {
    console.error('Batch execution error:', error.message);
  }
}

/**
 * Example 3: Function Discovery and Introspection
 * Demonstrates how to discover and inspect available functions
 */
async function functionDiscovery() {
  console.log('\n=== Example 3: Function Discovery ===');
  
  try {
    // Get all available functions
    const allFunctions = await canvasMCP.discoverFunctions();
    console.log(`Total available functions: ${allFunctions.length}`);
    
    // Get functions by category
    const categories = ['users', 'courses', 'submissions', 'analytics'];
    
    for (const category of categories) {
      const categoryFunctions = await canvasMCP.discoverFunctions({ category });
      console.log(`${category}: ${categoryFunctions.length} functions`);
      
      // Show first function in each category
      if (categoryFunctions.length > 0) {
        const func = categoryFunctions[0];
        console.log(`  - ${func.name}: ${func.description}`);
      }
    }
    
    // Get specific function details
    const getUserFunction = await canvasMCP.getFunctionDefinition('get_user');
    if (getUserFunction) {
      console.log('\nDetailed function info for get_user:');
      console.log('Description:', getUserFunction.description);
      console.log('Parameters:', Object.keys(getUserFunction.parameters).length);
      console.log('Return type:', getUserFunction.returns.type);
      console.log('Examples:', getUserFunction.examples?.length || 0);
    }
    
  } catch (error) {
    console.error('Discovery error:', error.message);
  }
}

/**
 * Example 4: Error Handling and Resilience
 * Demonstrates comprehensive error handling
 */
async function errorHandlingExample() {
  console.log('\n=== Example 4: Error Handling ===');
  
  const context = { canvasToken: process.env.CANVAS_API_TOKEN || 'demo-token' };
  
  // Example 1: Missing authentication
  try {
    await canvasMCP.executeFunction('get_user', { id: '123' }, {});
  } catch (error) {
    console.log('✓ Caught missing auth error:', error.message);
  }
  
  // Example 2: Invalid parameters
  try {
    await canvasMCP.executeFunction('get_user', {}, context);
  } catch (error) {
    console.log('✓ Caught invalid parameters error:', error.message);
  }
  
  // Example 3: Function not found
  try {
    await canvasMCP.executeFunction('nonexistent_function', {}, context);
  } catch (error) {
    console.log('✓ Caught function not found error:', error.message);
  }
  
  // Example 4: Graceful handling with fallback
  try {
    const result = await canvasMCP.executeFunction(
      'get_user',
      { id: 'invalid-user-id' },
      context
    );
    
    if (!result.success) {
      console.log('✓ Handled function execution failure:', result.error?.message);
      // Implement fallback logic here
      console.log('Fallback: Returning default user data');
    }
  } catch (error) {
    console.log('✓ Caught system error:', error.message);
  }
}

/**
 * Example 5: Performance Monitoring
 * Demonstrates performance monitoring and statistics
 */
async function performanceMonitoring() {
  console.log('\n=== Example 5: Performance Monitoring ===');
  
  try {
    const context = { canvasToken: process.env.CANVAS_API_TOKEN || 'demo-token' };
    
    // Execute several functions to generate statistics
    const operations = [
      () => canvasMCP.executeFunction('search_recipients', { search: 'student' }, context),
      () => canvasMCP.executeFunction('get_user', { id: '123' }, context),
      () => canvasMCP.executeFunction('get_course', { id: '456' }, context),
      () => canvasMCP.executeFunction('get_course_assignments', { course_id: '456' }, context)
    ];
    
    // Execute operations
    for (let i = 0; i < 3; i++) { // Run each operation 3 times
      for (const operation of operations) {
        try {
          await operation();
        } catch (error) {
          // Ignore individual operation errors for stats
        }
      }
    }
    
    // Get execution statistics
    const stats = await canvasMCP.getFunctionStats();
    console.log('Function Statistics:');
    console.log(`- Total functions: ${stats.totalFunctions}`);
    console.log(`- Categories: ${stats.categories.join(', ')}`);
    console.log(`- Total executions: ${stats.executionStats.totalExecutions}`);
    console.log(`- Successful: ${stats.executionStats.successfulExecutions}`);
    console.log(`- Failed: ${stats.executionStats.failedExecutions}`);
    console.log(`- Average execution time: ${stats.executionStats.averageExecutionTime.toFixed(2)}ms`);
    
  } catch (error) {
    console.error('Performance monitoring error:', error.message);
  }
}

/**
 * Example 6: AI Integration Pattern
 * Demonstrates how to integrate with an AI system
 */
async function aiIntegrationExample() {
  console.log('\n=== Example 6: AI Integration Pattern ===');
  
  // Simulate an AI system that needs Canvas data
  class AISystem {
    private canvasMCP: CanvasMCPIntegration;
    
    constructor() {
      this.canvasMCP = new CanvasMCPIntegration({
        enableLogging: true,
        enableCaching: true,
        cacheTtl: 300 // 5 minutes
      });
    }
    
    async initialize() {
      await this.canvasMCP.initialize();
    }
    
    /**
     * Process a natural language query and execute appropriate Canvas functions
     */
    async processQuery(query: string, context: any) {
      console.log(`Processing query: "${query}"`);
      
      // Simple query parsing (in real AI systems, this would be more sophisticated)
      const functions = this.parseQueryForFunctions(query);
      console.log(`Identified ${functions.length} functions to execute`);
      
      // Execute functions
      const results = await this.canvasMCP.executeFunctionsBatch(
        functions.map(func => ({
          name: func.name,
          parameters: func.parameters,
          context
        }))
      );
      
      // Process results and generate response
      return this.generateResponse(results, query);
    }
    
    private parseQueryForFunctions(query: string) {
      const functions = [];
      
      if (query.toLowerCase().includes('user') || query.toLowerCase().includes('student')) {
        functions.push({
          name: 'get_user',
          parameters: { id: '123' } // In real systems, extract from query
        });
      }
      
      if (query.toLowerCase().includes('course')) {
        functions.push({
          name: 'get_course',
          parameters: { id: '456' }
        });
      }
      
      if (query.toLowerCase().includes('assignment')) {
        functions.push({
          name: 'get_course_assignments',
          parameters: { course_id: '456' }
        });
      }
      
      return functions;
    }
    
    private generateResponse(results: any[], query: string) {
      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);
      
      let response = `Based on your query "${query}", I found:\n\n`;
      
      successfulResults.forEach(result => {
        response += `✓ ${result.metadata.function}: Successfully retrieved data\n`;
        if (result.data && typeof result.data === 'object') {
          const dataPreview = JSON.stringify(result.data).substring(0, 100);
          response += `  Data preview: ${dataPreview}...\n`;
        }
      });
      
      if (failedResults.length > 0) {
        response += `\n⚠️ ${failedResults.length} operations failed:\n`;
        failedResults.forEach(result => {
          response += `  - ${result.metadata?.function || 'Unknown'}: ${result.error?.message}\n`;
        });
      }
      
      return response;
    }
  }
  
  try {
    const aiSystem = new AISystem();
    await aiSystem.initialize();
    
    const context = { canvasToken: process.env.CANVAS_API_TOKEN || 'demo-token' };
    
    // Test different queries
    const queries = [
      "Show me information about user 123",
      "What courses are available?",
      "Get assignments for course 456"
    ];
    
    for (const query of queries) {
      const response = await aiSystem.processQuery(query, context);
      console.log(`\nQuery: "${query}"`);
      console.log('Response:', response);
    }
    
  } catch (error) {
    console.error('AI integration error:', error.message);
  }
}

/**
 * Example 7: Advanced Configuration and Customization
 * Demonstrates advanced configuration options
 */
async function advancedConfiguration() {
  console.log('\n=== Example 7: Advanced Configuration ===');
  
  // Create a custom-configured integration
  const customMCP = new CanvasMCPIntegration({
    enableLogging: true,
    maxConcurrentExecutions: 5, // Limit concurrent executions
    defaultTimeout: 10000, // 10 second timeout
    enableCaching: true,
    cacheTtl: 600 // 10 minute cache
  });
  
  try {
    await customMCP.initialize();
    
    const context = { canvasToken: process.env.CANVAS_API_TOKEN || 'demo-token' };
    
    // Test with timeout
    console.log('Testing with custom timeout...');
    const startTime = Date.now();
    
    try {
      await customMCP.executeFunction(
        'get_user',
        { id: '123' },
        context
      );
      
      const executionTime = Date.now() - startTime;
      console.log(`✓ Function executed in ${executionTime}ms`);
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.log(`✗ Function failed after ${executionTime}ms:`, error.message);
    }
    
    // Test caching
    console.log('\nTesting caching behavior...');
    const cacheStart = Date.now();
    
    // First call (should cache)
    await customMCP.executeFunction('get_user', { id: '123' }, context);
    const firstCallTime = Date.now() - cacheStart;
    
    // Second call (should use cache)
    const cacheStart2 = Date.now();
    await customMCP.executeFunction('get_user', { id: '123' }, context);
    const secondCallTime = Date.now() - cacheStart2;
    
    console.log(`First call: ${firstCallTime}ms`);
    console.log(`Second call (cached): ${secondCallTime}ms`);
    console.log(`Cache speedup: ${((firstCallTime - secondCallTime) / firstCallTime * 100).toFixed(1)}%`);
    
    // Clear cache
    customMCP.clearCache();
    console.log('✓ Cache cleared');
    
  } catch (error) {
    console.error('Advanced configuration error:', error.message);
  }
}

/**
 * Example 8: Custom Function Registration
 * Demonstrates how to register custom functions
 */
async function customFunctionRegistration() {
  console.log('\n=== Example 8: Custom Function Registration ===');
  
  try {
    // Create a new integration instance
    const customMCP = new CanvasMCPIntegration();
    await customMCP.initialize();
    
    // Define a custom function
    const customAnalyticsFunction: McpFunctionDefinition = {
      name: 'get_user_engagement_summary',
      description: 'Get a comprehensive engagement summary for a user',
      category: 'analytics',
      parameters: {
        user_id: {
          type: 'string',
          required: true,
          description: 'User ID to analyze'
        },
        time_period: {
          type: 'string',
          required: false,
          description: 'Time period for analysis',
          default: '30d',
          enum: ['7d', '30d', '90d', '1y']
        }
      },
      returns: {
        type: 'object',
        description: 'Engagement summary object'
      },
      examples: [
        {
          description: 'Get 30-day engagement summary',
          parameters: { user_id: '123' }
        },
        {
          description: 'Get 90-day engagement summary',
          parameters: { user_id: '123', time_period: '90d' }
        }
      ],
      implementation: async (params: any, context: any) => {
        // Custom implementation that combines multiple Canvas API calls
        const canvasToken = context.canvasToken || context.auth?.canvasToken;
        
        if (!canvasToken) {
          throw new Error('Canvas token required');
        }
        
        // Simulate analytics calculation
        const engagementScore = Math.floor(Math.random() * 100);
        const activityCount = Math.floor(Math.random() * 50);
        const lastActive = new Date().toISOString();
        
        return {
          success: true,
          data: {
            user_id: params.user_id,
            time_period: params.time_period,
            engagement_score: engagementScore,
            activity_count: activityCount,
            last_active: lastActive,
            summary: `User ${params.user_id} has ${engagementScore}% engagement with ${activityCount} activities in the last ${params.time_period}`
          },
          metadata: {
            duration: 0,
            timestamp: new Date().toISOString(),
            functionName: 'get_user_engagement_summary',
            callId: ''
          }
        };
      }
    };
    
    // Register the custom function
    await customMCP.registerFunction(customAnalyticsFunction);
    console.log('✓ Custom function registered');
    
    // Verify registration
    const registeredFunction = await customMCP.getFunctionDefinition('get_user_engagement_summary');
    if (registeredFunction) {
      console.log('✓ Function verified in registry');
      console.log('Function details:', {
        name: registeredFunction.name,
        category: registeredFunction.category,
        parameters: registeredFunction.parameters.length
      });
    }
    
    // Execute the custom function
    const context = { canvasToken: process.env.CANVAS_API_TOKEN || 'demo-token' };
    const result = await customMCP.executeFunction(
      'get_user_engagement_summary',
      { user_id: '123', time_period: '30d' },
      context
    );
    
    if (result.success) {
      console.log('✓ Custom function executed successfully');
      console.log('Result:', result.data);
    } else {
      console.log('✗ Custom function failed:', result.error);
    }
    
    // Get updated function statistics
    const stats = await customMCP.getFunctionStats();
    console.log(`Updated function count: ${stats.totalFunctions}`);
    
  } catch (error) {
    console.error('Custom function registration error:', error.message);
  }
}

/**
 * Main execution function
 * Runs all examples
 */
async function runAllExamples() {
  console.log('🚀 Canvas MCP Integration Examples\n');
  
  const examples = [
    basicFunctionExecution,
    batchFunctionExecution,
    functionDiscovery,
    errorHandlingExample,
    performanceMonitoring,
    aiIntegrationExample,
    advancedConfiguration,
    customFunctionRegistration
  ];
  
  for (const example of examples) {
    try {
      await example();
      console.log('\n' + '='.repeat(50));
    } catch (error) {
      console.error(`Example failed: ${error.message}`);
    }
  }
  
  console.log('\n✅ All examples completed!');
  
  // Cleanup
  try {
    await canvasMCP.shutdown();
    console.log('Integration shutdown successfully');
  } catch (error) {
    console.error('Shutdown error:', error.message);
  }
}

/**
 * Utility function to run a specific example
 */
async function runExample(exampleName: string) {
  const examples: Record<string, Function> = {
    basic: basicFunctionExecution,
    batch: batchFunctionExecution,
    discovery: functionDiscovery,
    error: errorHandlingExample,
    performance: performanceMonitoring,
    ai: aiIntegrationExample,
    config: advancedConfiguration,
    custom: customFunctionRegistration
  };
  
  const example = examples[exampleName];
  if (example) {
    console.log(`Running example: ${exampleName}`);
    await example();
  } else {
    console.log(`Unknown example: ${exampleName}`);
    console.log('Available examples:', Object.keys(examples).join(', '));
  }
}

// Export for use in other modules
export {
  runAllExamples,
  runExample,
  basicFunctionExecution,
  batchFunctionExecution,
  functionDiscovery,
  errorHandlingExample,
  performanceMonitoring,
  aiIntegrationExample,
  advancedConfiguration,
  customFunctionRegistration
};

// Run examples if this file is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    runAllExamples().catch(console.error);
  } else {
    runExample(args[0]).catch(console.error);
  }
}