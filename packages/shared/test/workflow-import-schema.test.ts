import { validateWorkflowImport } from '../src/lib/flows/workflow-import-schema';
import { ActionType, BranchOperator } from '../src/lib/flows/actions/action';
import { TriggerType } from '../src/lib/flows/triggers/trigger';

describe('WorkflowImportSchema', () => {
  const sampleWorkflow = {
    "created": "1732291869757",
    "updated": "1732291869757",
    "name": "Untitled",
    "description": "",
    "tags": [],
    "blocks": [],
    "template": {
      "displayName": "Untitled",
      "trigger": {
        "name": "trigger",
        "valid": false,
        "displayName": "Select Trigger",
        "type": "EMPTY",
        "settings": {
          "inputUiInfo": {}
        },
        "nextAction": {
          "name": "step_1",
          "type": "LOOP_ON_ITEMS",
          "valid": true,
          "settings": {
            "items": "",
            "inputUiInfo": {}
          },
          "nextAction": {
            "name": "step_10",
            "type": "CODE",
            "valid": true,
            "settings": {
              "input": {},
              "sourceCode": {
                "code": "export const code = async (inputs) => {\n  return true;\n};",
                "packageJson": "{}"
              },
              "inputUiInfo": {},
              "errorHandlingOptions": {
                "retryOnFailure": {
                  "value": false
                },
                "continueOnFailure": {
                  "value": false
                }
              }
            },
            "displayName": "Top level block"
          },
          "displayName": "Loop on Items",
          "firstLoopAction": {
            "name": "step_2",
            "type": "SPLIT",
            "valid": true,
            "branches": [
              {
                "optionId": "k2ANjKWfIO8iWlZNbhBG3",
                "nextAction": {
                  "name": "step_3",
                  "type": "BRANCH",
                  "valid": false,
                  "settings": {
                    "conditions": [
                      [
                        {
                          "operator": "TEXT_CONTAINS",
                          "firstValue": "",
                          "secondValue": "",
                          "caseSensitive": false
                        }
                      ]
                    ],
                    "inputUiInfo": {}
                  },
                  "nextAction": {
                    "name": "step_9",
                    "type": "CODE",
                    "valid": true,
                    "settings": {
                      "input": {},
                      "sourceCode": {
                        "code": "export const code = async (inputs) => {\n  return true;\n};",
                        "packageJson": "{}"
                      },
                      "inputUiInfo": {},
                      "errorHandlingOptions": {
                        "retryOnFailure": {
                          "value": false
                        },
                        "continueOnFailure": {
                          "value": false
                        }
                      }
                    },
                    "displayName": "Block in split 1 branch"
                  },
                  "displayName": "Condition",
                  "onFailureAction": {
                    "name": "step_4",
                    "type": "CODE",
                    "valid": true,
                    "settings": {
                      "input": {},
                      "sourceCode": {
                        "code": "export const code = async (inputs) => {\n  return true;\n};",
                        "packageJson": "{}"
                      },
                      "inputUiInfo": {},
                      "errorHandlingOptions": {
                        "retryOnFailure": {
                          "value": false
                        },
                        "continueOnFailure": {
                          "value": false
                        }
                      }
                    },
                    "displayName": "Block in condition false branch"
                  },
                  "onSuccessAction": {
                    "name": "step_7",
                    "type": "CODE",
                    "valid": true,
                    "settings": {
                      "input": {},
                      "sourceCode": {
                        "code": "export const code = async (inputs) => {\n  return true;\n};",
                        "packageJson": "{}"
                      },
                      "inputUiInfo": {},
                      "errorHandlingOptions": {
                        "retryOnFailure": {
                          "value": false
                        },
                        "continueOnFailure": {
                          "value": false
                        }
                      }
                    },
                    "displayName": "Block in condition true branch"
                  }
                }
              },
              {
                "optionId": "yu7HnjQE6fRa6CSLb8cyu",
                "nextAction": {
                  "name": "step_5",
                  "type": "CODE",
                  "valid": true,
                  "settings": {
                    "input": {},
                    "sourceCode": {
                      "code": "export const code = async (inputs) => {\n  return true;\n};",
                      "packageJson": "{}"
                    },
                    "inputUiInfo": {},
                    "errorHandlingOptions": {
                      "retryOnFailure": {
                        "value": false
                      },
                      "continueOnFailure": {
                        "value": false
                      }
                    }
                  },
                  "displayName": "Block in split 2 branch"
                }
              },
              {
                "optionId": "_f0krl1xC-wCskp2AOk4n",
                "nextAction": {
                  "name": "step_6",
                  "type": "CODE",
                  "valid": true,
                  "settings": {
                    "input": {},
                    "sourceCode": {
                      "code": "export const code = async (inputs) => {\n  return true;\n};",
                      "packageJson": "{}"
                    },
                    "inputUiInfo": {},
                    "errorHandlingOptions": {
                      "retryOnFailure": {
                        "value": false
                      },
                      "continueOnFailure": {
                        "value": false
                      }
                    }
                  },
                  "displayName": "Block in split 3 branch"
                }
              }
            ],
            "settings": {
              "options": [
                {
                  "id": "k2ANjKWfIO8iWlZNbhBG3",
                  "name": "Branch 1",
                  "conditions": [[]]
                },
                {
                  "id": "yu7HnjQE6fRa6CSLb8cyu",
                  "name": "Branch 2",
                  "conditions": [
                    [
                      {
                        "operator": "TEXT_EXACTLY_MATCHES",
                        "firstValue": "",
                        "secondValue": "",
                        "caseSensitive": false
                      }
                    ]
                  ]
                },
                {
                  "id": "_f0krl1xC-wCskp2AOk4n",
                  "name": "Branch 3",
                  "conditions": [
                    [
                      {
                        "operator": "TEXT_EXACTLY_MATCHES",
                        "firstValue": "",
                        "secondValue": "",
                        "caseSensitive": false
                      }
                    ]
                  ]
                }
              ],
              "inputUiInfo": {},
              "defaultBranch": "k2ANjKWfIO8iWlZNbhBG3"
            },
            "nextAction": {
              "name": "step_8",
              "type": "CODE",
              "valid": true,
              "settings": {
                "input": {},
                "sourceCode": {
                  "code": "export const code = async (inputs) => {\n  return true;\n};",
                  "packageJson": "{}"
                },
                "inputUiInfo": {},
                "errorHandlingOptions": {
                  "retryOnFailure": {
                    "value": false
                  },
                  "continueOnFailure": {
                    "value": false
                  }
                }
              },
              "displayName": "Block in loop"
            },
            "displayName": "Split"
          }
        }
      },
      "valid": false
    }
  };
  
  test('should validate a valid workflow import with sample file', () => {
    const result = validateWorkflowImport(sampleWorkflow);
    expect(result.success).toBe(true);
  });
  
  test('validateWorkflowImport should return success for valid workflow', () => {
    const result = validateWorkflowImport(sampleWorkflow);
    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
  });
  
  test('validateWorkflowImport should return errors for invalid workflow', () => {
    const invalidWorkflow = { ...sampleWorkflow, template: {} };
    const result = validateWorkflowImport(invalidWorkflow);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  test('should validate a workflow with all action types', () => {
    const workflow = {
      ...sampleWorkflow,
      template: {
        ...sampleWorkflow.template,
        trigger: {
          name: 'test-trigger',
          displayName: 'Test Trigger',
          valid: true,
          type: TriggerType.EMPTY,
          settings: {},
          nextAction: {
            name: 'code-action',
            displayName: 'Code Action',
            type: ActionType.CODE,
            valid: true,
            settings: {
              sourceCode: {
                code: 'export const code = async () => { return true; }',
                packageJson: '{}'
              },
              input: {},
              inputUiInfo: {},
              errorHandlingOptions: {}
            },
            nextAction: {
              name: 'branch-action',
              displayName: 'Branch Action',
              type: ActionType.BRANCH,
              valid: true,
              settings: {
                conditions: [
                  [
                    {
                      operator: BranchOperator.TEXT_CONTAINS,
                      firstValue: 'test',
                      secondValue: 'value',
                      caseSensitive: false
                    }
                  ]
                ],
                inputUiInfo: {}
              }
            }
          }
        }
      }
    };

    const result = validateWorkflowImport(workflow);
    expect(result.success).toBe(true);
  });
});