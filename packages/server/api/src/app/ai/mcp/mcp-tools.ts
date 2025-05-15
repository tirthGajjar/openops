import { ToolSet } from 'ai';
import { getDocsTools } from './docs-tools';
import { getSupersetTools } from './superset-tools';

let toolSet: ToolSet;
export const getMCPTools = async (): Promise<ToolSet> => {
  if (toolSet) {
    return toolSet;
  }

  toolSet = {
    ...(await getSupersetTools()),
    ...(await getDocsTools()),
  };

  return toolSet;
};
