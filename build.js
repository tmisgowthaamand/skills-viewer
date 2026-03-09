// build.js — Bundles all skill markdown files into a single data.json for static deployment
const fs = require('fs');
const path = require('path');

const localSkills = path.join(__dirname, 'skills');
const parentSkills = path.join(__dirname, '..', 'skills');
const SKILLS_DIR = fs.existsSync(localSkills) ? localSkills : parentSkills;
const OUT_DIR = path.join(__dirname, 'dist');
const FILES = ['SKILL.md', 'business-plan.md', 'finance.md', 'marketing.md', 'operations.md'];

function build() {
    console.log('📦 Building static site...\n');

    // Create dist folder
    fs.mkdirSync(OUT_DIR, { recursive: true });

    // Read all businesses
    const businesses = [];
    const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name));

    for (const dir of dirs) {
        const slug = dir.name;
        const skillPath = path.join(SKILLS_DIR, slug, 'SKILL.md');
        let name = slug, emoji = '📁', letter = slug[0].toUpperCase();

        if (fs.existsSync(skillPath)) {
            const content = fs.readFileSync(skillPath, 'utf8');
            const nm = content.match(/^#\s+(.+)$/m);
            if (nm) {
                emoji = nm[1].trim().split(' ')[0] || '📁';
                name = nm[1].trim().split(' ').slice(1).join(' ') || slug;
            }
            const lm = content.match(/^letter:\s*(.+)$/m);
            if (lm) letter = lm[1].trim();
        }

        // Read all file contents
        const files = {};
        for (const f of FILES) {
            const fp = path.join(SKILLS_DIR, slug, f);
            files[f] = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '') : '# File not found';
        }

        businesses.push({ slug, name, emoji, letter, files });
        console.log(`  ✅ ${emoji} ${name}`);
    }

    // Copy image directories from skills to dist
    for (const dir of dirs) {
        const imgDir = path.join(SKILLS_DIR, dir.name, 'images');
        if (fs.existsSync(imgDir)) {
            const destDir = path.join(OUT_DIR, 'skills', dir.name, 'images');
            fs.mkdirSync(destDir, { recursive: true });
            const images = fs.readdirSync(imgDir);
            for (const img of images) {
                fs.copyFileSync(path.join(imgDir, img), path.join(destDir, img));
            }
            console.log(`  🖼️  Copied ${images.length} images for ${dir.name}`);
        }
    }

    // Write bundled data
    const dataPath = path.join(OUT_DIR, 'data.json');
    fs.writeFileSync(dataPath, JSON.stringify(businesses));
    console.log(`\n📄 data.json — ${(fs.statSync(dataPath).size / 1024 / 1024).toFixed(2)} MB`);

    // Copy index.html to dist (with static data injected)
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

    // Inject window.APP_DATA globally so API requests are never made on Vercel
    const injectScript = `<script>window.APP_DATA = ${JSON.stringify({ businesses })};</script>`;
    html = html.replace('</body>', `${injectScript}\n</body>`);

    fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html);
    console.log('📄 index.html — copied and static data injected natively');

    console.log(`\n${'='.repeat(50)}`);
    console.log(`🎉 Build complete! Files in: ${OUT_DIR}`);
    console.log(`📁 Ready to deploy the 'dist' folder`);
    console.log(`${'='.repeat(50)}\n`);
}

build();
