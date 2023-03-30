import {
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum
} from 'openai';
import { api } from './api';
import { mergeDiffs } from '../../utils/mergeDiffs';
import { tokenCount } from '../../utils/tokenCount';
import {
  getAssistantPrompt,
  getSystemPrompt,
  getUserPrompt,
  GenerateCommitMessageErrorEnum,
  GenerateCommitMessageError
} from '../commons';

const INIT_MESSAGES_PROMPT: Array<ChatCompletionRequestMessage> = [
  {
    role: ChatCompletionRequestMessageRoleEnum.System,
    // prettier-ignore
    content: getSystemPrompt()
  },
  {
    role: ChatCompletionRequestMessageRoleEnum.User,
    content: getUserPrompt()
  },
  {
    role: ChatCompletionRequestMessageRoleEnum.Assistant,
    content: getAssistantPrompt()
  }
];

const generateCommitMessageChatCompletionPrompt = (
  diff: string
): Array<ChatCompletionRequestMessage> => {
  const chatContextAsCompletionRequest = [...INIT_MESSAGES_PROMPT];

  chatContextAsCompletionRequest.push({
    role: ChatCompletionRequestMessageRoleEnum.User,
    content: diff
  });

  return chatContextAsCompletionRequest;
};

const INIT_MESSAGES_PROMPT_LENGTH = INIT_MESSAGES_PROMPT.map(
  (msg) => tokenCount(msg.content) + 4
).reduce((a, b) => a + b, 0);

const MAX_REQ_TOKENS = 3900 - INIT_MESSAGES_PROMPT_LENGTH;

export const generateCommitMessageWithChatCompletion = async (
  diff: string
): Promise<string | GenerateCommitMessageError> => {
  try {
    if (tokenCount(diff) >= MAX_REQ_TOKENS) {
      const commitMessagePromises = getCommitMsgsPromisesFromFileDiffs(
        diff,
        MAX_REQ_TOKENS
      );

      const commitMessages = await Promise.all(commitMessagePromises);

      return commitMessages.join('\n\n');
    } else {
      const messages = generateCommitMessageChatCompletionPrompt(diff);

      const commitMessage = await api.generateCommitMessage(messages);

      if (!commitMessage)
        return { error: GenerateCommitMessageErrorEnum.emptyMessage };

      return commitMessage;
    }
  } catch (error) {
    return { error: GenerateCommitMessageErrorEnum.internalError };
  }
};

function getMessagesPromisesByChangesInFile(
  fileDiff: string,
  separator: string,
  maxChangeLength: number
) {
  const hunkHeaderSeparator = '@@ ';
  const [fileHeader, ...fileDiffByLines] = fileDiff.split(hunkHeaderSeparator);

  // merge multiple line-diffs into 1 to save tokens
  const mergedChanges = mergeDiffs(
    fileDiffByLines.map((line) => hunkHeaderSeparator + line),
    maxChangeLength
  );

  const lineDiffsWithHeader = mergedChanges.map(
    (change) => fileHeader + change
  );

  const commitMsgsFromFileLineDiffs = lineDiffsWithHeader.map((lineDiff) => {
    const messages = generateCommitMessageChatCompletionPrompt(
      separator + lineDiff
    );

    return api.generateCommitMessage(messages);
  });

  return commitMsgsFromFileLineDiffs;
}

export function getCommitMsgsPromisesFromFileDiffs(
  diff: string,
  maxDiffLength: number
) {
  const separator = 'diff --git ';

  const diffByFiles = diff.split(separator).slice(1);

  // merge multiple files-diffs into 1 prompt to save tokens
  const mergedFilesDiffs = mergeDiffs(diffByFiles, maxDiffLength);

  const commitMessagePromises = [];

  for (const fileDiff of mergedFilesDiffs) {
    if (tokenCount(fileDiff) >= maxDiffLength) {
      // if file-diff is bigger than gpt context — split fileDiff into lineDiff
      const messagesPromises = getMessagesPromisesByChangesInFile(
        fileDiff,
        separator,
        maxDiffLength
      );

      commitMessagePromises.push(...messagesPromises);
    } else {
      const messages = generateCommitMessageChatCompletionPrompt(
        separator + fileDiff
      );

      commitMessagePromises.push(api.generateCommitMessage(messages));
    }
  }
  return commitMessagePromises;
}
