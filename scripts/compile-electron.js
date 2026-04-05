const { exec } = require('child_process');

console.log('Compiling Electron Main Process...');
exec('npx tsc -p electron/tsconfig.json', (error, stdout, stderr) => {
    if (error) {
        console.error(`Compilation Error: ${error.message}`);
        return;
    }
    if (stderr) console.error(stderr);
    console.log(stdout);
    console.log('Electron compilation complete.');
});
