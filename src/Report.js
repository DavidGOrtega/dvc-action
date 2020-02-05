const json_2_mdtable = require('json-to-markdown-table2')
const vega = require('vega')
const vegalite = require('vega-lite')
const PATH = require('path')

const { upload_image, uuid, fs } = require('./utils')
const DVC = require('./Dvc');
const { vegametrics, unlink_folder } = require('./Vegametrics')

const image2Md = async (path) => {
    const link = await upload_image(path);

    return `![](${link})`;
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
            <summary>${section.lbl} files: ${section.files.length}</summary>\n`;

            section.files.forEach(file => 
                summary += `    - ${file.path}\t\t${file.size}Mb \n` + "\n");

            summary += `</details>\n`;
        });

    } catch (err) {
        console.error(err);
    }

    return summary;
}

const dvc_report_metrics_diff_md = async () => {
    let summary = 'No metrics difference available';
  
    try {
      const dvc_out = await DVC.metrics_diff();

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

    console.log("templates");
    console.log(templates);

    let summary = '';
    if (templates && templates.length) {
        try {
            for (idx in templates) {
                const template = templates[idx];
                const output = PATH.join('./', `${uuid()}`);
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

// TODO: data model of releases aree tied to github
const dvc_report_others = async (opts) => {
    const { releases } = opts;
    const dvc_releases = releases.data.filter(release => release.name && release.name.includes('DVC')); 
    const links = dvc_releases.map(release => `[${release.tag_name}](${release.html_url})`).join(', ');
  
    if (links && links.length)
        return `<details><summary>Experiments</summary>\n\n${links}\n</details>`;
  
    return 'No other experiments found';
}

const dvc_report = async (opts) => {
    const data = await dvc_report_data_md(opts);
    const metrics_diff = await dvc_report_metrics_diff_md(opts);
    //const metrics_vega = await dvc_report_metrics_md(opts);
    const vegametrics = await dvc_report_vegametrics_md(opts);
    const others = await dvc_report_others(opts);
    
    const summary = `### Data \n\n${data} \n\n### Metrics \n\n ${metrics_diff} \n\n ${vegametrics} \n\n### Other experiments \n${others}`;
  
    console.log(summary);

    return summary;
}

exports.image2Md = image2Md;
exports.dvc_report = dvc_report;

exports.dvc_report_metrics_md = dvc_report_metrics_md;
exports.dvc_report_vegametrics_md = dvc_report_vegametrics_md;
