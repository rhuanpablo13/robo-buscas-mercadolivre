const QUEBRA = '\n------------------------------------------------------------------------------------------------------------------- \n'

const log = require('./log');
const resources = require('./resources');
const mypuppeteer = require('./puppeteer');
const cron = require('./cron');
const emailMaker = require('./email-maker');


async function executarRobo() {
    await log.print('Iniciando o robô :)')
    let termos = await resources.todosTermos()
    let discos = [];

    if (termos != null) {
        for (const termo of termos) {
            await log.print('termo = ' + termo.descricao)
            let teste = await mypuppeteer.collectData(termo.descricao, true, true)
            let retorno = {
                'id_termo': termo.id,
                'termo': termo.descricao,
                'data': teste
            }
            discos.push(retorno)
        }

        
        if (discos != null) {                
            for (const disco of discos) {
                await resources.tratarRegistro(disco)
            }

            if (await resources.temDadosNoArquivoUrl()) {
                await resources.gravarNoArquivoEmail(emailMaker.getInicio())
                let urls = await resources.carregarArquivoUrls();
                await resources.gravarNoArquivoEmail(urls.data)
                await resources.gravarNoArquivoNovaUrl(emailMaker.getFim())
                await cron.roboEmails()
            }
        } else {
            console.log('não achou os discos')
        }       

    } else {
        console.log('não achou os dados')
    }

    log.print(QUEBRA)
    console.log("fim")
}

module.exports = {
    executarRobo
}
