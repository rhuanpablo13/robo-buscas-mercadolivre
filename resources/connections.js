//const mysql = require("mysql");
const mysql = require('mysql-await');

function getConnection() {
    var con = mysql.createConnection({
        "connectionLimit" : 100,
        "host": "dt3bgg3gu6nqye5f.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
        "user": "ytttsyvk633tkdb8",
        "password": "idw5mjko46ydrw5d",
        "database": "g5xzvr387fujul1g"
    });

    con.on(`error`, (err) => {
        log(`Connection error ${err.code}`);
        return null
    });
    return con
}

module.exports = {
    getConnection
}
