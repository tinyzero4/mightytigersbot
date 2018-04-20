const { MongoClient, ObjectID } = require('mongodb')
const { uri, db, matchesCollection } = require('./config')

let coll;

module.exports = () => MongoClient.connect(mongoUri).then(c => coll = c.db(db).coll(matchesCollection))

module.exports.Match = {
    find(_id) {
        return coll.findOne({ _id: ObjectID(_id) })
    },
    findLatest(teamId) {
        
    },
    create(data) {
        return coll.insertOne(Object.assign(data, { created: new Date() }), { w: 1 })
    },

    delete(_id) {
        return coll.deleteOne({ _id: ObjectID(_id) }, { w: 1 })
    }
};