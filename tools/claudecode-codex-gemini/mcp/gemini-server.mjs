#!/usr/bin/env node
import { createGeminiAdapter } from './adapters.mjs';
import { runStdioServer } from './runtime.mjs';

runStdioServer(createGeminiAdapter());
