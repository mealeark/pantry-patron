const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const path = require('path');

const database = require('../database/index.js');
const User = require('../database/schemas/UserSchema.js');
const util = require('./util.js');

// Module constants
const SALT_ROUNDS = 10; // Difficulty  to crack (Incrementing doubles compute time)
const CLIENT_FOLDER = path.join(__dirname, '..//client/dist');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || '0979zx7v6vvq0398ubvq7w6dc8c7z5rvg7i1',
  cookie: {},
  resave: true,
  saveUninitialized: true,
}));

// Handle static endpoints
const allPublicEndpoints = ['/login', '/register'];
const allPrivateEndpoints = ['/', '/lists'];

function serveStatic(endpoint, authorizeCallback = (req, res, next) => next()) {
  app.get(endpoint, authorizeCallback, (req, res) => res.sendFile(path.join(CLIENT_FOLDER, 'index.html')));
}

allPublicEndpoints.forEach(endpoint => serveStatic(endpoint));
allPrivateEndpoints.forEach(endpoint => serveStatic(endpoint, util.checkLoggedIn));

// Make all files in dist public (Must be after setting static endpoints)
app.use(express.static(CLIENT_FOLDER));

// All public API calls
app.get('/', util.checkLoggedIn, (req, res) => {
  res.end();
});

app.post('/login', (req, res) => {
  const { username, password } = req.body; // might only be req.body

  // If user
  if (username && password) {
    const db = User.find({ username }).exec();

    db.then(async (user) => {
      const isValiduser = await bcrypt.compare(password, user[0].hash);
      return {
        user: user[0],
        hash: user[0].hash,
        isValidUser: isValiduser,
      };
    })
      .then(({ user, hash, isValidUser }) => {
        if (!isValidUser) {
          res.end('/login');
        }
        req.session.username = username;
        req.session.hash = hash;
        database.searchForListsAndPopulate(user.grocery_lists, (lists) => {
          const results = { loc: '\/', lists, userData: user };
          res.end(JSON.stringify(results));
        });
      })
      .catch((err) => {
        if (err) console.error('user does not exist.');
      });
  } else {
    res.redirect('/login');
  }
});

app.post('/updateHistory', (req, res) => {
  database.searchForItemInHistoryAndPopulate(req.body, true, (historyItem) => {
    console.log('check me out ', historyItem);
    res.end(JSON.stringify(historyItem));
  });
});

app.get('/logout', (req, res) => {
  // Remove user
  console.log('Logout', req.session);
  req.session.destroy();
  res.redirect('/login');
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  /*
  What happens when a username already exists?
  */
  // If user
  if (username && password) {
    bcrypt.hash(password, SALT_ROUNDS)
      .then(async hash => (
        database.saveUser({
          username,
          hash,
          grocery_list: [],
          last_login: new Date(),
          failed_login_attempts: 0,
        })
      ))
      .then((hash) => {
        req.session.username = username;
        req.session.hash = hash;

        res.end('/login');
      })
      .catch();
  } else {
    res.end('/register');
  }
});

// searches the database for an item, if it doesn't exists a new item
// will be created
app.post('/search/item', util.checkLoggedIn, (req, res) => {
  database.searchForItem(req.body, (item) => {
    res.end(JSON.stringify(item));
  });
});

// adds an item to a specified grocerylist then returns
// the list in populated form.
app.post('/addItem', (req, res) => {
  console.log('inside add item!!!!!!!!', req.body)
  database.searchForItemInHistory(req.body, (updatedList) =>{
    database.searchForListsAndPopulate([updatedList._id], (populatedList) => {
      res.end(JSON.stringify(populatedList))
    });
  });
});


app.post('/lists/create', util.checkLoggedIn, (req, res) => {
  console.log('BEFORE', req.body);
  database.createList(req.body, (list) => {
    res.end(JSON.stringify(list));
  });
});

app.post('/updateList', (req, res) => {
  console.log(req.body)
});

app.post('/lists/delete', (req, res) => {
  const { _id } = req.body;
  database.deleteListById(_id);
});

app.get('/store/search', (req, res) => {
  const { name } = req.query;

  const promiseSearch = name ? database.storeSearch({ name }).exec() : database.storeSearch({}).exec();

  promiseSearch.then(stores => res.end(JSON.stringify(stores)));
});

app.post('/store/create', util.checkLoggedIn, (req, res) => {
  const { name } = req.body;

  if (!name) {
    res.status(404);
    res.send('Requires name');
    return;
  }

  database.storeSave({ name })
    .then(store =>{
      console.log('Wow a NEW store', store)
     res.end(JSON.stringify(store))})
    .catch((err) => {
      res.status(500);
      console.error(`Could not create store ${name} in Stores database (Duplicate?)`, err);
      res.send('Apologies for this error. From our expreience this occurs when the store name is a duplicate. We advise checking the store name.');
    });
});

// Initialization
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
