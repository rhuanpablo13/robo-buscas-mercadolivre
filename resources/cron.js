const cronn = require("node-schedule");
const resources = require('./resources');
const servidorEmails = require('./servidorEmails');
const main = require('./main');
const log = require('./log');

const QUEBRA = '\n------------------------------------------------------------------------------------------------------------------- \n'

const mypuppeteer = require('./puppeteer');
const emailMaker = require('./email-maker');

async function roboCron () {
    await log.print('Executando roboCron ...')
    // cronn.scheduleJob('*/59 * * * *', async () => { // a cada 5 minutos
    cronn.scheduleJob('2 * * * *', async () => { // a cada hora
    // cronn.scheduleJob('*/30 * * * *', async () => { // a cada 30 minutos
    // cronn.scheduleJob('1 * * * *', async () => { // a cada 3 minutos
        await executarRobo()
        await log.print(data = "Fim de execução do Robô", time=true, quebraLinha=true);
    });
}

async function executarRobo() {
    await log.print('Iniciando o robô :)')
    let termos = await resources.todosTermos()
    let discos = [];

    if (termos != null) {
        var count = 0
        for (const termo of termos) {
            await log.print('\ntermo = ' + termo.descricao)
            let teste = await mypuppeteer.collectData(termo.descricao, true, true)
            let disco = {
                'id_termo': termo.id,
                'termo': termo.descricao,
                'data': teste
            }
            discos.push(disco)
            

            if (discos.length == 10) {
                count++

                await log.print('Tratando ' + (count * 10) + ' discos de um total de: ' + termos.length)

                for (const disco of discos) {
                    await resources.tratarRegistro(disco)
                }
    
                if (await resources.temAmostrasDiscosNoBanco()) {
                    let contentEmail = emailMaker.getInicio()
                    contentEmail += await resources.carregarAmostrasDiscosNoBanco()
                    contentEmail += emailMaker.getFim()                    
                    await roboEmails(contentEmail)
                    await resources.apagarNoBancoAmostrasDiscos()
                    
                    // await resources.gravarNoArquivoEmail(emailMaker.getInicio())
                    // let urls = await resources.carregarArquivoUrls();
                    // await resources.gravarNoArquivoEmail(urls.data)
                    // await resources.gravarNoArquivoNovaUrl(emailMaker.getFim())
                    // await roboEmails()
                }
                discos = [];
            }
        }

        

    } else {
        console.log('não achou os dados')
    }

    log.print(QUEBRA)
    console.log("fim")
}


async function roboEmails2 (emails) {
    await log.print('Executando roboCronEmail 2 ...')
    
    if (emails != null && typeof(emails) !== "undefined") {
        let emailDest = await resources.buscaEmail();
        if (emailDest) {
            try {
                await servidorEmails.enviarEmail(
                    "noreply.envioemail@gmail.com", 
                    // [emailDest, 'rhuanpablo13@hotmail.com'],
                    ['rhuanpablo13@hotmail.com'],
                    'Aqui estão novos discos que encontrei pra vc :)',
                    emails
                )
                .then((res, rej) => {
                    if (res) {}
                    else log.print('Erro ao enviar email')
                    resources.apagarNoBancoAmostrasDiscos()
                });
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
                        // [emailDest, 'rhuanpablo13@hotmail.com'],
                        ['rhuanpablo13@hotmail.com'],
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
