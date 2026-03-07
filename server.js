// server.js — Production server for Render (serves the static dist/ folder)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3500;

// Try dist/ first (production build), fallback to dev mode
const DIST_DIR = path.join(__dirname, 'dist');
const useStatic = fs.existsSync(path.join(DIST_DIR, 'index.html'));

if (useStatic) {
    // ─── PRODUCTION: Serve static files from dist/ ───
    const server = http.createServer((req, res) => {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        let filePath = path.join(DIST_DIR, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));

        if (!fs.existsSync(filePath)) filePath = path.join(DIST_DIR, 'index.html');

        const ext = path.extname(filePath);
        const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        res.end(content);
    });

    server.listen(PORT, () => {
        console.log(`\n  🏢 Skills Viewer (production) at http://localhost:${PORT}\n`);
    });

} else {
    // ─── DEV MODE: API-based serving ───
    const SKILLS_DIR = path.join(__dirname, '..', 'skills');

    function getBusinessList() {
        return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => {
                const skillPath = path.join(SKILLS_DIR, d.name, 'SKILL.md');
                let name = d.name, emoji = '📁', letter = d.name[0].toUpperCase();
                if (fs.existsSync(skillPath)) {
                    const content = fs.readFileSync(skillPath, 'utf8');
                    const nm = content.match(/^#\s+(.+)$/m);
                    if (nm) { emoji = nm[1].trim().split(' ')[0]; name = nm[1].trim().split(' ').slice(1).join(' ') || d.name; }
                    const lm = content.match(/^letter:\s*(.+)$/m);
                    if (lm) letter = lm[1].trim();
                }
                return { slug: d.name, name, emoji, letter, files: ['SKILL.md', 'business-plan.md', 'finance.md', 'marketing.md', 'operations.md'] };
            })
            .sort((a, b) => a.slug.localeCompare(b.slug));
    }

    const server = http.createServer((req, res) => {
        const url = new URL(req.url, `http://localhost:${PORT}`);

        if (url.pathname === '/api/businesses') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(getBusinessList()));
        } else if (url.pathname === '/api/file') {
            const slug = url.searchParams.get('slug');
            const file = url.searchParams.get('file');
            const fp = path.join(SKILLS_DIR, slug, file);
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : '# File not found');
        } else {
            const fp = url.pathname === '/' ? path.join(__dirname, 'index.html') : path.join(__dirname, url.pathname.slice(1));
            const ext = path.extname(fp);
            const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
            if (fs.existsSync(fp)) {
                res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
                res.end(fs.readFileSync(fp));
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
            }
        }
    });

    server.listen(PORT, () => {
        console.log(`\n  🏢 Skills Viewer (dev) at http://localhost:${PORT}\n`);
    });
}
