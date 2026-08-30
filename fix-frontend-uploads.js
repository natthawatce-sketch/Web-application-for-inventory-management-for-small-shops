const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'frontend/src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if(file.endsWith('.jsx')) results.push(file);
        }
    });
    return results;
}

const files = walk(srcPath);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // Replace: `/uploads/${var}` with (var?.startsWith('http') ? var : `/uploads/${var}`)
    // Regex to find `/uploads/${something}`
    const regex = /`\/uploads\/\$\{([^}]+)\}`/g;
    
    if (regex.test(content)) {
        content = content.replace(regex, "($1?.startsWith('http') ? $1 : `/uploads/${$1}`)");
        fs.writeFileSync(file, content);
        console.log('Updated', file);
    }
});
