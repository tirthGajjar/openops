import {
  ChannelOption,
  ChatOption,
  ChatTypes,
} from '../src/lib/common/chat-types';
import { onActionReceived } from '../src/lib/common/on-action-received';

const mockChannelOption: ChannelOption = {
  id: 'channel-id',
  teamId: 'team-id',
  type: ChatTypes.CHANNEL,
};

const mockChatOption: ChatOption = {
  id: 'chat-id',
  type: ChatTypes.CHAT,
};

const mockMessageObj = {
  id: 'message-id',
};

const mockActions = [
  {
    buttonText: 'Approve',
    buttonStyle: 'positive',
    resumeUrl: 'https://example.com/approve',
  },
  {
    buttonText: 'Reject',
    buttonStyle: 'destructive',
    resumeUrl: 'https://example.com/reject',
  },
];

const mockContext = {
  auth: { access_token: 'mock-token' },
  resumePayload: {
    queryParams: {
      button: 'Approve',
      path: 'execution-path-1',
    },
  },
  currentExecutionPath: 'execution-path-1',
  run: { pause: jest.fn() },
  store: {
    get: jest.fn(),
  },
};

describe('onActionReceived', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return expired response when no button is clicked', async () => {
    mockContext.resumePayload = { queryParams: { button: '', path: '' } };

    const result = await onActionReceived({
      chatOrChannel: mockChannelOption,
      messageObj: mockMessageObj,
      header: 'Header',
      message: 'Message body',
      actions: mockActions,
      context: mockContext,
    });

    expect(result).toEqual({
      action: '',
      isExpired: true,
      message: mockMessageObj,
    });
  });

  test('should throw error if pause metadata is unavailable', async () => {
    mockContext.resumePayload.queryParams = {
      button: 'RandomAction',
      path: 'random-path',
    };

    mockContext.store.get.mockResolvedValueOnce(null);

    await expect(
      onActionReceived({
        chatOrChannel: mockChatOption,
        messageObj: mockMessageObj,
        header: 'Header',
        message: 'Message body',
        actions: mockActions,
        context: mockContext,
      }),
    ).rejects.toThrow('Could not fetch pause metadata: execution-path-1');
  });

  test('should return action result when a valid button is clicked', async () => {
    mockContext.store.get.mockResolvedValueOnce({ pauseMetadata: 'mock-data' });
    mockContext.resumePayload = {
      queryParams: {
        button: 'Approve',
        path: 'execution-path-1',
      },
    };

    const result = await onActionReceived({
      chatOrChannel: mockChannelOption,
      messageObj: mockMessageObj,
      header: 'Header',
      message: 'Message body',
      actions: mockActions,
      context: mockContext,
    });

    expect(result).toEqual({
      action: 'Approve',
      message: mockMessageObj,
      isExpired: false,
    });
  });
});
