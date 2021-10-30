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

let con = null
function setConnection(conParam) {
    con = conParam;
}

async function roboCron () {
    log('Executando roboCron ...')
    // cron.scheduleJob('*/1 * * * *', async () => { // a cada 5 minutos
    cron.scheduleJob('* */1 * * *', async () => { // a cada hora
        await executarRobo()
        log(data = QUEBRA, time=true, quebraLinha=true);
    });
}


async function verificaArquivoUrls() {

    try {
        let discos = [];

        var eachLine = Promise.promisify(lineReader.eachLine);
        return new Promise(function(resolve, reject) {
            eachLine('./urls.txt', function(line) {
                discos.push(line)
            }).then(function() {
                resolve ({'status': true, 'data': discos})
            }).catch(function(err) {
                console.error(err);
            });
        })

    } catch (err) {log(err)}
}


async function enviarEmails(novosDiscos, dest_email, qtd_discos = 0) {
    if (qtd_discos > 0) await log.print('Enviando email com ' + qtd_discos + ' discos novos')        

    return new Promise(async (resolve, reject) => {
        await sendMail(
            "noreply.envioemail@gmail.com", 
            "EnvioEmail@123", 
            novosDiscos,
            dest_email,
            'Aqui estão ' + qtd_discos + ' novos discos que encontrei pra vc :) '
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

    const remetente = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 25,
        secure: false, // true for 465, false for other ports
        auth: {
            user: user_mail,
            pass: pass
        },
        tls: { rejectUnauthorized: false }
    });
    
    var emailASerEnviado = {
        from: user_mail,
        to: maillist,
        subject: subject,
        text: content + '',
    };
    
    return new Promise((resolve, reject) => {
        remetente.sendMail(emailASerEnviado, response => {
            if (response) {
                log.print('Falha. ' + response);
                reject(false);
            } else {
                log.print('Email enviado com sucesso. ' + content);
                resolve(true);
            }
        })
    });
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
    console.log(results)
    
    // con.destroy()
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
function inserirNovoTermoDeBusca(termo) {

    if (existeTermo(termo)) {
        return null;
    }

    con.connect(async function(err) {
        if (err) throw err;
        
        var sql = "INSERT INTO TERMO(DESCRICAO) VALUES (?)";
        con.query(sql, [termo], async function (err, results) {
            if (err) throw err;
            if (results == '') {
                // con.destroy()
                return null;
            }

            await log.print("Inserindo novo termo de busca: " + termo);
            
            // con.destroy()
            return results
        });
    });
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
    
    if (results == '' || results[0].QTD == 0)
        return false
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
async function inserirNovoDisco(codigo, id_termo) {
    let url = 'https://produto.mercadolivre.com.br/' + codigo.replace('MLB', 'MLB-')
    var sql = "INSERT INTO DISCO(URL, ID_TERMO) VALUES (?, ?)";
    let results = await con.awaitQuery(sql, [url, id_termo])
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
    return (results[0] == '' || results[0].EMAIL == 0) ? null : results[0].EMAIL
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



async function gravarNovaUrl(data) {
    fs.appendFile('urls.txt', (data + "\n"), (err) => {
        if (err)  {log.print(err)};
    });
}

function apagarArquivoUrl() {
    try {
        log.print('Apagando arquivo de urls')
        fs.unlink('urls.txt')
    } catch(err) { log.print(err) }
}



async function roboCronEmail () {
    await log.print('Executando roboCronEmail ...')
    
    let novosDiscos = await verificaArquivoUrls();
    
    if (novosDiscos.status) {
        let emailDest = await buscaEmail();

        if (emailDest) {
            try {
                let content = '';
                for (const e of novosDiscos.data) {
                    content += e + '\n'
                }
                
                if (content.length > 0) {
                    await enviarEmails(content, emailDest, novosDiscos.data.length-1)
                    .then((res, rej) => {
                        if (res) {
                            log.print('Email enviado com sucesso')
                            apagarArquivoUrl()
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


async function tratarCodigo(codigoDisco, id_termo, descricao) {
    try {
        if (false === await existeCodigo(codigoDisco)) {
            let url = await inserirNovoDisco(codigoDisco, id_termo)
            await gravarNovaUrl(descricao + '\t' + url);
        } else {
            await log.print("Nenhum disco novo encontrado para o termo: " + descricao)
        }
    } catch (error) {
        await log.print(error)
    }
}


async function executarRobo() {
        await log.print('Iniciando o robô :)')
        let termos = await todosTermos()
        let discos = [];

        if (termos != null) {
            for (const termo of termos) {
                const id_termo = termo.id;
                const descricao = termo.descricao;        
                await log.print('termo = ' + descricao)
                let retorno = {
                    'id_termo': id_termo,
                    'termo': descricao,
                    'data': await mypuppeteer.collectData(descricao, true, true)
                }
                discos.push(retorno)
            }
            
            if (discos != null) {
                console.log(discos)

                for (const disco of discos) {
                    console.log(disco)
                    for (const codigos of disco.data) {
                        for (const codigo of codigos) {
                            await tratarCodigo(codigo, disco.id_termo, disco.termo)
                            console.log('tratando codigo: ' + codigo)
                        }
                    }
                }
            } else {
                console.log('não achou os discos')
            }

            await roboCronEmail()

        } else {
            console.log('não achou os dados')
        }
}


module.exports = {
    verificaArquivoUrls,
    enviarEmails,
    enviarEmailTeste,
    sendMail,    
    todosTermos,
    existeCodigo,
    existeTermo,
    existeIdTermo,
    existeTermoEmDisco,
    inserirNovoDisco,
    removerTermoDeBusca,
    buscaEmail,
    salvarEmail,
    gravarNovaUrl,
    tratarCodigo,
    executarRobo,
    roboCron,
    setConnection,
    roboCronEmail
}