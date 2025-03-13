import fs from "fs";

function loadSettings(file) {
    const data = fs.readFileSync(file, 'utf8');
    const settings = {};
    data.split(/\r?\n/).forEach(line => {
        const [key, value] = line.split('=').map(item => item.replace(/^"|"$/g, ''));
        if (key && value !== undefined) {
            settings[key] = value.includes(',') ? value.split(',').map(item => item.replace(/^"|"$/g, '')) : value;
        }
    });
    return settings;
}


const plugin = 'bobbintb.system.dirt';
// const settings = loadSettings(`/boot/config/plugins/${plugin}/${plugin}.cfg`);


const newSettings = loadSettings(`/boot/config/plugins/${plugin}/${plugin}.cfg`);
console.log(newSettings)
newSettings.share.forEach(element => console.log(element));

const added = newSettings.filter(x => !oldSettings.includes(x));
const removed = oldSettings.filter(x => !newSettings.includes(x));
