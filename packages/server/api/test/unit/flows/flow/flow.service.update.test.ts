import {
  ApplicationError,
  ErrorCode,
  FlowOperationType,
  validateWorkflowImport,
} from '@openops/shared';
import { distributedLock } from '@openops/server-shared';
import { update } from '../../../../src/app/flows/flow/flow.service';
import { flowVersionService } from '../../../../src/app/flows/flow-version/flow-version.service';
import { flowService } from '../../../../src/app/flows/flow/flow.service';
import { flowRepo } from '../../../../src/app/flows/flow/flow.repo';

jest.mock('@openops/shared', () => {
  const original = jest.requireActual('@openops/shared');
  return {
    ...original,
    validateWorkflowImport: jest.fn(),
  };
});

jest.mock('@openops/server-shared', () => {
  return {
    distributedLock: {
      acquireLock: jest.fn().mockResolvedValue({
        release: jest.fn().mockResolvedValue(true),
      }),
    },
  };
});

jest.mock('../../../../src/app/flows/flow-version/flow-version.service', () => {
  return {
    flowVersionService: {
      getFlowVersionOrThrow: jest.fn(),
      applyOperation: jest.fn(),
      createEmptyVersion: jest.fn(),
    },
  };
});

jest.mock('../../../../src/app/flows/flow/flow.service', () => {
  const actual = jest.requireActual('../../../../src/app/flows/flow/flow.service');
  return {
    ...actual,
    flowService: {
      updatedPublishedVersionId: jest.fn(),
      updateStatus: jest.fn(),
      getOnePopulatedOrThrow: jest.fn(),
    },
  };
});

jest.mock('../../../../src/app/flows/flow/flow.repo', () => {
  return {
    flowRepo: jest.fn().mockReturnValue({
      update: jest.fn(),
    }),
  };
});

jest.mock('../../../../src/app/flows/step-test-output/flow-step-test-output.service', () => {
  return {
    flowStepTestOutputService: {
      copyFromVersion: jest.fn(),
    },
  };
});

const mockValidateWorkflowImport = validateWorkflowImport as jest.Mock;
const mockGetFlowVersionOrThrow = flowVersionService.getFlowVersionOrThrow as jest.Mock;
const mockApplyOperation = flowVersionService.applyOperation as jest.Mock;
const mockGetOnePopulatedOrThrow = flowService.getOnePopulatedOrThrow as jest.Mock;

describe('update function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateWorkflowImport.mockReturnValue({ success: true });
    mockGetFlowVersionOrThrow.mockResolvedValue({
      id: 'version-id',
      flowId: 'flow-id',
      state: 'DRAFT',
    });
    mockApplyOperation.mockResolvedValue({
      id: 'version-id',
      flowId: 'flow-id',
    });
    mockGetOnePopulatedOrThrow.mockResolvedValue({
      id: 'flow-id',
      projectId: 'project-id',
      version: { id: 'version-id' },
    });
  });

  it('should validate workflow import when operation type is IMPORT_FLOW', async () => {
    const params = {
      id: 'flow-id',
      userId: 'user-id',
      projectId: 'project-id',
      operation: {
        type: FlowOperationType.IMPORT_FLOW,
        request: {
          displayName: 'Test Workflow',
          description: 'Test Description',
          trigger: {
            type: 'EMPTY',
            name: 'trigger',
            displayName: 'Test Trigger',
            valid: true,
            settings: {},
          },
        },
      },
    };

    await update(params);

    expect(mockValidateWorkflowImport).toHaveBeenCalledWith({
      displayName: 'Test Workflow',
      description: 'Test Description',
      template: {
        displayName: 'Test Workflow',
        trigger: params.operation.request.trigger,
        valid: true,
      },
    });
  });

  it('should throw VALIDATION error when import workflow validation fails', async () => {
    mockValidateWorkflowImport.mockReturnValue({
      success: false,
      errors: ['Invalid trigger structure', 'Missing required fields'],
    });

    const params = {
      id: 'flow-id',
      userId: 'user-id',
      projectId: 'project-id',
      operation: {
        type: FlowOperationType.IMPORT_FLOW,
        request: {
          displayName: 'Test Workflow',
          description: 'Test Description',
          trigger: {
            // Invalid trigger structure
            type: 'EMPTY',
          } as any,
        },
      },
    };

    await expect(update(params)).rejects.toThrow(ApplicationError);

    try {
      await update(params);
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
  });

  it('should not validate workflow import for non-IMPORT_FLOW operations', async () => {
    const params = {
      id: 'flow-id',
      userId: 'user-id',
      projectId: 'project-id',
      operation: {
        type: FlowOperationType.UPDATE_STEP,
        request: {
          stepId: 'step-id',
          settings: {},
        },
      },
    };

    await update(params);

    expect(mockValidateWorkflowImport).not.toHaveBeenCalled();
  });
});