import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '@openops/components/ui';
import { t } from 'i18next';
import React, { useCallback, useState } from 'react';

import { ActionType, TriggerType } from '@openops/shared';

import { JsonEditor } from '@/app/common/components/json-editor';
import { useStepSettingsContext } from '../step-settings/step-settings-context';
import { stepTestOutputHooks } from './step-test-output-hooks';
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
    const [tabValue, setTabValue] = useState<TabListEnum>(
      TabListEnum.STEP_OUTPUT,
    );
    const { toast } = useToast();
    const { selectedStep } = useStepSettingsContext();
    const { mutate } = stepTestOutputHooks.useSaveStepTestOutput();

    const updateTestData = useCallback(
      (json: any) => {
        if (!selectedStep.id) {
          toast({
            title: t('Error'),
            description: t('Step ID is missing'),
            variant: 'destructive',
          });
          return;
        }

        let newValue;

        try {
          newValue = JSON.parse(json);
        } catch {
          newValue = json;
        }

        mutate(
          {
            flowVersionId,
            stepId: selectedStep.id,
            output: newValue,
          },
          {
            onSuccess: () => {
              toast({
                title: t('Success'),
                description: t('Test output saved successfully'),
              });
              setTabValue(TabListEnum.STEP_OUTPUT);
            },
            onError: (error) => {
              console.error('Error saving test output:', error);
              toast({
                title: t('Error'),
                description: t('Failed to save test output'),
                variant: 'destructive',
              });
            },
          },
        );
      },
      [flowVersionId, selectedStep.id, toast, mutate],
    );

    return (
      <div className="flex flex-col gap-4 px-4 py-1">
        <Tabs value={tabValue} onValueChange={(v) => setTabValue(v)}>
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
