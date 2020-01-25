
const util = require('util')
const PATH = require('path')
const glob = util.promisify(require('glob'));
const fs = require('fs').promises;
const _ = require('underscore');
const vega = require('vega');
const vegalite = require('vega-lite');

const imgur = require('imgur')
imgur.setClientId('9ae2688f25fae09');

class Graph {
    constructor() {
        this.spec;
        this.path;

        this.values = [];
    }

    is_vega_lite = () => {
        return this.spec['$schema'].includes('vega-lite');
    }

    is_tpl = () => {
        return (_.isEmpty(this.spec.data) || !this.spec.data.values);
    }

    toMd = async () => {
        const path = `./${new Date().getUTCMilliseconds()}.png`;
        await this.toImage({ path });

        const imgur_resp = await imgur.uploadFile(path);
        const image_uri = imgur_resp.data.link;
        fs.unlink(path);

        return `![${this.path}](${image_uri})`;
    }

    toImage = async (opts) => {
        const { path } = opts;

        const vega_raw = this.is_vega_lite() ? vegalite.compile(this.spec).spec : this.spec;
        const view = new vega.View(vega.parse(vega_raw), { renderer: 'none' });
      
        const canvas = await view.toCanvas();
        await fs.writeFile(path, canvas.toBuffer());
    }


    toHTML = async (opts) => {
        const { path } = opts;
        const html = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/vega"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-lite"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-embed"></script>
</head>
<body>

<div id="vis"></div>

<script type="text/javascript">
    var spec = ${JSON.stringify(this.spec)};
    vegaEmbed('#vis', spec).then(function(result) {
    }).catch(console.error);
</script>
</body>
</html>
        `;

        await fs.writeFile(PATH.join(path, 'spec.json'), JSON.stringify(this.spec));
        await fs.writeFile(PATH.join(path, 'index.html'), html);
    }

    load = async (path) => {
        const content = await fs.readFile(path, "utf8");
        const data = JSON.parse(content);
        const schema = data['$schema'];

        if (!(schema && schema.includes('schema/vega'))) 
            throw new Error(`File ${path} is not a valid vega file`);

       this.spec = data;
       this.path = path;

        if (this.spec.data.url) {
            const data_url = await vega.loader().load(this.data.data.url);
            const values = vega.read(data_url.toString());

            this.data.data = { values };
            this.values.concat(values);
        }
    }

    add_data = (opts) => {
        const { data, experiment } = opts;

        const new_data = this.data.data || { values: [] };

        const values = [];

        for (var idx in data.values) {
            const datum = { ...data.values[idx], ...{ '@experiment': experiment } }
            new_data.values.push(datum);
            values.push(datum);
        }  
        
        this.data.data = new_data;
        this.data.encoding.color = { "field": "@experiment", "type": "nominal" };
        this.data.opacity = { value: 0.2 };

        this.values.concat(values);
    }

    static async find_templates(opts) {
        const tpls = [];

        const { glob_pattern = '**/*.json' } = opts;
        const paths = await glob(glob_pattern);
        

        for (var idx in paths) {
            const path = paths[idx];
            try {
                const graph = new Graph();
                await graph.load(path);

                if (graph.is_tpl())
                    tpls.push(path);

            } catch (err) {
                //console.log(err);
            }
        }

        return tpls;
    }

    static async load_uri(uri) {
        const data_url = await vega.loader().load(uri);
        const values = vega.read(data_url.toString());

        return values;
    }
}

exports.Graph = Graph;