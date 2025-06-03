import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '@openops/components/ui';
import { t } from 'i18next';
import React, { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { ActionType, TriggerType } from '@openops/shared';

import { JsonEditor } from '@/app/common/components/json-editor';
import { JsonViewer } from '../../../common/components/json-viewer';
import { QueryKeys } from '@/app/constants/query-keys';
import { flowsApi } from '../../flows/lib/flows-api';
import { useStepSettingsContext } from '../step-settings/step-settings-context';
import { TestActionSection } from './test-action-section';
import { TestTriggerSection } from './test-trigger-section';

type TestStepContainerProps = {
  flowVersionId: string;
  isSaving: boolean;
  flowId: string;
  type: ActionType | TriggerType;
};

enum TabListEnum {
  STEP_OUTPUT = 'STEP_OUTPUT',
  SAMPLE_STEP_OUTPUT = 'SAMPLE_STEP_OUTPUT',
}

const TestStepContainer = React.memo(
  ({ flowVersionId, isSaving, type, flowId }: TestStepContainerProps) => {
    const { toast } = useToast();
    const { selectedStep } = useStepSettingsContext();
    const queryClient = useQueryClient();

    const updateTestData = useCallback(
      async (json: any) => {
        try {
          if (!selectedStep.id) {
            toast({
              title: t('Error'),
              description: t('Step ID is missing'),
              variant: 'destructive',
            });
            return;
          }

          await flowsApi.saveStepTestOutput(flowVersionId, selectedStep.id, json);

          // Invalidate the previous query to refresh the data
          queryClient.invalidateQueries({
            queryKey: [QueryKeys.stepTestOutput, flowVersionId, selectedStep.id],
          });

          toast({
            title: t('Success'),
            description: t('Test output saved successfully'),
          });
        } catch (error) {
          console.error('Error saving test output:', error);
          toast({
            title: t('Error'),
            description: t('Failed to save test output'),
            variant: 'destructive',
          });
        }
      },
      [flowVersionId, selectedStep.id, toast, queryClient]
    );

    return (
      <div className="flex flex-col gap-4 px-4 py-1">
        <Tabs defaultValue={TabListEnum.STEP_OUTPUT}>
          <TabsList className="w-fit flex items-start gap-0 mb-5 bg-transparent border-none rounded-none">
            <TabsTrigger
              value={TabListEnum.STEP_OUTPUT}
              className="font-bold text-primary-300 text-base pl-0 pr-2 dark:text-white rounded-none  border-b-2 data-[state=active]:bg-background data-[state=active]:text-primary-300 data-[state=active]:dark:text-white data-[state=active]:shadow-none data-[state=active]:border-blueAccent-300"
            >
              {t('Step output')}
            </TabsTrigger>
            <TabsTrigger
              value={TabListEnum.SAMPLE_STEP_OUTPUT}
              className="font-bold text-primary-300 text-base pr-0 pl-2 dark:text-white rounded-none  border-b-2 data-[state=active]:bg-background data-[state=active]:text-primary-300 data-[state=active]:dark:text-white data-[state=active]:shadow-none data-[state=active]:border-blueAccent-300"
            >
              {t('Sample output data')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value={TabListEnum.STEP_OUTPUT}>
            {type === TriggerType.BLOCK ? (
              <TestTriggerSection
                flowId={flowId}
                isSaving={isSaving}
                flowVersionId={flowVersionId}
              ></TestTriggerSection>
            ) : (
              <TestActionSection
                flowVersionId={flowVersionId}
                isSaving={isSaving}
              ></TestActionSection>
            )}
          </TabsContent>
          <TabsContent value={TabListEnum.SAMPLE_STEP_OUTPUT}>
            <JsonEditor title={t('Output')} onChange={updateTestData} />
          </TabsContent>
        </Tabs>
      </div>
    );
  },
);
TestStepContainer.displayName = 'TestStepContainer';

export { TestStepContainer };
