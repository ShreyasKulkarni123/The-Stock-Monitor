// ********************** Initialize server **********************************

const server = require('../src/index'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************

describe('Register', () => {
  it('Registers a new user', done => {
    const newUser = {
      username: 'Willy Wonka',
      password: 'test',
    };

    chai
      .request(server)
      .post('/register')
      .send(newUser)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'User registered successfully');
        done();
      });
  });
});

describe('Login', () => {
  it('Logs in an existing user', done => {
    const credentials = {
      username: 'bob',
      password: 'password2'
    };

    chai
      .request(server)
      .post('/login')
      .send(credentials)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'User logged in successfully');
        done();
      });
  });
});


// *********************** TODO: WRITE 2 UNIT TESTCASES ABOUT A NEW FEATURE **************************
describe('Welcome', () => {
  it('Positive: /welcome', done => {
    
    chai
      .request(server)
      .post('/welcome')
      .send(credentials1)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome page is being displayed');
        done();
      });
  });
});


describe('Search', () => {
  it('Negative: /search', done => {
    const credentials1 = {
      symbol: 'META',
    };

    chai
      .request(server)
      .post('/search')
      .end((err, res) => {
        expect(res).to.have.status(404);
        expect(res.body.status).to.equals('error');
        assert.strictEqual(res.body.message, 'Company stock not found');
        done();
      });
  });
});

