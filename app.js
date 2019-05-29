const express = require('express');
const puppeteer = require('puppeteer');

const app = express();

// app config
app.disable('x-powered-by');

app.get('/', (req, res) => {
    if (req.hostname !== 'localhost' && req.get('X-Forwarded-Proto') === 'http') {
        res.status(403).end();
        return;
    }
    (async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto('https://www.otchy.net', {waitUntil: 'domcontentloaded'});
        const html = await page.$eval('html', el => {
            return el.innerHTML;
        });
        res.send(html);
    })();
});

const listener = app.listen(8080, () => {
    const port = listener.address().port;
    const suffix = port == 80 ? '' : `:${port}`
    console.log(`http://localhost${suffix}/`);
    console.log('Ctrl+C to quit');
});
