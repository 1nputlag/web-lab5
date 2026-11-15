import { Command } from 'commander';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import superagent from 'superagent';

const program = new Command();

program.helpOption('--help', 'показати довідку');

program.requiredOption('-h, --host <address>', 'адреса сервера');
program.requiredOption('-p, --port <number>', 'порт сервера');
program.requiredOption('-c, --cache <path>', 'кеш');

program.parse();
const options = program.opts();

const cacheDir = path.resolve(options.cache);

try{
await fs.mkdir(cacheDir, { recursive: true});
} catch(err){
    console.error('Не вдалося створити теку кешу:', err.message);
    process.exit(1);
}

function send(res, status, body, headers){
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers});
    res.end(body);
}

const server = http.createServer(async (req, res) => {
    try {
        if (req.method !== 'GET') {
            send(res, 405, 'Метод не дозволений', { Allow: 'GET' });
            return;
        }

        const pathname = req.url.split('?')[0];
        const match = pathname.match(/^\/(\d{3})$/);
        if (!match) {
            send(res, 404, 'Картинку не знайдено');
            return;
        }
        const code = match[1];

        const filePath = path.join(cacheDir, code + '.jpg');

        let image;
        try {
            image = await fs.readFile(filePath);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
        if (image) {
            send(res, 200, image, { 'Content-Type': 'image/jpeg', 'X-Cache': 'HIT' });
            return;
        }

        let response;
        try {
            response = await superagent.get('https://http.cat/' + code);
        } catch (err) {
            send(res, 404, 'Картинку не знайдено');
            return;
        }

        await fs.writeFile(filePath, response.body);
        send(res, 200, response.body, { 'Content-Type': 'image/jpeg', 'X-Cache': 'MISS' });
    } catch (err) {
        if (res.headersSent) {
            res.end();
            return;
        }
        send(res, 500, 'Внутрішня помилка сервера');
    }
});

server.listen(Number(options.port), options.host);