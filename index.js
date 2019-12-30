const core = require('@actions/core')
const github = require('@actions/github')

const util = require('util')
const exec = util.promisify(require('child_process').exec)

const fs = require('fs')
const writeFile = util.promisify(fs.writeFile)
const readFile = util.promisify(fs.readFile)

const imgur = require('imgur')
imgur.setClientId('9ae2688f25fae09');

const github_token = core.getInput('github_token');
const dvc_repro_file = core.getInput('dvc_repro_file');
const dvc_repro_skip = core.getInput('dvc_repro_skip') === 'true';
const skip_ci = core.getInput('skip_ci');

const GITHUB_SHA = process.env.GITHUB_SHA;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

const STUB = process.env.STUB === 'true';

const [owner, repo] = GITHUB_REPOSITORY.split('/');
const octokit = new github.GitHub(github_token);

// console.log(core);
// console.log(process.env);
// console.log(github.context);
// console.log(github.context.payload);


const DVC_METRICS_DIFF_STUB = {
  "train": {
    "train_time": "3d 8h 23m 15s",
    "memory_consume": "8Gb"
  },
  "eval": {
    "inference_time": 0.001,
    "memory_consume": "124Mb",

    "top1-error": 0.0385,
    "top5-error": 0.039221
  }
}

const DVC_METRICS_STUB = `
\tfile1.json:
\t\t{
\t\t  "$schema": "https://vega.github.io/schema/vega/v5.json",
\t\t  "width": 500,
\t\t  "height": 200,
\t\t  "padding": 5
\t\t}
\tfile2.txt: stat2
\tfile3.json:
\t\t{
\t\t  "$schema": "https://vega.github.io/schema/vega/v5.json",
\t\t  "width": 500,
\t\t  "height": 200,
\t\t  "padding": 5
\t\t}
\tfile4.txt: stat4
`;

const VEGA_DATA = {
  "$schema": "https://vega.github.io/schema/vega/v5.json",
  "width": 500,
  "height": 200,
  "padding": 5,

  "data": [
    {
      "name": "table",
      "values": [
        {"x": 0, "y": 28, "c": 0}, {"x": 0, "y": 55, "c": 1},
        {"x": 1, "y": 43, "c": 0}, {"x": 1, "y": 91, "c": 1},
        {"x": 2, "y": 81, "c": 0}, {"x": 2, "y": 53, "c": 1},
        {"x": 3, "y": 19, "c": 0}, {"x": 3, "y": 87, "c": 1},
        {"x": 4, "y": 52, "c": 0}, {"x": 4, "y": 48, "c": 1},
        {"x": 5, "y": 24, "c": 0}, {"x": 5, "y": 49, "c": 1},
        {"x": 6, "y": 87, "c": 0}, {"x": 6, "y": 66, "c": 1},
        {"x": 7, "y": 17, "c": 0}, {"x": 7, "y": 27, "c": 1},
        {"x": 8, "y": 68, "c": 0}, {"x": 8, "y": 16, "c": 1},
        {"x": 9, "y": 49, "c": 0}, {"x": 9, "y": 15, "c": 1}
      ],
      "transform": [
        {
          "type": "stack",
          "groupby": ["x"],
          "sort": {"field": "c"},
          "field": "y"
        }
      ]
    }
  ],

  "scales": [
    {
      "name": "x",
      "type": "band",
      "range": "width",
      "domain": {"data": "table", "field": "x"}
    },
    {
      "name": "y",
      "type": "linear",
      "range": "height",
      "nice": true, "zero": true,
      "domain": {"data": "table", "field": "y1"}
    },
    {
      "name": "color",
      "type": "ordinal",
      "range": "category",
      "domain": {"data": "table", "field": "c"}
    }
  ],

  "axes": [
    {"orient": "bottom", "scale": "x", "zindex": 1},
    {"orient": "left", "scale": "y", "zindex": 1}
  ],

  "marks": [
    {
      "type": "rect",
      "from": {"data": "table"},
      "encode": {
        "enter": {
          "x": {"scale": "x", "field": "x"},
          "width": {"scale": "x", "band": 1, "offset": -1},
          "y": {"scale": "y", "field": "y0"},
          "y2": {"scale": "y", "field": "y1"},
          "fill": {"scale": "color", "field": "c"}
        },
        "update": {
          "fillOpacity": {"value": 1}
        },
        "hover": {
          "fillOpacity": {"value": 0.5}
        }
      }
    }
  ]
}
 

const exe = async (command) => {
  const { stdout, stderr, error } = await exec(command);

  console.log(stdout);
  console.log(stderr);

  if (error) throw new Error(stderr);

  return stdout ? stdout : stderr;
}


const uuid = () =>{
  return new Date().getUTCMilliseconds()
}

const dvc_report_data_md = async () => {
  let summary = 'No data available';

  try {
    // TODO: extract file sizes and info from dcv changed files
    // const git_out = await exe('git diff --name-only $(git rev-parse HEAD~1) $(git rev-parse HEAD)');

    let dvc_out;
    try {
      let cmd = `dvc diff $(git rev-parse HEAD~1) $(git rev-parse HEAD)`;
      
      if (GITHUB_SHA != github.context.payload.after) 
        cmd = `dvc diff ${github.context.payload.after} ${GITHUB_SHA}`;

      dvc_out = await exe(cmd);

    } catch (err) {
      dvc_out = await exe('dvc diff 4b825dc642cb6eb9a060e54bf8d69288fbee4904 $(git rev-parse HEAD)');
    }
    
    //1799 files untouched, 0 files modified, 1000 files added, 1 file deleted, size was increased by 23.0 MB
    const regex = /(\d+) files? untouched, (\d+) files? modified, (\d+) files? added, (\d+) files? deleted/g;
    const match = regex.exec(dvc_out);

    const sections = [
      { lbl: 'New', total: match[3] },
      { lbl: 'Modified', total: match[2] },
      { lbl: 'Deleted', total: match[4] },
    ];

    summary = '';
    sections.forEach(section => {
      summary += ` - ${section.lbl} files: ${section.total}  \n`;

      for (let i=0; i<section.total; i++)
        summary += `    - ${section.lbl}-dummy.png\t\t30Mb\n`;
    });

  } catch (err) {
    console.error(err);
  }

  return summary;
}


const dvc_report_metrics_diff_md = async () => {
  let summary = 'No metrics available';

  try {

    let dvc_out;
    try {
      dvc_out = await exe('dvc metrics diff HEAD^^');

    } catch (err) {
      if (!STUB) throw err;

      // STUB
      dvc_out = DVC_METRICS_DIFF_STUB;
      // STUB ENDS
    }

    summary = '';
    for( const pipe in dvc_out ) {
      summary += ` - ${pipe}  \n`;

      for (const metric in dvc_out[pipe] )
        summary += `    - ${metric}:\t\t${dvc_out[pipe][metric]}\n`;
    };
  
  } catch (err) {
    console.error(err);
  }
 
  return summary;
}


const dvc_report_metrics_vega_md = async () => {
  let summary = '';

  try {
    let dvc_out;
    try {
      dvc_out = await exe('dvc metrics show');

    } catch (err) {
      if (!STUB) throw err;

      // STUB
      dvc_out = DVC_METRICS_STUB;
      await writeFile('file1.json', JSON.stringify(VEGA_DATA));
      await writeFile('file2.txt', 'stat2');
      await writeFile('file3.json', JSON.stringify(VEGA_DATA));
      await writeFile('file4.txt', 'stat4');
      // STUB ENDS
    }
    
    const regex = /\t[^"?].+:/gm;
    const matches = dvc_out.match(regex);

    for (idx in matches) {
      const file = matches[idx].replace(':', '').replace(/\t/g, '');

      try {
        if (!file.includes('"')) {
          const content = await readFile(file, "utf8");

          summary += await vega2md(file, JSON.parse(content));
        }
      
      } catch(err) {
        console.log(`${file} is not a valid vega file`);
        console.log(err);
      }
    }
  
  } catch (err) {
    console.error(err);
  }

  return summary;
}


const check_dvc_report_summary = async () => {
  const data = await dvc_report_data_md();
  const metrics_diff = await dvc_report_metrics_diff_md();
  const metrics_vega = await dvc_report_metrics_vega_md();

  const summary = `### Data  \n${data}  \n### Metrics  \n${metrics_diff}\n${metrics_vega}`;

  return summary;
}

const check_dvc_report = async () => {

  const started_at = new Date();
  const name = `DVC Report ${uuid()}`;
  const conclusion = 'success';
  const title = 'DVC Report';
  const summary = await check_dvc_report_summary();

  await octokit.checks.create({
    owner,
    repo,
    head_sha: GITHUB_SHA,

    started_at,
    name,
    conclusion,
    completed_at: new Date(),
    status: 'completed',
    output: {
      title,
      summary
    }
  })
}


const run_repro = async () => {
  
  if (dvc_repro_skip) {
    console.log('DVC repro skipped');
    return;
  }

  const dvc_repro_file_exists = fs.existsSync(dvc_repro_file);
  
  if (!dvc_repro_file_exists) 
    throw new Error(`DVC repro file ${dvc_repro_file} not found`);


  const has_dvc_remote = (await exe('dvc remote list')).length;
  if (has_dvc_remote) {
    console.log('Pulling from dvc remote');
    await exe('dvc pull');
  
  } else {
    console.log('Experiment does not have dvc remote!');
  }

  console.log(`echo Running dvc repro ${dvc_repro_file}`);
  try {
    await exe(`dvc repro ${dvc_repro_file}`);
  } catch (err) {
    console.log(err.message); // TODO: dvc uses the stderr to WARNING: Dependency of changed because it is 'modified'. 
  }
  

  const has_changes = true; // TODO: if ! git diff-index --quiet HEAD --; then
  if (has_changes) {
    console.log('Pushing...');

    await exe(`
      dvc commit -f
      git config --local user.email "action@github.com"
      git config --local user.name "GitHub Action"
      git commit -a -m "dvc repro ${skip_ci}"
      git remote add github "https://$GITHUB_ACTOR:${github_token}@github.com/$GITHUB_REPOSITORY.git"
      git push github HEAD:$GITHUB_REF
    `);

    if (has_dvc_remote) {
      console.log('Pushing to dvc remote');
      await exe('dvc push');
    }

    // TODO: save artifacts as releases
  }
}

const install_dependencies = async () => {
  console.log('installing dvc...')
  await exe('pip install dvc');
}

const vega2md = async (name, vega_data) => {
  const vega = require('vega')
  const path = `./../${name}.png`;
  const parsed = vega.parse(vega_data);
  const view = new vega.View(parsed, {renderer: 'none'});

  const canvas = await view.toCanvas();

  await writeFile(path, canvas.toBuffer())

  const imgur_resp = await imgur.uploadFile(path);

  return `![${name}](${imgur_resp.data.link})`;
}


const run_action = async () => {
  try {
    console.log('Checking skip');
    const last_log = await exe('git log -1');
    if (last_log.includes(skip_ci)) {
      console.log(`${skip_ci} found! skipping task`);
      return 0;
    }

    await install_dependencies();
    await run_repro();
    await check_dvc_report();
  
  } catch (error) {
    core.setFailed(error.message);
  }
}

run_action();