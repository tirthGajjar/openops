import { createAction, Property } from '@openops/blocks-framework';
import { convertToStringArrayWithValidation } from '@openops/shared';
import validator, { isEmpty } from 'validator';
import FormData from 'form-data';
import { JiraAuth, jiraCloudAuth } from '../../auth';
import {
  createJiraIssue,
  getPriorities,
  JiraUser,
  searchUserByCriteria,
  sendJiraRequest,
} from '../common';
import {
  getIssueTypeIdDropdown,
  getLabelDropdown,
  getProjectIdDropdown,
  getUsersDropdown,
} from '../common/props';
import { HttpMethod } from '@openops/blocks-common';

export const createIssue = createAction({
  name: 'create_issue',
  displayName: 'Create Issue',
  description: 'Create a new issue in a project',
  auth: jiraCloudAuth,
  props: {
    projectId: getProjectIdDropdown(),
    issueTypeId: getIssueTypeIdDropdown({ refreshers: ['projectId'] }),
    summary: Property.ShortText({
      displayName: 'Summary',
      required: true,
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
      projectId,
      issueTypeId,
      summary,
      description,
      priority,
      parentKey,
      labels,
      attachments,
    } = propsValue;

    let assignee = propsValue.assignee;
    if (typeof assignee === 'string' && validator.isEmail(assignee)) {
      const resultUser: JiraUser[] = await searchUserByCriteria(auth, assignee);
      if (resultUser.length === 0) {
        throw new Error(
          `Could not find a user that matches the query ${assignee}`,
        );
      }
      assignee = resultUser[0].accountId;
    }

    const createdIssue = await createJiraIssue({
      auth,
      projectId: projectId as string,
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
        url: `issue/${createdIssue.key}/attachments`,
        auth,
        headers: {
          'X-Atlassian-Token': 'no-check',
          ...formData.getHeaders(),
        },
        body: formData,
      });
    }

    return createdIssue;
  },
});
