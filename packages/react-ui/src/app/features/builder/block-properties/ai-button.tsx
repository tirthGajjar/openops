import { Button, cn } from '@openops/components/ui';
import { t } from 'i18next';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

type AIButtonProps = {
  hasActiveAiSettings: boolean;
  isLoading: boolean;
  isAiChatVisible: boolean;
  onGenerateWithAIClick: () => void;
  className?: string;
  size?: number;
};

const AIButton = ({
  hasActiveAiSettings,
  isLoading,
  isAiChatVisible,
  onGenerateWithAIClick,
  className,
  size = 20,
}: AIButtonProps) => {
  return hasActiveAiSettings ? (
    <Button
      variant="link"
      className={cn(
        'h-5 pr-0 py-0 gap-[5px]',
        {
          'text-blueAccent-300': isAiChatVisible,
        },
        className,
      )}
      onClick={onGenerateWithAIClick}
      loading={isLoading}
    >
      <Sparkles size={size} />
      {t('Generate with AI')}
    </Button>
  ) : (
    <Link
      to="/settings/ai"
      className={cn(
        'flex items-center h-5 pr-0 py-0 text-blueAccent-300 gap-[5px] hover:underline',
        className,
      )}
    >
      <Sparkles size={size} />
      {t('Configure AI')}
    </Link>
  );
};

export { AIButton };
