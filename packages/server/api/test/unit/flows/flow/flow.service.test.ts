import {
  ApplicationError,
  ErrorCode,
  FlowOperationType,
  validateWorkflowImport,
} from '@openops/shared';
import { flowService } from '../../../../src/app/flows/flow/flow.service';

jest.mock('@openops/shared', () => {
  const original = jest.requireActual('@openops/shared');
  return {
    ...original,
    validateWorkflowImport: jest.fn(),
  };
});

jest.mock('../../../../src/app/flows/flow/flow.service', () => {
  const actual = jest.requireActual('../../../../src/app/flows/flow/flow.service');
  return {
    ...actual,
    flowService: {
      ...actual.flowService,
      create: jest.fn(),
      update: jest.fn(),
    },
  };
});

const mockCreate = flowService.create as jest.Mock;
const mockUpdate = flowService.update as jest.Mock;
const mockValidateWorkflowImport = validateWorkflowImport as jest.Mock;

describe('flowService', () => {
  describe('createFromTemplate', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      
      mockCreate.mockResolvedValue({
        id: 'flow-id',
        projectId: 'project-id',
      });
      
      mockUpdate.mockResolvedValue({
        id: 'flow-id',
        projectId: 'project-id',
        version: { id: 'version-id' },
      });

      mockValidateWorkflowImport.mockReturnValue({ success: true });
    });

    it('should validate the workflow import structure', async () => {
      const params = {
        projectId: 'project-id',
        userId: 'user-id',
        displayName: 'Test Workflow',
        description: 'Test Description',
        trigger: {
          type: 'EMPTY',
          name: 'trigger',
          displayName: 'Test Trigger',
          valid: true,
          settings: {},
        },
        templateId: 'template-id',
        connectionIds: [],
        isSample: false,
      };

      await flowService.createFromTemplate(params);

      expect(mockValidateWorkflowImport).toHaveBeenCalledWith({
        displayName: 'Test Workflow',
        description: 'Test Description',
        template: {
          displayName: 'Test Workflow',
          trigger: params.trigger,
          valid: true,
        },
      });
    });

    it('should proceed with flow creation when validation is successful', async () => {
      const params = {
        projectId: 'project-id',
        userId: 'user-id',
        displayName: 'Test Workflow',
        description: 'Test Description',
        trigger: {
          type: 'EMPTY',
          name: 'trigger',
          displayName: 'Test Trigger',
          valid: true,
          settings: {},
        },
        templateId: 'template-id',
        connectionIds: [],
        isSample: false,
      };

      await flowService.createFromTemplate(params);

      expect(mockCreate).toHaveBeenCalledWith({
        userId: 'user-id',
        projectId: 'project-id',
        request: {
          projectId: 'project-id',
          displayName: 'Test Workflow',
        },
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        id: 'flow-id',
        userId: 'user-id',
        projectId: 'project-id',
        operation: {
          type: FlowOperationType.IMPORT_FLOW,
          request: {
            displayName: 'Test Workflow',
            description: 'Test Description',
            trigger: params.trigger,
            connections: [],
          },
        },
      });
    });

    it('should throw VALIDATION error when validation fails', async () => {
      mockValidateWorkflowImport.mockReturnValue({
        success: false,
        errors: ['Invalid trigger structure', 'Missing required fields'],
      });

      const params = {
        projectId: 'project-id',
        userId: 'user-id',
        displayName: 'Test Workflow',
        description: 'Test Description',
        trigger: {
          // Invalid trigger missing required fields
          type: 'EMPTY',
        } as any,
        templateId: 'template-id',
        connectionIds: [],
        isSample: false,
      };

      await expect(flowService.createFromTemplate(params)).rejects.toThrow(
        ApplicationError
      );

      try {
        await flowService.createFromTemplate(params);
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(ErrorCode.VALIDATION);
        expect((error as ApplicationError).params.message).toContain(
          'Invalid workflow template structure'
        );
        expect((error as ApplicationError).params.message).toContain(
          'Invalid trigger structure, Missing required fields'
        );
      }

      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should include all validation errors in the error message', async () => {
      mockValidateWorkflowImport.mockReturnValue({
        success: false,
        errors: [
          '/template/trigger: Required',
          '/template/displayName: Expected string',
          '/template/valid: Expected boolean',
        ],
      });

      const params = {
        projectId: 'project-id',
        userId: 'user-id',
        displayName: 'Test Workflow',
        description: 'Test Description',
        trigger: {} as any,
        templateId: 'template-id',
        connectionIds: [],
        isSample: false,
      };

      try {
        await flowService.createFromTemplate(params);
        fail('Expected to throw an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(ErrorCode.VALIDATION);
        
        const errorMessage = (error as ApplicationError).params.message;
        expect(errorMessage).toContain('/template/trigger: Required');
        expect(errorMessage).toContain('/template/displayName: Expected string');
        expect(errorMessage).toContain('/template/valid: Expected boolean');
      }
    });

    it('should not validate if validateWorkflowImport throws an exception', async () => {
      mockValidateWorkflowImport.mockImplementation(() => {
        throw new Error('Unexpected validation error');
      });

      const params = {
        projectId: 'project-id',
        userId: 'user-id',
        displayName: 'Test Workflow',
        description: 'Test Description',
        trigger: {
          type: 'EMPTY',
          name: 'trigger',
          displayName: 'Test Trigger',
          valid: true,
          settings: {},
        },
        templateId: 'template-id',
        connectionIds: [],
        isSample: false,
      };

      try {
        await flowService.createFromTemplate(params);
        fail('Expected to throw an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(ErrorCode.VALIDATION);
        expect((error as ApplicationError).params.message).toContain(
          'Invalid workflow template structure'
        );
        expect((error as ApplicationError).params.message).toContain(
          'Unexpected validation error'
        );
      }

      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});