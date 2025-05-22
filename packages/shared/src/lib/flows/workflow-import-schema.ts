import { Static, Type, TypeCompiler } from '@sinclair/typebox';
import { Action } from './actions/action';
import { Trigger } from './triggers/trigger';

/**
 * Schema for workflow import
 * 
 * This schema validates imported workflows against the recursive Action type
 * from action.ts, ensuring all possible block, code, loop, branch, and split
 * structures, and all branch operators are supported.
 */

/**
 * The template schema defines the main structure of a workflow
 * with a trigger that may have next actions
 */
export const WorkflowTemplateSchema = Type.Object({
  displayName: Type.String(),
  trigger: Trigger,
  valid: Type.Boolean(),
});

export type WorkflowTemplate = Static<typeof WorkflowTemplateSchema>;

/**
 * The workflow import schema validates the top-level workflow object
 */
export const WorkflowImportSchema = Type.Object({
  // Common workflow metadata
  name: Type.String(),
  description: Type.Optional(Type.String()),
  tags: Type.Optional(Type.Array(Type.String())),
  
  // Timestamps (as string for compatibility)
  created: Type.Optional(Type.String()),
  updated: Type.Optional(Type.String()),
  
  // Optional blocks array for workflow definitions
  blocks: Type.Optional(Type.Array(Type.Any())),
  
  // The template contains the trigger and actions
  template: WorkflowTemplateSchema,
});

export type WorkflowImport = Static<typeof WorkflowImportSchema>;

/**
 * Compiled validator for workflow imports
 * 
 * This uses TypeCompiler for runtime validation of imported workflows
 */
export const workflowImportValidator = TypeCompiler.Compile(WorkflowImportSchema);

/**
 * Validate a workflow import object
 * 
 * @param workflowImport The workflow import object to validate
 * @returns Validation result with boolean success flag and errors if any
 * 
 * @example
 * ```typescript
 * // Example usage for validating a workflow import
 * import { validateWorkflowImport } from '@openops/shared';
 * 
 * // In your API endpoint or service
 * try {
 *   const workflowData = req.body; // Or from any source
 *   const validationResult = validateWorkflowImport(workflowData);
 *   
 *   if (!validationResult.success) {
 *     return res.status(400).json({
 *       error: 'Invalid workflow structure',
 *       details: validationResult.errors
 *     });
 *   }
 *   
 *   // Process valid workflow data
 *   // ...
 * } catch (error) {
 *   // Handle unexpected errors
 * }
 * ```
 */
export function validateWorkflowImport(workflowImport: unknown): {
  success: boolean;
  errors?: string[];
} {
  try {
    const isValid = workflowImportValidator.Check(workflowImport);
    if (!isValid) {
      const errors = [...workflowImportValidator.Errors(workflowImport)].map(
        (error) => `${error.path}: ${error.message}`
      );
      return { success: false, errors };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      errors: [(error as Error).message ? (error as Error).message : 'Unknown validation error']
    };
  }
}