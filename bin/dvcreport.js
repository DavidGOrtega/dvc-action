#!/usr/bin/env node

const yargs = require('yargs')
const PATH = require('path')

const { exec, fs } = require('./../src/utils')
const Report = require('./../src/Report')


// TODO: duplicated. Refactor
const dvc_report = async (opts) => {
  const sanitize = (str) => str.replace(/(\r\n|\n|\r)/gm, "");

  const { templates, releases } = opts;
  const from = sanitize(await exec(`git rev-parse HEAD^`));
  const to = sanitize(await exec(`git rev-parse HEAD`));

  const report = await Report.dvc_report({ from, to, templates, releases });

  return report;
}

const run = async (argv) => {
  const { vega_templates, output } = argv;
  const templates = vega_templates.split(/[ ,]+/); 

  try {
    const releases = []; // TODO: Releases
    const markdown = await dvc_report({ templates, releases });

    const html = Report.toHTML(markdown);

    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(PATH.join(output, 'index.html'), html);
    
  } catch (err) {
    console.error(err);
  }
}

const argv = yargs
    .usage('Usage: $0 --vega_templates <comma delimited string> --output <output folder>')
    .example('$0 -i template1.json,template2.json -o myfolder', 'generates: myfolder/index.html')
    .demandOption(['vega_templates'])
    .alias('t', 'vega_templates')
    .demandOption('output')
    .alias('o', 'output')
    .help('h')
    .alias('h', 'help')
    .argv;

run(argv);