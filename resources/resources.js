const QUEBRA = '\n------------------------------------------------------------------------------------------------------------------- \n'
let URL_PRODUTO = 'https://produto.mercadolivre.com.br/'

Promise = require('bluebird'); 



const nodemailer = require('nodemailer');
const fs = require('fs');
const cron = require("node-schedule");
const lineReader = require('line-reader');
const util = require( 'util' );
const mypuppeteer = require('../resources/puppeteer');
const log = require('../resources/log');
const emailMaker = require('../resources/email-maker');

let con = null
function setConnection(conParam) {
    con = conParam;
}

async function roboCron () {
    log.print('Executando roboCron ...')
    // cron.scheduleJob('*/59 * * * *', async () => { // a cada 5 minutos
    // cron.scheduleJob('* */1 * * *', async () => { // a cada hora
    cron.scheduleJob('*/1 * * * *', async () => { // a cada 1 minuto
        // await executarRobo()
        // await enviarEmails()
        log.print(data = "Fim de execução do Robô", time=true, quebraLinha=true);
    });
}


async function carregarArquivoUrls() {
    return new Promise(async (resolve, reject) => {
        fs.readFile('./urls.txt', 'utf8' , (err, data) => {
            if (err) { 
                log.print(err); 
                resolve ({'status': false, 'data': []})
            }            
            resolve ({'status': true, 'data': data})
        })
    })
}

async function carregarArquivoEmail() {
    return new Promise(async (resolve, reject) => {
        fs.readFile('./email.txt', 'utf8' , (err, data) => {
            if (err) { 
                log.print(err); 
                resolve ({'status': false, 'data': []})
            }            
            resolve ({'status': true, 'data': data})
        })
    })
}

async function enviarEmails(novosDiscos, dest_email, qtd_discos = 0) {
    if (qtd_discos > 0) await log.print('Enviando email com discos novos')

    novosDiscos = 'teste'
    dest_email = 'rhuanpablo13@hotmail.com'

    

    return new Promise(async (resolve, reject) => {
        await sendMail(
            "noreply.envioemail@gmail.com", 
            "EnvioEmail@123", 
            novosDiscos,
            dest_email,
            'Aqui estão novos discos que encontrei pra vc :) '
        ).
        then((res, rej) => {
            if (res)
                resolve (true)
            else
                reject (true)
        })
    })
}


async function enviarEmailTeste(dest_email) {    
    log.print('Enviando email de teste para: ' + dest_email)

    return new Promise(async (resolve, reject) => {
        await sendMail(
            "noreply.envioemail@gmail.com", 
            "EnvioEmail@123", 
            'Testando envio de emails do seu Robô de Buscas do Mercado Livre :)',
            dest_email,
            'Um Oi do seu Robozinho de Buscas!! :) '
        ).
        then((res, rej) => {
            if (res)
                resolve (true)
            else
                reject (true)
        })
    })
}



async function sendMail(user_mail, pass, content, dest_email, subject) {

    var maillist = [
        dest_email,
        'rhuanpablo13@hotmail.com'
    ];

    var smtpTransport = nodemailer.createTransport({
        service: "Gmail",
        host: 'smtp.gmail.com',
        port: 25,
        secure: false,
        tls: { rejectUnauthorized: false },
        auth: {
            user: "rhuanpablo13saga@gmail.com", 
            pass: "Fofinho@123",
        }
    });

    var emailASerEnviado = {
        from: user_mail,
        to: maillist,
        subject: subject,
        html: content + '',
    };

    return new Promise((resolve, reject) => {
        smtpTransport.sendMail(emailASerEnviado, function(error, response) {
            if (error) {
            console.log(error);
            } else {
            console.log(response);
            }
            smtpTransport.close();
        });
    });
      
    // const remetente = nodemailer.createTransport({
    //     service: 'gmail',
    //     host: 'smtp.gmail.com',
    //     port: 25,
    //     secure: false, // true for 465, false for other ports
    //     auth: {
    //         user: user_mail,
    //         pass: pass
    //     },
    //     tls: { rejectUnauthorized: false }
    // });
      
    
    // return new Promise((resolve, reject) => {
    //     remetente.sendMail(emailASerEnviado, response => {
    //         if (response) {
    //             log.print('Falha. ' + response);
    //             reject(false);
    //         } else {
    //             log.print('Email enviado com sucesso. ');
    //             resolve(true);
    //         }
    //     })
    // });
}



/**
 * Termo:
 * return {
        'id' : ID,
        'descricao' : DESCRICAO
    }
 * @returns Object
 */
async function todosTermos() {
    var sql = "SELECT ID, DESCRICAO FROM TERMO";
    let results = await con.awaitQuery(sql)
    
    await log.print('Buscando todos os termos cadastrados => Encontrados: ' + results.length)

    return results.map((ret) => {                
        return {
            'id' : ret.ID,
            'descricao' : ret.DESCRICAO
        }
    })
}



/**
 * Método responsável por inserir termos de busca.
 * Retorna null se o termo já estiver cadastrado, ou objeto inserido.
 * @param string termo 
 * @returns null | objeto inserido
 */
async function inserirNovoTermoDeBusca(termo) {

    if (await existeTermo(termo) == true) {
        return null;
    }

    var sql = "INSERT INTO TERMO(DESCRICAO) VALUES (?)";
    let results = await con.awaitQuery(sql, [termo])

    console.log(results)
    await log.print("Inserindo novo termo de busca: " + termo)
    return results
}

/**
 * Método responsável por verificar se o código do disco já existe no banco.
 * @param string codigo 
 * @returns bool
 */
 async function existeCodigo(codigo) {
    let url_produto = URL_PRODUTO + codigo.replace('MLB', 'MLB-')
    var sql = "SELECT COUNT(URL) AS QTD FROM DISCO WHERE URL = ?";
    let results = await con.awaitQuery(sql, [url_produto])
        
    if (results == '' || results[0].QTD == 0)
        return false
    return true
}

/**
 * Método responsável por verificar se o termo de busca já existe no banco.
 * @param string termo 
 * @returns bool
 */
async function existeTermo(termo) {        
    var sql = "SELECT COUNT(DESCRICAO) AS QTD FROM TERMO WHERE DESCRICAO = ?";
    let results = await con.awaitQuery(sql, [termo])
    
    if (results == '' || results[0].QTD == 0) {
        return false
    }
    return true
}

/**
 * Método responsável por verificar se o id do termo de busca já existe no banco.
 * @param int id do termo 
 * @returns bool
 */
async function existeIdTermo(id) {
    var sql = "SELECT COUNT(*) AS QTD FROM TERMO WHERE ID = ?";
    let results = await con.awaitQuery(sql, [id])

    if (results == '' || results[0].QTD == 0)
        return false
    return true
}

/**
 * Método responsável por verificar se o termo de busca já existe relacionado a tabela de disco.
 * @param int id termo 
 * @returns bool
 */
async function existeTermoEmDisco(id_termo) {
    var sql = "SELECT COUNT(*) AS QTD FROM DISCO WHERE ID_TERMO = ?";
    let results = await con.awaitQuery(sql, [id_termo])

    if (results == '' || results[0].QTD == 0)
        return false
    return true
}

/**
 * Método responsável por cadastrar um novo disco.
 * @param string codigo, int id termo 
 * @returns objeto inserido
 */
async function inserirNovoDisco(codigo, id_termo, thumb, title, price) {
    let url = 'https://produto.mercadolivre.com.br/' + codigo.replace('MLB', 'MLB-')
    var sql = "INSERT INTO DISCO(URL, ID_TERMO, THUMB, TITLE, PRICE) VALUES (?, ?, ?, ?, ?)";
    let results = await con.awaitQuery(sql, [url, id_termo, thumb, title, price])
    return url
}

async function removerTermoDeBusca(id_termo) {
    let excluiu = false;
    
    if (await existeTermoEmDisco(id_termo)) {
        await log.print("Removendo discos onde o id_termo é: " + id_termo);
        let results = await con.awaitQuery('DELETE FROM DISCO WHERE ID_TERMO = (?)', [id_termo])
        console.log(results)
        excluiu = true;
    }

    if (existeIdTermo(id_termo)) {
        await log.print("Removendo termo id: " + id_termo)
        let results = await con.awaitQuery('DELETE FROM TERMO WHERE ID = (?)', [id_termo])
        console.log(results)
        excluiu = true;
    }

    return excluiu        
}

async function buscaEmail() {
    var sql = "SELECT EMAIL AS EMAIL FROM EMAIL";
    let results = await con.awaitQuery(sql)
    return (results == '' || results == 'undefined' ) ? null : results[0].EMAIL
}

async function salvarEmail(email) {

    await log.print('Salvando email: ' + email)

    var sql = "SELECT COUNT(*) AS QTD FROM EMAIL";
    let results = await con.awaitQuery(sql, [])
        
    if (results[0] == '' || results[0].QTD == 0) {
        await con.awaitQuery('INSERT INTO EMAIL(EMAIL) VALUES (?)', [email])
        await log.print('Inserindo email: ' + email)
    } else {
        await con.awaitQuery('UPDATE EMAIL SET EMAIL = ?', [email])
        await log.print('Atualizando email para: ' + email)
    }
}



async function temDadosNoArquivoUrl() {
    try {
        let content = fs.readFileSync('./urls.txt');
        if (content == null || content == '') 
            return false
        return true
    } catch (err) {return false}
}

async function gravarNoArquivoEmail(data) {
    fs.appendFile('./email.txt', (data + "\n"), (err) => {
        if (err)  {log.print(err)};
    });
}

async function gravarNoArquivoNovaUrl(data) {
    fs.appendFile('./urls.txt', (data + "\n"), (err) => {
        if (err)  {log.print(err)};
    });
}

function apagarArquivoUrl() {
    try {
        log.print('Apagando arquivo de urls')
        fs.unlinkSync('./urls.txt')
    } catch(err) { log.print(err) }
}

function apagarArquivoEmail() {
    try {
        log.print('Apagando arquivo de email')
        fs.unlinkSync('./email.txt')
    } catch(err) { log.print(err) }
}


async function roboCronEmail () {
    await log.print('Executando roboCronEmail ...')
    
    let novosDiscos = await carregarArquivoEmail()
    
    if (novosDiscos.status) {
        // let emailDest = await buscaEmail();
        let emailDest = 'rhuanpablo13@hotmail.com'
        if (emailDest) {
            try {
                let content = novosDiscos.data

                if (content.length > 0) {                    
                    await enviarEmails(content, emailDest, 0)
                    .then((res, rej) => {
                        if (res) {                            
                            apagarArquivoUrl()
                            apagarArquivoEmail()
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


async function tratarRegistro(disco) {

    try {
        if (typeof(data) != "undefined" && typeof(data.length) != "undefined") {
            let data = disco.data[0]
            for (var i = 0; i < data.length; i++) {
                let reg = data[i]
                if (false === await existeCodigo(reg.id)) {
                    let url = await inserirNovoDisco(reg.id, disco.id_termo, reg.thumb, reg.title, reg.price)
                    await gravarNoArquivoNovaUrl(
                        emailMaker.montarAmostraDisco (reg.id, reg.thumb, reg.title, reg.price, url)
                    );
                } else {
                    await log.print("Nenhum disco novo encontrado para o termo: " + disco.termo)
                }
            }
        }
    } catch (error) {
        await log.print('tratarRegistro')
        await log.print(error)
    }
}


async function executarRobo() {
    await log.print('Iniciando o robô :)')
    let termos = await todosTermos()
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
                await tratarRegistro(disco)
            }
            
            
            if (await temDadosNoArquivoUrl()) {                
                await gravarNoArquivoEmail(emailMaker.getInicio())
                let urls = await carregarArquivoUrls();
                await gravarNoArquivoEmail(urls.data)
                await gravarNoArquivoNovaUrl(emailMaker.getFim())
                await roboCronEmail()
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
    carregarArquivoUrls,
    enviarEmails,
    enviarEmailTeste,
    sendMail,    
    todosTermos,
    existeCodigo,
    existeTermo,
    existeIdTermo,
    existeTermoEmDisco,
    inserirNovoDisco,
    inserirNovoTermoDeBusca,
    removerTermoDeBusca,
    buscaEmail,
    salvarEmail,
    gravarNoArquivoNovaUrl,
    tratarRegistro,
    executarRobo,
    roboCron,
    setConnection,
    roboCronEmail,
    apagarArquivoUrl
}