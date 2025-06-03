import {
  Button,
  clipboardUtils,
  COPY_PASTE_TOAST_DURATION,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  toast,
} from '@openops/components/ui';
import { t } from 'i18next';
import { Check, Copy, Download, Pencil, Trash } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import ReactJson from 'react-json-view';
import TextareaAutosize from 'react-textarea-autosize';

import { useTheme } from '@/app/common/providers/theme-provider';

type JsonEditorProps = {
  json?: any;
  title: string;
  onChange?: (json: any) => void;
};

type JsonFormValues = {
  jsonContent: string;
};

const JsonEditor = React.memo(({ json, title, onChange }: JsonEditorProps) => {
  const { theme } = useTheme();
  const [editableJson, setEditableJson] = useState(json);

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
    setEditableJson(json);
    form.reset({
      jsonContent: JSON.stringify(json, null, 2),
    });
  }, [json, form]);

  const showCopySuccessToast = () =>
    toast({
      title: t('Copied to clipboard'),
      duration: COPY_PASTE_TOAST_DURATION,
    });

  const showCopyFailureToast = () =>
    toast({
      title: t('Failed to copy to clipboard'),
      duration: COPY_PASTE_TOAST_DURATION,
    });

  const handleCopy = () => {
    const text = JSON.stringify(editableJson, null, 2);
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(showCopySuccessToast)
        .catch(showCopyFailureToast);
    } else {
      clipboardUtils.copyInInsecureContext({
        text,
        onSuccess: showCopySuccessToast,
        onError: showCopyFailureToast,
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(editableJson, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    handleDownloadFile(url);
  };

  const handleDownloadFile = (fileUrl: string, ext = '') => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = `${title}${ext}`;
    link.click();
    URL.revokeObjectURL(fileUrl);
  };

  const handleEdit = () => {
    form.reset({
      jsonContent: JSON.stringify(editableJson, null, 2),
    });
    // setIsEditMode(true);
  };

  const handleDelete = () => {
    const emptyJson = {};
    setEditableJson(emptyJson);
    form.reset({
      jsonContent: JSON.stringify(emptyJson, null, 2),
    });
    if (onChange) {
      onChange(emptyJson);
    }
  };

  return (
    <div className="rounded-lg border border-solid border-dividers overflow-hidden">
      <div className="px-4 py-3 flex border-solid border-b border-dividers justfy-center items-center">
        <div className="flex-grow justify-center items-center">
          <span className="text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-0">
          <Button variant={'ghost'} size={'sm'} onClick={handleDelete}>
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
                        onSubmit();
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
