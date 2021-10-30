const puppeteer = require('puppeteer');
const log = require('../resources/log');

async function collectData(url, headless = false, closeBrowser = true) {
        await log.print('Iniciando a coleta de dados...')
        // const browser = await puppeteer.launch()
        const browser = await puppeteer.launch({ headless: headless, devtools: false, args: ['--no-sandbox']})
        const page = await browser.newPage();
        url = 'https://lista.mercadolivre.com.br/musica/' + url;
        
        await page.goto(url);
        let registros = [];
        
        await log.print('Pesquisando em: ' + url)
        let pages = await numberPages(page);
    
        await log.print('Quantidade de páginas encontradas: ' + pages)
        if (pages == 0) {
            await browser.close();
            return []
        }
    
        if (pages == 1) {            
            registros.push(await scrap(page))
        }
    
        if (pages > 1) {
            while (await currentNumberPage(page) < pages) {                
                registros.push(await scrap(page))
                await next(page);
            }
            registros.push(await scrap(page))
        }
        
        await log.print('Encerrando a coleta de dados para ' + url)
        if (closeBrowser || headless == true)
            await browser.close();
        return registros;
}

async function scrap(page) {
    let content = await page.evaluate(() => {
        let divs = [...document.querySelectorAll('.ui-search-result__bookmark form input[name="itemId"]')];
        return divs.map((div) => div.value);
    });
    return content
}

async function next(page) {
    await Promise.all([
        await page.waitForSelector(".ui-search-results"),
        await page.click("a[title='Seguinte']"),
    ]);
}

async function numberPages(page) {
    return await page.evaluate(() => {
        if (document.querySelector('.andes-pagination__page-count') != null)
            return parseInt(document.querySelector('.andes-pagination__page-count').textContent.split('de ')[1]);
        return 1;
    });
}

async function currentNumberPage(page) {
    await page.waitForSelector(".andes-pagination__button--current")
    return await page.evaluate(() => {
        return parseInt(document.querySelector('.andes-pagination__button--current').textContent);
    });
}


module.exports = {
    collectData,
    scrap,
    next,
    numberPages,
    currentNumberPage
}