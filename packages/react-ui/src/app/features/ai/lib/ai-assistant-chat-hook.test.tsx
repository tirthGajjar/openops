import { useAppStore } from '@/app/store/app-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { aiAssistantChatApi } from './ai-assistant-chat-api';
import { useAiAssistantChat } from './ai-assistant-chat-hook';

// Mock the AI assistant chat API
jest.mock('./ai-assistant-chat-api', () => ({
  aiAssistantChatApi: {
    open: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock the authentication session
jest.mock('@/app/lib/authentication-session', () => ({
  authenticationSession: {
    getToken: jest.fn(() => 'mock-token'),
  },
}));

// Mock the AI SDK useChat hook
jest.mock('@ai-sdk/react', () => ({
  useChat: jest.fn(() => ({
    messages: [],
    input: '',
    handleInputChange: jest.fn(),
    handleSubmit: jest.fn(),
    status: 'idle',
    setMessages: jest.fn(),
  })),
}));

// Mock the UI components and toast notification
jest.mock('@openops/components/ui', () => ({
  toast: jest.fn(),
  AI_CHAT_CONTAINER_SIZES: {
    DOCKED: 'DOCKED',
    EXPANDED: 'EXPANDED',
  },
}));

// Mock i18next
jest.mock('i18next', () => ({
  t: jest.fn((key: string) => key),
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
  },
  writable: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const Wrapper = (props: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {props.children}
  </QueryClientProvider>
);

describe('useAiAssistantChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    // Reset the store to initial state
    useAppStore.setState({
      isAiChatOpened: false,
    });
  });

  it('should not call queryFn when AI chat is closed', async () => {
    const mockOpen = jest.mocked(aiAssistantChatApi.open);

    // Ensure AI chat is closed
    useAppStore.setState({ isAiChatOpened: false });

    renderHook(() => useAiAssistantChat(), { wrapper: Wrapper });

    // Wait a bit to ensure no async calls are made
    await waitFor(() => {
      expect(mockOpen).not.toHaveBeenCalled();
    });
  });

  it('should call queryFn when AI chat is opened', async () => {
    const mockOpen = jest.mocked(aiAssistantChatApi.open);
    const mockConversation = {
      chatId: 'test-chat-id',
      messages: [],
    };
    mockOpen.mockResolvedValue(mockConversation);

    // Ensure AI chat is opened
    useAppStore.setState({ isAiChatOpened: true });

    renderHook(() => useAiAssistantChat(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledTimes(1);
    });
  });

  it('should start calling queryFn when AI chat state changes from closed to opened', async () => {
    const mockOpen = jest.mocked(aiAssistantChatApi.open);
    const mockConversation = {
      chatId: 'test-chat-id',
      messages: [],
    };
    mockOpen.mockResolvedValue(mockConversation);

    // Start with AI chat closed
    useAppStore.setState({ isAiChatOpened: false });

    const { rerender } = renderHook(() => useAiAssistantChat(), {
      wrapper: Wrapper,
    });

    // Verify no calls when closed
    await waitFor(() => {
      expect(mockOpen).not.toHaveBeenCalled();
    });

    // Open the AI chat
    useAppStore.setState({ isAiChatOpened: true });
    rerender();

    // Verify API is called when opened
    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledTimes(1);
    });
  });
});
