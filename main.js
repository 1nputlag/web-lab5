import { Command } from 'commander';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

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
    try{
       send(res, 200, 'ok');
    } catch (err){
     if (res.headersSent){
        res.end();
        return;
     }
     send(res, 500, 'Внутрішня помилка сервера');
    }
});

server.listen(Number(options.port), options.host);