const fs = require('fs');
const path = require('path');

function replaceInFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInFiles(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            const originalContent = content;
            
            // Replace template literal
            content = content.replace(/`http\:\/\/\$\{window\.location\.hostname\}\:5000/g, '`');
            
            // It might be `http://${window.location.hostname}:5000/...`
            // If it becomes `/...`, it's a relative URL from root, which is correct.
            // Example: `http://${window.location.hostname}:5000/api/users` -> `/api/users`
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

replaceInFiles(path.join(__dirname, 'src'));
console.log('Done replacing URLs');
