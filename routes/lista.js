const express = require('express');
const router = express.Router();
const passport = require('passport');
const mysql = require("mysql2/promise");

const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const fs = require('fs');

// const cron = require("node-cron");
const cron = require("node-schedule");


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


async function connect() {
    let connection = null
    try {
        
        connection = await mysql.createConnection("mysql://bc08f50273d49b:dc99c304@us-cdbr-east-04.cleardb.com/heroku_4943b17354a4347?reconnect=true");
        // const connection = await mysql.createConnection("mysql://root:root@localhost:3306/robo");
        if (connection == null) console.log("NÃO Conectou no MySQL!");
        else console.log("Conectou no MySQL!");
        
    } catch (error) {
        console.log(error)
    }
    return connection;
}


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



async function verificaArquivoUrls() {
    
    return new Promise(async (resolve, reject) => {
        try {
            let urls = []
            lineReader.open('./urls.txt', async function(err, reader) {
                while (reader.hasNextLine()) {
                    reader.nextLine(async function(err2, line) {
                        urls.push(line)
                    });
                }
            });
            resolve ({'status': true, 'data': urls});
    
        } catch (err) {console.log(err)}
    })
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


async function pesquisarTermosDeBusca(termos) {
    
    return new Promise(async (resolve, reject) => {
        await termos.forEach(async (termo, i) => {
            
            const id_termo = termo.id;
            const descricao = termo.descricao;

            log('termo = ' + descricao)
            
            return await collectData(descricao, true, true).then(async (discos) => {
                return await pesquisarDiscos(discos, id_termo, descricao).then(async (res, rej) => {
                    if (rej) reject('Nenhum disco novo encontrado para o termo: ' + descricao)
                    resolve(res)
                })
            })            
        })
        // resolve(true)
    })
}

async function pesquisarDiscos(discos, id_termo, descricao) {
    return new Promise(async (resolve, reject) => {
        discos.forEach( async (disco) => {
            await coletania(disco, id_termo, descricao).then(async (res, rej) => {
                if (rej) reject(rej)
                resolve(res)
            })
        })
    });
}

async function coletania(disco, id_termo, descricao) {
    return new Promise(async (resolve, reject) => {
        disco.forEach(async (codigoDisco) => {
            await tratarCodigo(codigoDisco, id_termo, descricao).then(async (res, rej) => {
                if (rej) reject(rej)
                resolve(res)
            })
        })
    });
}

async function tratarCodigo(codigoDisco, id_termo, descricao) {

    return new Promise(async (resolve, reject) => {
        try {
                await existeCodigo(codigoDisco).then(async (res, rej) => {
                if (false == res) {
                    let url = await inserirNovoDisco(codigoDisco, id_termo)
                    gravarNovaUrl(descricao + '\t' + url);
                    resolve(true)
                } else {
                    log("Nenhum disco encontrado para o termo: " + descricao)
                    resolve(false)
                }
            })
        } catch (error) {
            log(error)
            reject(error)
        }
    });
}

async function sendMail(user_mail, pass, content, dest_email, subject) {

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
        to: dest_email,
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
    return new Promise(async function (resolve, reject) {
        log('Iniciando a coleta de dados...')
        const browser = await puppeteer.launch()
        // const browser = await puppeteer.launch({ headless: headless, devtools: false })
        const page = await browser.newPage();
        url = 'https://lista.mercadolivre.com.br/musica/' + url;
    
        await page.goto(url);
        let registros = [];
        
        log('Pesquisando em: ' + url)
        let pages = await numberPages(page);
    
        log('Quantidade de páginas encontradas: ' + pages)
        if (pages == 0) {
            await browser.close();
            resolve([]);
        }
    
        if (pages == 1) {
            registros.push(await scrap(page));
        }
    
        if (pages > 1) {
            while (await currentNumberPage(page) < pages) {
                registros.push(await scrap(page));
                await next(page);
            }    
            registros.push(await scrap(page));
        }
        
        log('Encerrando a coleta de dados para ' + url)
        if (closeBrowser || headless == true)
            await browser.close();
        resolve(registros);
    });
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
    let conn = await connect();
    let retorno = await conn.query('SELECT ID, DESCRICAO FROM TERMO;');
    // await disconnect(conn);

    if (retorno[0] == '') {
        return null;
    }

    log('Buscando todos os termos cadastrados => Encontrados: ' + retorno[0].length)
    return retorno[0].map((ret) => {
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
    if (await existeTermo(termo)) {
        return null;
    }
    let conn = await connect();
    const sql = 'INSERT INTO TERMO(DESCRICAO) VALUES (?);';
    const values = [termo];
    log("\tInserindo novo termo de busca: " + termo);
    let retorno = await conn.query(sql, values);
    // await disconnect(conn);
    return retorno;
}

/**
 * Método responsável por verificar se o código do disco já existe no banco.
 * @param string codigo 
 * @returns bool
 */
 async function existeCodigo(codigo) {
    return new Promise(async function (resolve, reject){
        let url_produto = 'https://produto.mercadolivre.com.br/' + codigo.replace('MLB', 'MLB-')
        let conn = await connect();
        let retorno = await conn.query('SELECT COUNT(URL) AS QTD FROM DISCO WHERE URL = "' + url_produto + '";');
        // await disconnect(conn);
        if (retorno[0] == '' || retorno[0][0].QTD == 0) {
            resolve(false)
        } else {
            resolve(true);
        }
    });

}

/**
 * Método responsável por verificar se o termo de busca já existe no banco.
 * @param string termo 
 * @returns bool
 */
async function existeTermo(termo) {
    let conn = await connect();
    let retorno = await conn.query('SELECT COUNT(DESCRICAO) AS QTD FROM TERMO WHERE DESCRICAO = "' + termo + '";');
    // await disconnect(conn);
    return (retorno[0] == '' || retorno[0][0].QTD == 0) ? false : true
}

/**
 * Método responsável por verificar se o id do termo de busca já existe no banco.
 * @param int id do termo 
 * @returns bool
 */
async function existeIdTermo(id) {
    let conn = await connect();
    let retorno = await conn.query('SELECT COUNT(*) AS QTD FROM TERMO WHERE ID = ' + id + ';');
    // await disconnect(conn);
    return (retorno[0] == '' || retorno[0][0].QTD == 0) ? false : true
}

/**
 * Método responsável por verificar se o termo de busca já existe relacionado a tabela de disco.
 * @param int id termo 
 * @returns bool
 */
async function existeTermoEmDisco(id_termo) {
    let conn = await connect();
    let retorno = await conn.query('SELECT COUNT(*) AS QTD FROM DISCO WHERE ID_TERMO = "' + id_termo + '";');
    // await disconnect(conn);
    return (retorno[0] == '' || retorno[0][0].QTD == 0) ? false : true
}

/**
 * Método responsável por cadastrar um novo disco.
 * @param string codigo, int id termo 
 * @returns objeto inserido
 */
async function inserirNovoDisco(codigo, id_termo) {
    let conn = await connect();
    const sql = 'INSERT INTO DISCO(URL, ID_TERMO) VALUES (?, ?);';
    let url = 'https://produto.mercadolivre.com.br/' + codigo.replace('MLB', 'MLB-')

    const values = [url, id_termo];
    log("Inserindo nova url: " + url + " - id_termo: " + id_termo);
    await conn.query(sql, values);
    // await disconnect(conn);
    return url;
}

async function removerTermoDeBusca(id_termo) {
    let conn = await connect();
    const values = [id_termo];
    let excluiu = false;

    if (await existeTermoEmDisco(id_termo)) {
        const sql = 'DELETE FROM DISCO WHERE ID_TERMO = (?);';
        log("Removendo discos onde o id_termo é: " + id_termo);
        await conn.query(sql, values);
        excluiu = true;
    }

    if (await existeIdTermo(id_termo)) {
        sql = 'DELETE FROM TERMO WHERE ID = (?);';
        log("Removendo termo id: " + id_termo);
        await conn.query(sql, values);
        excluiu = true;
    }
    // await disconnect(conn);    
    return excluiu;
}

async function connect2() {
    if(global.connection && global.connection.state !== 'disconnected')
        return global.connection;
 
    const connection = await mysql.createConnection("mysql://bc08f50273d49b:dc99c304@us-cdbr-east-04.cleardb.com/heroku_4943b17354a4347?reconnect=true")
    .then(connection => {
        if (connection) {
            global.connection = connection;
            return connection
        }
    })
    // const connection = await mysql.createConnection("mysql://root:root@localhost:3306/robo");
    console.log("Conectou no MySQL!");
    return connection;
}

async function disconnect(conn) {
    await conn.close
    global.connection.close
}

async function buscaEmail() {
    let conn = await connect();
    let retorno = await conn.query('SELECT EMAIL AS EMAIL FROM EMAIL;');
    // await disconnect(conn);
    return (retorno[0] == '' || retorno[0][0].EMAIL == 0) ? null : retorno[0][0].EMAIL
}

async function salvarEmail(email) {
    log('Salvando email: ' + email)
    let conn = await connect();
    let retorno = await conn.query('SELECT COUNT(*) AS QTD FROM EMAIL;');
    if (retorno[0] == '' || retorno[0][0].QTD == 0) {
        const sql = 'INSERT INTO EMAIL(EMAIL) VALUES (?);';
        const values = [email];
        log('Inserindo email: ' + email)
        await conn.query(sql, values);
    } else {
        const sql = 'UPDATE EMAIL SET EMAIL = ?;';
        const values = [email];
        log('Atualizando email para: ' + email)
        await conn.query(sql, values);
    } 
    // await disconnect(conn);
}

function log(data, time = true, quebraLinha = false) {
    let line = '';

    if (time) {
        line = getTime() + '\t' + data + "\n";
    }

    if (quebraLinha) {
        line = "\n" + line + "\n";
    }

    fs.appendFileSync('log.txt', line, (err) => {
        if (err) throw err;
    });
    console.log(line)
}

async function gravarNovaUrl(data) {
    fs.appendFile('urls.txt', (data + "\n"), (err) => {
        if (err) throw err;
    });
}

async function apagarArquivoUrl() {
    try {
        log('Apagando arquivo de urls')
        fs.unlinkSync('urls.txt')
    } catch(err) { }
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

    // Execute a cron job when the minute is 01 (e.g. 19:30, 20:30, etc.)
    let novosDiscos = await verificaArquivoUrls();
    if (novosDiscos.status) {
        let emailDest = await buscaEmail();
        if (emailDest) {
            try {
                let content = '';
                novosDiscos.data.forEach(e => {
                    content += e + '\n'
                })
                await enviarEmails(content, emailDest, novosDiscos.data.length-1);
            } catch (error) {
                console.log(error)
            }
        }
    }
}


const roboCron = async () => {
    log('Executando roboCron ...')
    
    cron.scheduleJob('0 * * * *', async () => { // a cada hora
        let retorno = await executarRobo()

        // se retornar true, foi cadastrado um novo disco, sendo assim pode se enviar um email
        if (retorno) {
            let retornoEmail = await roboCronEmail()
            if (retornoEmail) {
                log('Email enviado com sucesso!')
                apagarArquivoUrl();
            }
        }
        log(data = QUEBRA, time=true, quebraLinha=true);
    });

}


async function executarRobo() {

    log('Iniciando o robô :)')

    // recuperar os discos do banco
    let termos = await todosTermos()
    
    return new Promise(async (resolve, reject) => {
        // pesquisar os termos no site do mercado livre
        if (termos != null) {                    
            await pesquisarTermosDeBusca(termos).then(async (response, reject2) => {
                if (reject2) reject(reject2)
                resolve(response)
            })             
        }
    })
}


roboCron();

module.exports = router;