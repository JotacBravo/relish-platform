import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { Survey } from 'survey-react-ui';
import { Model } from 'survey-core';
import { useLocation } from 'react-router-dom';
import { surveyForPath } from './surveyRoutes';
import { loggableAnswer } from './telemetryPrivacy';
import surveyThemeJSON from './survey_theme';
import 'survey-core/survey-core.min.css';

const API_BASE = '/api/survey';

// Prolific completion codes, set at build time (see relish/.env.example).
const PROLIFIC_CODES = {
  youth: process.env.REACT_APP_PROLIFIC_CODE_YOUTH,
  futures: process.env.REACT_APP_PROLIFIC_CODE_FUTURES,
  visions: process.env.REACT_APP_PROLIFIC_CODE_VISIONS,
};

// Completed page while saving, and if saving fails.
const SAVING_HTML = `
  <div style="display: flex; align-items: center; padding: 20px;">
    <img src="/Relish_Logo_Master_01.png" alt="Relish Logo" style="height: 50px; margin-right: 20px;" />
    <h3 style="margin: 0;">Saving your answers…</h3>
  </div>
`;
const SAVE_ERROR_HTML = `
  <div style="display: flex; flex-direction: column; align-items: center; padding: 20px; gap: 12px; text-align: center;">
    <img src="/Relish_Logo_Master_01.png" alt="Relish Logo" style="height: 50px;" />
    <h3 style="margin: 0;">Your answers have not been saved yet</h3>
    <p style="margin: 0;">Please keep this page open, check your internet connection and press "Try again".</p>
  </div>
`;
const SAVING_TEXT = 'Saving your answers…';
const SAVED_TEXT = 'Your answers have been saved.';
const SAVE_ERROR_TEXT = 'Your answers could not be saved. Please check your internet connection and try again.';

function thanksHtml(isProlific, prolificCode, prolificRedirect) {
  if (!isProlific) return `
    <div style="display: flex; align-items: center; padding: 20px;">
      <img src="/Relish_Logo_Master_01.png" alt="Relish Logo" style="height: 50px; margin-right: 20px;" />
      <h3 style="margin: 0;">Thank you for your participation!</h3>
    </div>
  `;
  if (!prolificRedirect) return `
    <div style="display: flex; flex-direction: column; align-items: center; padding: 20px; gap: 16px;">
      <img src="/Relish_Logo_Master_01.png" alt="Relish Logo" style="height: 50px;" />
      <h3 style="margin: 0;">Thank you for your participation!</h3>
      <p>Please return to Prolific to complete your submission.</p>
    </div>
  `;
  return `
    <div style="display: flex; flex-direction: column; align-items: center; padding: 20px; gap: 16px;">
      <img src="/Relish_Logo_Master_01.png" alt="Relish Logo" style="height: 50px;" />
      <h3 style="margin: 0;">Thank you for your participation!</h3>
      <p>You will be redirected to Prolific automatically. If not, please click the button below or paste this code on Prolific:</p>
      <p style="font-size: 1.4em; font-weight: bold; letter-spacing: 2px;">${prolificCode}</p>
      <a href="${prolificRedirect}" style="padding: 10px 24px; background: #333; color: white; border-radius: 6px; text-decoration: none;">
        Return to Prolific
      </a>
    </div>
  `;
}

const generateSessionId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// The address picks the survey; unknown addresses collect nothing.
export default function SurveyComponent() {
  const location = useLocation();
  const config = surveyForPath(location.pathname);
  if (!config) return <UnknownSurvey />;
  return <SurveyRunner config={config} />;
}

function UnknownSurvey() {
  useEffect(() => { document.title = 'Survey not found'; }, []);
  return (
    <div role="alert" style={{ maxWidth: 520, margin: '15vh auto', padding: '0 20px', textAlign: 'center', fontFamily: 'Lato, sans-serif' }}>
      <img src="/Relish_Logo_Master_01.png" alt="RELISH" style={{ height: 50 }} />
      <h2>This survey link is not valid</h2>
      <p>Please check the address. No answers are collected on this page.</p>
    </div>
  );
}

function SurveyRunner({ config }) {
  const sessionIdRef = useRef(generateSessionId());
  const pageStartTimeRef = useRef(Date.now());
  const logQueueRef = useRef([]);
  const completionLoggedRef = useRef(false);
  const { surveyType, isProlific } = config;

  const prolificCode = PROLIFIC_CODES[surveyType];
  const prolificRedirect = prolificCode ? `https://app.prolific.com/submissions/complete?cc=${prolificCode}` : null;

  // Survey telemetry, under a random session id, sent in batches of five.
  const flushLogs = useCallback(async () => {
    if (logQueueRef.current.length === 0) return;
    try {
      const logsToSend = [...logQueueRef.current];
      logQueueRef.current = [];
      await fetch(`${API_BASE}/log-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: logsToSend }),
      });
    } catch (error) {
      console.error('Error sending logs:', error);
    }
  }, []);

  const sendLog = useCallback(async (eventType, additionalData = {}) => {
    logQueueRef.current.push({
      surveyType,
      sessionId: sessionIdRef.current,
      eventType,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });
    if (logQueueRef.current.length >= 5) {
      await flushLogs();
    }
  }, [surveyType, flushLogs]);

  useEffect(() => {
    document.title = config.title;
    sendLog('survey_started');

    const handleBeforeUnload = () => {
      if (logQueueRef.current.length > 0) {
        navigator.sendBeacon(`${API_BASE}/log-batch`, JSON.stringify({ events: logQueueRef.current }));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (logQueueRef.current.length > 0) {
        sendLog('survey_abandoned');
        flushLogs();
      }
    };
  }, [config.title, sendLog, flushLogs]);

  const survey = useMemo(() => {
    const model = new Model(config.definition());
    model.markdown = true;
    model.applyTheme(surveyThemeJSON);
    model.locale = 'en';
    model.showQuestionNumbers = 'off';
    model.showNavigationButtons = 'both';
    model.navigationButtonsLocation = 'topBottom';
    model.completedHtml = SAVING_HTML;

    model.onCurrentPageChanged.add((sender) => {
      const currentTime = Date.now();
      const timeSpent = Math.round((currentTime - pageStartTimeRef.current) / 1000);
      pageStartTimeRef.current = currentTime;
      sendLog('page_changed', { pageNumber: sender.currentPageNo, timeSpent });
    });

    model.onValueChanged.add((sender, options) => {
      sendLog('question_answered', {
        pageNumber: sender.currentPageNo,
        questionName: options.name,
        answer: loggableAnswer(options.name, options.value),
      });
    });

    model.onChoicesLoaded.add((sender, options) => {
      if (options.question.choicesByUrl?.url?.includes('countries.json')) {
        options.choices.sort((a, b) => a.text.localeCompare(b.text));
      }
    });

    // "Saving" until the server answers, then the thank-you or the error with
    // SurveyJS's "Try again" button, which runs this handler again.
    model.onComplete.add(async (sender, options) => {
      sender.completedHtml = SAVING_HTML;
      options.showSaveInProgress(SAVING_TEXT);
      try {
        if (!completionLoggedRef.current) {
          completionLoggedRef.current = true;
          const totalTime = Math.round((Date.now() - pageStartTimeRef.current) / 1000);
          await sendLog('survey_completed', { timeSpent: totalTime });
          await flushLogs();
        }

        const res = await fetch(`${API_BASE}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ surveyType, responses: sender.data }),
        });
        if (!res.ok) throw new Error(`Failed to save responses: ${res.status}`);

        sender.completedHtml = thanksHtml(isProlific, prolificCode, prolificRedirect);
        options.showSaveSuccess(SAVED_TEXT);
        if (isProlific && prolificRedirect) {
          setTimeout(() => { window.location.href = prolificRedirect; }, 3000);
        }
      } catch (error) {
        console.error('Error saving responses:', error);
        sender.completedHtml = SAVE_ERROR_HTML;
        options.showSaveError(SAVE_ERROR_TEXT);
        await sendLog('error', { error: error.message, context: 'survey_completion' });
        await flushLogs();
      }
    });

    return model;
  }, [config, surveyType, isProlific, prolificCode, prolificRedirect, sendLog, flushLogs]);

  return <Survey model={survey} />;
}
