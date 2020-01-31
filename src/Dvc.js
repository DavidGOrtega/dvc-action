const util = require('util')
const execp = util.promisify(require('child_process').exec)
const fs = require('fs').promises
const FIXTURES = require('./Fixtures').METRICS;
const STUB = process.env.STUB;

const uuid = () =>{
    return new Date().getUTCMilliseconds()
}

const exec = async (command) => {
    const { stdout, stderr } = await execp(command);
  
    //if (stderr) throw new Error(stderr);
  
    return stdout;
}

const has_remote = async() => {
    return (await exec('dvc remote list')).length > 0;
}

const metrics_show = async (opts) => {
    const { all } = opts;
    const metrics = {};

    const dvc_out = await exec('dvc metrics show -a');
 
    const lines = dvc_out.split('\n');
    let branch;
    for(let i=0; i<lines.length; i++) {
        const line = lines[i];

        if (line.length) {
            const is_branch = !line.startsWith('\t');
        
            if (is_branch) {
                branch = line
                    .replace(':', '')
                    .replace('working tree', 'current');
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
    if (STUB) return DVC_METRICS_DIFF_STUB;
        
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

    const dvc_out = await exec(`dvc diff ${from} ${to}`);

    //1799 files untouched, 0 files modified, 1000 files added, 1 file deleted, size was increased by 23.0 MB
    const regex = /(\d+) files? untouched, (\d+) files? modified, (\d+) files? added, (\d+) files? deleted/g;
    const match = regex.exec(dvc_out);

    return {
        unmodified: mock_outs(match[1]),
        modified: mock_outs(match[2]),
        added: mock_outs(match[3]),
        deleted: mock_outs(match[4]),
    };
}

const init_remote = async () => {
    const dvc_remote_list = await exec('dvc remote list');
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
        await fs.writeFile(path, GDRIVE_USER_CREDENTIALS);
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
          await fs.writeFile(path, GDRIVE_USER_CREDENTIALS);
  
      } else {
        console.log(`:warning: Google drive dvc remote found but no credentials found`);
      }
    }
  
    // ssh
    if(dvc_remote_list.toLowerCase().includes('ssh://')) {
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
    if(dvc_remote_list.toLowerCase().includes('hdfs://')) {
      // TODO: implement
      throw new Error(`:warning: HDFS secrets not yet implemented`);
    }
  
    if (has_dvc_remote) {
      console.log('Pulling from dvc remote');
      // TODO: check if -f and try would be desirable
      // projects with repro without push data previously fails
      try {
        await exec('dvc pull -f');
      } catch (err) {
          console.error('Failed pulling from remote');
      }
      
    }
}

const get = async (opts) => {
    if (STUB)
        return JSON.stringify(FIXTURES[opts.rev ? `${opts.input}@${opts.rev}` : opts.input]);

    const output_tmp = `./get_${uuid()}`;
    const { input, rev, output = output_tmp, url = './' } = opts;

    try {
        if (rev)
            await exec(`dvc get --rev ${rev} -o ${output} ${url} ${input}`);
        else 
            await exec(`dvc get -o ${output} ${url} ${input}`);

        const data = await fs.readFile(output, "utf8");

        return data;

    } finally {
        if (output_tmp === output)
            await fs.unlink(output);
    }
}

exports.has_remote = has_remote;
exports.metrics_show = metrics_show;
exports.metrics_diff = metrics_diff;
exports.diff = diff;
exports.init_remote = init_remote;
exports.get = get;
