#!/usr/bin/env node

const path = require('path')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const fs = require('fs').promises
const yargs = require('yargs')
const DVC = require('./src/Dvc')
const Graph = require('./src/Graph').Graph

const get_old = async() => {
    const { stdout } = await exec(`git rev-parse HEAD^`);

    return stdout;
}

const load_metrics_dataset = async(dataset) => {
    const [ input, revision ] = dataset.split('@');
    if (revision === 'all') throw new Error(`Revision 'all' not yet supported`);
    
    let rev = revision;
    if (revision === 'current') 
        rev = '';
       
    if (revision === 'old') {
        console.warn(`Revision 'old' points to current!!!`)
        rev = '';
    }
        
    const data = await DVC.get({input, rev});

    return data.map(item => { 
        return { ...item, ...{ '@experiment': revision } };
    });
}

const run = async (argv) => {
    const { input, output } = argv

    const graph = new Graph();
    await graph.load(input);

    // if spec looks for dataset
    if (graph.spec.data && graph.spec.data.name) {
        if (!graph.spec.datasets) 
            graph.spec.datasets = {};

        const dataset_name = graph.spec.data.name;
        const dataset = graph.spec.datasets[dataset_name];
        
        // inject if looked dataset does not exist
        if (!dataset) {
            graph.spec.datasets[dataset_name] = await load_metrics_dataset(dataset_name);
        
        // inject if is a string (filename)
        } else if (dataset && !Array.isArray(dataset)) {
            graph.spec.datasets[dataset_name] = await load_metrics_dataset(dataset);

        // inject if datasets composition of filenames
        } else if (dataset && Array.isArray(dataset) && typeof(dataset[0] === 'string')) {
            let joined_dataset = [];
           
            for (let i=0; i<dataset.length; i++) {
                const dataset_name = dataset[i];

                try {
                    const chunk_dataset = await load_metrics_dataset(dataset_name);
                    joined_dataset = joined_dataset.concat(chunk_dataset);
                } catch(err) {
                    console.warn(`Failed processing ${dataset_name}`);
                }
            }

            graph.spec.datasets[dataset_name] = joined_dataset;
        }
    }

    console.log(JSON.stringify(graph.spec.datasets));
    
    await fs.mkdir(output, { recursive: true });

    await graph.toImage({ path: path.join(output, 'graph.png') });
    await graph.toHTML({ path: output });
}
   
var argv = yargs
    .usage('Usage: $0 --input <vega file> --output <output folder>')
    .example('$0 -i metrics/myvega.json -o myfolder', 'generates: myfolder/spec.json myfolder/index.html myfolder/graph.png')
    .demandOption(['input'])
    .alias('i', 'input')
    .demandOption('output')
    .alias('o', 'output')
    .help('h')
    .alias('h', 'help')
    .argv;

run(argv);