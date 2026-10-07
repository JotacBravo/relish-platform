import { isIdentifierQuestion, loggableAnswer } from './telemetryPrivacy';
import { SURVEY_ROUTES } from './surveyRoutes';

describe('survey telemetry leaves identifiers out', () => {
  test.each(['email', 'prolific_id', 'Prolific_PID', 'EMAIL'])('%s: no answer in the event', name => {
    expect(isIdentifierQuestion(name)).toBe(true);
    expect(loggableAnswer(name, 'someone@example.org')).toBeUndefined();
    expect(JSON.parse(JSON.stringify({ questionName: name, answer: loggableAnswer(name, 'x') }))).toEqual({ questionName: name });
  });

  test('other answers are logged as they are', () => {
    expect(loggableAnswer('dish_1', 'Bacalhau')).toBe('Bacalhau');
    expect(loggableAnswer('eating_habits', { simple_home: 'often' })).toEqual({ simple_home: 'often' });
    expect(isIdentifierQuestion('email_opt_in')).toBe(false);
  });

  test('every identifier question in the survey definitions is covered', () => {
    const names = new Set();
    const walk = o => {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === 'object') {
        if (typeof o.name === 'string' && /mail|prolific/i.test(o.name) && o.type) names.add(o.name);
        Object.values(o).forEach(walk);
      }
    };
    Object.values(SURVEY_ROUTES).forEach(config => walk(config.definition()));
    expect(names.size).toBeGreaterThan(0);
    names.forEach(name => expect(isIdentifierQuestion(name)).toBe(true));
  });
});
