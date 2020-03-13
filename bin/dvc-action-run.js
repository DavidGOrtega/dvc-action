#!/usr/bin/env node

const { env } = process;
if (env.GITHUB_ACTION) require('./../index');
else require('./github-run');
