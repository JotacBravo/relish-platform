// Survey telemetry keeps the event but never the answer to an identifier question.
const IDENTIFIER_QUESTIONS = new Set(['email', 'prolific_id', 'prolific_pid']);

export const isIdentifierQuestion = name => IDENTIFIER_QUESTIONS.has(String(name).toLowerCase());

export const loggableAnswer = (questionName, value) =>
  isIdentifierQuestion(questionName) ? undefined : value;
