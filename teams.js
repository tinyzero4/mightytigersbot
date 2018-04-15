const { MongoClient, ObjectID } = require('mongodb');

let mongoUri = 'mongodb://localhost:27017/tigers'
let teamsColl = 'teams'

let db;

module.exports = () => MongoClient.connect(mongoUri).then(c => db = c.db('tigers'))

module.exports.Team = {
    find(_id) {
        if (typeof _id !== 'object') _id = ObjectID(_id)
        return db.collection(teamsColl).findOne({ _id })
    },
    create(data) {
        console.log(db);
        data.created = Date.now()
        return db.collection(teamsColl).insertOne(data, { w: 1 })
    },
    delete(_id) {
        if (typeof _id !== 'object') _id = ObjectID(_id)
        return db.collection(teamsColl).deleteOne({ _id }, { w: 1 })
    }
};