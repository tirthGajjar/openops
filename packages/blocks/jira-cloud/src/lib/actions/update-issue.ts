import { HttpMethod } from '@openops/blocks-common';
import { Property, createAction } from '@openops/blocks-framework';
import { convertToStringArrayWithValidation } from '@openops/shared';
import FormData from 'form-data';
import { JiraAuth, jiraCloudAuth } from '../../auth';
import { getPriorities, sendJiraRequest, updateJiraIssue } from '../common';
import {
  getIssueIdDropdown,
  getIssueTypeIdDropdown,
  getLabelDropdown,
  getProjectIdDropdown,
  getUsersDropdown,
} from '../common/props';

export const updateIssueAction = createAction({
  name: 'update_issue',
  displayName: 'Update Issue',
  description: 'Updates a existing issue in a project.',
  auth: jiraCloudAuth,
  props: {
    projectId: getProjectIdDropdown(),
    issueId: getIssueIdDropdown({ refreshers: ['projectId'] }),
    issueTypeId: getIssueTypeIdDropdown({
      refreshers: ['projectId'],
      required: false,
    }),
    summary: Property.ShortText({
      displayName: 'Summary',
      required: false,
    }),
    description: Property.LongText({
      displayName: 'Description',
      required: false,
    }),
    assignee: getUsersDropdown({
      displayName: 'Assignee',
      refreshers: ['projectId'],
      required: false,
    }),
    priority: Property.Dropdown({
      displayName: 'Priority',
      required: false,
      refreshers: ['auth'],
      options: async ({ auth }) => {
        if (!auth) {
          return {
            options: [],
          };
        }

        const priorities = await getPriorities({ auth: auth as JiraAuth });
        return {
          options: priorities.map((item) => {
            return {
              label: item.name,
              value: item.id,
            };
          }),
        };
      },
    }),
    parentKey: Property.ShortText({
      displayName: 'Parent Key',
      description:
        'If you would like to attach the issue to a parent, insert the parent issue key',
      required: false,
    }),
    labels: getLabelDropdown(),
    attachments: Property.File({
      displayName: 'Attachments',
      description: 'File to attach to the issue',
      required: false,
    }),
  },
  run: async ({ auth, propsValue }) => {
    const {
      issueId,
      issueTypeId,
      assignee,
      summary,
      description,
      priority,
      parentKey,
      labels,
      attachments,
    } = propsValue;

    const updatedIssue = await updateJiraIssue({
      auth,
      issueId,
      summary,
      issueTypeId,
      assignee,
      description,
      priority,
      parentKey,
      labels: !labels
        ? undefined
        : convertToStringArrayWithValidation(
            labels,
            'Labels must be a string or an array of strings',
          ),
    });

    // If attachments are provided, upload them to the issue
    if (attachments) {
      const formData = new FormData();
      const fileBuffer = Buffer.from(attachments.base64, 'base64');
      formData.append('file', fileBuffer, attachments.filename);

      await sendJiraRequest({
        method: HttpMethod.POST,
        url: `issue/${issueId}/attachments`,
        auth,
        headers: {
          'X-Atlassian-Token': 'no-check',
          ...formData.getHeaders(),
        },
        body: formData,
      });
    }

    return updatedIssue;
  },
});
