const path = require('path')
const { exec, fs } = require('./utils')
const DVC = require('./Dvc')
const Graph = require('./Graph').Graph

const unlink_folder = async (folder) => {
    await fs.unlink(path.join(folder, 'index.html'));
    await fs.unlink(path.join(folder, 'spec.json'));
    await fs.unlink(path.join(folder, 'graph.png'));
    await fs.rmdir(folder);
}
  
const vegametrics = async (opts) => {
    const { input, output } = opts;

    const graph = new Graph();
    await graph.load(input);

    const metrics_dataset = new VegaMetricsDataset();
    
    // if spec looks for dataset
    if (graph.spec.data && graph.spec.data.name) {
        if (!graph.spec.datasets) 
            graph.spec.datasets = {};

        const dataset_name = graph.spec.data.name;
        const dataset = graph.spec.datasets[dataset_name];
        
        // inject if looked dataset does not exist
        if (!dataset) {
            await metrics_dataset.add(dataset_name);

        // inject if is a string (filename)
        } else if (dataset && !Array.isArray(dataset)) {
            await metrics_dataset.add(dataset);

        // inject if datasets composition of filenames
        } else if (dataset && Array.isArray(dataset) && typeof(dataset[0] === 'string')) {

            for (let i=0; i<dataset.length; i++) {
                await metrics_dataset.add(dataset[i]);
            }     
        }

        graph.spec.datasets[dataset_name] = metrics_dataset.data
    }

    await fs.mkdir(output, { recursive: true });

    await graph.toHTML({ path: output });
    await graph.toImage({ path: path.join(output, 'graph.png') });
}

class VegaMetricsDataset {
    constructor() {
        this.scalars = false;
        this.data = [];
    }

    add = async (metrics) => {
        const [ input, rev ] = metrics.split('@');

        if (input === 'scalars') {
            this.scalars = true;

            const data = await DVC.metrics_show({ all: true });

            //const { hash } = await exec(`git rev-parse HEAD^`);
            //const data = await DVC.get({ input, rev });
                    
            for (let revision in data) {
                let merged_obj = {};

                for (let idx in data[revision]) {
                    const rev_data = data[revision][idx];
                    const rev_data_data = JSON.parse(rev_data.data);
                
                    if (!Array.isArray(rev_data_data)) {
                        merged_obj = {...merged_obj, ...rev_data_data, ...{ '@experiment': revision }}
                    }
                }

                this.data.push(merged_obj);
            }

        } else {
            const expand = (data, name) => {
                return data.map(item => { 
                    return { ...item, ...{ '@experiment': name } };
                });
            }
    
            const add_rev = async (opts) => {
                const { rev, name } = opts;
                const data = await DVC.get({ input, rev });
        
                if (name === 'current')
                    console.log("current " + data);

                if (name === 'old')
                    console.log("old " + data);
                this.data = this.data.concat(expand(JSON.parse(data), name));
            }
    
            const current = async () => {
                await add_rev({ name: 'current' })
            }
    
            const old = async () => { 
                try {
                    const hash = (await exec(`git rev-parse HEAD^`)).replace(/(\r\n|\n|\r)/gm, "");
                    await add_rev({ rev: hash, name: 'old' });
    
                } catch(err) {
                    console.log(`Failed adding old to dataset`);
                }
            }
    
            const all = async () => { 
                const data = await DVC.metrics_show({ all: true });
                
                for (let revision in data) {
                    for (let idx in data[revision]) {
                        const rev_data = data[revision][idx];
                        
                        if (rev_data.path === input)  
                            this.data = this.data.concat(expand(JSON.parse(rev_data.data), revision));
                    }
                }
    
                await old();
                await current();
            }
    
            if (!rev || rev === 'current') 
                await current()
            
            else if (rev === 'old') 
                await old()
            
            else if (rev === 'all') 
                await all()
    
            else 
                await add_rev({ rev, name: rev })
        }
    }
}

exports.unlink_folder = unlink_folder;
exports.vegametrics = vegametrics;