const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = [
    'node_modules', '.git', 'dist', 'build', 'src-tauri/target',
    '.gemini', '.claude', '.qwen', '.kiro', '.augment',
    '_bmad', '.agent'  // Workflow engine (static, rarely changed)
];

const IGNORE_FILES = ['package-lock.json', 'filepath.md', '.gitignore'];

// Only include important files
const INCLUDE_PATTERNS = [
    /\.tsx?$/,   // TypeScript/TSX
    /\.rs$/,     // Rust
    /\.toml$/,   // Cargo/config
    /package\.json$/,
    /tsconfig.*\.json$/,
    /vite.*\.ts$/,
    /vitest.*\.ts$/
];

// Include only docs/ markdown and top-level README
const INCLUDE_MD_DIRS = ['docs/epics.md', 'docs/sprint-artifacts', 'README.md'];

function shouldInclude(filePath) {
    // Exclude tests
    if (filePath.includes('.test.') || filePath.includes('/test/')) return false;

    // Exclude migration SQL
    if (filePath.includes('migrations/') && filePath.endsWith('.sql')) return false;

    // Markdown: only docs/ and README.md
    if (filePath.endsWith('.md')) {
        return INCLUDE_MD_DIRS.some(dir => filePath.startsWith(dir) || filePath === dir);
    }

    // Check patterns
    return INCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const relativePath = path.relative(process.cwd(), fullPath);

        if (fs.statSync(fullPath).isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                getAllFiles(fullPath, arrayOfFiles);
            }
        } else {
            if (!IGNORE_FILES.includes(file) && shouldInclude(relativePath)) {
                arrayOfFiles.push(relativePath);
            }
        }
    });

    return arrayOfFiles;
}

function generateManifest() {
    console.log('Generating filepath.md manifest...');
    const files = getAllFiles(process.cwd());

    const content = `# Project File Manifest

**Auto-generated** list of key source files. Excludes: tests, migrations, workflow engine, build artifacts.

## Files (${files.length} total)

${files.sort().map(f => `- [\`${f}\`](file://${path.resolve(f)})`).join('\n')}

---
*Generated: ${new Date().toISOString()}*
`;

    fs.writeFileSync('filepath.md', content);
    console.log(`✓ Manifest generated: ${files.length} files (was ~8000, now optimized)`);
}

generateManifest();
