const core = require('@actions/core')
const github = require('@actions/github')

const util = require('util')
const exec = util.promisify(require('child_process').exec)

const fs = require('fs')
const writeFile = util.promisify(fs.writeFile)
const readFile = util.promisify(fs.readFile)
const fsStat = util.promisify(fs.stat)

const vega = require('vega');
const vegalite = require('vega-lite');
const json_2_mdtable =require('json-to-markdown-table2');
const imgur = require('imgur')
imgur.setClientId('9ae2688f25fae09');

const github_token = core.getInput('github_token');
const dvc_repro_file = core.getInput('dvc_repro_file');
const release_skip = core.getInput('release_skip')  === 'true';
const release_files = core.getInput('release_files') || [];
const skip_ci = core.getInput('skip_ci');

const {
  GITHUB_SHA,
  GITHUB_REPOSITORY,
  GITHUB_HEAD_REF,
  GITHUB_BASE_REF,
  GITHUB_EVENT_NAME,
} = process.env;

const STUB = process.env.STUB === 'true';

const [owner, repo] = GITHUB_REPOSITORY.split('/');
const octokit = new github.GitHub(github_token);

//console.log(process.env);
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


const exe = async (command, quiet) => {
  const { stdout, stderr, error } = await exec(command);

  if (!quiet) {
    console.log(`\nCommand: ${command}`);
    console.log(`\t\t${stdout}`);
    console.log(`\t\t${stderr}`);
  }
   
  if (error) throw new Error(stderr);

  return stdout;
}


const dvc_has_remote = async() => {
  return (await exe('dvc remote list')).length > 0;
}


const uuid = () =>{
  return new Date().getUTCMilliseconds()
}


const dvc_report_data_md = async (opts) => {
  const { from, to } = opts;
  let summary = 'No data available';

  try {
    const dvc_out = await exe(`dvc diff ${from} ${to}`);

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

      // TODO: Replace this section with real output
      for (let i=0; i<section.total; i++)
      summary += `    - file${i}\t\tMb\n`;
    });

  } catch (err) {
    console.error(err);
  }

  return summary;
}


const dvc_report_metrics_diff_md = async () => {
  let summary = 'No metrics difference available';

  try {

    let dvc_out;
    try {
      dvc_out = await exe('dvc metrics diff HEAD^^');

    } catch (err) {
      if (!STUB) throw err;

      // STUB
      console.log('dvc_report_metrics_diff_md failed, doing STUB');
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


const vega2md = async (name, vega_json) => {
  const is_vega_lite = vega_json['$schema'].includes('vega-lite');
  const vega_data = is_vega_lite ? vegalite.compile(vega_json).spec : vega_json;
  const view = new vega.View(vega.parse(vega_data), {renderer: 'none'});

  const canvas = await view.toCanvas();

  const path = `./../${uuid()}.png`;
  await writeFile(path, canvas.toBuffer());

  const imgur_resp = await imgur.uploadFile(path);
  const image_uri = imgur_resp.data.link;

  return `![${name}](${image_uri})`;
}


const dvc_report_metrics_md = async () => {
  let summary = '';

  try {
    const quiet = true;
    const dvc_out = await exe('dvc metrics show', quiet);

    const regex = /.+?:/gm;
    const matches = dvc_out.match(regex);

    for (idx in matches) {
      const file = matches[idx].replace(':', '').replace(/\t/g, '');

      try {
        if (!file.includes('"')) {
          const content = await readFile(file, "utf8");
          const json_parsed = JSON.parse(content);

          try {
              summary += `\n ${(await vega2md(file, json_parsed))} \n`;
          } catch(err) {
            if (json_parsed) {
              summary += `\n ${json_2_mdtable(json_parsed)} \n`;
            
            } else
              summary += `\n \`\`\`${content}\`\`\` \n`;
          }  
        }
      
      } catch(err) {
        console.log(err);
      }
    }
  
  } catch (err) {
    console.error(err);
  }

  if (!summary.length)
    return 'No metrics available';

  return `${summary} \n`;
}


const check_dvc_report_summary = async (opts) => {
  const data = await dvc_report_data_md(opts);
  const metrics_diff = await dvc_report_metrics_diff_md(opts);
  const metrics_vega = await dvc_report_metrics_md();

  const summary = 
  `### Data  \n
  ${data}  
  
  ### Metrics  \n
  ${metrics_diff}  \n
  
  ${metrics_vega}`;

  return summary;
}

const check_dvc_report = async (opts) => {
  console.log("Creating DVC report");

  const { summary } = opts;

  const started_at = new Date();
  const name = `DVC Report ${uuid()}`;
  const conclusion = 'success';
  const title = 'DVC Report';

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


const has_skip_ci = async () => {
  console.log('Checking skip');
  const last_log = await exe('git log -1');
  
  if (last_log.includes(skip_ci)) {
    console.log(`${skip_ci} found! skipping task`);
    return true;
  }

  return false;
}


const install_dependencies = async () => {
  console.log('installing dvc...');
  await exe('pip uninstall -y enum34');
  await exe('pip install --quiet dvc[all]');
}

const init_remote = async () => {
  const dvc_remote_list =  await exe('dvc remote list');
  const has_dvc_remote = dvc_remote_list.length > 0;

  if (!has_dvc_remote) { 
    console.log(':warning: Experiment does not have dvc remote!');
    return;
  }

  // s3
  if(dvc_remote_list.toLowerCase().includes('s3://')) {
    const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      console.log(`:warning: S3 dvc remote found but no credentials found`);
    }
  }

  // azure
  if(dvc_remote_list.toLowerCase().includes('azure://')) {
    const { AZURE_STORAGE_CONNECTION_STRING, AZURE_STORAGE_CONTAINER_NAME } = process.env;
    if (!AZURE_STORAGE_CONNECTION_STRING || !AZURE_STORAGE_CONTAINER_NAME) {
      console.log(`:warning: Azure dvc remote found but no credentials found`);
    }
  }

  // Aliyn
  if(dvc_remote_list.toLowerCase().includes('azure://')) {
    const { OSS_BUCKET, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_ENDPOINT } = process.env;
    if (!OSS_BUCKET || !OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_ENDPOINT) {
      console.log(`:warning: Aliyin dvc remote found but no credentials found`);
    }
  }

  // gs
  if(dvc_remote_list.toLowerCase().includes('gs://')) {
    const { GOOGLE_APPLICATION_CREDENTIALS } = process.env;
    if (GOOGLE_APPLICATION_CREDENTIALS) {
      const path = `./../GOOGLE_APPLICATION_CREDENTIALS.json`;
      await writeFile(path, GDRIVE_USER_CREDENTIALS);
      process.env['GOOGLE_APPLICATION_CREDENTIALS'] = path;
    
    } else {
      console.log(`:warning: Google storage dvc remote found but no credentials found`);
    }
  }
  
  // gdrive
  if(dvc_remote_list.toLowerCase().includes('gdrive://')) {
    
    const { GDRIVE_USER_CREDENTIALS } = process.env;
    if (GDRIVE_USER_CREDENTIALS) {
        const path = '.dvc/tmp/gdrive-user-credentials.json';
        await writeFile(path, GDRIVE_USER_CREDENTIALS);

    } else {
      console.log(`:warning: Google drive dvc remote found but no credentials found`);
    }
  }

  // ssh
  if(dvc_remote_list.toLowerCase().includes('ssh://')) {
    
    const { DVC_REMOTE_SSH_KEY } = process.env;
    if (DVC_REMOTE_SSH_KEY) {
        const path = '~/.ssh/dvc_remote.pub';
        await writeFile(path, DVC_REMOTE_SSH_KEY);
        await exe(`echo ${path} >> ~/.ssh/known_hosts`);

    } else {
      console.log(`:warning: SSH dvc remote found but no credentials found`);
    }
  }

  // HDFS
  if(dvc_remote_list.toLowerCase().includes('hdfs://')) {
    // TODO: implement
    console.log(`:warning: HDFS secrets not yet implemented`);
  }

  console.log('Pulling from dvc remote');
  if (has_dvc_remote) {
    // TODO: check if -f and try would be desirable
    // projects with repro without push data previously fails
    try {
      await exe('dvc pull -f');
    } catch (err) {}
    
  }
}


const run_repro = async () => {
  let repro_runned = false;

  if (dvc_repro_file === 'None') {
    console.log('DVC repro skipped');
    return;
  }

  const dvc_repro_file_exists = fs.existsSync(dvc_repro_file);

  if (!dvc_repro_file_exists) 
    throw new Error(`DVC repro file ${dvc_repro_file} not found`);

  console.log(`echo Running dvc repro ${dvc_repro_file}`);
  // TODO: try since dvc uses the stderr to WARNING: Dependency of changed because it is 'modified'. 
  try {
    await exe(`dvc repro ${dvc_repro_file}`);
  } catch (err) {
    console.log(err.message); 
  }
  
  // TODO: review, dvc lock changes for git
  const git_status = await exe(`git status`);
  const git_changed = !git_status.includes('up to date');
  const dvc_status = await exe(`dvc status -c`);
  const dvc_changed = !dvc_status.includes('up to date');
  if (/*git_changed ||*/ dvc_changed) {

    console.log('DVC commit');
    await exe('dvc commit -f');

    // TODO: review git add --all required because of metrics files. Should it not be tracked by dvc?
    console.log('Git commit');
    await exe(`
      git config --local user.email "action@github.com"
      git config --local user.name "GitHub Action"
      git add --all
      git commit -a -m "dvc repro ${skip_ci}"
    `);

    const has_dvc_remote = await dvc_has_remote();
    if (has_dvc_remote) {
      console.log('DVC Push');
      await exe('dvc push');
    }

    console.log('Git push');
    try {
    await exe(`
      git remote add github "https://$GITHUB_ACTOR:${github_token}@github.com/$GITHUB_REPOSITORY.git"
      git push github HEAD:$GITHUB_HEAD_REF
    `);
    }catch (err) {}

    repro_runned = true;
  }

  return repro_runned;
}


const octokit_upload_release_asset = async (url, filepath) => {
  const stat = await fsStat(filepath);

  if (!stat.isFile()) {
      console.log(`Skipping, ${filepath} its not a file`);
      return;
  }

  const file = await readFile(filepath);
  const name = path.basename(filepath);
  // TODO: mime type
  const mime = "binary/octet-stream";

  await octokit.repos.uploadReleaseAsset({
      url,
      name,
      file,
      headers: {
          "content-type": mime,
          "content-length": stat.size
      },
  });
}


const create_release = async (opts) => {
  const { body } = opts;

  const tag_name = GITHUB_SHA.slice(0, 7);

  const release = await octokit.repos.createRelease({
      owner,
      repo,
      head_sha: GITHUB_SHA,

      tag_name,
      body
  });

  // TODO: promisify all
  for (idx in release_files) {
    await octokit_upload_release_asset(release.data.upload_url, release_files[idx]);
  }
}

const dvc_diff = async (from, to) => {
  console.log(from.replace('n', ''));
  console.log(to.replace('n', ''));
  try {
    console.log(await exe(`dvc diff ${from.replace('n', '')} ${to.replace('n', '')}`));
    }catch(err){}
}

const run_action = async () => {
  try {
    const is_pr = GITHUB_EVENT_NAME === 'pull_request';

    if (( await has_skip_ci() )) return;

    await install_dependencies();
    await init_remote();

    const repro_runned = await run_repro();

    console.log(process.env);
    try {
      await exe(`git log --graph --all`);
    }catch(err){}

    try {
    await dvc_diff((await exe(`git log -n 1 origin/${GITHUB_HEAD_REF} --pretty=format:%H`)), (await exe(`git log -n 1 origin/${GITHUB_BASE_REF} --pretty=format:%H`)));
  }catch(err){}
  try {
    await dvc_diff(github.context.payload.before, github.context.payload.after);
  }catch(err){}
  try {
    await dvc_diff((await exe(`git rev-parse HEAD~1`)), (await exe(`git rev-parse HEAD`)));
  }catch(err){}
  try {
    await dvc_diff((await exe(`git rev-parse HEAD^1`)), (await exe(`git rev-parse HEAD`)));
  }catch(err){}


    let from = is_pr ? await exe(`git log -n 1 origin/${GITHUB_HEAD_REF} --pretty=format:%H`) 
      : github.context.payload.before;

    if (from === '0000000000000000000000000000000000000000')
          from = await exe(`git rev-parse HEAD~1`)
    
    let to = is_pr ? await exe(`git log -n 1 origin/${GITHUB_BASE_REF} --pretty=format:%H`) 
      : await exe(`git rev-parse HEAD`);

    const report = await check_dvc_report_summary({ from, to });
    await check_dvc_report({ summary: report });

    if (!release_skip && repro_runned)
      await create_release({ body: report });
  
  } catch (error) {
    core.setFailed(error.message);
  }
}

run_action();