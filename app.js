const express = require('express');
const puppeteer = require('puppeteer');
const parseUrl = require('url').parse;

const PAGE_TIMEOUT = 5000;
const CHECK_REDIRECT_TIMNEOUT = 10000;
const CHECK_REDIRECT_INTERVAL = 100;
const LAT_LONG_URL_REGEX = /.+\/@([\d\.]+),([\d\.]+),[\d]+z\/.+/;

const app = express();

// app config
app.disable('x-powered-by');

app.get('/', (req, res) => {
    if (req.hostname !== 'localhost' && req.get('X-Forwarded-Proto') === 'http') {
        res.status(400).send('Require HTTPS');
        return;
    }
    const url = req.query.url;
    if (!url) {
        res.status(400).send('url parameter is required');
        return;
    }
    const parsedUrl = parseUrl(url);
    const {protocol, host, pathname} = parsedUrl;
    if (!protocol || !host || !pathname) {
        res.status(400).send('invalid url format');
        return;
    }
    (async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const pageRes = await page
            .goto(url, {waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT})
            .catch(e => console.error(e));
        if (!pageRes) {
            res.status(500).send(`Couldn't access ${url} in ${PAGE_TIMEOUT} msec`);
            return;
        }
        const timeStarted = (new Date()).getTime();
        const checkRedirect = () => {
            const pageUrl = page.url();
            const results = LAT_LONG_URL_REGEX.exec(pageUrl);
            if (results) {
                const lat = results[1];
                const long = results[2];
                res.set('Content-Type', 'text/plain').send(`lat = ${lat}, long = ${long}\n`);
                return;
            }
            const timeSpent = (new Date()).getTime() - timeStarted;
            if (timeSpent >= CHECK_REDIRECT_TIMNEOUT) {
                res.status(500).send(`Couldn't get lat and long from ${pageUrl} in ${CHECK_REDIRECT_INTERVAL} msec`);
                return;
            }
            setTimeout(checkRedirect, CHECK_REDIRECT_INTERVAL);
        };
        checkRedirect();
    })();
});

const listener = app.listen(8080, () => {
    const port = listener.address().port;
    const suffix = port == 80 ? '' : `:${port}`
    console.log(`http://localhost${suffix}/`);
    console.log('Ctrl+C to quit');
});
