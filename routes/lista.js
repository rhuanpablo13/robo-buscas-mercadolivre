const express = require('express');
const router = express.Router();
const passport = require('passport');
const mysql = require("mysql2/promise");

const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const fs = require('fs');

const http = require('http');
const path = require('path');


/* GET lista page. */
router.get('/', async (req, res, next) => {
    
    let todosOsTermos = await todosTermos();
    let email = await buscaEmail();

    log(getTime() + "\tIniciando...")

    if (todosOsTermos == null) {
        res.render('lista', {
            msg: '',
            items: [],
            email: email
        });
    } else {
        res.render('lista', {
            msg: '',
            items: await todosTermos(),
            email: await buscaEmail()
        });
    }
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
        
        log(getTime() + "\tNovo termo: " + termo)

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

    res.sendStatus(201).send('')
    passport.authenticate('local', {
        failureRedirect: '/login?fail=true'
    });

    let email = req.body.email;
    if (email == null || email == 'undefined') {
        res.status(500).send({
            msg: 'Informe um email'
        })
    }

    log(getTime() + '\tSalvando e saindo...')

    res.render('lista', {
        msg: 'Okay! Tudo salvo por aqui... Agora é só aguardar os emails :)'
    });

    setTimeout(function() { 
        req.logout();
        //res.redirect('/login');
    }, 4000);

    // await main();
});


async function main() {

    let novosDiscos = [];
    const url_produto = 'https://produto.mercadolivre.com.br/'

    // recuperar os discos do banco
    let termos = await todosTermos()

    // pesquisar os termos no site do mercado livre
    const url_lista = 'https://lista.mercadolivre.com.br/musica/'
    
    if (termos != null) {
        termos.forEach(async (termo) => {
            
            const id_termo = termo.id;
            const descricao = termo.descricao;

            // pegar os códigos e fazer a mágica acontecer
            let discos = await collectData((url_lista + descricao), true, true)

            if (typeof discos !== 'undefined' && discos.length > 0) {
                
                discos.forEach(async (grupo) => {            
                    grupo.forEach(async (codigo, i) => {
                        
                        try {
                            let existe = await existeCodigo(codigo)
                            if (! existe) {
                                log(getTime() + '\tEnviar email e inserir no banco -> ' + id_termo + " -> " + descricao)
        
                                novosDiscos.push(url_produto + codigo.replace('MLB', 'MLB-'))

                                // sendMail(
                                //     "rhuanpablo13saga@gmail.com", 
                                //     "Fofinho@123", 
                                //     'https://produto.mercadolivre.com.br/' + codigo.replace('MLB', 'MLB-')
                                // )
                                await inserirNovoDisco(codigo, id_termo)
                            } else {
                                log(getTime() + '\tCódigo já está cadastrado: ' + codigo)
                            }
                        } catch (error) {
                            log(getTime() + '\t' + error)
                        }
                    })
                })

            } else {
                log(getTime() + "\tNenhum disco novo encontrado para o termo: " + termo);
            }
        })
    }    
}

async function sendMail(user_mail, pass, content) {
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
        to: user_mail,
        subject: 'Aqui está um novo disco que encontrei pra vc :) ',
        text: content,
    };


    remetente.sendMail(emailASerEnviado, function(error){
        if (error) {
            console.log(error);
        } else {
            console.log('Email enviado com sucesso. ' + content);
        }
    });
}

async function collectData(url, headless = false, closeBrowser = true) {
    const browser = await puppeteer.launch({ headless: headless, devtools: false });
    const page = await browser.newPage();
    await page.goto(url);
    let registros = [];
    
    log(getTime() + '\tPesquisando em: ' + url)
    let pages = await numberPages(page);

    console.log(getTime() + '\tPáginas encontradas: ' + pages)
    if (pages == 0) {
        await browser.close();
        return [];
    }

    while (await currentNumberPage(page) < pages) {
        registros.push(await scrap(page));
        await next(page);
    }    
    registros.push(await scrap(page));
    
    log(getTime() + '\tFim pesquisa')
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
        return parseInt(document.querySelector('.andes-pagination__page-count').textContent.split('de ')[1]);
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
    await disconnect(conn);

    if (retorno[0] == '') {
        return null;
    }

    log(getTime() + '\tBuscando todos os termos cadastrados: ' + retorno[0].length)
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
    log(getTime() + "\tInserindo novo termo de busca: " + termo);
    let retorno = await conn.query(sql, values);
    await disconnect(conn);
    return retorno;
}

/**
 * Método responsável por verificar se o código do disco já existe no banco.
 * @param string codigo 
 * @returns bool
 */
async function existeCodigo(codigo) {
    let conn = await connect();
    let retorno = await conn.query('SELECT COUNT(CODIGO) AS QTD FROM DISCO WHERE CODIGO = "' + codigo + '";');
    await disconnect(conn);
    return (retorno[0] == '' || retorno[0][0].QTD == 0) ? false : true
}

/**
 * Método responsável por verificar se o termo de busca já existe no banco.
 * @param string termo 
 * @returns bool
 */
async function existeTermo(termo) {
    let conn = await connect();
    let retorno = await conn.query('SELECT COUNT(DESCRICAO) AS QTD FROM TERMO WHERE DESCRICAO = "' + termo + '";');
    await disconnect(conn);
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
    await disconnect(conn);
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
    await disconnect(conn);
    return (retorno[0] == '' || retorno[0][0].QTD == 0) ? false : true
}

/**
 * Método responsável por cadastrar um novo disco.
 * @param string codigo, int id termo 
 * @returns objeto inserido
 */
async function inserirNovoDisco(codigo, id_termo) {
    if (await existeCodigo(codigo)) {
        return null;
    }
    let conn = await connect();
    const sql = 'INSERT INTO DISCO(CODIGO, ID_TERMO) VALUES (?, ?);';
    const values = [codigo, id_termo];
    log(getTime() + "\tInserindo novo disco: " + codigo + " - id_termo: " + id_termo);
    let retorno = await conn.query(sql, values);
    await disconnect(conn);
    return retorno;
}

async function removerTermoDeBusca(id_termo) {
    let conn = await connect();
    const values = [id_termo];
    let excluiu = false;

    if (await existeTermoEmDisco(id_termo)) {
        const sql = 'DELETE FROM DISCO WHERE ID_TERMO = (?);';
        log(getTime() + "\tRemovendo discos onde o id_termo é: " + id_termo);
        await conn.query(sql, values);
        excluiu = true;
    }

    if (await existeIdTermo(id_termo)) {
        sql = 'DELETE FROM TERMO WHERE ID = (?);';
        log(getTime() + "\tRemovendo termo id: " + id_termo);
        await conn.query(sql, values);
        excluiu = true;
    }
    await disconnect(conn);    
    return excluiu;
}

async function connect() {
    if(global.connection && global.connection.state !== 'disconnected')
        return global.connection;
 
    const connection = await mysql.createConnection("mysql://root:@localhost:3306/robo");
    console.log("Conectou no MySQL!");
    global.connection = connection;
    return connection;
}

async function disconnect(conn) {
    await conn.close
    global.connection.close
    console.log('Desconectando...')
}

async function buscaEmail() {
    let conn = await connect();
    let retorno = await conn.query('SELECT EMAIL AS EMAIL FROM EMAIL;');
    await disconnect(conn);
    return (retorno[0] == '' || retorno[0][0].EMAIL == 0) ? null : retorno[0][0].EMAIL
}

async function salvarEmail(email) {
    let conn = await connect();
    let retorno = await conn.query('SELECT COUNT(*) AS QTD FROM EMAIL;');
    if (retorno[0] == '' || retorno[0][0].QTD == 0) {
        const sql = 'INSERT INTO EMAIL(EMAIL) VALUES (?);';
        const values = [email];
        await conn.query(sql, values);
    } else {
        const sql = 'UPDATE EMAIL SET EMAIL = ?;';
        const values = [email];
        await conn.query(sql, values);
    } 
    await disconnect(conn);
    log(getTime() + '\tSalvando email: ' + email)
    return true;
}

async function log(data) {
    fs.appendFile('log.txt', (data + "\n"), (err) => {
        if (err) throw err;
    });
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

module.exports = router;