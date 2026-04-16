const { execSync } = require('child_process');

console.log('Compiling Electron Main Process...');
try {
    execSync('npx tsc -p electron/tsconfig.json', { stdio: 'inherit' });
    console.log('Electron compilation complete.');
} catch (error) {
    console.error(`Compilation Error: ${error.message}`);
    process.exit(1);
}
