const { uuid, exec, fs } = require('./src/utils')
const DVC = require('./src/Dvc');
const Report = require('./src/Report');

const core = require('@actions/core')
const github = require('@actions/github')

const GITHUB_TOKEN = core.getInput('github_token');
const {
  GITHUB_REPOSITORY,
  GITHUB_EVENT_NAME,
  GITHUB_WORKFLOW,
  GITHUB_HEAD_REF,
  GITHUB_REF,
  GITHUB_HEAD_SHA,
  GITHUB_SHA,
} = process.env;

const octokit = new github.GitHub(GITHUB_TOKEN);

const IS_PR = GITHUB_EVENT_NAME === 'pull_request';
const HEAD_SHA = GITHUB_HEAD_SHA;
const SHA = GITHUB_SHA;
const BASE_REF = GITHUB_BASE_REF;
const HEAD_REF = GITHUB_HEAD_REF;
const REF = GITHUB_REF;
const [OWNER, REPO] = GITHUB_REPOSITORY.split('/');

const DVC_REPRO_FILE = core.getInput('dvc_repro_file');
const TEMPLATES = core.getInput('vega_templates') ? core.getInput('vega_templates').split(/[ ,]+/) : [];
const RELEASE_FILES = core.getInput('release_files') ? core.getInput('release_files').split(/[ ,]+/) : [];
const RELEASE_SKIP = core.getInput('release_skip')  === 'true';
const SKIP_CI = core.getInput('skip_ci');

// console.log(process.env);
// console.log(github.context);
// console.log(github.context.payload);
 
const has_skip_ci = async (skip_ci) => {
  const last_log = await exec('git log -1');
  return last_log.includes(skip_ci);
}

const run_repro = async (opts) => {
  const { dvc_repro_file, user_email, user_name, skip_ci, remote, ref } = opts;

  console.log(`Running dvc repro ${dvc_repro_file}`);

  if (dvc_repro_file === 'None') {
    console.log('DVC repro skipped by None');
    return false;
  }

  const file_exists = await fs.exists(dvc_repro_file);
  if (!file_exists) throw new Error(`DVC repro file ${dvc_repro_file} not found`);

  const dvc_repro = DVC.repro(dvc_repro_file);
  const repro_ran = !dvc_repro.includes('pipelines are up to date');

  if (repro_ran) {
    console.log('dvc repro ran, updating remotes');
    await exec('dvc commit -f');

    await exec(`git config --local user.email "${user_email}"`);
    await exec(`git config --local user.name "${user_name}"`);
    await exec(`git add --all`);
    await exec(`git commit -a -m "dvc repro ${skip_ci}"`);

    await exec('dvc push');

    await exec(`git remote add remote "${remote}"`, { throw_err: false });
    await exec(`git push remote HEAD:${ref}`, { throw_err: false });
  
  } else 
    console.log('pipelines are up to date');

  return repro_ran;
}

const dvc_report = async (opts) => {
  const sanitize = (str) => str.replace(/(\r\n|\n|\r)/gm, "");

  const { templates } = opts;

  const releases = await octokit.repos.listReleases({ OWNER, REPO });

  // BASE_SHA VS SHA
  const from = sanitize(IS_PR ? 
    await exec(`git log -n 1 origin/${BASE_REF} --pretty=format:%H`) : 
    await exec(`git rev-parse HEAD^`));

  const to = IS_PR ? HEAD_SHA : sanitize(await exec(`git rev-parse HEAD`));

  const report = await Report.dvc_report({ from, to, templates, releases });

  return report;
}

const create_check_dvc_report = async (opts) => {
  console.log("Creating DVC report");
  const { head_sha, report, title = 'DVC Report' } = opts;

  const name = `${title} ${uuid()}`;
  const started_at = new Date();
  const completed_at = new Date();
  const summary = report;
  
  const check = await octokit.checks.create({
    OWNER,
    REPO,
    head_sha,
    name,
    started_at,
    completed_at,
    conclusion: 'success',
    status: 'completed',
    output: { title, summary }
  })

  return check;
}

const create_release = async (opts) => {
  const { head_sha, report, release_files } = opts;

  const tag_name = head_sha.slice(0, 7);
  const name = `${tag_name} DVC Release`;
  const body = report;

  const release = await octokit.repos.createRelease(
    { OWNER, REPO, head_sha, tag_name, name, body });

  // assets
  const upload_asset = async (url, filepath) => {
    const stat = await fs.stat(filepath);
  
    if (!stat.isFile()) {
        console.log(`Skipping, ${filepath} its not a file`);
        return;
    }
  
    const name = path.basename(filepath);
    const file = await fs.readFile(filepath);
    const mime = "binary/octet-stream"; // TODO: mime type
    const headers = { "content-type": mime, "content-length": stat.size };

    await octokit.repos.uploadReleaseAsset({ url, name, file, headers });
  }

  // TODO: promisify all
  for (idx in release_files) {
    await upload_asset(release.data.upload_url, release_files[idx]);
  }

  return release;
}

const run = async () => {
  const ref = IS_PR ? HEAD_REF : REF;
  const head_sha = IS_PR ? HEAD_SHA : SHA;

  const dvc_repro_file = DVC_REPRO_FILE;
  const user_email = 'action@github.com';
  const user_name = 'GitHub Action';
  const remote = `https://${OWNER}:${GITHUB_TOKEN}@github.com/${OWNER}/${REPOSITORY}.git`;
  const skip_ci = SKIP_CI;

  try {

    if (IS_PR) {
      const checks = await octokit.checks.listForRef({ OWNER, REPO, ref });

      if (checks.data.check_runs.filter(check => {
        return check.name.includes(`${GITHUB_WORKFLOW}`)
      }).length > 1) {
        console.log('This branch is running or has runned another check. Cancelling...');
        return
      }
    }

    if (IS_PR) {
      try {
        await exec(`git checkout origin/${ref}`);
        await exec(`dvc checkout`);
      } catch (err) {}
    }

    const do_skip = await has_skip_ci(skip_ci);
    if (do_skip) {
      console.log(`${skip_ci} found; skipping task`);
      return;
    } 

    await DVC.setup();
    await DVC.init_remote();

    const repro_ran = await run_repro(
      { dvc_repro_file, user_email, user_name, skip_ci, remote, ref });

    const report = await dvc_report();

    await create_check_dvc_report({ head_sha, report, templates: TEMPLATES });

    if (!RELEASE_SKIP && repro_ran)
      await create_release({ head_sha, report, release_files: RELEASE_FILES });
  
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();