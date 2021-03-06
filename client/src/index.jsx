import React from 'react';
import ReactDOM from 'react-dom';
import {
  BrowserRouter as Router,
  Route,
  Switch,
} from 'react-router-dom';

import $ from 'jquery';


// components
import Home from './components/Home.jsx';
import Login from './components/Login.jsx';
import Register from './components/Register.jsx';
import Lists from './components/Lists.jsx';

function sendNewUserCredentials(newUserCreds, callback) {
  $.ajax({
    url: '/register',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(newUserCreds),
    success: (loc) => {
      console.log('New user information saved to db');
      callback(loc);
    },
    error: (err) => {
      console.error(err);
    },
  });
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoggedIn: false,
      stores: [],
      user: {},
      lists: [],
    };
    console.log(`the user is logged in: ${this.state.isLoggedIn}, under user info ${this.state.user.username}`);

    this.verify = this.verify.bind(this);
    this.update = this.update.bind(this);
  }

  componentDidMount() {
    this.getStores();
  }

  createNewStore(newStoreNameObj, callback) {
    // newStoreNameObj === { name: <storeName> }
    $.ajax({
      url: '/store/create',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(newStoreNameObj),
      success: (data) => {
        this.getStores();

        if(callback){ callback(JSON.parse(data)) }
      },
      error: (err) => {
        console.error(err);
      }
    })
  }

  getStores() {
    $.ajax({
      url: '/store/search',
      type: 'GET',
      contentType: 'application/json',
      success: (data) => {
        this.setState({stores: JSON.parse(data)});
      },
      error: (err) => {
        console.error(`${err}in getStores function`);
      },
    });
  }

  update(data) {
    this.setState(data);
  }

  verify(credentials, callback) {
    $.ajax({
      url: '/login',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(credentials),
      success: (data) => {
        console.log(JSON.parse(data), 'in verify credentials');
        this.setState({ isLoggedIn: true });
        // //get user information
        this.setState({ lists: JSON.parse(data).lists || [] });
        this.setState({ user: JSON.parse(data).userData || {} });
        this.setState({ categories: JSON.parse(data).categories || [] });
        callback(JSON.parse(data).loc);
      },
      error: (err) => {
        console.error(err);
        callback('/login');
      },
    });
  } // end verify

  deleteList({ _id }) {
    $.ajax({
      url: '/lists/delete',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ _id }),
      success: (data) => {
        if (!data) {
          console.error('No response from server');
        }
      },
      error: (err) => {
        console.error(err);
      },
    });
  }

  render() {
    // console.log('USER INFO', this.state)
    return (
      <Router>
        <Switch>
          <Route
            exact
            path="/"
            render={props => <Home {...props} user={this.state.user} />}
          />
          <Route
            exact
            path="/login"
            render={props => <Login verify={this.verify} {...props} />}
          />
          <Route
            exact
            path="/register"
            render={props => <Register grabUserCredentials={sendNewUserCredentials} {...props} />
          }
          />
          <Route exact path="/logout" render={props => <Login verify={this.verify} {...props} />} />
          <Route
            exact
            path="/lists"
            render={props => (<Lists
              user={this.state.user}
              lists={this.state.lists}
              update={this.update.bind(this)}
              stores={this.state.stores}
              createStore={this.createNewStore.bind(this)}
              deleteList={this.deleteList}
              {...props}
            />)}
          />
        </Switch>
      </Router>
    );
  } // end render
}

ReactDOM.render(<App />, document.getElementById('app'));

/*
/'
/login
/register
/logout
/list

------------> think about we add a /list/edit  <-----  new challenge!!!!!!

*/
