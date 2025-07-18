import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { useSocket } from '@/app/common/providers/socket-provider';
import { flowRunsApi } from '@/app/features/flow-runs/lib/flow-runs-api';
import { FlowRun, FlowVersion, WebsocketClientEvent } from '@openops/shared';

type UseRunProgressParams = {
  run: FlowRun | null;
  setRun: (run: FlowRun, flowVersion: FlowVersion) => void;
  flowVersion: FlowVersion | null;
};

export const useRunProgress = ({
  run,
  setRun,
  flowVersion,
}: UseRunProgressParams) => {
  const socket = useSocket();
  const abortControllerRef = useRef<AbortController | null>(null);

  const { mutate: fetchAndUpdateRun } = useMutation({
    mutationFn: async (runId: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        const result = await flowRunsApi.getPopulated(runId, {
          signal: abortControllerRef.current.signal,
        });

        return result;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return null;
        }
        throw error;
      }
    },
  });

  const handleRunProgress = useCallback(
    (runId: string) => {
      if (run && run?.id === runId) {
        fetchAndUpdateRun(runId, {
          onSuccess: (updatedRun) => {
            if (updatedRun && flowVersion) {
              setRun(updatedRun, flowVersion);
            }
          },
        });
      }
    },
    [run, fetchAndUpdateRun, setRun, flowVersion],
  );

  useEffect(() => {
    socket.on(WebsocketClientEvent.FLOW_RUN_PROGRESS, handleRunProgress);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      socket.removeAllListeners(WebsocketClientEvent.FLOW_RUN_PROGRESS);
      socket.removeAllListeners(WebsocketClientEvent.TEST_STEP_FINISHED);
      socket.removeAllListeners(WebsocketClientEvent.TEST_FLOW_RUN_STARTED);
    };
  }, [socket.id, run?.id, handleRunProgress, socket]);
};
