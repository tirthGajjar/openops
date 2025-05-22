const createJiraIssueMock = jest.fn();
const sendJiraRequestMock = jest.fn();

jest.mock('../../src/lib/common', () => ({
  createJiraIssue: createJiraIssueMock,
  sendJiraRequest: sendJiraRequestMock,
}));

import { createIssue } from '../../src/lib/actions/create-issue';

describe('createIssue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const auth = {
    instanceUrl: 'some url',
    email: 'some email',
    apiToken: 'some api token',
  };

  test('should create action with correct properties', () => {
    expect(createIssue.props).toMatchObject({
      projectId: {
        required: true,
        type: 'DROPDOWN',
      },
      issueTypeId: {
        required: true,
        type: 'DROPDOWN',
      },
      summary: {
        required: true,
        type: 'SHORT_TEXT',
      },
      description: {
        required: false,
        type: 'LONG_TEXT',
      },
      assignee: {
        required: false,
        type: 'DROPDOWN',
      },
      priority: {
        required: false,
        type: 'DROPDOWN',
      },
      parentKey: {
        required: false,
        type: 'SHORT_TEXT',
      },
      labels: {
        required: false,
        type: 'MULTI_SELECT_DROPDOWN',
      },
      attachments: {
        required: false,
        type: 'FILE',
      },
    });
  });

  test('should create an issue', async () => {
    createJiraIssueMock.mockResolvedValue({
      id: 'some id',
      key: 'PROJ-123',
    });

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        issueId: 'some issueId',
        projectId: 2,
        assignee: 'some assignee',
        description: 'some description',
        issueTypeId: 'some issueTypeId',
        labels: 'some labels',
        parentKey: 'some parentKey',
        priority: 'some priority',
        summary: 'some summary',
      },
    };

    const result = await createIssue.run(context);

    expect(result).toEqual({
      id: 'some id',
      key: 'PROJ-123',
    });

    expect(createJiraIssueMock).toHaveBeenCalledTimes(1);
    expect(createJiraIssueMock).toHaveBeenCalledWith({
      assignee: 'some assignee',
      auth: {
        apiToken: 'some api token',
        email: 'some email',
        instanceUrl: 'some url',
      },
      description: 'some description',
      issueTypeId: 'some issueTypeId',
      labels: ['some labels'],
      parentKey: 'some parentKey',
      priority: 'some priority',
      projectId: 2,
      summary: 'some summary',
    });
    expect(sendJiraRequestMock).not.toHaveBeenCalled();
  });

  test('should create an issue with attachment', async () => {
    createJiraIssueMock.mockResolvedValue({
      id: 'some id',
      key: 'PROJ-123',
    });
    sendJiraRequestMock.mockResolvedValue({
      body: {
        id: 'attachment-id',
        filename: 'test.pdf',
      },
    });

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        issueId: 'some issueId',
        projectId: 2,
        assignee: 'some assignee',
        description: 'some description',
        issueTypeId: 'some issueTypeId',
        labels: 'some labels',
        parentKey: 'some parentKey',
        priority: 'some priority',
        summary: 'some summary',
        attachments: {
          base64: 'SGVsbG8gV29ybGQ=',
          filename: 'test.pdf',
        },
      },
    };

    const result = await createIssue.run(context);

    expect(result).toEqual({
      id: 'some id',
      key: 'PROJ-123',
    });

    expect(createJiraIssueMock).toHaveBeenCalledTimes(1);
    expect(createJiraIssueMock).toHaveBeenCalledWith({
      assignee: 'some assignee',
      auth: {
        apiToken: 'some api token',
        email: 'some email',
        instanceUrl: 'some url',
      },
      description: 'some description',
      issueTypeId: 'some issueTypeId',
      labels: ['some labels'],
      parentKey: 'some parentKey',
      priority: 'some priority',
      projectId: 2,
      summary: 'some summary',
    });

    expect(sendJiraRequestMock).toHaveBeenCalledTimes(1);
    expect(sendJiraRequestMock).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      url: 'issue/PROJ-123/attachments',
      auth: auth,
      headers: expect.objectContaining({
        'X-Atlassian-Token': 'no-check',
      }),
    }));
  });

  test.each([
    [undefined, undefined],
    [null, undefined],
    ['', undefined],
    ['label1', ['label1']],
    [['label1'], ['label1']],
    [
      ['label1', 'label2'],
      ['label1', 'label2'],
    ],
    [[], []],
  ])(
    'should create an issue when labels=%p',
    async (labelsInput, expectedLabels) => {
      createJiraIssueMock.mockResolvedValue({
        id: 'some id',
        key: 'PROJ-123',
      });

      const context = {
        ...jest.requireActual('@openops/blocks-framework'),
        auth: auth,
        propsValue: {
          issueId: 'some issueId',
          projectId: 2,
          assignee: 'some assignee',
          description: 'some description',
          issueTypeId: 'some issueTypeId',
          labels: labelsInput,
          parentKey: 'some parentKey',
          priority: 'some priority',
          summary: 'some summary',
        },
      };

      const result = await createIssue.run(context);

      expect(result).toEqual({
        id: 'some id',
        key: 'PROJ-123',
      });

      expect(createJiraIssueMock).toHaveBeenCalledTimes(1);
      expect(createJiraIssueMock).toHaveBeenCalledWith({
        assignee: 'some assignee',
        auth: {
          apiToken: 'some api token',
          email: 'some email',
          instanceUrl: 'some url',
        },
        description: 'some description',
        issueTypeId: 'some issueTypeId',
        labels: expectedLabels,
        parentKey: 'some parentKey',
        priority: 'some priority',
        projectId: 2,
        summary: 'some summary',
      });
    },
  );
});
