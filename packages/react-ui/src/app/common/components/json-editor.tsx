import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@openops/components/ui';
import { t } from 'i18next';
import { Check } from 'lucide-react';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import TextareaAutosize from 'react-textarea-autosize';

type JsonEditorProps = {
  json?: any;
  title: string;
  onChange: (json: any) => void;
};

type JsonFormValues = {
  jsonContent: string;
};

const JsonEditor = React.memo(({ json, title, onChange }: JsonEditorProps) => {
  const validateJson = (
    value: string,
  ): { valid: boolean; message?: string } => {
    try {
      const parsed = JSON.parse(value);
      if (
        Array.isArray(parsed) ||
        (typeof parsed === 'object' && parsed !== null)
      ) {
        return { valid: true };
      } else {
        return {
          valid: false,
        };
      }
    } catch (e) {
      return { valid: false };
    }
  };

  const form = useForm<JsonFormValues>({
    defaultValues: {
      jsonContent: JSON.stringify(json, null, 2),
    },
    mode: 'onTouched',
  });

  useEffect(() => {
    form.reset({
      jsonContent: JSON.stringify(json, null, 2),
    });
  }, [json, form]);

  return (
    <div className="rounded-lg border border-solid border-dividers overflow-hidden">
      <div className="px-4 py-3 flex border-solid border-b border-dividers justfy-center items-center">
        <div className="flex-grow justify-center items-center">
          <span className="text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-0">
          <Button
            variant={'ghost'}
            size={'sm'}
            onClick={() => {
              onChange(form.getValues().jsonContent);
            }}
          >
            <Check className="w-4 h-4" />
            {t('Apply')}
          </Button>
        </div>
      </div>
      <Form {...form}>
        <form className="space-y-2 p-2">
          <FormField
            control={form.control}
            name="jsonContent"
            rules={{
              required: t('JSON content is required'),
              validate: {
                validJson: (value) => {
                  const result = validateJson(value);
                  return !result.valid && 'Invalid JSON format';
                },
              },
            }}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <TextareaAutosize
                    {...field}
                    minRows={3}
                    className="w-full h-full border-none resize-none dark:text-primary-700 text-base font-normal leading-normal outline-none dark:bg-accent"
                    placeholder={t('Paste sample data here')}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' && !ev.shiftKey) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        onChange(form.getValues().jsonContent);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
});

JsonEditor.displayName = 'JsonEditor';
export { JsonEditor };
