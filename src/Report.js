const fs = require('fs').promises
const PATH = require('path')

const imgur = require('imgur')
imgur.setClientId('9ae2688f25fae09')

const json_2_mdtable = require('json-to-markdown-table2')
const vega = require('vega')
const vegalite = require('vega-lite')

const DVC = require('./Dvc');
const { vegametrics, unlink_folder } = require('./Vegametrics')

const uuid = () =>{
    return `${new Date().getUTCMilliseconds()}`;
}

const image2Md = async (path) => {
    const imgur_resp = await imgur.uploadFile(path);

    return `![](${imgur_resp.data.link})`;
}

const vega2md = async (vega_json) => {
    const is_vega_lite = vega_json['$schema'].includes('vega-lite');
    const vega_data = is_vega_lite ? vegalite.compile(vega_json).spec : vega_json;
    const view = new vega.View(vega.parse(vega_data), {renderer: 'none'});
  
    const canvas = await view.toCanvas();
  
    const path = `vega_${uuid()}.png`;
    await fs.writeFile(path, canvas.toBuffer());
    await fs.unlink(path);
  
    const md = await image2Md(path);
  
    return md;
}

const dvc_report_data_md = async (opts) => {
    const { from, to } = opts;
    let summary = 'No data available';

    try {
        const { added, modified, deleted } = await DVC.diff(from, to); 
        const sections = [
            { lbl: 'Added', files: added },
            { lbl: 'Modified', files: modified },
            { lbl: 'Deleted', files: deleted },
        ];

        summary = '';
        sections.forEach(section => {
            summary += `<details>
            <summary>${section.lbl} files: ${section.total}</summary>\n\n`;

            section.files.forEach(file => 
                summary += `  - ${file.path}\t\t${file.size}Mb\n`)

            summary += `</details>`;
        });

    } catch (err) {
        console.error(err);
    }

    return summary;
}

const dvc_report_metrics_diff_md = async () => {
    let summary = 'No metrics difference available';
  
    try {
      const dvc_out = DVC.metrics_diff();
      
      const diff = [];
      for (path in dvc_out) {
          const output = dvc_out[path];
          for (metric in output) {
              const value = output[metric]['new'];
              const change = output[metric]['diff'];
  
              diff.push({path, metric, value, change });
          }
      }
  
      summary = `\n${json_2_mdtable(diff)}`;
    
    } catch (err) {
      console.error(err);
    }
   
    return summary;
}

const dvc_report_metrics_md = async (opts) => {
    let summary = '';
  
    try {
      const { current } = await DVC.metrics_show(opts);

      for (idx in current) {
        const metric = current[idx];

        let sectionmark = '';
        try {
            const json_parsed = JSON.parse(metric.data);

            try {
                sectionmark += `${(await vega2md(json_parsed))}`;
            } catch(err) {
                sectionmark += `${json_2_mdtable(json_parsed)}`;
            } 

        } catch(err) {
            sectionmark += `\`\`\`${metric.data}\`\`\``;
        }

        summary += `\n<details><summary>${metric.path}</summary>\n\n${sectionmark}\n</details>\n`;
      }
    
    } catch (err) {
      console.error(err);
    }
  
    if (summary.length)
        return summary;

    return 'No metrics available';
}

const dvc_report_vegametrics_md = async (opts) => {
    const { templates } = opts;

    let summary = '';
    if (templates && templates.length) {
        try {
            for (idx in templates) {
                const template = templates[idx];
                const output = PATH.join('./', uuid());
                await vegametrics({ input: template, output });
                const sectionmark = await image2Md(PATH.join(output, 'graph.png'));

                summary += `\n<details><summary>${template}</summary>\n\n${sectionmark}\n</details>\n`;

                await unlink_folder(output)
            }
        
        } catch (err) {
            console.error(err);
        }
    }
  
    if (summary.length)
        return summary;

    return 'No vegametrics available';
}

const dvc_report_others = async (opts) => {
    const { releases } = opts;
    const dvc_releases = releases.data.filter(release => release.name && release.name.includes('DVC')); 
    const links = dvc_releases.map(release => `[${release.tag_name}](${release.html_url})`).join(', ');
  
    const summary = `<details><summary>Experiments</summary>\n\n${links}\n</details>`;
  
    return summary;
}

const dvc_report = async (opts) => {
    const data = await dvc_report_data_md(opts);
    const metrics_diff = await dvc_report_metrics_diff_md(opts);
    const metrics_vega = await dvc_report_metrics_md(opts);
    const vegametrics = await dvc_report_vegametrics_md(opts);
    const others = await dvc_report_others(opts);
    
    const summary = 
    `### Data  \n
    ${data}  
    
    ### Metrics  \n
    ${metrics_diff}  \n
    
    ${metrics_vega} \n

    ${vegametrics} \n
  
    ### Other experiments \n
    ${others}
    `;
  
    return summary;
}

exports.image2Md = image2Md;
exports.dvc_report = dvc_report;

exports.dvc_report_metrics_md = dvc_report_metrics_md;
exports.dvc_report_vegametrics_md = dvc_report_vegametrics_md;