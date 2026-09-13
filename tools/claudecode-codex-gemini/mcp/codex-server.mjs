#!/usr/bin/env node
import { createCodexAdapter } from './adapters.mjs';
import { runStdioServer } from './runtime.mjs';

runStdioServer(createCodexAdapter());
