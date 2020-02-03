const express = require('express')
var PORT = process.env.PORT || 3000;
const morgan = require('morgan')
const path = require('path')
const mysql = require('mysql');
const multer = require('multer')
const hbs = require('hbs')
const {sendWelcomeEmail} = require('./emails/accounts')
var bodyParser = require('body-parser')
const publicDirectory = path.join(__dirname, '../public')
const crypto = require('crypto')
var session = require('express-session')
var username;
const app = express();
app.use(morgan('combined'));
app.set('view engine', 'hbs')
//app.use(express.static('public'));  // set a static folder so we donthave to put in a command for every page(about, contact etc)
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(session({
    secret: 'someRandomSecret',
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 },
    //store: sessionStore, // connect-mongo session store
    proxy: true,
    resave: true,
    saveUninitialized: true
}))

const upload = multer({
    dest: 'documents', 
    limits: {
        fileSize: 3000000
    },
    fileFilter(req, file, callback){
        if(!file.originalname.endsWith('/\.(doc|docx|pdf)$/')){
            return callback(new Error('Please upload pdf or doc file'))
        }

        //callback(new Error('File must be a doc or pdf'))
        callback(undefined, true)
        //callback(undefined, false)
    }
})

var connection = mysql.createConnection({  //connection variable set which uses the module settings set for the db credentials.
    'host': 'localhost',
    'user': 'root',
    'password': 'puneet',
    'database': 'blog',
    'multipleStatements': true
});
app.get('/about', function(req, res){
    res.sendFile(path.join(__dirname, 'public', 'about.html'))
})


app.get('/upcoming', function (req, res){
    res.sendFile(path.join(__dirname, 'public', 'upcoming1.html'))
})

app.get('/search-engine', function(req, res){
    res.render('search-engine')
})

app.post('/resume', upload.single('resume'), (req, res)=>{
    res.sendFile(path.join(__dirname, 'public', 'doc.html'))
}, (error, req, res, next) =>{
    res.status(400).send({error: error.message})
})

// app.get('/resume', function(req, res){
//     try {

//         var sql = "SELECT * FROM article WHERE heading = 'one'";

//         connection.query(sql, true,  function(error, results, fields) {
//             console.log(typeof(results[0].content))
//             if(error){
//                 res.status(500).send(err.toString())
//             } else{
//                 this.originalRes.render('resume', {data:results});
//             }
            
            
//         }.bind({ originalReq: req, originalRes: res }));

       

//     } catch (ex) {
//         res.send('Internal error');
//     }
// })
app.get('/resume', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'doc.html'))
})

app.post('/create-article', function(req, res){
    var author = req.body.author;
    var heading = req.body.heading;
    var content = req.body.content;
    var title = req.body.title;
    console.log(req.body)
    try {

        var sql = "INSERT INTO article (author, heading, title, content) VALUES ('" + author + "', '" + heading + "', '" + title + "','" + content + "')";

        connection.query(sql, function(error, results, fields) {
            if (author!==username) {
                res.send('Please enter the correct username')
            } else if(error){
                res.status(500).send(error.toString())
            } else{
                this.originalRes.redirect('/dashboard');
            }
            
            
        }.bind({ originalReq: req, originalRes: res }));

       

    } catch (ex) {
        res.send('Internal error');
    }
 })

app.get('/create-article', function(req, res){
    res.render('create-article')
})





app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'home.html'))
})

//end point to test password hasing 
function hash(input, salt) {
    var hashed = crypto.pbkdf2Sync(input, salt, 10000, 512, 'sha512')
    return ['pbkdf2', '10000', salt, hashed.toString('hex')].join('$');
}
app.get('/hash/:input', function (req, res) {
    var hashedString = hash(req.params.input, 'this is me');
    res.send(hashedString)
})


app.post('/create-user', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    console.log(req.body)
    var salt = crypto.randomBytes(128).toString('hex');
    var dbString = hash(password, salt);
    connection.connect(function (err) {
        if (err) throw err;
        var sql = "INSERT INTO user (username, password) VALUES ('" + username + "', '" + dbString + "')";
        connection.query(sql, function (err, result) {
            console.log(sql)
            if (err) {
                res.status(500).send(err.toString())
            } else {
                sendWelcomeEmail(username)
                res.redirect('/user-dashboard')
            }
        })
    });
});



app.get('/create-user', function (req, res) {
    res.render('create-user')
})

app.post('/login', function (req, res) {

    username = req.body.username;
    var password = req.body.password;
        //first step to check if only the username exists or not
        var sql = 'SELECT * FROM user WHERE username = ?';
        connection.query(sql, [username], function (err, result) {
            console.log(sql)
            if (err) {
                res.status(500).send(err.toString())
            } else if (result.length === 0) {
                res.status(403).send('username/password is invalid')
            } else {
                //Match the pass
                var dbString = result[0].password;
                var salt = dbString.split('$')[2];
                var hashedPassword = hash(password, salt);
                if (hashedPassword === dbString) {
                    //Set the session
                    req.session.auth = { userId: result[0].username }
                    //set a cookie with a session id
                    //internally on the server side it maps session id to an object
                    //obj contain [auth which contain userId]


                    res.redirect('user-dashboard')
                    
                    //res.render('/user-dashboard')
                } else {
                    res.status(403).send('username/password is invalid')
                }
            }
        })
})

 app.get('/login', function(req, res){
     res.render('login')
 })

 app.get('/user-dashboard', function(req, res){
    try {  // try and catch for if there is an error with this code segment it will not disrupt the whole program and should not let it freeze.
            let sql = 'SELECT * from article where author = ?'; 

            connection.query(sql, [username], function(error, results, fields) {
                if (error) {
                    console.error(error.message);
                }
                console.log(results);

                this.originalRes.render("dashboard", {data : results });
                
            }.bind({ originalReq: req, originalRes: res }));
        

       

    } catch (ex) {
        res.send('Internal error');
    }
 })

 app.get('/guest-dashboard', (req, res)=>{
     res.render('user-dashboard')
 })

 app.get('/guest', (req, res)=> {
     res.redirect('/guest-dashboard')
 })
 app.get('/projects', (req, res)=>{
     res.render('projects')
 })

 app.get('/weather', (req, res)=>{
    res.render('weather')
})

app.get('/website', (req, res)=>{
    res.render('website')
})

app.get('/bank', (req, res)=>{
    res.render('bank')
})

app.get('/projects', (req, res)=>{
    res.render('projects')
})


app.get('/check-login', function (req, res) {
    if (req.session && req.session.auth && req.session.auth.userId) {
        // Load the user object
        connection.query('SELECT * FROM user WHERE username = ?', [req.session.auth.userId], function (err, result) {
            if (err) {
               res.status(500).send(err.toString());
            } else {
               res.send(result.rows[0].username);    
            }
        });
    } else {
        res.status(400).send('You are not logged in');
    }
 });

app.get('/logout', function (req, res) {
    delete req.session.auth;
    //res.send('<html><body>Logged out!<br/><br/><a href="/">Back to home</a></body></html>');
    res.redirect('/')
 });


// var counter = 0;
// app.get('/counter', function (req, res) {
//     counter += 1;
//     res.send(counter.toString())
// })



//first we have to make an end point for every new feature even permanent or testing 
// app.get('/articles/:articleName', function (req, res) {
//     //trying to test db by making a select statement
//     // return a response
//     connection.connect(function (err) {
//         if (err) throw err;
//         var sql = "SELECT * FROM article WHERE title = '" + req.params.articleName + "'";
//         connection.query(sql, function (err, result) {
//             console.log(sql)
//             if (err) {
//                 res.status(500).send(err.toString())
//             } else if (result.length === 0) {
//                 res.status(404).send('Article not found')
//             } else {
//                 res.render('one', { data: result[0] })
//             }
//         })
//     });
// })


// var names = [];
// app.get('/submit-name/', function (req, res) {
//     //get the name from the request object(extraction)
//     var name = req.query.name;

//     names.push(name);
//     //Array to string to send (JSON)
//     res.send(JSON.stringify(names))
// })


// app.get('/:articleName', function (req, res) {
//     //res.sendFile(path.join(__dirname, 'public', 'one.html'))
//     var articleName = req.params.articleName;
//     res.send(createTemplate(articles[articleName]))
// })

// app.get('/article-one', function (req, res) {
//     res.sendFile(path.join(__dirname, 'public', 'one.html'))
// })

// app.get('/article-two', function (req, res) {
//     res.sendFile(path.join(__dirname, 'public', 'two.html'))
// })

// app.get('/article-three', function (req, res) {
//     res.sendFile(path.join(__dirname, 'public', 'three.html'))
// })


app.listen(PORT);