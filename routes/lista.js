const QUEBRA = '\n------------------------------------------------------------------------------------------------------------------- \n'
let URL_PRODUTO = 'https://produto.mercadolivre.com.br/'

const express = require('express');
const router = express.Router();
const passport = require('passport');
const mysql = require("mysql");
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const fs = require('fs');
const cron = require("node-schedule");
const lineReader = require('line-reader');
const util = require( 'util' );



var db_config = {
    max_user_connections : 100,
    host: 'us-cdbr-east-04.cleardb.com', //?reconnect=true
    user: 'bc08f50273d49b',
    password: 'dc99c304',
    database: 'heroku_4943b17354a4347'
};

function makeDb( config ) {
    const connection = mysql.createConnection( config );
    return {
        query( sql, args ) {
            return util.promisify( connection.query )
            .call( connection, sql, args );
        },
        close() {
            return util.promisify( connection.end ).call( connection );
        }
    };
}


/* GET lista page. */
router.get('/', async (req, res, next) => {
    
    log("Iniciando...")

    let todosOsTermos = await todosTermos();
    let email = await buscaEmail();

    if (todosOsTermos == null) {
        res.render('lista', {
            msg: '',
            items: [],
            email: email
        });
    } else {
        res.render('lista', {
            msg: '',
            items: todosOsTermos,
            email: email
        });
    }

    // testeConexao();

});


/* POST lista page */
router.post('/adicionar', async (req, res, next) => {

    passport.authenticate('local', {
        failureRedirect: '/login?fail=true'   
    });

    let termo = req.body.termo;
    if (termo !== '') {
        let retorno = await inserirNovoTermoDeBusca(termo)
        if (retorno == null) {
            res.status(401).send({
                error: 'Termo já está cadastrado'
            })
            return;
        }
        let id = retorno[0].insertId;
        
        log("Novo termo: " + termo)

        res.status(200).send(
            `<li id="${id}">
                <label>${termo}</label>
                <input type="hidden" value='{"id": ${id}, "disco": "${termo}"}' name='discos'/>
                <button type="reset" class="close" id="${id}" onclick="excluir(this);"><i class="fa fa-close"></i></button>
            </li>`
        );
    }
});


/* DELETE lista page */
router.delete('/deletar', async (req, res, next) => {

    passport.authenticate('local', {
        failureRedirect: '/login?fail=true'   
    });

    let id = parseInt(req.body.id);
    let retorno = await removerTermoDeBusca(id)
    if (retorno == -1) {
        console.log('erro ao excluir')
        res.status(401).send({
            error: 'Erro ao excluir termo'
        })
    }
    res.sendStatus(201).send('')
});


/* POST lista page */
router.post('/salvar', async (req, res, next) => {

    passport.authenticate('local', {
        failureRedirect: '/login?fail=true'
    });

    let email = req.body.email;
    if (email == null || email == 'undefined' || email == '') {
        res.status(500).send({
            error: 'Informe seu email'
        })
        return;
    }

    await salvarEmail(email);

    log('Salvando e saindo...')

    res.status(200).send({
        success: 'Okay! Tudo salvo por aqui... Agora é só aguardar os emails :)'
    })
    
    await executarRobo()
});


/* POST lista page */
router.post('/testeEmail', async (req, res, next) => {

    passport.authenticate('local', () => {
        res.redirect ('/login?fail=true')
    });

    let email = req.body.email;
    if (email == null || email == 'undefined' || email == '') {
        res.status(500).send({
            error: 'Informe seu email para teste'
        })
        return;
    }

    await enviarEmailTeste(email)
    .then(response => {
        if (response) {
            res.status(200).send({
                success: 'Email de teste enviado com sucesso! :)'
            })
            return;
        }
        res.status(500).send({
            error: 'Houve uma falha ao enviar para este email... :('
        })
    })
    .catch(err => console.log(err))
    
});






Promise = require('bluebird');

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
    if (qtd_discos > 0) log('Enviando email com ' + qtd_discos + ' discos novos')        

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
    log('Enviando email de teste para: ' + dest_email)

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
                log('Falha. ' + response);
                reject(false);
            } else {
                log('Email enviado com sucesso. ' + content);
                resolve(true);
            }
        })
    });
}

async function collectData(url, headless = false, closeBrowser = true) {
    // return new Promise(async function (resolve, reject) {
        log('Iniciando a coleta de dados...')
        // const browser = await puppeteer.launch()
        const browser = await puppeteer.launch({ headless: headless, devtools: false, args: ['--no-sandbox']})
        const page = await browser.newPage();
        url = 'https://lista.mercadolivre.com.br/musica/' + url;
        
        await page.goto(url);
        let registros = [];
        
        log('Pesquisando em: ' + url)
        let pages = await numberPages(page);
    
        log('Quantidade de páginas encontradas: ' + pages)
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
        
        log('Encerrando a coleta de dados para ' + url)
        if (closeBrowser || headless == true)
            await browser.close();
        return registros;
    // });
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

/**
 * Termo:
 * return {
        'id' : ID,
        'descricao' : DESCRICAO
    }
 * @returns Object
 */
async function todosTermos() {
    const connection = makeDb( db_config );
    try {
        let results = await connection.query('SELECT ID, DESCRICAO FROM TERMO')
        console.log(results)
        if (results == '') {
            return null;
        }
        log('Buscando todos os termos cadastrados => Encontrados: ' + results.length)
        return results.map((ret) => {
            return {
                'id' : ret.ID,
                'descricao' : ret.DESCRICAO
            }
        }) 
    } catch ( err ) {
        console.log(err)
    } finally {
        await connection.close();
    }
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

    pool.getConnection(function(err, connection) {
        if (err) throw err; // not connected!
      
        // Use the connection
        connection.query('INSERT INTO TERMO(DESCRICAO) VALUES (?)', [termo], function (error, results, fields) {
            // When done with the connection, release it.
            connection.release();
            
            // Handle error after the release.
            if (error) throw error;
            // Don't use the connection here, it has been returned to the pool.
      
            if (results == '') {
                return null;
            }

            log("Inserindo novo termo de busca: " + termo);

            return results
        });
    });

    // if (await existeTermo(termo)) {
    //     return null;
    // }
    
    // const sql = 'INSERT INTO TERMO(DESCRICAO) VALUES (?);';
    // const values = [termo];
    // log("\tInserindo novo termo de busca: " + termo);
    // let retorno = connection.query(sql, values, [], function (err, user) { connection.release() });
    // // await disconnect(conn);
    // return retorno;
}

/**
 * Método responsável por verificar se o código do disco já existe no banco.
 * @param string codigo 
 * @returns bool
 */
 async function existeCodigo(codigo) {
    let url_produto = URL_PRODUTO + codigo.replace('MLB', 'MLB-')
    const connection = makeDb( db_config );
    try {
        let results = await connection.query('SELECT COUNT(URL) AS QTD FROM DISCO WHERE URL = ?', [url_produto])
        console.log(results)
        if (results == '' || results[0].QTD == 0)
            return false
        return true
    } catch ( err ) {
        console.log(err)
    } finally {
        await connection.close();
    }
}

/**
 * Método responsável por verificar se o termo de busca já existe no banco.
 * @param string termo 
 * @returns bool
 */
async function existeTermo(termo) {
    const connection = makeDb( db_config );
    try {
        let results = await connection.query('SELECT COUNT(DESCRICAO) AS QTD FROM TERMO WHERE DESCRICAO = ?', [termo])
        console.log(results)
        if (results == '' || results[0].QTD == 0)
            return false
        return true
    } catch ( err ) {
        console.log(err)
    } finally {
        await connection.close();
    }
}

/**
 * Método responsável por verificar se o id do termo de busca já existe no banco.
 * @param int id do termo 
 * @returns bool
 */
async function existeIdTermo(id) {
    const connection = makeDb( db_config );
    try {
        let results = await connection.query('SELECT COUNT(*) AS QTD FROM TERMO WHERE ID = ?', [id])
        console.log(results)
        if (results == '' || results[0].QTD == 0)
            return false
        return true
    } catch ( err ) {
        console.log(err)
    } finally {
        await connection.close();
    }
}

/**
 * Método responsável por verificar se o termo de busca já existe relacionado a tabela de disco.
 * @param int id termo 
 * @returns bool
 */
async function existeTermoEmDisco(id_termo) {
    const connection = makeDb( db_config );
    try {
        let results = await connection.query('SELECT COUNT(*) AS QTD FROM DISCO WHERE ID_TERMO = ?', [id_termo])
        console.log(results)
        if (results == '' || results[0].QTD == 0)
            return false
        return true
    } catch ( err ) {
        console.log(err)
    } finally {
        await connection.close();
    }
}

/**
 * Método responsável por cadastrar um novo disco.
 * @param string codigo, int id termo 
 * @returns objeto inserido
 */
async function inserirNovoDisco(codigo, id_termo) {
    let url = 'https://produto.mercadolivre.com.br/' + codigo.replace('MLB', 'MLB-')

    const connection = makeDb( db_config );
    try {
        let results = await connection.query('INSERT INTO DISCO(URL, ID_TERMO) VALUES (?, ?)', [url, id_termo])
        console.log(results)
        return url
    } catch ( err ) {
        console.log(err)
    } finally {
        await connection.close();
    }
}

async function removerTermoDeBusca(id_termo) {
    let excluiu = false;
    const connection = makeDb( db_config );
    try {
        if (await existeTermoEmDisco(id_termo)) {
            log("Removendo discos onde o id_termo é: " + id_termo);
            let results = await connection.query('DELETE FROM DISCO WHERE ID_TERMO = (?)', [id_termo])
            console.log(results)
            excluiu = true;
        }

        if (existeIdTermo(id_termo)) {
            log("Removendo termo id: " + id_termo)
            let results = await connection.query('DELETE FROM TERMO WHERE ID = (?)', [id_termo])
            console.log(results)
            excluiu = true;
        }
        return excluiu

    } catch ( err ) {
        console.log(err)
    } finally {
        await connection.close();
    }
}

async function buscaEmail() {
    const connection = makeDb( db_config );
    try {
        let results = await connection.query('SELECT EMAIL AS EMAIL FROM EMAIL')
        console.log('buscando email')
        console.log(results)
        return (results[0] == '' || results[0].EMAIL == 0) ? null : results[0].EMAIL
    } catch ( err ) {
        console.log(err)
    } finally {
        await connection.close();
    }
}

async function salvarEmail(email) {
    const connection = makeDb( db_config );
    try {
        log('Salvando email: ' + email)
        let results = await connection.query('SELECT COUNT(*) AS QTD FROM EMAIL')
        console.log(results)
        if (results[0] == '' || results[0].QTD == 0) {
            await connection.query('INSERT INTO EMAIL(EMAIL) VALUES (?)', [email], function (error, results, fields) {
                if (error) throw error;
                log('Inserindo email: ' + email)
            })
        } else {
            await connection.query('UPDATE EMAIL SET EMAIL = ?', [email], function (error, results, fields) {
                if (error) throw error;
                log('Atualizando email para: ' + email)
            })
        }
    } catch ( err ) {
        console.log(err)
    } finally {
        await connection.close();
    }
}

function log(data, time = true, quebraLinha = false) {
    let line = '';
    
    if (time) {
        line = getTime() + '\t' + data + "\n";
    }

    console.log(line)

    if (quebraLinha) {
        line = "\n" + line + "\n";
    }

    fs.appendFile('log.txt', line, (err) => {
        if (err) console.log(err)        
    });
        
}

async function gravarNovaUrl(data) {
    fs.appendFile('urls.txt', (data + "\n"), (err) => {
        if (err)  {log(err)};
    });
}

function apagarArquivoUrl() {
    try {
        log('Apagando arquivo de urls')
        fs.unlink('urls.txt')
    } catch(err) { log(err) }
}

function getTime() {
    var dataAtual = new Date();
    var dia = dataAtual.getDate();
    var mes = (dataAtual.getMonth() + 1);
    var ano = dataAtual.getFullYear();
    var horas = dataAtual.getHours();
    var minutos = dataAtual.getMinutes();
    return dia + "-" + mes + "-" + ano + " " + horas + ":" + minutos;
}

const roboCronEmail = async () => {
    log('Executando roboCronEmail ...')
    log(getTime())

    // Execute a cron job when the minute is 01 (e.g. 19:30, 20:30, etc.)
    let novosDiscos = await verificaArquivoUrls();
    
    if (novosDiscos.status) {
        let emailDest = await buscaEmail();

        if (emailDest) {
            try {
                let content = '';
                for (const e of novosDiscos.data) {
                    content += e + '\n'
                }
                
                await enviarEmails(content, emailDest, novosDiscos.data.length-1)
                .then((res, rej) => {
                    if (res) {
                        log('Email enviado com sucesso')
                        apagarArquivoUrl()
                    }
                    else log('Erro ao enviar email')
                });
            } catch (error) {
                log(error)
            }
        } else {
            log('Nenhum email cadastrado')    
        }
    } else {
        log('Nenhum disco encontrado para enviar emails')
    }
}


const roboCron = async () => {
    log('Executando roboCron ...')
    
    
    cron.scheduleJob('*/1 * * * *', async () => { // a cada 5 minutos
    // cron.scheduleJob('* */1 * * *', async () => { // a cada hora
        await executarRobo()
        log(data = QUEBRA, time=true, quebraLinha=true);
    });

}


async function tratarCodigo(codigoDisco, id_termo, descricao) {
    try {
        if (false === await existeCodigo(codigoDisco)) {
            let url = await inserirNovoDisco(codigoDisco, id_termo)
            await gravarNovaUrl(descricao + '\t' + url);
        } else {
            log("Nenhum disco novo encontrado para o termo: " + descricao)
        }
    } catch (error) {
        log(error)
    }
}


async function executarRobo() {

    log('Iniciando o robô :)')

    // recuperar os discos do banco
    let termos = await todosTermos()
    let discos = [];

    // pesquisar os termos no site do mercado livre
    if (termos != null) {                    
        for (const termo of termos) {
            const id_termo = termo.id;
            const descricao = termo.descricao;        
            log('termo = ' + descricao)
            let retorno = {
                'id_termo': id_termo,
                'termo': descricao,
                'data': await collectData(descricao, true, true)
            }
            discos.push(retorno)
        }

        if (discos != null) {
            for (const disco of discos) {
                console.log(disco)
                for (const codigos of disco.data) {
                    for (const codigo of codigos) {
                        await tratarCodigo(codigo, disco.id_termo, disco.termo)
                        console.log('tratando codigo: ' + codigo)
                    }
                }
            }
        }
        await roboCronEmail()
    }
}

// roboCron();

module.exports = router;