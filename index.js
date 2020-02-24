console.log(process.env);

const core = require('@actions/core')
const github = require('@actions/github')

const { exec } = require('./src/utils')
const DVC = require('./src/Dvc')
const CI = require('./src/CI')

const GITHUB_TOKEN = core.getInput('github_token');
const octokit = new github.GitHub(GITHUB_TOKEN);

const {
  GITHUB_REPOSITORY,
  GITHUB_EVENT_NAME,
  GITHUB_HEAD_REF,
  GITHUB_REF,
  GITHUB_HEAD_SHA,
  GITHUB_SHA,
  GITHUB_WORKFLOW,
} = process.env;

const IS_PR = GITHUB_EVENT_NAME === 'pull_request';
const HEAD_SHA = GITHUB_HEAD_SHA;
const SHA = GITHUB_SHA;
const HEAD_REF = GITHUB_HEAD_REF;
const REF = GITHUB_REF;
const [OWNER, REPO] = GITHUB_REPOSITORY.split('/');

const check_action_ran_ref = async (opts) => {
  const { owner, repo, ref } = opts;
  const checks = await octokit.checks.listForRef({ owner, repo, ref });

  return (checks.data.check_runs.filter(check => {
    return check.name.includes(`${GITHUB_WORKFLOW}`)
  }).length > 1) 

}

const create_check_dvc_report = async (opts) => {
  const { 
    owner,
    repo,
    head_sha, 
    report, 
    started_at = new Date(),
    completed_at = new Date(),
    conclusion = 'success',
    status = 'completed',
  } = opts;

  const title = CI.DVC_TITLE;
  const name = title;
  const check = await octokit.checks.create({
    owner,
    repo,
    head_sha,
    name,
    started_at,
    completed_at,
    conclusion,
    status,
    output: { title, summary: report }
  });

  return check;
}

const run = async () => {
  const ref = IS_PR ? HEAD_REF : REF;
  const head_sha = IS_PR ? HEAD_SHA : SHA;
  const owner = OWNER;
  const repo = REPO;
  const user_email = 'action@github.com';
  const user_name = 'GitHub Action';
  const remote = `https://${owner}:${GITHUB_TOKEN}@github.com/${owner}/${repo}.git`;

  const dvc_pull = core.getInput('dvc_pull');
  const repro_targets = core.getInput('repro_targets');
  const metrics_diff_targets = core.getInput('metrics_diff_targets') ? core.getInput('metrics_diff_targets').split(/[ ,]+/) : [];

  if (await CI.commit_skip_ci()) {
    console.log(`${CI.SKIP} found; skipping task`);
    return;
  } 
  
  /* if (IS_PR && await check_action_ran_ref({ owner, repo, ref })) {
    console.log('This ref is running or has runned another check. Cancelling...');
    return;
  } */

  await DVC.setup();
  await DVC.init_remote({ dvc_pull });

  if (IS_PR) {
    await exec('git fetch --prune --unshallow', { throw_err: false });
    await exec(`git checkout origin/${ref}`);
    await exec(`dvc checkout`, { throw_err: false });
  }

  const repro_ran = await CI.run_dvc_repro(
    { user_email, user_name, remote, ref, repro_targets });

  console.log("Generating Dvc Report");
  const from = repro_ran ? head_sha : '';
  const to = repro_ran ? repro_ran : '';
  const dvc_report_out = await CI.dvc_report({ from, to, metrics_diff_targets });

  console.log("Creating check");
  await create_check_dvc_report({ 
    owner,
    repo,
    head_sha: repro_ran ? repro_ran : head_sha, 
    report: dvc_report_out.md });
}

run().catch(e => core.setFailed(e.message));