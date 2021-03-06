const assert = require('assert')
const request = require('supertest')
const endpoint = '/a/lists'

let listId = null
let listId2 = null
let inboxId = null

describe('/lists', function() {
  describe('POST /', function() {
    it('needs authentication', function(done) {
      request(app)
        .post(endpoint)
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
    it('should fail if no name is supplied', function(done) {
      request(app)
        .post(endpoint)
        .set({ Authorization: 'Bearer ' + token.access_token })
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
    it('should fail if name is blank', function(done) {
      request(app)
        .post(endpoint)
        .send({ name: '' })
        .set({ Authorization: 'Bearer ' + token.access_token })
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
    it('should create a list and return all required attributes', function(done) {
      request(app)
        .post(endpoint)
        .send({ name: 'A Cool List', id: '12345' })
        .set({ Authorization: 'Bearer ' + token.access_token })
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err)
          assert(typeof res.body.id !== 'undefined', 'has id')
          assert(res.body.originalId === '12345', 'has correct og id')
          assert(typeof res.body.name !== 'undefined', 'has name')
          assert(typeof res.body.notes !== 'undefined', 'has notes')
          assert(typeof res.body.users !== 'undefined', 'has users')
          assert(typeof res.body.sort !== 'undefined', 'has sort')
          assert(typeof res.body.updatedAt !== 'undefined', 'has updatedAt')
          assert(typeof res.body.createdAt !== 'undefined', 'has createdAt')
          assert(typeof res.body.order !== 'undefined', 'has order')
          done()
        })
    })
    it('should not be able to create a default system list', function(done) {
      request(app)
        .post(endpoint)
        .send({ name: 'nitrosys-whatever', id: '12345' })
        .set({ Authorization: 'Bearer ' + token.access_token })
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
    it('should create truncate a list name with over 255 characters', function(done) {
      request(app)
        .post(endpoint)
        .send({ name: new Array(256).fill('a').join(''), id: '12345' })
        .set({ Authorization: 'Bearer ' + token.access_token })
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err)
          assert.equal(
            res.body.name,
            new Array(255).fill('a').join(''),
            'truncated to 255'
          )
          done()
        })
    })
  })

  describe('GET /', function() {
    before(function(done) {
      // creates another test list
      request(app)
        .post(endpoint)
        .send({ name: 'A List Not belonging to user1' })
        .set({ Authorization: 'Bearer ' + token2.access_token })
        .end(function(err, res) {
          listId2 = res.body.id
          done()
        })
    })
    it('needs authentication', function(done) {
      request(app)
        .get(endpoint)
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
    it('should return all lists for the user with correct attributes', function(done) {
      request(app)
        .get(endpoint)
        .set({ Authorization: 'Bearer ' + token.access_token })
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err)
          if (res.body.length === 3) {
            assert(typeof res.body[0].id !== 'undefined')

            inboxId = res.body[0].id
            listId = res.body[0].id
            if (res.body[0].name === 'nitrosys-inbox') {
              listId = res.body[1].id
            } else {
              inboxId = res.body[1].id
            }
            assert(typeof res.body[0].name !== 'undefined')
            assert(typeof res.body[0].updatedAt !== 'undefined')
            assert(typeof res.body[0].createdAt !== 'undefined')
            done()
          } else {
            done(new Error('Did not return expected number of lists.'))
          }
        })
    })
  })
  describe('DELETE /', function() {
    it('needs authentication', function(done) {
      request(app)
        .delete(endpoint + '/')
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
    it('requires a list', function(done) {
      request(app)
        .delete(endpoint + '/')
        .set({ Authorization: 'Bearer ' + token.access_token })
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
    it('requires correct uuid syntax', function(done) {
      request(app)
        .delete(endpoint + '/')
        .set({ Authorization: 'Bearer ' + token.access_token })
        .send({ lists: ['rekt'] })
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
    it('should delete a list', function(done) {
      request(app)
        .delete(endpoint + '/')
        .set({ Authorization: 'Bearer ' + token.access_token })
        .send({ lists: [listId] })
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
    it('should be deleted from the database', function(done) {
      request(app)
        .get(endpoint + '/' + listId)
        .set({ Authorization: 'Bearer ' + token.access_token })
        .expect(404)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
    it('should not delete a list belonging to another user', function(done) {
      request(app)
        .delete(endpoint + '/')
        .set({ Authorization: 'Bearer ' + token.access_token })
        .send({ lists: [listId2] })
        .expect(404)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
    it('should return exact lists that do not exist', function(done) {
      request(app)
        .delete(endpoint + '/')
        .set({ Authorization: 'Bearer ' + token2.access_token })
        .send({ lists: [listId2, '38944917-a0fd-4e31-9c56-6c1f825bfa0c'] })
        .expect(404)
        .end(function(err, res) {
          if (err) return done(err)
          assert.equal(
            res.body.items[0],
            '38944917-a0fd-4e31-9c56-6c1f825bfa0c',
            'Not found list must be found.'
          )
          done()
        })
    })
    it('should not delete the default system lists', function(done) {
      request(app)
        .delete(endpoint + '/')
        .set({ Authorization: 'Bearer ' + token.access_token })
        .send({ lists: [inboxId] })
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err)
          done()
        })
    })
  })
})
