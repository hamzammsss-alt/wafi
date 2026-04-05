const { spawn } = require('child_process');
const electron = require('electron');

// Delete the environment variable that causes issues
delete process.env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, ['.'], {
    stdio: 'inherit',
    env: process.env // Pass the cleaned environment
});

child.on('close', (code) => {
    process.exit(code);
});
