const { uuid, exec, fs } = require('./utils')
const { METRICS, DVC_METRICS_DIFF_STUB } = require('./Fixtures');

const STUB = process.env.STUB;

const setup = async () => {
  try {
    await exec('dvc');

  } catch(err) {
    console.log('installing dvc...');
    await exec('pip uninstall -y enum34', { throw_err: false });
    await exec('pip install --quiet dvc[all]');
  }
}

const init_remote = async () => {
  const dvc_remote_list = (await exec('dvc remote list', { throw_err: false })).toLowerCase();
  const has_dvc_remote = dvc_remote_list.length > 0;

  if (!has_dvc_remote) { 
    console.log(':warning: Experiment does not have dvc remote!');
    return;
  }

  // s3
  if(dvc_remote_list.includes('s3://')) {
    const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      console.log(`:warning: S3 dvc remote found but no credentials found`);
    }
  }

  // azure
  if(dvc_remote_list.includes('azure://')) {
    const { AZURE_STORAGE_CONNECTION_STRING, AZURE_STORAGE_CONTAINER_NAME } = process.env;
    if (!AZURE_STORAGE_CONNECTION_STRING || !AZURE_STORAGE_CONTAINER_NAME) {
      console.log(`:warning: Azure dvc remote found but no credentials found`);
    }
  }

  // Aliyn
  if(dvc_remote_list.includes('oss://')) {
    const { OSS_BUCKET, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_ENDPOINT } = process.env;
    if (!OSS_BUCKET || !OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_ENDPOINT) {
      console.log(`:warning: Aliyin dvc remote found but no credentials found`);
    }
  }

  // gs
  if(dvc_remote_list.includes('gs://')) {
    const { GOOGLE_APPLICATION_CREDENTIALS } = process.env;
    if (GOOGLE_APPLICATION_CREDENTIALS) {
      const path = '.dvc/tmp/GOOGLE_APPLICATION_CREDENTIALS.json';
      await fs.writeFile(path, GDRIVE_USER_CREDENTIALS);
      process.env['GOOGLE_APPLICATION_CREDENTIALS'] = path;

    } else {
      console.log(`:warning: Google storage dvc remote found but no credentials found`);
    }
  }
  
  // gdrive
  if(dvc_remote_list.includes('gdrive://')) {
    const { GDRIVE_USER_CREDENTIALS } = process.env;
    if (GDRIVE_USER_CREDENTIALS) {
        const path = '.dvc/tmp/gdrive-user-credentials.json';
        await fs.writeFile(path, GDRIVE_USER_CREDENTIALS);

    } else {
      console.log(`:warning: Google drive dvc remote found but no credentials found`);
    }
  }

  // ssh
  if(dvc_remote_list.includes('ssh://')) {
    const { DVC_REMOTE_SSH_KEY } = process.env;
    if (DVC_REMOTE_SSH_KEY) {
        const path = '~/.ssh/dvc_remote.pub';
        await fs.writeFile(path, DVC_REMOTE_SSH_KEY);
        await exec(`echo ${path} >> ~/.ssh/known_hosts`);

    } else {
      console.log(`:warning: SSH dvc remote found but no credentials found`);
    }
  }

  // HDFS
  if(dvc_remote_list.includes('hdfs://')) {
    // TODO: implement
    throw new Error(`:warning: HDFS secrets not yet implemented`);
  }

  if (has_dvc_remote) {
    console.log('Pulling from dvc remote');
    // TODO: check if -f and try would be desirable
    // projects with repro without push data previously fails
    try {
      await exec('dvc pull -f', { throw_err: false });
    } catch (err) {
      console.error('Failed pulling from remote');
    }
  }
}

const repro = async (dvc_file) => {
  return await exec(`dvc repro ${dvc_file}`, { throw_err: false, debug: true });
}

const get = async (opts) => {
  const output_tmp = `./get_${uuid()}`;
  const { input, rev, output = output_tmp, url = './' } = opts;

  const command = rev ? `dvc get --rev ${rev} -o ${output} ${url} ${input}` 
    : `dvc get -o ${output} ${url} ${input}`;

  await exec(command, { throw_err: false });
  const data = await fs.readFile(output, "utf8");

  if (output_tmp === output)
    await fs.unlink(output);

  return data;
}

const metrics_show = async (opts) => {
  const { all } = opts;
  const metrics = {};

  const dvc_out = await exec('dvc metrics show -a', { throw_err: false });

  const lines = dvc_out.split('\n');
  let branch;
  for(let i=0; i<lines.length; i++) {
      const line = lines[i];

      if (line.length) {
          const is_branch = !line.startsWith('\t');
      
          if (is_branch) {
              branch = line
                  .replace(':', '')
                  .replace('working tree', 'current'); //TODO: review, working tree not comming always?
              metrics[branch] = [];
          
          } else {
              try {
                  const path = line.split(':')[0].replace('\t', '');
                  await fs.access(path, fs.F_OK);
                  branch && metrics[branch].push(path);
              
              } catch(err) {
                  //console.log(err)
              }
          }
      }
  }

  // [branch1, branch2] cleanup
  for (metric in metrics) {
    const exploded = metric.split(', ');

    if (exploded.length > 1) {
        exploded.forEach(item => {
            metrics[item] = metrics[metric];
        });

        delete metrics[metric];
    }
  }

  const out = {};
  for (rev in metrics) {
    if (all || rev === 'current') {
        out[rev] = [];

        await Promise.all( metrics[rev].map(async (path, idx)  => {
            const data = await get({ input: path });

            out[rev][idx] = { path, data }
        }));
    } 
  }

  return out;
}




const metrics_diff = async () => {
  return DVC_METRICS_DIFF_STUB;
      
  // TODO: remove STUB
  const json = await exe('dvc metrics diff --show-json');
  const data = JSON.parse(json);

  return data;
}

const diff = async (from, to) => {
  // TODO: Replace this section with real output
  const mock_outs = (total) => {
    const files = [];

    for (let i=0; i<total; i++)
      files.push({ path: `file${i}`, size: 0 });

    return  files;
  }

  const dvc_out = await exec(`dvc diff ${from} ${to}`, { throw_err: false });
  //1799 files untouched, 0 files modified, 1000 files added, 1 file deleted, size was increased by 23.0 MB
  // const regex = /(\d+) files? untouched, (\d+) files? modified, (\d+) files? added, (\d+) files? deleted/g;
  //files summary: 15 added, 2 deleted, 1 modified
  const regex = /files summary: (\d+) added, (\d+) deleted, (\d+) modified/g;
  const match = regex.exec(dvc_out);

  return {
      added: mock_outs(match[1]),
      deleted: mock_outs(match[2]),
      modified: mock_outs(match[3]),
  };
}

exports.setup = setup;
exports.init_remote = init_remote;

exports.repro = repro;
exports.get = get;
exports.metrics_show = metrics_show;
exports.metrics_diff = metrics_diff;
exports.diff = diff;
