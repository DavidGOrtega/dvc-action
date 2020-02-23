const json_2_mdtable = require('json-to-markdown-table2')

const dvc_diff_report_md = (data) => {
  if (!data)
    return 'No metrics difference available';
  
  let summary = '';
  
  const { added, modified, deleted } = data; 
  const sections = [
      { lbl: 'Added', files: added },
      { lbl: 'Modified', files: modified },
      { lbl: 'Deleted', files: deleted },
  ];

  sections.forEach(section => {
    summary += `<details>\n<summary>${section.lbl}: ${section.files.length}</summary>\n`;

    section.files.forEach(file => 
        summary += ` - ${file.path} \n`);

    summary += `</details>\n`;
  });
  
  return summary;
}

const dvc_metrics_diff_report_md = (data) => {
  if (!data)
    return 'No metrics difference available';

  const diff = [];

  for (path in data) {
    const output = data[path];
    for (metric in output) {
      const value = output[metric]['new'];
      const arrow = output[metric]['diff'] > 0 ? 
        ':small_red_triangle:' : ':small_red_triangle_down:';
      const change = `${arrow} ${output[metric]['diff']}`;

      diff.push({ path, metric, value, change });
    }
  }

  const summary = `\n${json_2_mdtable(diff)}`;

  return summary;
}

const others_report_md = (tags) => {
  if (!tags.length) 
    return 'No other experiments available';
  
  const links = tags.map(tag => `#${tag}`);
  const summary = `<details><summary>Experiments</summary>\n\n${links.length > 1 
    ? links.join(', ') : links[0]}\n</details>`;
  
  return summary;
}

const dvc_report_md = (opts) => {
  const { dvc_diff, dvc_metrics_diff, tags = [] } = opts;
  const diff_md = dvc_diff_report_md(dvc_diff);
  const metrics_diff_md = dvc_metrics_diff_report_md(dvc_metrics_diff);
  const others_md = others_report_md(tags);
  
  const summary = `### Data \n\n${diff_md} \n\n### Metrics \n\n ${metrics_diff_md} \n\n### Other experiments \n${others_md}`;

  return summary;
}

const md_to_html = (markdown) => `
<!doctype html>
<html>
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1, minimal-ui">
		<title>GitHub Markdown CSS demo</title>
		<link rel="stylesheet" href="report.css">
		<style>
			body {
				box-sizing: border-box;
				min-width: 200px;
				max-width: 980px;
				margin: 0 auto;
				padding: 45px;
			}
		</style>
	</head>
	<body>
        <div class="markdown-body" id="content">
        </div>
    </body>
    <script src="showdown.min.js"></script>
    <script>
const text = \`${markdown}\`;

const converter = new showdown.Converter({ tables: true })
converter.setFlavor('github');

const html=converter.makeHtml(text);
document.getElementById("content").innerHTML = html; 
</script>
</html>
`;

exports.dvc_report_md = dvc_report_md;
exports.md_to_html = md_to_html;
