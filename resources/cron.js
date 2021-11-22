const cronn = require("node-schedule");
const resources = require('./resources');
const servidorEmails = require('./servidorEmails');
const main = require('./main');
const log = require('./log');

const QUEBRA = '\n------------------------------------------------------------------------------------------------------------------- \n'

const mypuppeteer = require('./puppeteer');
const emailMaker = require('./email-maker');

async function roboCron () {
    log.print('Executando roboCron ...')
    // cron.scheduleJob('*/59 * * * *', async () => { // a cada 5 minutos
    // cron.scheduleJob('* */1 * * *', async () => { // a cada hora
    cronn.scheduleJob('*/1 * * * *', async () => { // a cada 1 minuto
        await executarRobo()
        log.print(data = "Fim de execução do Robô", time=true, quebraLinha=true);
    });
}

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
                await roboEmails()
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


async function roboEmails () {
    await log.print('Executando roboCronEmail ...')
    
    let novosDiscos = await resources.carregarArquivoEmail()
    
    if (novosDiscos.status) {
        let emailDest = await resources.buscaEmail();        
        if (emailDest) {
            try {
                let content = novosDiscos.data

                if (content.length > 0) {
                  
                    await servidorEmails.enviarEmail(
                        "noreply.envioemail@gmail.com", 
                        [emailDest, 'rhuanpablo13@hotmail.com'],
                        'Aqui estão novos discos que encontrei pra vc :)',
                        content
                    )
                    .then((res, rej) => {
                        if (res) {                            
                            resources.apagarArquivoUrl()
                            resources.apagarArquivoEmail()
                        }
                        else log.print('Erro ao enviar email')
                    });
                }
            } catch (error) {
                await log.print(error)
            }
        } else {
            await log.print('Nenhum email cadastrado')    
        }
    } else {
        await log.print('Nenhum disco encontrado para enviar emails')
    }
}


module.exports = {
    roboCron,
    roboEmails
}
