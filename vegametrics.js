#!/usr/bin/env node

const yargs = require('yargs')
const vegametrics = require('./src/Vegametrics').vegametrics
const Report = require('./src/Report')

const run = async (argv) => {
    try {
        await vegametrics(argv);
    } catch (err) {
        console.error(err);
    }
}

var argv = yargs
    .usage('Usage: $0 --input <vega file> --output <output folder>')
    .example('$0 -i metrics/myvega.json -o myfolder', 'generates: myfolder/spec.json myfolder/index.html')
    .demandOption(['input'])
    .alias('i', 'input')
    .demandOption('output')
    .alias('o', 'output')
    .help('h')
    .alias('h', 'help')
    .argv;

run(argv);