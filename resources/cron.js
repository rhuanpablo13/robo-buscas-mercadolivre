require().config();
const cron = require("node-schedule");
const resources = require('./resources');
const servidorEmails = require('./servidorEmails');
const main = require('./main');
const log = require('./log');

async function roboCron () {
    log.print('Executando roboCron ...')
    // cron.scheduleJob('*/59 * * * *', async () => { // a cada 5 minutos
    cron.scheduleJob('* */1 * * *', async () => { // a cada hora
    // cron.scheduleJob('*/1 * * * *', async () => { // a cada 1 minuto
        await main.executarRobo()
        log.print(data = "Fim de execução do Robô", time=true, quebraLinha=true);
    });
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
                        process.env."noreply.envioemail@gmail.com", 
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
