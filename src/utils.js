const util = require('util')
const fs = require('fs').promises
const glob = util.promisify(require('glob'))

fs.exists = async (file) => {
  try {
    await fs.access(file, fs.F_OK);
  } catch (err) {
    return false;
  }

  return true;
}

const execp = util.promisify(require('child_process').exec)
const exec = async (command, opts) => {
  const { debug, throw_err = true } = opts || {};
  const { stdout, stderr } = await execp(command);

  if (debug) 
    console.log(`\nCommand: ${command}\n\t${stdout}\n\t${stderr}`);

  if (throw_err && stderr) throw new Error(stderr);

  return stdout;
}

const uuid = () => {
  return new Date().getUTCMilliseconds()
}

const imgur = require('imgur')
imgur.setClientId('9ae2688f25fae09')

const upload_image = async (img_path) => {
  const imgur_resp = await imgur.uploadFile(img_path);
  return imgur_resp.data.link;
}

exports.fs = fs;
exports.glob = glob;
exports.exec = exec;
exports.uuid = uuid;
exports.upload_image = upload_image;