const { MongoClient, ObjectID } = require('mongodb')

export const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/tigers'
export const db = 'tigers'
export const teamsCollection = 'teams'
export const matchesCollection = 'matches'