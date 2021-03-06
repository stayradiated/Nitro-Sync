const assert = require('assert')
const request = require('supertest')
const endpoint = '/a/auth'

describe('/auth', function() {
  let tmptoken = null
  describe('POST /authorize', function() {
    it('should return a refresh_token', function(done) {
      request(app)
        .post(endpoint + '/authorize')
        .send({ username: 'test@nitrotasks.com', password: 'secret' })
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err)
          if ('refresh_token' in res.body) {
            done()
            tmptoken = res.body.refresh_token
          } else {
            done(new Error('Missing refresh_token in body.'))
          }
        })
    })
    it('needs parameters', function(done) {
      request(app)
        .post(endpoint + '/authorize')
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
    it('should fail if username or password is empty', function(done) {
      request(app)
        .post(endpoint + '/authorize')
        .send({ username: '', password: '' })
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
    it('should fail if username is wrong', function(done) {
      request(app)
        .post(endpoint + '/authorize')
        .send({ username: 'not exist', password: 'secret' })
        .expect(401)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
    it('should fail if password is wrong', function(done) {
      request(app)
        .post(endpoint + '/authorize')
        .send({ username: 'test@nitrotasks.com', password: 'not correct' })
        .expect(401)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
  })
  describe('GET /token', function() {
    it('should return a access_token', function(done) {
      request(app)
        .get(endpoint + '/token/' + token.refresh_token)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err)
          if ('access_token' in res.body) {
            done()
          } else {
            done(new Error('Missing access_token in body.'))
          }
        })
    })
    it('needs parameters', function(done) {
      request(app)
        .get(endpoint + '/token/')
        .expect(404)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })

    it('should fail if refresh_token is wrong', function(done) {
      request(app)
        .get(endpoint + '/token/wrongtoken')
        .expect(401)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
  })
  describe('DELETE /token', function(done) {
    it('should be able to delete a token (sign out)', function(done) {
      request(app)
        .delete(endpoint + '/token/' + tmptoken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
    it('should not be able to delete a token that does not exist', function(done) {
      request(app)
        .delete(endpoint + '/token/' + tmptoken)
        .expect(401)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
  })
  describe('GET /testbearer', function() {
    it('needs authentication', function(done) {
      request(app)
        .get(endpoint + '/testbearer')
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
    it('should succeed if token is correct', function(done) {
      request(app)
        .get(endpoint + '/testbearer')
        .set({'Authorization': 'Bearer ' + token.access_token})
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
    it('should fail if the token is wrong', function(done) {
      request(app)
        .get(endpoint + '/testbearer')
        .set({'Authorization': 'Bearer wrongtoken'})
        .expect(401)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
  })
})