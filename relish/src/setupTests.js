// Loaded by CRA before every test file.
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// react-router 7 expects these web globals; CRA's jsdom (Jest 27) lacks them.
if (!global.TextEncoder) Object.assign(global, { TextEncoder, TextDecoder });
