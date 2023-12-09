const { urlencoded } = require('express');
const express = require('express');
const fast2sms = require('fast-two-sms')
const app = express();
const cors = require("cors");

const path = require('path');
const bodyParser = require('body-parser');
const knex = require('knex');

const pool = require('./db');
const fs = require('fs');
var fileSystem = require("fs");
var fastcsv = require("fast-csv");
const translate = require('google-translate-api');

require('dotenv').config();
const port = 3000;

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use("/public", express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

// Middleware to log requests (for debugging purposes)
app.use((req, res, next) => {
    console.log(`Received request: ${req.method} ${req.url}`);
    next();
});

// Middleware to handle database connection
pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});


const db = knex({
    client: 'pg',
    connection: {
        host: 'localhost',
        user: 'myproject',
        password: 'pratyush',
        port: 5433,
        database: 'myproject'
    }
});

const initialPath = path.join(__dirname, 'public');

//login and registration
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.post('/register-user', (req, res) => {
    const { name, email, password } = req.body;

    if (!name.length || !email.length || !password.length) {
        res.json({ message: 'Fill all the fields', redirect: '/register' });
    } else {
        db('users')
            .insert({
                name: name,
                email: email,
                password: password
            })
            .returning(['name', 'email'])
            .then(data => {
                res.json({ message: 'Registration successful', redirect: '/task' });
            })
            .catch(err => {
                if (err.detail.includes('already exists')) {
                    res.json({ message: 'Email already exists', redirect: '/register' });
                }
            });
    }
});

app.post('/login-user', (req, res) => {
    const { email, password } = req.body;

    db.select('name', 'email')
        .from('users')
        .where({
            email: email,
            password: password
        })
        .then(data => {
            if (data.length) {
                res.json({ message: 'Login successful', redirect: '/task' });
            } else {
                res.json({ message: 'Email or password is incorrect', redirect: '/' });
            }
        });
});

app.get('/getSlangFromDatabasePage', (req, res) => {
    res.sendFile(__dirname + '/getslag.html');
});

// Route for finding slang from the API
app.get('/getSlangFromAPIPage', (req, res) => {
    res.sendFile(__dirname + '/getslangapi.html');
});

app.get('/task', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Middleware to find slang in local language using the database - Task 1
app.get('/getSlangFromDatabase', async (req, res) => {
    try {
        await findSlangDatabase(req, res);
    } catch (error) {
        console.error('Error in /getSlangFromDatabase middleware:', error.message);
        res.status(500).send('Internal Server Error');
    }
});

// Middleware to find slang in local language using API - Task 1
app.get('/getSlangFromAPI', async (req, res) => {
    try {
        await findSlangAPI(req, res);
    } catch (error) {
        console.error('Error in /getSlangFromAPI middleware:', error.message);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/validatenewdata', (req, res) => {
    res.sendFile(__dirname + '/validatenew.html');
});

// Middleware to validate data insertion - Task 2
app.post('/validateNew', validateData, async (req, res) => {
    try {
        const { client_email, client_name, income_per_annum, savings_per_annum, mobile_number } = req.body;
        const newClient = await pool.query("INSERT INTO client_income_data(client_email,client_name,income_per_annum,savings_per_annum,mobile_number) VALUES($1,$2,$3,$4,$5) RETURNING *", [client_email, client_name, income_per_annum, savings_per_annum, mobile_number]);
        res.json(newClient.rows[0]);
    } catch (err) {
        console.error('Error during data insertion:', err.message);
        res.status(500).send('Internal Server Error');
    }
});


// Middleware to validate all records - Task 2
app.get('/validateAll', async (req, res) => {
    try {
        let inValidRows = await pool.query("SELECT * FROM client_income_data WHERE savings_per_annum > income_per_annum");
        inValidRows = inValidRows.rows;

        if (inValidRows.length === 0) {
            res.send("All records are Valid");
        } else {
            res.send(inValidRows);
        }
    } catch (err) {
        console.error('Error during data validation:', err.message);
        res.status(500).send('Internal Server Error');
    }
});

// Middleware to get data into CSV - Task 3
app.get('/getCSV', exportCSV, (req, res) => {});

// Middleware to send SMS - Task 4
app.post('/sendmessage', SMS, (req, res) => {});

// Start the server
app.listen(port, () => {
    console.log(`Server is listening at port : ${port}`);
});
// Middleware to find slang in local language - Task 1
async function findSlangDatabase(req, res) {
    const { word, lang } = req.query;

    // Log the received data
    console.log('Received data:', { word, lang });

    try {
        // Implement database query to find slang
        const data = await db
            .select('slang')
            .from('wordslang')
            .where({
                word: word,
                lang_id: lang, // Corrected property name
            });

        console.log('Data from the database:', data);

        if (data.length > 0) {
            res.send(data[0].slang);
        } else {
            res.send('Slang not found in the database');
        }
    } catch (err) {
        console.error('Error during slang lookup:', err.message);
        res.status(500).send(`Error during slang lookup: ${err.message}`);
    }
}

// Middleware to find slang in local language using API - Task 1
async function findSlangAPI(req, res) {
    try {
        var word = req.query.word;
        var language = req.query.lang;
        const response = await translate(word, { to: language });
        console.log(response.text);
        var data = {
            status: "Success",
            GivenWord: word,
            SlangLanguage: language,
            ConvertedSlang: response.text,
        };
        // send the response
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({
            status: "Failed",
            Msg: "Something Went Wrong!",
            Error: error,
        });
    }
}


// Middleware to validate data - Task 2
function validateData(req, res, next) {
    const { client_email, income_per_annum, savings_per_annum, mobile_number } = req.body;

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(client_email)) {
        return res.status(400).send("Invalid email address");
    }

    // Phone number validation regex
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(mobile_number)) {
        return res.status(400).send("Invalid mobile number, should be of 10 digits");
    }

    if (income_per_annum < savings_per_annum) {
        return res.status(400).send("Invalid Data Savings cannot be more than Income");
    } else {
        next();
    }
}

// Middleware to export data in CSV - Task 3
async function exportCSV(req, res) {
    try {
        let data = await pool.query("SELECT * FROM client_income_data");
        data = data.rows;

        var file = fs.createWriteStream("public/data.csv");
        fastcsv
            .write(data, { headers: true })
            .on("finish", function () {
                res.send("<a href='/public/data.csv' download='data.csv' id='download-link'></a><script>document.getElementById('download-link').click();</script>");
            })
            .pipe(file);

    } catch (err) {
        console.error('Error during CSV export:', err.message);
        res.status(500).send('Internal Server Error');
    }
}

app.get('/sendSMSPage', (req, res) => {
    res.sendFile(__dirname + '/SendSMS.html');
});
// Middleware to send SMS - Task 4
async function SMS(req, res) {
    try {
        const { client_email, client_name, income_per_annum, savings_per_annum, mobile_number } = req.body;
        var options = {
            authorization: 'Z3UielVCFfrT4Jy5wImjgESNRQA6MKq7uYDo8H90cGkL1bzOP2MpK5keqAROB0NwWE7Iav96fxDdQcbu',
            message: ` Your Details :\n Email ID :${client_email}\n Name : ${client_name}\n Income Per Annum: ${income_per_annum}\n Savings Per Annum: ${savings_per_annum}\n Contact : ${mobile_number}\n Thank you for your response`,
            numbers: [mobile_number]
        };

        const response = await fast2sms.sendMessage(options); // Asynchronous Function.

        console.log('SMS Response:', response);

        if (response) {
            if (response.status === 'OK') {
                res.send(response.message);
            } else {
                console.error('Error sending SMS:', response);
                res.status(500).send(`Error sending SMS: ${response && response.message ? response.message : 'Unknown error'}`);
            }
        } else {
            console.error('Error sending SMS: Unknown error');
            res.status(500).send('Error sending SMS: Unknown error');
        }
    } catch (err) {
        console.error('Error during SMS sending:', err.message);
        res.status(500).send(`Error during SMS sending: ${err.message}`);
    }
}
