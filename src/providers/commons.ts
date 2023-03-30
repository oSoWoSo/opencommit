import { getConfig } from '../commands/config';
import { i18n, I18nLocals } from '../i18n';

export function getSystemPrompt(): string {
  const config = getConfig();
  const translation = i18n[(config?.language as I18nLocals) || 'en'];

  return `You are to act as the author of a commit message in git. Your mission is to create clean and comprehensive commit messages in the conventional commit convention and explain why a change was done. I'll send you an output of 'git diff --staged' command, and you convert it into a commit message.
${
  config?.emoji
    ? 'Use GitMoji convention to preface the commit.'
    : 'Do not preface the commit with anything.'
}
${
  config?.description
    ? 'Add a short description of WHY the changes are done after the commit message. Don\'t start it with "This commit", just describe the changes.'
    : "Don't add any descriptions to the commit, only commit message."
}
Use the present tense. Lines must not be longer than 74 characters. Use ${
    translation.localLanguage
  } to answer.`;
}

export function getUserPrompt(): string {
  return `diff --git a/src/server.ts b/src/server.ts
index ad4db42..f3b18a9 100644
--- a/src/server.ts
+++ b/src/server.ts
@@ -10,7 +10,7 @@
import {
  initWinstonLogger();
  
  const app = express();
 -const port = 7799;
 +const PORT = 7799;
  
  app.use(express.json());
  
@@ -34,6 +34,6 @@
app.use((_, res, next) => {
  // ROUTES
  app.use(PROTECTED_ROUTER_URL, protectedRouter);
  
 -app.listen(port, () => {
 -  console.log(\`Server listening on port \${port}\`);
 +app.listen(process.env.PORT || PORT, () => {
 +  console.log(\`Server listening on port \${PORT}\`);
  });`;
}

export function getAssistantPrompt() {
  const config = getConfig();
  const translation = i18n[(config?.language as I18nLocals) || 'en'];

  return `${config?.emoji ? '🐛 ' : ''}${translation.commitFix}
${config?.emoji ? '✨ ' : ''}${translation.commitFeat}
${config?.description ? translation.commitDescription : ''}`;
}

export enum GenerateCommitMessageErrorEnum {
  tooMuchTokens = 'TOO_MUCH_TOKENS',
  internalError = 'INTERNAL_ERROR',
  emptyMessage = 'EMPTY_MESSAGE'
}

export interface GenerateCommitMessageError {
  error: GenerateCommitMessageErrorEnum;
}
