import { DiscoverPremiumTile } from '@/app/features/home/components/discover-premium-tile';
import {
  DismissiblePanel,
  FlowTemplateMetadataWithIntegrations,
  KnowledgeBaseCard,
  SampleTemplateCard,
} from '@openops/components/ui';
import { t } from 'i18next';
import { BookOpenText } from 'lucide-react';
import { useMemo } from 'react';

type HomeGetStartedProps = {
  sampleTemplates: FlowTemplateMetadataWithIntegrations[];
  onSampleTemplateClick: (
    template: FlowTemplateMetadataWithIntegrations,
  ) => void;
  close: () => void;
};

const HomeGetStarted = ({
  sampleTemplates,
  onSampleTemplateClick,
  close,
}: HomeGetStartedProps) => {
  const displayedTemplates = useMemo(
    () => sampleTemplates.slice(0, 3),
    [sampleTemplates],
  );

  return (
    <DismissiblePanel
      className="min-h-fit h-fit"
      closeTooltip={t('Close')}
      onClose={close}
      buttonClassName="size-6 top-[26px]"
    >
      <div className="p-6 flex flex-col gap-4 bg-secondary font-bold">
        <h2 className="text-[24px]">{t('Get started')}</h2>
        <div className="flex items-start justify-between gap-4 flex-wrap @[1160px]:flex-nowrap">
          <div className="w-full @[1160px]:w-[50%] flex flex-col gap-2">
            <h3>{t('Start with our Sample template')}</h3>
            <div className="flex gap-2">
              {displayedTemplates.map((template, index) => (
                <SampleTemplateCard
                  key={template.id}
                  templateMetadata={template}
                  onClick={() => onSampleTemplateClick(template)}
                />
              ))}
            </div>
          </div>
          <div className="w-full flex flex-col gap-2">
            <h3>{t('Quick links')}</h3>
            <div className="w-full grid grid-cols-2 gap-2 @[900px]:grid-cols-4 font-normal">
              <KnowledgeBaseCard
                link="https://openops.com/docs/introduction/overview"
                text={t('What is OpenOps?')}
                icon={<BookOpenText size={15} />}
                iconWrapperClassName="bg-warning"
                className="max"
              />
              <KnowledgeBaseCard
                link="https://openops.com/docs/introduction/features-and-benefits"
                text={t('Features and benefits')}
                icon={<BookOpenText size={15} />}
                iconWrapperClassName="bg-blue-500"
              />
              <KnowledgeBaseCard
                link="https://openops.com/docs/getting-started/quick-start-guide"
                text={t('Quick start guide')}
                icon={<BookOpenText size={15} />}
                iconWrapperClassName="bg-warning-200"
              />
              <KnowledgeBaseCard
                link="https://slack.openops.com/"
                text={t('Community')}
                icon={<BookOpenText size={15} />}
                iconWrapperClassName="bg-teal-400"
              />
            </div>

            <DiscoverPremiumTile />
          </div>
        </div>
      </div>
    </DismissiblePanel>
  );
};

HomeGetStarted.displayName = 'HomeGetStarted';
export { HomeGetStarted };
