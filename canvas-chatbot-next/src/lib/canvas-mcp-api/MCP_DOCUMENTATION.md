# Canvas MCP Integration Documentation

## Overview

The Canvas MCP (Model Context Protocol) Integration provides a robust function calling system that enables AI systems to interact with Canvas LMS data through well-defined, secure, and monitored function calls. This system replaces the previous RAG-based approach with a more reliable and maintainable function calling architecture.

## Key Features

- **Secure Function Calling**: All functions require proper authentication and parameter validation
- **Comprehensive Error Handling**: Detailed error messages with appropriate HTTP status codes
- **Performance Monitoring**: Built-in metrics and execution tracking
- **Batch Execution**: Support for executing multiple functions concurrently
- **Caching**: Intelligent caching to improve performance
- **Extensible**: Easy to add new Canvas API functions
- **Type Safety**: Full TypeScript support with comprehensive type definitions

## Architecture

The system consists of several key components:

1. **MCP Types** (`mcp-types.ts`): Core type definitions for the function calling system
2. **MCP Registry** (`mcp-registry.ts`): Function registration and discovery
3. **MCP Executor** (`mcp-executor.ts`): Function execution with validation and error handling
4. **Canvas Functions** (`canvas-functions.ts`): Canvas API function implementations
5. **MCP Integration** (`mcp-integration.ts`): Main integration point

## Quick Start

### Basic Usage

```typescript
import { canvasMCP } from './mcp-integration';

// Initialize the integration
await canvasMCP.initialize();

// Execute a function
const result = await canvasMCP.executeFunction(
  'get_user',
  { id: '123' },
  { canvasToken: 'your-canvas-token' }
);

if (result.success) {
  console.log('User data:', result.data);
} else {
  console.error('Error:', result.error);
}
```

### Batch Execution

```typescript
// Execute multiple functions in batch
const results = await canvasMCP.executeFunctionsBatch([
  {
    name: 'get_user',
    parameters: { id: '123' },
    context: { canvasToken: 'your-token' }
  },
  {
    name: 'get_course',
    parameters: { id: '456' },
    context: { canvasToken: 'your-token' }
  },
  {
    name: 'get_course_assignments',
    parameters: { course_id: '456' },
    context: { canvasToken: 'your-token' }
  }
]);

results.forEach((result, index) => {
  if (result.success) {
    console.log(`Function ${index} succeeded:`, result.data);
  } else {
    console.error(`Function ${index} failed:`, result.error);
  }
});
```

## Available Functions

### Search Functions

#### `search_recipients`
Search for recipients (users or contexts) in Canvas.

**Parameters:**
- `search` (string, required): Search query string
- `context` (string, optional): Context for the search (e.g., course, group)
- `type` (string, optional): Type of recipients to search for ('user' or 'context')
- `limit` (number, optional): Maximum number of results (1-100, default: 20)
- `offset` (number, optional): Number of results to skip (default: 0)

**Example:**
```typescript
const result = await canvasMCP.executeFunction(
  'search_recipients',
  { 
    search: 'john doe', 
    type: 'user', 
    limit: 10 
  },
  { canvasToken: 'your-token' }
);
```

### User Functions

#### `get_user`
Get detailed information about a specific user.

**Parameters:**
- `id` (string, required): User ID or login ID
- `include` (array, optional): Additional fields to include

**Example:**
```typescript
const result = await canvasMCP.executeFunction(
  'get_user',
  { 
    id: '123',
    include: ['email', 'last_login', 'permissions']
  },
  { canvasToken: 'your-token' }
);
```

#### `get_user_page_views`
Get page view analytics for a specific user within a time range.

**Parameters:**
- `user_id` (string, required): User ID
- `start_time` (string, required): Start time in ISO 8601 format
- `end_time` (string, required): End time in ISO 8601 format
- `results_format` (string, optional): Format of results ('csv' or 'jsonl', default: 'jsonl')
- `include_context` (boolean, optional): Include context information (default: true)

**Example:**
```typescript
const result = await canvasMCP.executeFunction(
  'get_user_page_views',
  { 
    user_id: '123',
    start_time: '2024-01-01T00:00:00Z',
    end_time: '2024-01-07T23:59:59Z'
  },
  { canvasToken: 'your-token' }
);
```

### Course Functions

#### `get_course`
Get detailed information about a specific course.

**Parameters:**
- `id` (string, required): Course ID
- `include` (array, optional): Additional fields to include

**Example:**
```typescript
const result = await canvasMCP.executeFunction(
  'get_course',
  { id: '123' },
  { canvasToken: 'your-token' }
);
```

#### `get_course_assignments`
Get all assignments for a specific course.

**Parameters:**
- `course_id` (string, required): Course ID
- `include` (array, optional): Additional fields to include
- `per_page` (number, optional): Number of results per page (1-100)
- `page` (number, optional): Page number

**Example:**
```typescript
const result = await canvasMCP.executeFunction(
  'get_course_assignments',
  { 
    course_id: '123',
    per_page: 50,
    page: 1
  },
  { canvasToken: 'your-token' }
);
```

#### `get_course_discussions`
Get discussion topics for a course.

**Parameters:**
- `course_id` (string, required): Course ID
- `include` (array, optional): Additional fields to include
- `per_page` (number, optional): Number of results per page (1-100)
- `page` (number, optional): Page number

**Example:**
```typescript
const result = await canvasMCP.executeFunction(
  'get_course_discussions',
  { course_id: '123' },
  { canvasToken: 'your-token' }
);
```

#### `get_course_files`
Get files for a course.

**Parameters:**
- `course_id` (string, required): Course ID
- `include` (array, optional): Additional fields to include
- `per_page` (number, optional): Number of results per page (1-100)
- `page` (number, optional): Page number

**Example:**
```typescript
const result = await canvasMCP.executeFunction(
  'get_course_files',
  { course_id: '123' },
  { canvasToken: 'your-token' }
);
```

### Submission Functions

#### `get_submission`
Get submission details for a specific assignment and user.

**Parameters:**
- `course_id` (string, required): Course ID
- `assignment_id` (string, required): Assignment ID
- `user_id` (string, required): User ID
- `include` (array, optional): Additional fields to include

**Example:**
```typescript
const result = await canvasMCP.executeFunction(
  'get_submission',
  { 
    course_id: '123',
    assignment_id: '456',
    user_id: '789'
  },
  { canvasToken: 'your-token' }
);
```

#### `get_submissions`
Get all submissions for a specific assignment.

**Parameters:**
- `course_id` (string, required): Course ID
- `assignment_id` (string, required): Assignment ID
- `include` (array, optional): Additional fields to include
- `per_page` (number, optional): Number of results per page (1-100)
- `page` (number, optional): Page number

**Example:**
```typescript
const result = await canvasMCP.executeFunction(
  'get_submissions',
  { 
    course_id: '123',
    assignment_id: '456'
  },
  { canvasToken: 'your-token' }
);
```

### Content Functions

#### `export_course_content`
Export course content in various formats.

**Parameters:**
- `course_id` (string, required): Course ID
- `export_type` (string, required): Type of export ('common_cartridge', 'qti', or 'zip')
- `select` (object, optional): Specific content to export
- `include_metadata` (boolean, optional): Include metadata in export (default: true)

**Example:**
```typescript
const result = await canvasMCP.executeFunction(
  'export_course_content',
  { 
    course_id: '123',
    export_type: 'common_cartridge'
  },
  { canvasToken: 'your-token' }
);
```

### Analytics Functions

#### `get_account_analytics`
Get analytics data for an account.

**Parameters:**
- `account_id` (string, required): Account ID
- `type` (string, required): Type of analytics ('account' or 'course')
- `start_date` (string, optional): Start date in ISO 8601 format
- `end_date` (string, optional): End date in ISO 8601 format

**Example:**
```typescript
const result = await canvasMCP.executeFunction(
  'get_account_analytics',
  { 
    account_id: '1',
    type: 'account'
  },
  { canvasToken: 'your-token' }
);
```

### Assessment Functions

#### `get_rubric`
Get rubric details for a course.

**Parameters:**
- `course_id` (string, required): Course ID
- `rubric_id` (string, required): Rubric ID
- `include` (array, optional): Additional fields to include

**Example:**
```typescript
const result = await canvasMCP.executeFunction(
  'get_rubric',
  { 
    course_id: '123',
    rubric_id: '456'
  },
  { canvasToken: 'your-token' }
);
```

## Error Handling

The system provides comprehensive error handling with detailed error messages:

```typescript
try {
  const result = await canvasMCP.executeFunction(
    'get_user',
    { id: 'invalid-id' },
    { canvasToken: 'invalid-token' }
  );
} catch (error) {
  if (error.code === 'AUTH_REQUIRED') {
    console.error('Authentication required:', error.message);
  } else if (error.code === 'CANVAS_API_ERROR') {
    console.error('Canvas API error:', error.message);
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## Function Discovery

Discover available functions dynamically:

```typescript
// Get all available functions
const allFunctions = await canvasMCP.discoverFunctions();

// Get functions by category
const userFunctions = await canvasMCP.discoverFunctions({ category: 'users' });

// Search functions
const searchFunctions = await canvasMCP.discoverFunctions({ search: 'course' });

// Get specific function details
const functionDef = await canvasMCP.getFunctionDefinition('get_user');
```

## Performance Monitoring

Get execution statistics:

```typescript
const stats = await canvasMCP.getFunctionStats();
console.log('Total functions:', stats.totalFunctions);
console.log('Categories:', stats.categories);
console.log('Execution stats:', stats.executionStats);
```

## Advanced Configuration

### Custom Configuration

```typescript
const customMCP = new CanvasMCPIntegration({
  enableLogging: true,
  maxConcurrentExecutions: 20,
  defaultTimeout: 60000, // 60 seconds
  enableCaching: true,
  cacheTtl: 600 // 10 minutes
});

await customMCP.initialize();
```

### Custom Functions

Register custom functions:

```typescript
const customFunction: McpFunctionDefinition = {
  name: 'custom_analytics',
  description: 'Custom analytics function',
  category: 'analytics',
  parameters: [
    {
      name: 'course_id',
      type: 'string',
      required: true,
      description: 'Course ID'
    }
  ],
  returnType: 'object',
  implementation: async (params, context) => {
    // Custom implementation
    return {
      success: true,
      data: { custom: 'data' },
      metadata: { timestamp: new Date().toISOString() }
    };
  }
};

await canvasMCP.registerFunction(customFunction);
```

## Best Practices

### 1. Authentication
Always provide valid Canvas API tokens in the context:

```typescript
const context = { 
  canvasToken: process.env.CANVAS_API_TOKEN,
  // Additional context data
};
```

### 2. Error Handling
Always handle errors appropriately:

```typescript
try {
  const result = await canvasMCP.executeFunction('get_user', params, context);
  if (result.success) {
    // Handle success
  } else {
    // Handle function execution failure
    console.error('Function failed:', result.error);
  }
} catch (error) {
  // Handle system-level errors
  console.error('System error:', error.message);
}
```

### 3. Batch Operations
Use batch execution for multiple related operations:

```typescript
const results = await canvasMCP.executeFunctionsBatch([
  { name: 'get_user', parameters: { id: '123' }, context },
  { name: 'get_course', parameters: { id: '456' }, context },
  { name: 'get_course_assignments', parameters: { course_id: '456' }, context }
]);
```

### 4. Caching
Enable caching for frequently accessed data:

```typescript
const mcp = new CanvasMCPIntegration({
  enableCaching: true,
  cacheTtl: 300 // 5 minutes
});
```

### 5. Logging
Enable logging for debugging and monitoring:

```typescript
const mcp = new CanvasMCPIntegration({
  enableLogging: true
});
```

## Integration with AI Systems

The Canvas MCP Integration is designed to work seamlessly with AI systems:

```typescript
// AI system integration example
class AISystem {
  private canvasMCP: CanvasMCPIntegration;

  constructor() {
    this.canvasMCP = new CanvasMCPIntegration();
  }

  async initialize() {
    await this.canvasMCP.initialize();
  }

  async processUserQuery(query: string, userContext: any) {
    // Parse query to determine required functions
    const requiredFunctions = this.parseQueryForFunctions(query);
    
    // Execute required functions
    const results = await this.canvasMCP.executeFunctionsBatch(
      requiredFunctions.map(func => ({
        name: func.name,
        parameters: func.parameters,
        context: userContext
      }))
    );

    // Process results and generate AI response
    return this.generateAIResponse(results, query);
  }
}
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure valid Canvas API token is provided
   - Check token permissions and expiration

2. **Function Not Found**
   - Verify function name is correct
   - Check if integration is initialized

3. **Parameter Validation Errors**
   - Ensure all required parameters are provided
   - Check parameter types and formats

4. **Rate Limiting**
   - Implement appropriate rate limiting
   - Use batch operations when possible

5. **Performance Issues**
   - Enable caching for frequently accessed data
   - Use appropriate timeout settings
   - Monitor execution statistics

### Debug Mode

Enable debug logging:

```typescript
const mcp = new CanvasMCPIntegration({
  enableLogging: true
});

// Set logger level
logger.level = 'debug';
```

## Migration from RAG

If you're migrating from the previous RAG-based system:

1. **Replace Vector Search**: Use `search_recipients` function instead of vector similarity search
2. **Update Data Access**: Use specific functions instead of semantic retrieval
3. **Modify AI Prompts**: Update prompts to use function calling syntax
4. **Test Thoroughly**: Validate all migrated functionality

## Support

For issues and questions:
- Check the error logs for detailed information
- Review function documentation and examples
- Ensure proper authentication and permissions
- Verify Canvas API compatibility

## License

This integration is part of the Canvas Chatbot project and follows the same licensing terms.