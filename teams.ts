const { MongoClient, ObjectID } = require('mongodb')
const { uri, db, teamsCollection } = require('./config')

let coll;

module.exports = () => MongoClient.connect(uri).then(c => coll = c.db(db).coll(teamsCollection))

module.exports.Team = {
    find(_id: string) {
        return coll.findOne({ _id: ObjectID(_id) })
    },
    create(data) {
        return coll.insertOne(Object.assign(data, { created: new Date() }), { w: 1 })
    },
    delete(_id: string) {
        return coll.deleteOne({ _id: ObjectID(_id) }, { w: 1 })
    }
};