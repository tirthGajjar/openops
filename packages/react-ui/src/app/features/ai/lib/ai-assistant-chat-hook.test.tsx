import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { useAiAssistantChat } from './ai-assistant-chat-hook';

// Mock the dependencies
jest.mock('@/app/features/ai/lib/ai-assistant-chat-api', () => ({
  aiAssistantChatApi: {
    open: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/app/lib/authentication-session', () => ({
  authenticationSession: {
    getToken: jest.fn().mockReturnValue('mock-token'),
  },
}));

jest.mock('@ai-sdk/react', () => ({
  useChat: jest.fn().mockReturnValue({
    messages: [],
    input: '',
    handleInputChange: jest.fn(),
    handleSubmit: jest.fn(),
    status: 'awaiting_message',
    setMessages: jest.fn(),
  }),
}));

jest.mock('@openops/components/ui', () => ({
  toast: jest.fn(),
}));

jest.mock('i18next', () => ({
  t: jest.fn((key) => key),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAiAssistantChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('should initialize with default values', async () => {
    const { result } = renderHook(() => useAiAssistantChat(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
      expect(result.current.messages).toEqual([]);
      expect(result.current.input).toBe('');
      expect(result.current.status).toBe('awaiting_message');
      expect(typeof result.current.handleInputChange).toBe('function');
      expect(typeof result.current.handleSubmit).toBe('function');
      expect(typeof result.current.createNewChat).toBe('function');
    });
  });

  it('should have createNewChat function available', async () => {
    const { result } = renderHook(() => useAiAssistantChat(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.createNewChat).toBeDefined();
      expect(typeof result.current.createNewChat).toBe('function');
    });
  });
});
