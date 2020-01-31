const core = require('@actions/core')
const github = require('@actions/github')

const util = require('util')
const exec = util.promisify(require('child_process').exec)
const fs = require('fs').promises

const DVC = require('./src/Dvc');
const Report = require('./src/Report');

const github_token = core.getInput('github_token');
const dvc_repro_file = core.getInput('dvc_repro_file');
const release_skip = core.getInput('release_skip')  === 'true';
const release_files = core.getInput('release_files') ? core.getInput('release_files').split(/[ ,]+/) : [];
const release_files = core.getInput('templates') ? core.getInput('vega_templates').split(/[ ,]+/) : [];
const skip_ci = core.getInput('skip_ci');

const {
  GITHUB_REPOSITORY,
  GITHUB_HEAD_REF,
  GITHUB_EVENT_NAME,
  GITHUB_WORKFLOW,
} = process.env;

const IS_PR = GITHUB_EVENT_NAME === 'pull_request';
const GITHUB_SHA = IS_PR ? github.context.payload.pull_request.head.sha : process.env.GITHUB_SHA

const [owner, repo] = GITHUB_REPOSITORY.split('/');
const octokit = new github.GitHub(github_token);

// console.log(process.env);
// console.log(github.context);
// console.log(github.context.payload);
 
const exe = async (command, quiet) => {
  const { stdout, stderr } = await exec(command);

  if (!quiet) {
    console.log(`\nCommand: ${command}`);
    console.log(`\t\t${stdout}`);
    console.log(`\t\t${stderr}`);
  }
   
  return stdout;
}

const uuid = () =>{
  return new Date().getUTCMilliseconds()
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
  try {
    await exe('dvc');
  } catch(err) {
    console.log('installing dvc...');
    await exe('pip uninstall -y enum34');
    await exe('pip install --quiet dvc[all]');
  }
}

// TODO: make it non Github dependant
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

    const has_dvc_remote = await DVC.has_remote();
    if (has_dvc_remote) {
      console.log('DVC Push');
      await exe('dvc push');
    }

    console.log('Git push');
    try {
    await exe(`
      git remote add github "https://$GITHUB_ACTOR:${github_token}@github.com/$GITHUB_REPOSITORY.git"
      git push github HEAD:${IS_PR ? GITHUB_HEAD_REF : GITHUB_REF}
    `);
    }catch (err) {}

    repro_runned = true;
  }

  return repro_runned;
}

const dvc_report = async () => {
  let from = IS_PR ? await exe(`git log -n 1 origin/${GITHUB_BASE_REF} --pretty=format:%H`) 
  : github.context.payload.before;

  if (from === '0000000000000000000000000000000000000000')
    from = await exe(`git rev-parse HEAD^`);

  from = from.replace(/(\r\n|\n|\r)/gm, "")

  const to = await exe(`git rev-parse HEAD`).replace(/(\r\n|\n|\r)/gm,"");

  const releases = await octokit.repos.listReleases({ owner, repo });

  const report = await Report.dvc_report({ from, to, releases, templates });

  return report;
}

const create_check_dvc_report = async (opts) => {
  console.log("Creating DVC report");

  const { summary } = opts;

  const started_at = new Date();
  const name = `DVC Report ${ uuid() }`;
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

const upload_release_asset = async (url, filepath) => {
  const stat = await fs.stat(filepath);

  if (!stat.isFile()) {
      console.log(`Skipping, ${filepath} its not a file`);
      return;
  }

  const file = await fs.readFile(filepath);
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
      name: `${tag_name} DVC Release`,
      head_sha: GITHUB_SHA,

      tag_name,
      body
  });

  // TODO: promisify all
  for (idx in release_files) {
    await upload_release_asset(release.data.upload_url, release_files[idx]);
  }
}

const run = async () => {
  try {
    if (IS_PR) {
      const checks = await octokit.checks.listForRef({
        owner,
        repo,
        ref: GITHUB_SHA
      });

      if (checks.data.check_runs.filter(check => {
        return check.name.includes(`${GITHUB_WORKFLOW}`)
      }).length > 1) {
        console.log('This branch is running or has runned another check. Cancelling...');
        return
      }

      try {
        await exe(`git checkout origin/${GITHUB_HEAD_REF}`);
        await exe(`dvc checkout`);
      } catch (err) {}
    }

    if (( await has_skip_ci() )) return;

    await install_dependencies();
    await DVC.init_remote();

    const repro_runned = await run_repro();
    const report = await dvc_report();

    await create_check_dvc_report({ summary: report });

    if (!release_skip && repro_runned)
      await create_release({ body: report });
  
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();